#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{Address, BytesN, Env};

const USDC: i128 = 10_000_000; // 7 decimales
const FEE_BPS: u32 = 50; // 0.5 % para TilcaGo
const WINDOW: u64 = 30 * 60;
const T0: u64 = 1_800_000_000;

struct Setup<'a> {
    env: Env,
    client: TilcaGoEscrowClient<'a>,
    token: TokenClient<'a>,
    contract: Address,
    admin: Address,
    tourist: Address,
    agent: Address,
    fee_account: Address,
}

fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|l| l.timestamp = T0);

    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let admin = Address::generate(&env);
    let arbiter = Address::generate(&env);
    let fee_account = Address::generate(&env);
    let tourist = Address::generate(&env);
    let agent = Address::generate(&env);

    StellarAssetClient::new(&env, &sac.address()).mint(&tourist, &(500 * USDC));

    let contract = env.register(
        TilcaGoEscrow,
        (admin.clone(), arbiter, sac.address(), fee_account.clone(), FEE_BPS, WINDOW),
    );
    let client = TilcaGoEscrowClient::new(&env, &contract);
    let token = TokenClient::new(&env, &sac.address());
    Setup { env, client, token, contract, admin, tourist, agent, fee_account }
}

fn id(env: &Env, n: u8) -> BytesN<32> {
    BytesN::from_array(env, &[n; 32])
}

fn deposit(s: &Setup, n: u8) -> BytesN<32> {
    let order = id(&s.env, n);
    s.client.deposit(&order, &s.tourist, &s.agent, &(100 * USDC), &(T0 + 3_600));
    order
}

fn advance(env: &Env, secs: u64) {
    env.ledger().with_mut(|l| l.timestamp += secs);
}

#[test]
fn flujo_feliz_paga_al_cajero_y_la_comision() {
    let s = setup();
    let order = deposit(&s, 1);
    assert_eq!(s.token.balance(&s.contract), 100 * USDC);
    assert_eq!(s.client.get_order(&order).status, Status::Funded);

    s.client.start_handover(&order);
    assert_eq!(s.client.get_order(&order).status, Status::InHandover);

    s.client.release(&order);
    // La firma que autorizó la liberación es la del turista
    assert_eq!(s.env.auths()[0].0, s.tourist);

    assert_eq!(s.client.get_order(&order).status, Status::Released);
    assert_eq!(s.token.balance(&s.agent), 995_000_000); // 99.50 USDC
    assert_eq!(s.token.balance(&s.fee_account), 5_000_000); // 0.50 USDC
    assert_eq!(s.token.balance(&s.contract), 0);
    assert_eq!(s.token.balance(&s.tourist), 400 * USDC);
}

#[test]
fn el_turista_no_puede_reembolsarse_durante_la_entrega() {
    // El hueco de la v2: recibir el efectivo, no firmar, esperar el vencimiento y reembolsarse.
    let s = setup();
    let order = deposit(&s, 1);
    s.client.start_handover(&order);
    advance(&s.env, 10 * 3_600); // la orden ya venció

    assert_eq!(s.client.try_refund(&order), Err(Ok(Error::InvalidState)));
    assert_eq!(s.token.balance(&s.contract), 100 * USDC);
}

#[test]
fn reembolso_solo_despues_del_vencimiento() {
    let s = setup();
    let order = deposit(&s, 1);
    assert_eq!(s.client.try_refund(&order), Err(Ok(Error::NotExpired)));

    advance(&s.env, 3_600);
    s.client.refund(&order);
    assert_eq!(s.client.get_order(&order).status, Status::Refunded);
    assert_eq!(s.token.balance(&s.tourist), 500 * USDC);
    // Una orden reembolsada no se puede liberar ni volver a reembolsar
    assert_eq!(s.client.try_refund(&order), Err(Ok(Error::InvalidState)));
    assert_eq!(s.client.try_release(&order), Err(Ok(Error::InvalidState)));
}

#[test]
fn no_se_libera_sin_entrega_iniciada() {
    let s = setup();
    let order = deposit(&s, 1);
    assert_eq!(s.client.try_release(&order), Err(Ok(Error::InvalidState)));
}

#[test]
fn una_sola_liquidacion() {
    let s = setup();
    let order = deposit(&s, 1);
    s.client.start_handover(&order);
    s.client.release(&order);
    assert_eq!(s.client.try_release(&order), Err(Ok(Error::InvalidState)));
    assert_eq!(s.client.try_agent_refund(&order), Err(Ok(Error::InvalidState)));
}

#[test]
fn no_se_inicia_entrega_de_orden_vencida() {
    let s = setup();
    let order = deposit(&s, 1);
    advance(&s.env, 3_600);
    assert_eq!(s.client.try_start_handover(&order), Err(Ok(Error::Expired)));
}

#[test]
fn cancelar_entrega_devuelve_la_orden_a_funded() {
    let s = setup();
    let order = deposit(&s, 1);
    s.client.start_handover(&order);
    s.client.cancel_handover(&order);
    assert_eq!(s.client.get_order(&order).status, Status::Funded);

    advance(&s.env, 3_600);
    s.client.refund(&order);
    assert_eq!(s.token.balance(&s.tourist), 500 * USDC);
}

#[test]
fn el_cajero_puede_devolver_durante_la_entrega() {
    let s = setup();
    let order = deposit(&s, 1);
    s.client.start_handover(&order);
    s.client.agent_refund(&order);
    assert_eq!(s.env.auths()[0].0, s.agent);
    assert_eq!(s.token.balance(&s.tourist), 500 * USDC);
}

#[test]
fn disputa_resuelta_a_favor_del_cajero() {
    let s = setup();
    let order = deposit(&s, 1);
    s.client.start_handover(&order);
    s.client.open_dispute(&order, &s.agent, &id(&s.env, 9));
    assert_eq!(s.client.get_order(&order).status, Status::Disputed);
    // En disputa nadie puede liberar ni reembolsar por su cuenta
    assert_eq!(s.client.try_release(&order), Err(Ok(Error::InvalidState)));
    assert_eq!(s.client.try_refund(&order), Err(Ok(Error::InvalidState)));

    s.client.resolve_dispute(&order, &Outcome::PayAgent);
    assert_eq!(s.client.get_order(&order).status, Status::Released);
    assert_eq!(s.token.balance(&s.agent), 995_000_000);
}

#[test]
fn disputa_resuelta_a_favor_del_turista() {
    let s = setup();
    let order = deposit(&s, 1);
    s.client.start_handover(&order);
    s.client.open_dispute(&order, &s.tourist, &id(&s.env, 9));
    s.client.resolve_dispute(&order, &Outcome::RefundTourist);
    assert_eq!(s.client.get_order(&order).status, Status::Refunded);
    assert_eq!(s.token.balance(&s.tourist), 500 * USDC);
}

#[test]
fn el_admin_escala_solo_despues_de_la_ventana() {
    let s = setup();
    let order = deposit(&s, 1);
    s.client.start_handover(&order);
    assert_eq!(s.client.try_open_dispute(&order, &s.admin, &id(&s.env, 9)), Err(Ok(Error::HandoverWindowOpen)));

    let extrano = Address::generate(&s.env);
    assert_eq!(s.client.try_open_dispute(&order, &extrano, &id(&s.env, 9)), Err(Ok(Error::NotParty)));

    advance(&s.env, WINDOW);
    s.client.open_dispute(&order, &s.admin, &id(&s.env, 9));
    assert_eq!(s.client.get_order(&order).status, Status::Disputed);
}

#[test]
fn validaciones_del_deposito() {
    let s = setup();
    let order = deposit(&s, 1);
    let ok_expiry = T0 + 3_600;
    assert_eq!(s.client.try_deposit(&order, &s.tourist, &s.agent, &USDC, &ok_expiry), Err(Ok(Error::OrderExists)));
    let otra = id(&s.env, 2);
    assert_eq!(s.client.try_deposit(&otra, &s.tourist, &s.agent, &0, &ok_expiry), Err(Ok(Error::InvalidAmount)));
    assert_eq!(s.client.try_deposit(&otra, &s.tourist, &s.agent, &USDC, &T0), Err(Ok(Error::InvalidExpiry)));
    assert_eq!(
        s.client.try_deposit(&otra, &s.tourist, &s.agent, &USDC, &(T0 + 8 * 24 * 3_600)),
        Err(Ok(Error::InvalidExpiry))
    );
    assert_eq!(s.client.try_deposit(&otra, &s.tourist, &s.tourist, &USDC, &ok_expiry), Err(Ok(Error::SameParty)));
}

#[test]
fn la_comision_queda_fijada_al_depositar() {
    let s = setup();
    let order = deposit(&s, 1);
    s.client.set_fee_bps(&200);
    s.client.start_handover(&order);
    s.client.release(&order);
    assert_eq!(s.token.balance(&s.fee_account), 5_000_000);
    assert_eq!(s.client.try_set_fee_bps(&5_000), Err(Ok(Error::FeeTooHigh)));
}

#[test]
fn reparto_con_redondeo_hacia_el_cajero() {
    assert_eq!(TilcaGoEscrow::split(100 * USDC, 50), (995_000_000, 5_000_000));
    // 1 unidad mínima: la comisión redondea a 0 y todo va al cajero
    assert_eq!(TilcaGoEscrow::split(1, 50), (1, 0));
}

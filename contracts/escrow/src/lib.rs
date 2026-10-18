#![no_std]
//! TilcaGoEscrow — escrow de USDC para retiros de efectivo en el mostrador.
//!
//! Flujo feliz (ver tilcago_v3.md §4 y §7):
//!   deposit (turista) → FUNDED
//!   start_handover (cajero, en el mostrador) → IN_HANDOVER   ← bloquea el reembolso unilateral
//!   release (turista, frente al efectivo contado) → RELEASED  ← paga al cajero y la comisión
//!
//! Salidas alternativas:
//!   cancel_handover (cajero)            IN_HANDOVER → FUNDED
//!   refund (turista, orden vencida)     FUNDED → REFUNDED
//!   agent_refund (cajero, voluntario)   FUNDED | IN_HANDOVER → REFUNDED
//!   open_dispute (turista / cajero / admin tras la ventana) IN_HANDOVER → DISPUTED
//!   resolve_dispute (árbitro)           DISPUTED → RELEASED | REFUNDED
//!
//! El activo se maneja a través de su Stellar Asset Contract (SAC): el contrato solo
//! acepta el token fijado al desplegar, así que un «USDC» de otro emisor queda fuera.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token, Address, BytesN,
    Env,
};

/// Comisión máxima de la plataforma: 10 %.
const MAX_FEE_BPS: u32 = 1_000;
/// Plazo máximo entre el depósito y el vencimiento de la orden: 7 días.
const MAX_ORDER_SECS: u64 = 7 * 24 * 60 * 60;
const BPS: i128 = 10_000;

// TTL de las órdenes en el almacenamiento persistente (≈ 5 s por ledger). Una orden vive
// como máximo 7 días; 14 días de vida alcanzan y abaratan la renta que paga cada depósito.
// El historial completo queda igual en los eventos de la cadena.
const DAY_IN_LEDGERS: u32 = 17_280;
const ORDER_TTL_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;
const ORDER_TTL_EXTEND_TO: u32 = 14 * DAY_IN_LEDGERS;
// La instancia y el código los extiende el admin (scripts/extend-ttl.sh) por meses. El contrato
// solo los extiende como red de seguridad cuando les queda menos de un día, para que la renta
// del código no la pague el depósito de un turista.
const INSTANCE_TTL_THRESHOLD: u32 = DAY_IN_LEDGERS;
const INSTANCE_TTL_EXTEND_TO: u32 = 2 * DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    OrderExists = 1,
    OrderNotFound = 2,
    InvalidAmount = 3,
    InvalidExpiry = 4,
    InvalidState = 5,
    NotExpired = 6,
    Expired = 7,
    NotParty = 8,
    HandoverWindowOpen = 9,
    FeeTooHigh = 10,
    SameParty = 11,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Status {
    Funded = 0,
    InHandover = 1,
    Released = 2,
    Refunded = 3,
    Disputed = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Order {
    pub tourist: Address,
    pub agent: Address,
    /// Monto total depositado, en unidades mínimas del token (7 decimales en USDC).
    pub amount: i128,
    /// Comisión de la plataforma fijada al depositar (no cambia si luego cambia la config).
    pub fee_bps: u32,
    pub expiry: u64,
    pub status: Status,
    pub created_at: u64,
    /// Momento en que el cajero inició la entrega (0 si nunca ocurrió).
    pub handover_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub arbiter: Address,
    pub token: Address,
    pub fee_account: Address,
    pub fee_bps: u32,
    /// Segundos que el turista tiene para firmar `release` antes de que el admin pueda escalar a disputa.
    pub handover_window: u64,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Config,
    Order(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Outcome {
    PayAgent = 0,
    RefundTourist = 1,
}

// ---------- Eventos ----------

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Deposited {
    #[topic]
    pub order_id: BytesN<32>,
    pub tourist: Address,
    pub agent: Address,
    pub amount: i128,
    pub expiry: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HandoverStarted {
    #[topic]
    pub order_id: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HandoverCancelled {
    #[topic]
    pub order_id: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Released {
    #[topic]
    pub order_id: BytesN<32>,
    pub agent_amount: i128,
    pub fee: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Refunded {
    #[topic]
    pub order_id: BytesN<32>,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Disputed {
    #[topic]
    pub order_id: BytesN<32>,
    pub by: Address,
    pub reason_hash: BytesN<32>,
}

#[contract]
pub struct TilcaGoEscrow;

#[contractimpl]
impl TilcaGoEscrow {
    /// Se ejecuta una sola vez al desplegar.
    pub fn __constructor(
        env: Env,
        admin: Address,
        arbiter: Address,
        token: Address,
        fee_account: Address,
        fee_bps: u32,
        handover_window: u64,
    ) {
        if fee_bps > MAX_FEE_BPS {
            panic_with_error!(&env, Error::FeeTooHigh);
        }
        let config = Config { admin, arbiter, token, fee_account, fee_bps, handover_window };
        env.storage().instance().set(&DataKey::Config, &config);
    }

    // ---------- Turista ----------

    /// Crea la orden y bloquea `amount` del token en el contrato.
    pub fn deposit(env: Env, order_id: BytesN<32>, tourist: Address, agent: Address, amount: i128, expiry: u64) -> Result<(), Error> {
        tourist.require_auth();
        let config = Self::load_config(&env);
        let key = DataKey::Order(order_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::OrderExists);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if tourist == agent {
            return Err(Error::SameParty);
        }
        let now = env.ledger().timestamp();
        if expiry <= now || expiry > now + MAX_ORDER_SECS {
            return Err(Error::InvalidExpiry);
        }

        token::TokenClient::new(&env, &config.token).transfer(&tourist, env.current_contract_address(), &amount);

        let order = Order {
            tourist: tourist.clone(),
            agent: agent.clone(),
            amount,
            fee_bps: config.fee_bps,
            expiry,
            status: Status::Funded,
            created_at: now,
            handover_at: 0,
        };
        Self::save_order(&env, &order_id, &order);
        Deposited { order_id, tourist, agent, amount, expiry }.publish(&env);
        Ok(())
    }

    /// Libera el pago: el turista firma frente al efectivo contado.
    pub fn release(env: Env, order_id: BytesN<32>) -> Result<(), Error> {
        let mut order = Self::load_order(&env, &order_id)?;
        order.tourist.require_auth();
        Self::expect(&order, Status::InHandover)?;
        Self::pay_agent(&env, &order_id, &mut order);
        Ok(())
    }

    /// Reembolso al turista si la orden venció sin que empezara la entrega.
    pub fn refund(env: Env, order_id: BytesN<32>) -> Result<(), Error> {
        let mut order = Self::load_order(&env, &order_id)?;
        order.tourist.require_auth();
        Self::expect(&order, Status::Funded)?;
        if env.ledger().timestamp() < order.expiry {
            return Err(Error::NotExpired);
        }
        Self::refund_tourist(&env, &order_id, &mut order);
        Ok(())
    }

    // ---------- Cajero ----------

    /// El cajero validó el QR/PIN y empieza a contar el efectivo. Desde aquí no hay reembolso unilateral.
    pub fn start_handover(env: Env, order_id: BytesN<32>) -> Result<(), Error> {
        let mut order = Self::load_order(&env, &order_id)?;
        order.agent.require_auth();
        Self::expect(&order, Status::Funded)?;
        let now = env.ledger().timestamp();
        if now >= order.expiry {
            return Err(Error::Expired);
        }
        order.status = Status::InHandover;
        order.handover_at = now;
        Self::save_order(&env, &order_id, &order);
        HandoverStarted { order_id }.publish(&env);
        Ok(())
    }

    /// El cajero no puede completar la entrega (no-show, falta efectivo): la orden vuelve a FUNDED.
    pub fn cancel_handover(env: Env, order_id: BytesN<32>) -> Result<(), Error> {
        let mut order = Self::load_order(&env, &order_id)?;
        order.agent.require_auth();
        Self::expect(&order, Status::InHandover)?;
        order.status = Status::Funded;
        Self::save_order(&env, &order_id, &order);
        HandoverCancelled { order_id }.publish(&env);
        Ok(())
    }

    /// El cajero devuelve los fondos por su cuenta. Solo lo perjudica a él, así que se permite también en entrega.
    pub fn agent_refund(env: Env, order_id: BytesN<32>) -> Result<(), Error> {
        let mut order = Self::load_order(&env, &order_id)?;
        order.agent.require_auth();
        if order.status != Status::Funded && order.status != Status::InHandover {
            return Err(Error::InvalidState);
        }
        Self::refund_tourist(&env, &order_id, &mut order);
        Ok(())
    }

    // ---------- Disputas ----------

    /// Turista o cajero pueden abrir una disputa durante la entrega; el admin solo cuando venció la ventana.
    pub fn open_dispute(env: Env, order_id: BytesN<32>, by: Address, reason_hash: BytesN<32>) -> Result<(), Error> {
        by.require_auth();
        let mut order = Self::load_order(&env, &order_id)?;
        Self::expect(&order, Status::InHandover)?;
        if by != order.tourist && by != order.agent {
            let config = Self::load_config(&env);
            if by != config.admin {
                return Err(Error::NotParty);
            }
            if env.ledger().timestamp() < order.handover_at + config.handover_window {
                return Err(Error::HandoverWindowOpen);
            }
        }
        order.status = Status::Disputed;
        Self::save_order(&env, &order_id, &order);
        Disputed { order_id, by, reason_hash }.publish(&env);
        Ok(())
    }

    /// El árbitro decide: pagar al cajero o reembolsar al turista. No hay otra salida.
    pub fn resolve_dispute(env: Env, order_id: BytesN<32>, outcome: Outcome) -> Result<(), Error> {
        let config = Self::load_config(&env);
        config.arbiter.require_auth();
        let mut order = Self::load_order(&env, &order_id)?;
        Self::expect(&order, Status::Disputed)?;
        match outcome {
            Outcome::PayAgent => Self::pay_agent(&env, &order_id, &mut order),
            Outcome::RefundTourist => Self::refund_tourist(&env, &order_id, &mut order),
        }
        Ok(())
    }

    // ---------- Administración ----------

    pub fn set_fee_bps(env: Env, fee_bps: u32) -> Result<(), Error> {
        let mut config = Self::load_config(&env);
        config.admin.require_auth();
        if fee_bps > MAX_FEE_BPS {
            return Err(Error::FeeTooHigh);
        }
        config.fee_bps = fee_bps;
        env.storage().instance().set(&DataKey::Config, &config);
        Ok(())
    }

    pub fn set_arbiter(env: Env, arbiter: Address) -> Result<(), Error> {
        let mut config = Self::load_config(&env);
        config.admin.require_auth();
        config.arbiter = arbiter;
        env.storage().instance().set(&DataKey::Config, &config);
        Ok(())
    }

    /// Reemplaza el código del contrato (útil en testnet). Las órdenes se conservan.
    pub fn upgrade(env: Env, wasm_hash: BytesN<32>) -> Result<(), Error> {
        Self::load_config(&env).admin.require_auth();
        env.deployer().update_current_contract_wasm(wasm_hash);
        Ok(())
    }

    // ---------- Lectura ----------

    pub fn get_order(env: Env, order_id: BytesN<32>) -> Result<Order, Error> {
        Self::load_order(&env, &order_id)
    }

    pub fn get_config(env: Env) -> Config {
        Self::load_config(&env)
    }

    /// Reparto de `amount` con la comisión `fee_bps`: (para el cajero, para TilcaGo).
    pub fn split(amount: i128, fee_bps: u32) -> (i128, i128) {
        let fee = amount * fee_bps as i128 / BPS;
        (amount - fee, fee)
    }

    // ---------- Internas ----------

    fn load_config(env: &Env) -> Config {
        env.storage().instance().extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
        env.storage().instance().get(&DataKey::Config).unwrap()
    }

    fn load_order(env: &Env, order_id: &BytesN<32>) -> Result<Order, Error> {
        env.storage().persistent().get(&DataKey::Order(order_id.clone())).ok_or(Error::OrderNotFound)
    }

    fn save_order(env: &Env, order_id: &BytesN<32>, order: &Order) {
        let key = DataKey::Order(order_id.clone());
        env.storage().persistent().set(&key, order);
        env.storage().persistent().extend_ttl(&key, ORDER_TTL_THRESHOLD, ORDER_TTL_EXTEND_TO);
    }

    fn expect(order: &Order, status: Status) -> Result<(), Error> {
        if order.status != status {
            return Err(Error::InvalidState);
        }
        Ok(())
    }

    fn pay_agent(env: &Env, order_id: &BytesN<32>, order: &mut Order) {
        let config = Self::load_config(env);
        let (agent_amount, fee) = Self::split(order.amount, order.fee_bps);
        // El estado se escribe antes de transferir: una sola liquidación por orden.
        order.status = Status::Released;
        Self::save_order(env, order_id, order);
        let token = token::TokenClient::new(env, &config.token);
        let me = env.current_contract_address();
        token.transfer(&me, &order.agent, &agent_amount);
        if fee > 0 {
            token.transfer(&me, &config.fee_account, &fee);
        }
        Released { order_id: order_id.clone(), agent_amount, fee }.publish(env);
    }

    fn refund_tourist(env: &Env, order_id: &BytesN<32>, order: &mut Order) {
        let config = Self::load_config(env);
        order.status = Status::Refunded;
        Self::save_order(env, order_id, order);
        token::TokenClient::new(env, &config.token).transfer(&env.current_contract_address(), &order.tourist, &order.amount);
        Refunded { order_id: order_id.clone(), amount: order.amount }.publish(env);
    }
}

mod test;

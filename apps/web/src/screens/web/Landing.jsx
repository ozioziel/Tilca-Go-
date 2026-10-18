import { useState } from 'react'
import {
  ArrowRight, ArrowUpDown, Check, ChevronDown, DollarSign, Eye, Globe, Layers, MapPin,
  Navigation, Percent, QrCode, Search, ShieldCheck, Star, Wallet, Zap,
} from 'lucide-react'
import Tilcayo from '../../components/Tilcayo'
import Mapa from '../../components/Mapa'
import { Onda } from '../../components/Paisaje'
import { Button, Chip, Logo } from '../../components/ui'
import { CAJEROS, cotizar, MARGEN, RATE, RATE_REF } from '../../data/config'
import { useI18n } from '../../i18n'

const irA = (hash) => () => {
  window.location.hash = hash
}

export default function Landing() {
  const { t, lang, setLang, bs, num } = useI18n()
  const [usd, setUsd] = useState('100')
  const q = cotizar(Number(usd) || 0)
  // Desglose de la cotización de ejemplo para 100 USDC: referencia, margen y comisión
  const q100 = cotizar(100)
  const barras = [
    { nombre: t('web.desgloseRef', { ref: num(RATE_REF) }), valor: q100.referencia, texto: bs(q100.referencia), tilcago: true },
    { nombre: t('web.desgloseMargen', { margen: MARGEN * 100 }), valor: q100.margen, texto: `− ${bs(q100.margen)}` },
    { nombre: t('web.desgloseComision', { fee: num(q100.comisionUsdc) }), valor: q100.comision, texto: `− ${bs(q100.comision)}` },
  ]
  const maxBarra = q100.referencia
  const pasos = [
    { n: '01', Icon: Eye, t: 'web.paso1t', d: 'web.paso1d' },
    { n: '02', Icon: MapPin, t: 'web.paso2t', d: 'web.paso2d' },
    { n: '03', Icon: Wallet, t: 'web.paso3t', d: 'web.paso3d' },
    { n: '04', Icon: QrCode, t: 'web.paso4t', d: 'web.paso4d' },
  ]

  return (
    <div className="web">
      <div className="web__formas" aria-hidden="true">
        <span className="forma forma--1" />
        <span className="forma forma--2" />
        <span className="forma forma--3" />
      </div>

      <nav className="web-nav glass">
        <Logo onClick={irA('#/')} />
        <div className="web-nav__links">
          <a href="#como">{t('web.link1')}</a>
          <a href="#tarifas">{t('web.link2')}</a>
          <a href="#cajeros">{t('web.link3')}</a>
          <a href="#stellar">{t('web.link4')}</a>
        </div>
        <div className="web-nav__acciones">
          <button type="button" className="web-nav__idioma" onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>
            <Globe size={18} aria-hidden="true" /> {lang === 'es' ? 'ES / EN' : 'EN / ES'}
          </button>
          <a className="boton-oscuro" href="#/app">
            {t('web.abrir')} <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </nav>

      {/* Portada */}
      <header className="web-hero">
        <div className="web-hero__texto">
          <Chip tone="beige">{t('web.chip')}</Chip>
          <h1 className="display-xl">{t('web.titulo')}</h1>
          <p className="body-l muted">{t('web.texto')}</p>
          <div className="web-hero__botones">
            <Button block={false} onClick={irA('#/app')}>{t('web.cotizarAhora')}</Button>
            <a className="btn btn--secondary btn--link" href="#cajeros">{t('web.verCajeros')}</a>
          </div>
          <div className="web-hero__datos">
            <div><strong className="display-m">1.5 %</strong><span className="body-s muted">{t('web.stat1')}</span></div>
            <div><strong className="display-m">40+</strong><span className="body-s muted">{t('web.stat2')}</span></div>
            <div><strong className="display-m">~5 s</strong><span className="body-s muted">{t('web.stat3')}</span></div>
          </div>
        </div>

        <div className="web-calc-wrap">
          <Tilcayo pose="echado" className="web-calc__gato respira" title="Tilcayo" />
          <div className="web-calc glass flota flota--lenta">
            <div className="entre">
              <h2 className="h-s">{t('web.cotiza')}</h2>
              <Chip>{t('web.tasaVivo')}</Chip>
            </div>
            <div className="calc">
              <label className="calc__campo calc__campo--claro">
                <span className="calc__monto">
                  <span className="overline">{t('cotizar.envias')}</span>
                  <input className="calc__input" inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value.replace(/[^\d.]/g, '').slice(0, 8))} aria-label={t('cotizar.envias')} />
                </span>
                <span className="moneda"><span className="moneda__icono"><DollarSign size={14} /></span>USDC <ChevronDown size={14} /></span>
              </label>
              <span className="calc__swap" aria-hidden="true"><ArrowUpDown size={16} /></span>
              <div className="calc__campo calc__campo--claro">
                <span className="calc__monto">
                  <span className="overline">{t('cotizar.recibes')}</span>
                  <strong className="calc__input">{num(q.efectivo)}</strong>
                </span>
                <span className="moneda"><span className="moneda__icono"><Wallet size={14} /></span>BOB <ChevronDown size={14} /></span>
              </div>
            </div>
            <div className="stack-8">
              <div className="row"><span className="row__label">{t('cotizar.tipo')}</span><span className="row__value">1 USDC = {RATE} Bs</span></div>
              <div className="row"><span className="row__label">{t('cotizar.comision')}</span><span className="row__value">{bs(q.comision)}</span></div>
              <div className="row"><span className="row__label">{t('cotizar.red')}</span><span className="row__value text-teal">{t('comun.gratis')}</span></div>
              <div className="row row--strong"><span className="row__label">{t('cotizar.total')}</span><span className="row__value text-terra">{bs(q.efectivo)}</span></div>
            </div>
            <div className="nota nota--verde"><Check size={18} aria-hidden="true" /><span>{t('cotizar.referencia', { ref: num(RATE_REF), margen: MARGEN * 100 })}</span></div>
            <Button onClick={irA('#/app')}>{t('web.continuar')}</Button>
            <div className="paga-con">
              <span className="label-s muted">{t('web.pagaCon')}</span>
              {[[DollarSign, 'USDC'], [Layers, t('web.pronto')]].map(([Icon, l]) => (
                <span key={l} className="paga-con__chip"><Icon size={13} aria-hidden="true" /> {l}</span>
              ))}
            </div>
          </div>
        </div>
        <Onda ancho className="web-hero__onda deriva" />
      </header>

      {/* Cómo funciona */}
      <section id="como" className="web-seccion">
        <span className="overline text-terra">{t('web.comoOv')}</span>
        <h2 className="display-l">{t('web.comoTitulo')}</h2>
        <p className="body-l muted web-seccion__texto">{t('web.comoTexto')}</p>
        <div className="pasos">
          <svg className="pasos__recorrido" viewBox="0 0 980 90" preserveAspectRatio="none" aria-hidden="true">
            <path d="M10 70 C 200 0, 380 80, 560 30 S 860 10, 960 60" />
          </svg>
          <Tilcayo pose="trepando" className="pasos__gato" />
          {pasos.map(({ n, Icon, t: tt, d }, i) => (
            <article key={n} className="paso glass flota flota--suave" style={{ '--retraso': `${i * 0.5}s` }}>
              <div className="entre">
                <strong className="display-m text-terra">{n}</strong>
                <span className="icono-redondo"><Icon size={20} aria-hidden="true" /></span>
              </div>
              <h3 className="h-xs">{t(tt)}</h3>
              <p className="body-s muted">{t(d)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Stellar */}
      <section id="stellar" className="web-seccion">
        <div className="stellar">
          <span className="stellar__brillo" aria-hidden="true" />
          <div className="stellar__texto">
            <span className="overline stellar__ov">{t('web.stellarOv')}</span>
            <h2 className="display-l">{t('web.stellarTitulo')}</h2>
            <p className="body-m">{t('web.stellarTexto')}</p>
          </div>
          <div className="stellar__datos">
            {[[Zap, '~5 s', t('web.st1')], [Percent, 'Bs 0', t('web.st2')], [ShieldCheck, t('web.st3v'), t('web.st3')]].map(([Icon, v, l], i) => (
              <div key={v} className="stellar__dato flota flota--suave" style={{ '--retraso': `${i * 0.6}s` }}>
                <span className="stellar__icono"><Icon size={20} aria-hidden="true" /></span>
                <span><strong className="h-s">{v}</strong><span className="body-s">{l}</span></span>
              </div>
            ))}
          </div>
          <svg className="stellar__onda" viewBox="0 0 1200 140" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-20 90 C 200 10, 380 140, 620 70 S 1000 20, 1220 80" stroke="#C2603A" strokeWidth="8" fill="none" opacity="0.5" />
            <path d="M-20 106 C 200 26, 380 156, 620 86 S 1000 36, 1220 96" stroke="#2E6B5B" strokeWidth="6" fill="none" opacity="0.6" />
          </svg>
        </div>
      </section>

      {/* Comparación */}
      <section id="tarifas" className="web-seccion web-dos">
        <div>
          <span className="overline text-terra">{t('web.transOv')}</span>
          <h2 className="display-l">{t('web.transTitulo')}</h2>
          <p className="body-l muted">{t('web.transTexto')}</p>
        </div>
        <div className="comparacion-wrap">
          <Tilcayo pose="asomado" className="asoma asoma--derecha brinca" />
          <div className="comparacion glass">
            <h3 className="h-xs">{t('web.cuanto', { usd: 100 })}</h3>
            {barras.map((b, i) => (
              <div key={b.nombre} className="barra">
                <div className="entre">
                  <span className={`label-m ${b.tilcago ? '' : 'muted'}`}>{b.nombre}</span>
                  <span className={`label-m ${b.tilcago ? 'text-terra' : ''}`}>{b.texto}</span>
                </div>
                <span className="barra__pista">
                  <span className={`barra__valor ${b.tilcago ? 'is-tilcago' : ''}`} style={{ width: `${Math.max((b.valor / maxBarra) * 100, 2)}%`, '--i': i }} />
                </span>
              </div>
            ))}
            <p className="label-s muted">{t('web.ref', { amount: bs(q100.efectivo) })}</p>
          </div>
        </div>
      </section>

      {/* Red de cajeros */}
      <section id="cajeros" className="web-seccion web-dos web-dos--mapa">
        <div className="web-mapa">
          <Mapa cajeros={CAJEROS} selected="sc" />
          <span className="pill-dato glass web-mapa__tag"><Navigation size={14} className="text-teal" aria-hidden="true" /> {t('web.estasAqui')}</span>
        </div>
        <div className="stack-16">
          <span className="overline text-terra">{t('web.redOv')}</span>
          <h2 className="display-l">{t('web.redTitulo')}</h2>
          <p className="body-l muted">{t('web.redTexto')}</p>
          <div className="buscador glass"><Search size={18} aria-hidden="true" /> {t('web.buscar')}</div>
          {CAJEROS.slice(0, 3).map((c, i) => (
            <div key={c.id} className={`cajero glass ${i === 0 ? 'is-selected' : ''}`}>
              <span className="cajero__ini">{c.ini}</span>
              <span className="cajero__datos">
                <strong>{c.nombre}</strong>
                <span className="fila-icono body-s muted"><MapPin size={13} aria-hidden="true" /> {c.zona} · {c.distancia} m</span>
                <span className="fila-icono label-s muted"><Star size={12} className="text-terra estrella" aria-hidden="true" /> {c.rating} · {t('mapa.retiros', { n: c.retiros })}</span>
                <Chip>{t('mapa.disp', { amount: `Bs ${c.efectivo.toLocaleString('en-US')}` })}</Chip>
              </span>
            </div>
          ))}
          <a className="link fila-icono" href="#/app">{t('web.verTodos')} <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </section>

      {/* Para cajeros */}
      <section className="web-seccion">
        <div className="banner-wrap">
          <Tilcayo pose="asomado" className="banner__gato brinca" />
          <div className="banner">
            <span className="banner__brillo" aria-hidden="true" />
            <div className="banner__texto">
              <span className="overline stellar__ov">{t('web.cajOv')}</span>
              <h2 className="display-l">{t('web.cajTitulo')}</h2>
              <p className="body-m">{t('web.cajTexto')}</p>
            </div>
            <Button block={false} onClick={irA('#/cajero')}>{t('web.cajBoton')}</Button>
          </div>
        </div>
      </section>

      <footer className="web-pie">
        <div className="stack-8">
          <Logo onClick={irA('#/')} />
          <span className="body-s muted">{t('web.footer')}</span>
        </div>
        <div className="web-pie__links">
          <a href="#/">{t('web.terminos')}</a>
          <a href="#/">{t('web.privacidad')}</a>
          <a href="#/">{t('web.soporte')}</a>
          <a href="#/cajero">{t('web.serCajero')}</a>
        </div>
      </footer>
    </div>
  )
}

import Tilcayo from '../../components/Tilcayo'
import { Onda } from '../../components/Paisaje'
import { Button, Chip, LangToggle, Lines, Logo } from '../../components/ui'
import { cotizar, RATE } from '../../data/config'
import { useI18n } from '../../i18n'

export default function Bienvenida({ nav, setState }) {
  const { t, bs } = useI18n()
  const q = cotizar(100)

  // Entrar a la app activa la trepada del tilcayo en Inicio
  const entrar = () => {
    setState((s) => ({ ...s, introPending: true }))
    nav.go('inicio', { root: true, plain: true })
  }

  return (
    <div className="pantalla bienvenida">
      <div className="bienvenida__hero">
        <Onda className="bienvenida__onda deriva" />
        <div className="glass card bienvenida__flotante flota">
          <span className="overline">{t('bienv.recibes')}</span>
          <strong className="h-s">{bs(q.efectivo)}</strong>
          <Chip>{t('bienv.listo')}</Chip>
        </div>
        <div className="bienvenida__tasa">
          <Tilcayo pose="feliz" className="asoma asoma--derecha brinca" />
          <div className="glass card flota flota--lenta">
            <span className="overline">{t('bienv.tasaHoy')}</span>
            <strong className="display-m">1 USD = {RATE} Bs</strong>
            <span className="body-s muted">{t('bienv.tasaNota')}</span>
          </div>
        </div>
      </div>

      <Logo />
      <h1 className="display-m entra" style={{ '--i': 1 }}>
        <Lines text={t('bienv.titulo')} />
      </h1>
      <p className="body-m muted entra" style={{ '--i': 2 }}>
        {t('bienv.texto')}
      </p>
      <div className="stack-12 entra" style={{ '--i': 3 }}>
        <Button onClick={() => nav.go('crear')}>{t('bienv.crear')}</Button>
        <Button variant="secondary" icon={false} onClick={entrar}>
          {t('bienv.tengo')}
        </Button>
      </div>
      <LangToggle className="centrado" />
    </div>
  )
}

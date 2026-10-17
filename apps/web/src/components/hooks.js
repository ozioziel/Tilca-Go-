import { useEffect, useRef, useState } from 'react'

/** true si la persona pidió reducir el movimiento en su sistema. */
export function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const onChange = () => setReduce(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduce
}

/** setTimeout que se limpia solo al desmontar el componente. */
export function useTimers() {
  const ids = useRef([])
  useEffect(() => () => ids.current.forEach(clearTimeout), [])
  return (fn, ms) => {
    const id = setTimeout(fn, ms)
    ids.current.push(id)
    return id
  }
}

/** Cuenta regresiva en segundos (para la tasa fijada). */
export function useCountdown(seconds) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

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

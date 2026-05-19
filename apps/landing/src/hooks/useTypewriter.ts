import { useEffect, useRef, useState } from 'react'

export interface UseTypewriterOptions {
  /** Velocidad de tipeo en ms por carácter. Default 35. */
  speed?: number
  /** Delay inicial antes de empezar a tipear, en ms. Default 0. */
  startDelay?: number
  /** Si true, sólo arranca cuando el ref entra en viewport. Default false. */
  whenVisible?: boolean
  /** Si true, respeta `prefers-reduced-motion` y muestra el texto completo sin animar. */
  respectReducedMotion?: boolean
  /** Callback al terminar la animación. */
  onDone?: () => void
}

export interface UseTypewriterResult<T extends HTMLElement = HTMLElement> {
  text: string
  done: boolean
  ref: React.RefObject<T | null>
}

/**
 * Hook minimalista para animación de tipeo.
 * - Sin dependencias.
 * - Soporta arranque por viewport (IntersectionObserver).
 * - Respeta prefers-reduced-motion.
 */
export function useTypewriter<T extends HTMLElement = HTMLElement>(
  fullText: string,
  options: UseTypewriterOptions = {},
): UseTypewriterResult<T> {
  const {
    speed = 35,
    startDelay = 0,
    whenVisible = false,
    respectReducedMotion = true,
    onDone,
  } = options

  const ref = useRef<T | null>(null)
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [shouldStart, setShouldStart] = useState(!whenVisible)

  // Detectar visibilidad (si aplica)
  useEffect(() => {
    if (!whenVisible) return
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShouldStart(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldStart(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [whenVisible])

  // Animación de tipeo
  useEffect(() => {
    if (!shouldStart) return

    // Reduced motion: mostrar todo de una
    if (respectReducedMotion && typeof window !== 'undefined') {
      const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      if (mq?.matches) {
        setText(fullText)
        setDone(true)
        onDone?.()
        return
      }
    }

    setText('')
    setDone(false)

    let cancelled = false
    let i = 0
    let intervalId: ReturnType<typeof setInterval> | undefined

    const startTimeout = setTimeout(() => {
      if (cancelled) return
      intervalId = setInterval(() => {
        if (cancelled) return
        i += 1
        setText(fullText.slice(0, i))
        if (i >= fullText.length) {
          if (intervalId) clearInterval(intervalId)
          setDone(true)
          onDone?.()
        }
      }, speed)
    }, startDelay)

    return () => {
      cancelled = true
      clearTimeout(startTimeout)
      if (intervalId) clearInterval(intervalId)
    }
  }, [fullText, shouldStart, speed, startDelay, respectReducedMotion, onDone])

  return { text, done, ref }
}

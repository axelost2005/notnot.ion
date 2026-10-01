import { useCallback, useEffect, type RefObject } from 'react'

const narrow = () => window.matchMedia('(max-width: 767px)').matches

/** Ancho de la zona del borde que pasa de columna. */
const EDGE_PX = 40
/** Cuánto hay que quedarse en el borde para pasar a la columna de al lado. */
const HOLD_MS = 500
/** Si sigue en el borde, la siguiente espera más: da tiempo a soltar en la que llegó. */
const REPEAT_MS = 1100

/**
 * En el celu se ve una columna por vez (con scroll-snap). Arrastrando una tarjeta, quedarse en
 * el borde de la pantalla pasa a la columna de al lado, de a una, como el swipe.
 *
 * Reemplaza al auto-scroll de dnd-kit en esa fila: con scroll-snap, cada paso del auto-scroll
 * salta una columna entera y en un instante se va hasta el final, sin dejar soltar en el medio.
 * Devuelve el `autoScroll.canScroll` para dnd-kit, que deja de mover esa fila en el celu.
 */
export function useEdgePaging(scrollerRef: RefObject<HTMLElement | null>, dragging: boolean) {
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!dragging || !scroller || !narrow()) return

    let x: number | null = null
    let nextPageAt: number | null = null
    const onMove = (event: PointerEvent | TouchEvent) => {
      x = 'touches' in event ? (event.touches[0]?.clientX ?? x) : event.clientX
    }

    const timer = window.setInterval(() => {
      if (x === null) return
      const { left, right } = scroller.getBoundingClientRect()
      const direction = x > right - EDGE_PX ? 1 : x < left + EDGE_PX ? -1 : 0
      if (direction === 0) {
        nextPageAt = null
        return
      }
      const now = performance.now()
      nextPageAt ??= now + HOLD_MS
      if (now < nextPageAt) return
      nextPageAt = now + REPEAT_MS
      // El scroll-snap termina de alinear la columna.
      scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: 'smooth' })
    }, 50)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onMove)
    }
  }, [scrollerRef, dragging])

  return useCallback(
    (element: Element) => !(element === scrollerRef.current && narrow()),
    [scrollerRef],
  )
}

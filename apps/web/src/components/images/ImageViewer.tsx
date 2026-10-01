import { useGSAP } from '@gsap/react'
import type { ImageInfo } from '@notnot/shared'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useRef, useState } from 'react'
import { imageUrl } from '@/lib/images'

gsap.registerPlugin(useGSAP, Flip)

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Grande, pero no a pantalla completa (y nunca más grande que la imagen). */
function fitToScreen({ width, height }: ImageInfo) {
  const scale = Math.min(1, (window.innerWidth * 0.88) / width, (window.innerHeight * 0.8) / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

type Props = {
  image: ImageInfo | null
  /** La miniatura de esa imagen: desde ahí se agranda y ahí vuelve al cerrar. */
  getThumb: (imageId: string) => HTMLElement | null
  onClose: () => void
}

/** La imagen agrandada sobre el fondo oscurecido. Se cierra con un click, con Esc o tocando afuera. */
export function ImageViewer({ image, getThumb, onClose }: Props) {
  return (
    <DialogPrimitive.Root open={image !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {image && (
          <Viewer key={image.id} image={image} thumb={() => getThumb(image.id)} onClose={onClose} />
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

type ViewerProps = { image: ImageInfo; thumb: () => HTMLElement | null; onClose: () => void }

// Va adentro del portal: así sus efectos corren cuando la imagen ya está en la página.
function Viewer({ image, thumb, onClose }: ViewerProps) {
  const scope = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const picture = useRef<HTMLImageElement>(null)
  const closing = useRef(false)
  const [size] = useState(() => fitToScreen(image))

  // Abrir: la imagen sale de la miniatura y crece hasta su lugar (GSAP Flip).
  const { contextSafe } = useGSAP(
    () => {
      const from = thumb()
      const animate = !reducedMotion() && from !== null && picture.current !== null
      gsap.from(backdrop.current, { opacity: 0, duration: animate ? 0.35 : 0.15 })
      if (!animate) return
      Flip.fit(picture.current, from, { scale: false })
      gsap.to(picture.current, {
        x: 0,
        y: 0,
        width: size.width,
        height: size.height,
        duration: 0.45,
        ease: 'power3.out',
      })
    },
    { scope },
  )

  // Cerrar: vuelve a la miniatura y recién ahí se va. Va por `contextSafe` en cada handler,
  // así GSAP limpia la animación si el visor se desmonta en el medio.
  function close() {
    if (closing.current) return
    closing.current = true
    const to = thumb()
    const animate = !reducedMotion() && to !== null && picture.current !== null
    gsap.to(backdrop.current, { opacity: 0, duration: animate ? 0.3 : 0.15 })
    if (!animate) {
      gsap.to(picture.current, { opacity: 0, duration: 0.15, onComplete: onClose })
      return
    }
    Flip.fit(picture.current, to, {
      scale: false,
      duration: 0.3,
      ease: 'power3.inOut',
      onComplete: onClose,
    })
  }

  return (
    <DialogPrimitive.Content
      ref={scope}
      aria-describedby={undefined}
      onEscapeKeyDown={(event) => {
        event.preventDefault()
        contextSafe(close)()
      }}
      onClick={() => contextSafe(close)()}
      className="fixed inset-0 z-50 grid place-items-center outline-none"
    >
      <DialogPrimitive.Title className="sr-only">Imagen</DialogPrimitive.Title>
      <div ref={backdrop} aria-hidden="true" className="absolute inset-0 bg-black/80" />
      <img
        ref={picture}
        src={imageUrl(image.id)}
        alt=""
        style={size}
        // `cover` mientras viaja: desde la miniatura cuadrada hasta la imagen entera. El fondo se
        // ve si todavía no terminó de bajar.
        className="relative rounded-lg bg-neutral-800 object-cover shadow-2xl"
      />
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-md text-white/80 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <X className="size-5" />
      </button>
    </DialogPrimitive.Content>
  )
}

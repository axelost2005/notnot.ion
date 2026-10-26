import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { Menu, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MenuContext, tileSelector } from './navigation'

gsap.registerPlugin(useGSAP, Flip)

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Corto: que se sienta directo (en el prototipo era más lento y lo pediste más rápido).
const OPEN = { duration: 0.3, ease: 'power3.out' }
const CLOSE = { duration: 0.24, ease: 'power3.inOut' }

const PanelContext = createContext<{ close: () => void } | null>(null)

type Props = {
  /**
   * El cuadrado del que sale (`data-tile`). Puede cambiar con el panel abierto. Sin cuadrado
   * (abierto desde Hoy), aparece y se va con un fundido.
   */
  tile: string | null
  /** Para lectores de pantalla: "Hoy", el nombre del tablero… */
  label: string
  /** Terminó de cerrarse: hay que volver al Inicio. */
  onClosed: () => void
  children: ReactNode
}

/**
 * Lo que se abre al tocar un cuadrado: crece desde el cuadrado hasta un panel grande (en el celu,
 * la pantalla entera) y vuelve a él al cerrarse con la ×, Esc o tocando afuera.
 */
export function Panel(props: Props) {
  return (
    // Siempre abierto mientras existe: se cierra navegando al Inicio (ver `onClosed`).
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <PanelContent {...props} />
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// Va adentro del portal: así sus efectos corren cuando el panel ya está en la página.
function PanelContent({ tile, label, onClosed, children }: Props) {
  const scope = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const currentTile = useRef(tile)
  const findTile = () =>
    currentTile.current === null
      ? null
      : document.querySelector<HTMLElement>(tileSelector(currentTile.current))

  // Abrir: el panel sale del cuadrado y crece hasta su lugar (GSAP Flip).
  const { contextSafe } = useGSAP(
    () => {
      const from = findTile()
      const el = panel.current
      const animate = !reducedMotion() && from !== null && el !== null
      gsap.from(backdrop.current, { opacity: 0, duration: animate ? OPEN.duration : 0.15 })
      if (!animate) {
        gsap.from(el, { opacity: 0, duration: 0.15 })
        return
      }
      const { width, height } = el.getBoundingClientRect()
      Flip.fit(el, from, { scale: false })
      gsap.to(el, { x: 0, y: 0, width, height, ...OPEN, clearProps: 'transform,width,height' })
      gsap.from(content.current, { opacity: 0, duration: 0.16, delay: OPEN.duration * 0.45 })
    },
    { scope },
  )

  // Con el panel abierto se puede pasar a otro (de Hoy a un tablero): cambia el contenido.
  useEffect(() => {
    if (currentTile.current === tile) return
    currentTile.current = tile
    if (!reducedMotion())
      gsap.fromTo(content.current, { opacity: 0 }, { opacity: 1, duration: 0.15 })
  }, [tile])

  // Cerrar: vuelve a su cuadrado y recién ahí se va. Va por `contextSafe` en cada handler, así
  // GSAP limpia la animación si el panel se desmonta en el medio.
  function close() {
    if (closing.current) return
    closing.current = true
    const to = findTile()
    const el = panel.current
    const animate = !reducedMotion() && to !== null && el !== null
    gsap.to(backdrop.current, { opacity: 0, duration: animate ? CLOSE.duration : 0.12 })
    if (!animate) {
      gsap.to(el, { opacity: 0, duration: 0.12, onComplete: onClosed })
      return
    }
    gsap.to(content.current, { opacity: 0, duration: 0.08 })
    Flip.fit(el, to, { scale: false, ...CLOSE, onComplete: onClosed })
  }
  const requestClose = () => contextSafe(close)()

  return (
    <DialogPrimitive.Content
      ref={scope}
      aria-describedby={undefined}
      onOpenAutoFocus={(event) => {
        // El panel y no el primer campo: con el dedo, no abre el teclado apenas se entra. Si un
        // campo ya se enfocó solo (Hoy en la compu, el atajo "Nueva nota"), queda ahí.
        event.preventDefault()
        if (!panel.current?.contains(document.activeElement)) panel.current?.focus()
      }}
      // Radix escucha el Esc antes que los campos: el de un campo es del campo (cerrar "Agregar
      // tarjeta", cancelar un nombre, cerrar el autocompletado) y el de un arrastre con teclado
      // lo cancela. Si el campo no lo usó, el foco pasa al panel y el próximo Esc lo cierra.
      onEscapeKeyDown={(event) => {
        const target = event.target instanceof HTMLElement ? event.target : null
        if (target?.closest('[data-card-handle][aria-pressed="true"]')) return
        if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
          setTimeout(() => {
            if (!event.defaultPrevented && document.activeElement === target) panel.current?.focus()
          })
          return
        }
        requestClose()
      }}
      // Afuera solo hay toasts y otros diálogos: tocarlos no cierra el panel.
      onPointerDownOutside={(event) => event.preventDefault()}
      onInteractOutside={(event) => event.preventDefault()}
      className="fixed inset-0 z-40 outline-none"
    >
      <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
      <div
        ref={backdrop}
        aria-hidden="true"
        onClick={requestClose}
        className="absolute inset-0 bg-black/30 dark:bg-black/55"
      />
      <div
        ref={panel}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 mx-auto flex flex-col overflow-hidden bg-background outline-none',
          'top-6 bottom-6 w-[min(72rem,calc(100%-3rem))] rounded-2xl border shadow-2xl',
          'max-md:inset-0 max-md:w-full max-md:rounded-none max-md:border-0 max-md:pt-[env(safe-area-inset-top)] max-md:pb-[env(safe-area-inset-bottom)] max-md:shadow-none',
        )}
      >
        <PanelContext value={{ close: requestClose }}>
          <div ref={content} className="flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </PanelContext>
      </div>
    </DialogPrimitive.Content>
  )
}

type HeaderProps = {
  children: ReactNode
  className?: string
  /** Dónde va la × para cerrar el panel. En las notas de la compu va en la nota, no en la lista. */
  close?: 'always' | 'mobile' | 'never'
  /** Fuera de un panel, en el celu, el ☰ que abre la barra. Dentro de una nota va "‹". */
  menu?: boolean
}

/** El encabezado de cada sección: con la × al final en un panel y con el ☰ en el celu. */
export function PanelHeader({ children, className, close = 'always', menu = true }: HeaderProps) {
  const panel = useContext(PanelContext)
  const openMenu = useContext(MenuContext)
  const showMenu = !panel && openMenu !== null && menu

  return (
    <header
      className={cn(
        'flex h-12 shrink-0 items-center gap-2.5 border-b px-4 max-md:h-14 max-md:pr-2',
        showMenu && 'max-md:pl-2',
        className,
      )}
    >
      {showMenu && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menú"
          aria-haspopup="dialog"
          onClick={openMenu}
          className="shrink-0 text-muted-foreground md:hidden"
        >
          <Menu />
        </Button>
      )}
      {children}
      {close !== 'never' && <PanelClose className={cn(close === 'mobile' && 'md:hidden')} />}
    </header>
  )
}

function PanelClose({ className }: { className?: string }) {
  const panel = useContext(PanelContext)
  if (!panel) return null
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cerrar"
      title="Cerrar (Esc)"
      onClick={panel.close}
      className={cn('-mr-1.5 shrink-0 text-muted-foreground', className)}
    >
      <X />
    </Button>
  )
}

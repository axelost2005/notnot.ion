import { Download, Share } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { needsIosInstallTip, useInstallPrompt } from './install'

const buttonClass = 'gap-1.5 max-md:size-9 max-md:px-0'

/** Solo aparece si el navegador deja instalar, o en iOS con el tip de "Compartir". */
export function InstallButton({ className }: { className?: string }) {
  const { canInstall, install } = useInstallPrompt()
  const [iosTip] = useState(needsIosInstallTip)
  const [tipOpen, setTipOpen] = useState(false)

  if (canInstall) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(buttonClass, className)}
        onClick={() => void install()}
      >
        <Download />
        <span className="max-md:sr-only">Instalar app</span>
      </Button>
    )
  }

  if (!iosTip) return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(buttonClass, className)}
        onClick={() => setTipOpen(true)}
      >
        <Download />
        <span className="max-md:sr-only">Instalar app</span>
      </Button>
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar en el iPhone</DialogTitle>
            <DialogDescription>
              En Safari, tocá{' '}
              <Share className="inline size-4 align-text-bottom" aria-label="Compartir" /> Compartir
              y después «Agregar a inicio».
            </DialogDescription>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            La app instalada tiene su propio almacenamiento: puede pedirte el código otra vez.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

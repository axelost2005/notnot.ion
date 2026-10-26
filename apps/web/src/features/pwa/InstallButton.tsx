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
import { needsIosInstallTip, useInstallPrompt } from './install'

const buttonClass = 'w-full justify-start gap-2.5 px-2 text-muted-foreground'

/** Solo aparece si el navegador deja instalar, o en iOS con el tip de "Compartir". */
export function InstallButton() {
  const { canInstall, install } = useInstallPrompt()
  const [iosTip] = useState(needsIosInstallTip)
  const [tipOpen, setTipOpen] = useState(false)

  if (canInstall) {
    return (
      <Button variant="ghost" className={buttonClass} onClick={() => void install()}>
        <Download className="size-3.5" />
        Instalar app
      </Button>
    )
  }

  if (!iosTip) return null

  return (
    <>
      <Button variant="ghost" className={buttonClass} onClick={() => setTipOpen(true)}>
        <Download className="size-3.5" />
        Instalar app
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

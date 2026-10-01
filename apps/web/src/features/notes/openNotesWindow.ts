/** Una sola ventana de notas: si ya está abierta, cambia al tablero pedido y pasa adelante. */
export function openNotesWindow(slug: string) {
  window.open(`/notas/${slug}`, 'notnot-notas', 'popup,width=400,height=640')?.focus()
}

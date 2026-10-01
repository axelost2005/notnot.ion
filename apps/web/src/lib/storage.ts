// localStorage puede no estar (modo privado, storage bloqueado): nunca rompe la app.

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Sin storage no se recuerda: no es un error para el usuario.
  }
}

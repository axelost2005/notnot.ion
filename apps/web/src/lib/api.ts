import { DAY_START_HEADER } from '@notnot/shared'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const isApiError = (error: unknown, status?: number): error is ApiError =>
  error instanceof ApiError && (status === undefined || error.status === status)

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  json?: unknown
  headers?: Record<string, string>
}

/** La medianoche de hoy en este dispositivo: la API pasa al historial lo terminado antes. */
function dayStart() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function readError(body: unknown): { code?: string; message?: string } {
  if (typeof body !== 'object' || body === null || !('error' in body)) return {}
  const { error } = body
  if (typeof error !== 'object' || error === null) return {}
  return {
    code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
    message: 'message' in error && typeof error.message === 'string' ? error.message : undefined,
  }
}

/** Llama a la API del mismo origen. Tira `ApiError` si no hay red o la respuesta no es 2xx. */
export async function api<T>(path: string, { json, headers, ...init }: RequestOptions = {}) {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: {
        [DAY_START_HEADER]: dayStart(),
        ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'No hay conexión con el servidor')
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    const { code, message } = readError(body)
    throw new ApiError(res.status, code ?? 'UNKNOWN', message ?? 'El servidor no respondió bien')
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

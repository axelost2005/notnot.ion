export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { json?: unknown }

function readError(body: unknown): { code?: string; message?: string } {
  if (typeof body !== 'object' || body === null || !('error' in body)) return {}
  const { error } = body
  if (typeof error !== 'object' || error === null) return {}
  return {
    code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
    message: 'message' in error && typeof error.message === 'string' ? error.message : undefined,
  }
}

/** Llama a la API del mismo origen. Tira `ApiError` si la respuesta no es 2xx. */
export async function api<T>(path: string, { json, headers, ...init }: RequestOptions = {}) {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: json === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: json === undefined ? undefined : JSON.stringify(json),
  })

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    const { code, message } = readError(body)
    throw new ApiError(
      res.status,
      code ?? 'UNKNOWN',
      message ?? 'No se pudo conectar con el servidor',
    )
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

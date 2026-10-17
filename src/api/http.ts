export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

export class ApiError extends Error {
  status: number
  fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

let csrfToken = ''
let unauthorizedHandler: (() => void) | null = null

export function setCsrfToken(token: string) {
  csrfToken = token
}

/** Called when a signed-in request comes back 401, so the app can return to the sign-in page. */
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

const NETWORK_MESSAGE = 'We could not reach the server. Check your connection and try again.'

export async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal; quiet401?: boolean } = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new ApiError(0, NETWORK_MESSAGE)
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  let detail = 'Something went wrong. Please try again.'
  let fields: Record<string, string> = {}
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') detail = data.detail
    else if (Array.isArray(data.detail)) detail = 'Please check the details you entered.'
    if (data.fields && typeof data.fields === 'object') fields = data.fields
  } catch {
    if (response.status >= 500) detail = 'The server had a problem. Please try again in a moment.'
  }
  if (response.status === 401 && !options.quiet401) unauthorizedHandler?.()
  throw new ApiError(response.status, detail, fields)
}

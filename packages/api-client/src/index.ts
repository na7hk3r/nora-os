export interface NoraApiClientOptions {
  baseUrl: string
  accessToken?: string
  fetcher?: typeof fetch
}

export interface NoraApiErrorShape {
  status: number
  message: string
  code?: string
}

export class NoraApiError extends Error {
  constructor(readonly shape: NoraApiErrorShape) {
    super(shape.message)
    this.name = 'NoraApiError'
  }
}

export class NoraApiClient {
  private readonly fetcher: typeof fetch

  constructor(private readonly options: NoraApiClientOptions) {
    this.fetcher = options.fetcher ?? fetch
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (this.options.accessToken) {
      headers.set('Authorization', `Bearer ${this.options.accessToken}`)
    }

    const response = await this.fetcher(new URL(path, this.options.baseUrl).toString(), {
      ...init,
      headers,
    })

    if (!response.ok) {
      throw new NoraApiError({
        status: response.status,
        message: response.statusText || 'Nora API request failed',
      })
    }

    return response.json() as Promise<T>
  }
}

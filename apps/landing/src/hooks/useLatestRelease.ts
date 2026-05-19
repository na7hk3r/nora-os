import { useEffect, useState } from 'react'

const REPO = 'na7hk3r/nora-os'
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`
const CACHE_KEY = 'nora-os:latest-release'
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutos

export interface ReleaseAsset {
  name: string
  url: string
  size: number
}

export interface LatestRelease {
  version: string
  publishedAt: string
  htmlUrl: string
  assets: {
    windows?: ReleaseAsset
    windowsPortable?: ReleaseAsset
    linuxAppImage?: ReleaseAsset
    linuxDeb?: ReleaseAsset
    macDmg?: ReleaseAsset
    all: ReleaseAsset[]
  }
}

interface CacheEntry {
  data: LatestRelease
  ts: number
}

interface RawAsset {
  name: string
  browser_download_url: string
  size: number
}

interface RawRelease {
  tag_name?: string
  name?: string
  published_at?: string
  html_url?: string
  assets?: RawAsset[]
}

export function classifyAssets(rawAssets: RawAsset[]): LatestRelease['assets'] {
  const all: ReleaseAsset[] = rawAssets.map((a) => ({
    name: a.name,
    url: a.browser_download_url,
    size: a.size,
  }))

  const find = (predicate: (name: string) => boolean): ReleaseAsset | undefined =>
    all.find((a) => predicate(a.name.toLowerCase()))

  return {
    windows: find(
      (n) => n.endsWith('.exe') && !n.includes('portable'),
    ),
    windowsPortable: find((n) => n.endsWith('.exe') && n.includes('portable')),
    linuxAppImage: find((n) => n.endsWith('.appimage')),
    linuxDeb: find((n) => n.endsWith('.deb')),
    macDmg: find((n) => n.endsWith('.dmg')),
    all,
  }
}

function readCache(): LatestRelease | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null
    return entry.data
  } catch {
    return null
  }
}

function writeCache(data: LatestRelease): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() } satisfies CacheEntry),
    )
  } catch {
    // ignore quota errors
  }
}

export interface UseLatestReleaseResult {
  release: LatestRelease | null
  loading: boolean
  error: string | null
}

export function useLatestRelease(): UseLatestReleaseResult {
  const [release, setRelease] = useState<LatestRelease | null>(() => readCache())
  const [loading, setLoading] = useState<boolean>(release === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (release) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`GitHub API ${res.status}`)
        const json = (await res.json()) as RawRelease
        const data: LatestRelease = {
          version: (json.tag_name ?? json.name ?? 'latest').replace(/^v/, ''),
          publishedAt: json.published_at ?? '',
          htmlUrl: json.html_url ?? `https://github.com/${REPO}/releases/latest`,
          assets: classifyAssets(json.assets ?? []),
        }
        if (cancelled) return
        writeCache(data)
        setRelease(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'unknown error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [release])

  return { release, loading, error }
}

export const FALLBACK_RELEASES_URL = `https://github.com/${REPO}/releases`

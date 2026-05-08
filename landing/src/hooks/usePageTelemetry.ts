import { useEffect } from 'react'
import { trackPageView } from '../utils/telemetry'

export function usePageTelemetry() {
  useEffect(() => {
    const track = () => {
      trackPageView()
    }

    track()
    window.addEventListener('hashchange', track)
    window.addEventListener('popstate', track)

    return () => {
      window.removeEventListener('hashchange', track)
      window.removeEventListener('popstate', track)
    }
  }, [])
}

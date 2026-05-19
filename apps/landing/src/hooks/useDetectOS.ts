export type DetectedOS = 'windows' | 'mac' | 'linux' | 'unknown'

export function detectOS(userAgent: string = navigator.userAgent): DetectedOS {
  const ua = userAgent.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac') || ua.includes('darwin')) return 'mac'
  if (ua.includes('linux') || ua.includes('x11')) return 'linux'
  return 'unknown'
}

export function osLabel(os: DetectedOS, fallback = 'tu sistema'): string {
  switch (os) {
    case 'windows':
      return 'Windows'
    case 'mac':
      return 'macOS'
    case 'linux':
      return 'Linux'
    default:
      return fallback
  }
}

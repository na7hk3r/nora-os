/**
 * Responsive and accessibility utility functions
 * Helps ensure consistent responsive behavior and a11y compliance
 */

export const BREAKPOINTS = {
  mobile: '640px', // sm
  tablet: '768px', // md
  desktop: '1024px', // lg
} as const

/**
 * Media query helper for responsive classes
 */
export const RESPONSIVE = {
  /**
   * Mobile-first: applies on mobile and up
   */
  mobile: '', // default

  /**
   * Tablet and up (768px)
   */
  tablet: 'md:',

  /**
   * Desktop and up (1024px)
   */
  desktop: 'lg:',

  /**
   * Large desktop (1280px)
   */
  largeDesktop: 'xl:',
}

/**
 * Common responsive grid configurations
 */
export const RESPONSIVE_GRID = {
  /**
   * Single column on mobile, 2 columns on tablet, 3+ on desktop
   */
  auto: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',

  /**
   * Single column on mobile, 2 columns on tablet+
   */
  twoCol: 'grid-cols-1 md:grid-cols-2',

  /**
   * Single column on mobile, 3 columns on desktop+
   */
  threeCol: 'grid-cols-1 lg:grid-cols-3',

  /**
   * Flexible columns that wrap (good for widget layouts)
   */
  flexible: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}

/**
 * Common responsive padding/margin
 */
export const RESPONSIVE_SPACING = {
  /**
   * Padding: 2 on mobile, 4 on tablet, 6 on desktop
   */
  padding: 'p-2 md:p-4 lg:p-6',

  /**
   * Padding horizontal: 3 on mobile, 6 on desktop
   */
  paddingHorizontal: 'px-3 md:px-6',

  /**
   * Padding vertical: 3 on mobile, 6 on desktop
   */
  paddingVertical: 'py-3 md:py-6',

  /**
   * Gap: 3 on mobile, 4 on tablet, 6 on desktop
   */
  gap: 'gap-3 md:gap-4 lg:gap-6',
}

/**
 * Common responsive font sizes
 */
export const RESPONSIVE_TEXT = {
  /**
   * Title: text-lg on mobile, text-2xl on desktop
   */
  title: 'text-lg md:text-xl lg:text-2xl',

  /**
   * Subtitle: text-base on mobile, text-lg on desktop
   */
  subtitle: 'text-base md:text-lg',

  /**
   * Body: text-sm on mobile, text-base on desktop
   */
  body: 'text-sm md:text-base',
}

/**
 * Accessibility helpers
 */
export const A11Y = {
  /**
   * Screen reader only (visually hidden but available to screen readers)
   */
  srOnly: 'sr-only',

  /**
   * Focus ring for keyboard navigation
   */
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',

  /**
   * High contrast focus ring (for dark mode)
   */
  focusRingDark: 'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 focus:ring-blue-400',

  /**
   * Hidden state for interactive elements
   */
  ariaBusy: 'aria-busy',

  /**
   * Disabled state
   */
  ariaDisabled: 'aria-disabled',
}

/**
 * Utility to get responsive class based on screen size
 * @param mobile - Class for mobile
 * @param tablet - Class for tablet
 * @param desktop - Class for desktop
 * @returns Combined responsive classes
 */
export function responsive(
  mobile: string,
  tablet?: string,
  desktop?: string,
): string {
  const classes = [mobile]
  if (tablet) classes.push(`md:${tablet}`)
  if (desktop) classes.push(`lg:${desktop}`)
  return classes.join(' ')
}

/**
 * Check if screen is mobile size (useful for mobile-specific logic)
 * Note: This should be called on client side only
 */
export function isMobileScreen(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 640
}

/**
 * Debounced resize handler for responsive behavior.
 * Returns an unsubscribe function; returns a noop when window is unavailable.
 */
export function useResponsiveCheck(
  callback: (isMobile: boolean) => void,
  breakpoint = 640,
): () => void {
  if (typeof window === 'undefined') return () => {}

  let timeout: ReturnType<typeof setTimeout>
  const handleResize = () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      callback(window.innerWidth < breakpoint)
    }, 150) // Debounce 150ms
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}

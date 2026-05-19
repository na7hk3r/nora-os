/**
 * Animation utility classes and configurations
 * Ensures consistent motion and transitions across the app
 */

export const ANIMATION_CLASSES = {
  /**
   * Fade in from transparent
   * Usage: className="animate-fadeIn"
   */
  fadeIn: 'animate-in fade-in duration-300',

  /**
   * Slide in from top
   */
  slideInTop: 'animate-in slide-in-from-top-2 duration-300',

  /**
   * Slide in from bottom
   */
  slideInBottom: 'animate-in slide-in-from-bottom-2 duration-300',

  /**
   * Scale in from center
   */
  scaleIn: 'animate-in zoom-in-95 duration-200',

  /**
   * Pulse/highlight effect
   */
  pulse: 'animate-pulse',

  /**
   * Spin/loading effect
   */
  spin: 'animate-spin',
}

/**
 * Tailwind CSS animation keyframes to add to global styles
 * Add these to your Tailwind config or global.css
 */
export const TAILWIND_ANIMATION_KEYFRAMES = `
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInDown {
  from {
    transform: translateY(-0.5rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInUp {
  from {
    transform: translateY(0.5rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
`

/**
 * Hover and transition utilities for interactive elements
 */
export const INTERACTION_CLASSES = {
  /**
   * Smooth transition for color/background changes
   */
  smoothTransition: 'transition-colors duration-200 ease-out',

  /**
   * Hover state lift effect
   */
  hoverLift: 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ease-out',

  /**
   * Button-like interaction (scale + highlight)
   */
  buttonInteraction: 'active:scale-95 transition-transform duration-100',

  /**
   * Disabled state styling
   */
  disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
}

/**
 * Spacing tokens for consistent gaps
 * Usage: use gap-internal for internal component spacing, gap-section for section spacing
 */
export const SPACING = {
  /**
   * Internal component spacing (between items within a module)
   */
  internal: 'gap-3',

  /**
   * Section spacing (between major sections)
   */
  section: 'gap-4',

  /**
   * Major spacing (between primary layout sections)
   */
  major: 'gap-6',
}

/**
 * Fade in animation CSS
 * Used as: <div className={fadeInAnimation()} />
 */
export function fadeInAnimation(duration = 300): string {
  return `animate-fadeIn` // Relies on Tailwind definitions
}

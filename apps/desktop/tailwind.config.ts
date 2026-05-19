/** @type {import('tailwindcss').Config} */
export default {
  content: {
    relative: true,
    files: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  },
  theme: {
    extend: {
      fontFamily: {
        /**
         * Display: stack geométrico de sistema. La identidad oficial pide
         * "Nora Sans" (custom no pública) y como sustituto Space Grotesk; la
         * CSP del app no permite cargar fuentes externas, así que se prioriza
         * un fallback geométrico con letras como Inter Display / SF Pro Display.
         */
        display: [
          'Inter Display',
          'SF Pro Display',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        /* Colores con CSS vars — soportan modificadores de opacidad (bg-surface/50) */
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          light: 'rgb(var(--color-surface-light) / <alpha-value>)',
          lighter: 'rgb(var(--color-surface-lighter) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light) / <alpha-value>)',
        },
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        /** Texto principal según tema (claro en dark, marrón cálido en light). */
        foreground: 'rgb(var(--color-text) / <alpha-value>)',
        /* Colores estáticos (no temáticos) */
        success: {
          DEFAULT: '#22c55e',
          light: '#4ade80',
          dark: '#16a34a',
        },
        warning: {
          DEFAULT: '#eab308',
          light: '#facc15',
          dark: '#ca8a04',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
        },
        'xp-bronze': '#cd7f32',
        'xp-silver': '#c0c0c0',
        'xp-gold': '#f5c542',
        'xp-platinum': '#5ed4ff',
        chart: {
          grid: '#334155',
          axis: '#94a3b8',
          tooltipBg: '#1e1e2e',
          tooltipBorder: '#334155',
          weight: '#f97316',
          mealGood: '#22c55e',
          mealWarn: '#eab308',
          mealBad: '#ef4444',
          smoking: '#f97316',
        },
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          from: { transform: 'translateX(-8px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 4px 0 rgba(249,115,22,0.35)' },
          '50%': { boxShadow: '0 0 12px 2px rgba(249,115,22,0.55)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% center' },
          to: { backgroundPosition: '200% center' },
        },
        scoreReveal: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        popIn: {
          '0%': { transform: 'scale(0.92) translateY(6px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249,115,22,0)' },
          '50%': { boxShadow: '0 0 24px 4px rgba(249,115,22,0.35)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out both',
        'slide-up': 'slideUp 0.25s ease-out both',
        'slide-right': 'slideRight 0.2s ease-out both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'score-reveal': 'scoreReveal 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'pop-in': 'popIn 0.35s ease-out both',
        'glow-once': 'glowPulse 1.4s ease-in-out 1',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      /**
       * Escala tipográfica semántica (Etapa 5.4).
       * Reemplaza los `text-[10px]/[11px]` ad-hoc dispersos por tokens estables.
       *  - micro:    badges, kbd, eyebrow labels MUY pequeños
       *  - caption:  metadata, timestamps, hints
       *  - body-sm:  texto secundario / muted
       *  - body:     texto principal de UI
       *  - title:    títulos de sección dentro de cards
       *  - display:  headers de página
       */
      fontSize: {
        micro: ['0.625rem', { lineHeight: '0.875rem' }],
        caption: ['0.6875rem', { lineHeight: '1rem' }],
        'body-sm': ['0.75rem', { lineHeight: '1.125rem' }],
        body: ['0.875rem', { lineHeight: '1.35rem' }],
        title: ['1rem', { lineHeight: '1.4rem' }],
        display: ['1.25rem', { lineHeight: '1.6rem' }],
      },
      /**
       * Tracking semántico (Etapa 5.4).
       *  - eyebrow:  uppercase labels (lo que antes era tracking-[0.18em]/[0.2em])
       *  - label:    UI secundaria sutil (antes tracking-[0.14em])
       */
      letterSpacing: {
        eyebrow: '0.18em',
        label: '0.14em',
      },
    },
  },
  plugins: [],
}

// Reformado: nuevas keyframes (gradientShift, glowPulse, marquee) y boxShadow `glow` accent.
import type { Config } from 'tailwindcss'

/**
 * Paleta inspirada en el app principal (Nora OS).
 * Tokens replicados a través de CSS vars para soportar dark/light toggle.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // ⚠️ NOTA: `base` está expuesto como color (`bg-base`, `text-base`).
        // Eso significa que `text-base` también genera `color: rgb(var(--color-base))`,
        // entrando en CONFLICTO con la utilidad de font-size `text-base`.
        // En la práctica el color gana cuando aparece en breakpoint (md:text-base).
        // ➜ Para tamaño de fuente usar `text-[1rem]` (arbitrary) en vez de `text-base`.
        base: 'rgb(var(--color-base) / <alpha-value>)',
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
        foreground: 'rgb(var(--color-text) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--color-glow) / 0.2), 0 14px 50px -10px rgb(var(--color-glow) / 0.45)',
        'glow-sm':
          '0 0 0 1px rgb(var(--color-glow) / 0.15), 0 6px 24px -6px rgb(var(--color-glow) / 0.35)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.05)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out both',
        'slide-up': 'slideUp 0.4s ease-out both',
        floaty: 'floaty 4s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease-in-out infinite',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config

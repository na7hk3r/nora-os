import type { ReactNode } from 'react'

interface SectionProps {
  id?: string
  title?: string
  eyebrow?: string
  description?: string
  children: ReactNode
  className?: string
  /** Centra el header. Default true. */
  centered?: boolean
}

export function Section({
  id,
  title,
  eyebrow,
  description,
  children,
  className = '',
  centered = true,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:scroll-mt-24 sm:px-6 sm:py-20 md:px-8 md:py-28 ${className}`}
    >
      {(title || eyebrow || description) && (
        <header className={`mb-10 md:mb-16 ${centered ? 'text-left sm:text-center' : ''}`}>
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-widest text-accent mb-3">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground text-balance sm:text-4xl md:text-5xl">
              {title}
            </h2>
          )}
          {description && (
            <p
              className={`mt-5 text-[1rem] text-muted leading-relaxed text-pretty sm:text-lg ${
                centered ? 'max-w-2xl sm:mx-auto' : 'max-w-2xl'
              }`}
            >
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  )
}

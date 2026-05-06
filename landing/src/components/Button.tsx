import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  as?: 'button'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

interface AnchorProps {
  href: string
  variant?: Variant
  size?: Size
  as: 'a'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
  className?: string
  target?: string
  rel?: string
  download?: string | boolean
  onClick?: MouseEventHandler<HTMLAnchorElement>
  ['aria-label']?: string
  ['aria-disabled']?: boolean
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-[1rem]',
  lg: 'px-7 py-3.5 text-lg',
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent hover:bg-accent-light text-white shadow-lg shadow-accent/30 hover:shadow-accent/40',
  secondary:
    'bg-surface-light hover:bg-surface-lighter text-foreground border border-border',
  ghost: 'bg-transparent hover:bg-surface-light text-foreground',
}

const baseClasses =
  'inline-flex max-w-full items-center justify-center gap-2 whitespace-normal rounded-lg text-center font-medium leading-snug transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base disabled:opacity-50 disabled:cursor-not-allowed'

export function Button(props: ButtonProps | AnchorProps) {
  const { variant = 'primary', size = 'md', leftIcon, rightIcon, children, className = '' } = props
  const cls = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`

  if ('as' in props && props.as === 'a') {
    const { href, target, rel, download, onClick } = props
    const ariaDisabled = props['aria-disabled']
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        download={download as string | undefined}
        onClick={onClick}
        className={cls}
        aria-label={props['aria-label']}
        aria-disabled={ariaDisabled}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </a>
    )
  }

  const { variant: _v, size: _s, leftIcon: _l, rightIcon: _r, className: _c, ...rest } = props as ButtonProps
  void _v
  void _s
  void _l
  void _r
  void _c
  return (
    <button className={cls} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}

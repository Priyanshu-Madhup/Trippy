import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-ink shadow-soft hover:opacity-90',
        secondary: 'bg-surface text-ink border border-line shadow-soft hover:bg-surface-2',
        soft: 'bg-surface-2 text-ink hover:bg-surface-3',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        danger: 'bg-danger text-white hover:opacity-90',
        link: 'text-ink underline-offset-4 hover:underline px-0',
        glass: 'bg-white/15 text-white backdrop-blur-md border border-white/20 hover:bg-white/25',
      },
      size: {
        sm: 'h-9 rounded-full px-3.5 text-[13px] [&_svg]:size-4',
        md: 'h-11 rounded-full px-5 text-sm [&_svg]:size-[18px]',
        lg: 'h-13 rounded-full px-6 text-[15px] [&_svg]:size-5',
        icon: 'size-10 rounded-full [&_svg]:size-[18px]',
        'icon-sm': 'size-8 rounded-full [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
})

import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  subtitle?: string
  /** `hero` is a large centred title; `compact` is a small left-aligned one. */
  variant?: 'hero' | 'compact'
}

export function PageHeader({ title, subtitle, variant = 'hero' }: PageHeaderProps) {
  const hero = variant === 'hero'
  return (
    <header className={cn('mb-6', hero && 'pt-8 pb-4 text-center')}>
      <h1 className={cn('font-semibold tracking-tight text-gold', hero ? 'text-4xl' : 'text-base')}>{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  )
}

import type { ReactNode } from 'react'

export function ScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6 text-center text-muted-foreground">{children}</div>
  )
}

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

type HomeHeroProps = {
  title: string
  subtitle: string
  /** Used for the avatar initial */
  name?: string
}

/** Full-bleed picture at the top of the home page, with account/sign-out on it and a frosted greeting panel at the bottom. */
export function HomeHero({ title, subtitle, name }: HomeHeroProps) {
  const { signOut } = useAuth()
  const initial = (name?.trim()[0] ?? '?').toUpperCase()

  return (
    <header className="relative isolate -mx-4 -mt-[calc(env(safe-area-inset-top)+1.5rem)] mb-5 flex h-[40dvh] min-h-72 flex-col justify-between overflow-hidden rounded-b-3xl p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <img
        src="/homepage-hero.jpg"
        alt=""
        className="absolute inset-0 -z-10 size-full object-cover object-[50%_45%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[oklch(0.17_0.012_285)]/50 via-transparent to-[oklch(0.17_0.012_285)]/40" />

      <div className="flex items-center justify-between">
        <span
          aria-label={name ? `Signed in as ${name}` : 'Account'}
          className="flex size-10 items-center justify-center rounded-full bg-white/25 text-base font-semibold text-white ring-1 ring-white/40 backdrop-blur-md"
        >
          {initial}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="h-9 rounded-full bg-white/20 px-3 text-white ring-1 ring-white/30 backdrop-blur-md hover:bg-white/30 hover:text-white dark:hover:bg-white/30"
        >
          <LogOut /> Log out
        </Button>
      </div>

      <div className="rounded-2xl bg-black/35 px-4 py-3 text-white ring-1 ring-white/20 backdrop-blur-xl">
        <h1 className="text-xl font-semibold tracking-tight text-[oklch(0.88_0.12_100)]">{title}</h1>
        <p className="text-sm text-white/80">{subtitle}</p>
      </div>
    </header>
  )
}

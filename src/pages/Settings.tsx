import { LogOut } from 'lucide-react'
import { InviteCodeCard } from '@/components/InviteCodeCard'
import { MemberList } from '@/components/MemberList'
import { NotificationsCard } from '@/components/NotificationsCard'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { useGroup } from '@/lib/group-context'

export function Settings() {
  const { session, signOut } = useAuth()
  const { group, members, timezone } = useGroup()

  return (
    <>
      <PageHeader title="Settings" variant="compact" />
      <div className="flex flex-col gap-4">
        <section className="pt-8 pb-6 text-center">
          <p className="text-sm text-muted-foreground">Your space</p>
          <h2 className="text-4xl font-semibold tracking-tight text-gold">{group.name}</h2>
        </section>
        <InviteCodeCard code={group.invite_code} groupName={group.name} />
        <MemberList members={members} currentUserId={session?.user.id} />
        <NotificationsCard />
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed in as {session?.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Reminder times use your timezone: <span className="text-foreground">{timezone}</span>
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

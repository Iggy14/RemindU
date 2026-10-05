import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Member } from '@/lib/groups'

type MemberListProps = {
  members: Member[]
  currentUserId?: string
}

export function MemberList({ members, currentUserId }: MemberListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          {members.length === 1 ? 'Just you so far' : `${members.length} people share this space`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase"
              >
                {m.display_name.charAt(0)}
              </span>
              <span className="flex-1 truncate">{m.display_name}</span>
              {m.user_id === currentUserId && <Badge variant="secondary">You</Badge>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

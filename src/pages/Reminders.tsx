import { PageHeader } from '@/components/PageHeader'

export function Reminders() {
  return (
    <>
      <PageHeader title="Reminders" subtitle="Everything you're tracking" />
      <p className="text-muted-foreground">No reminders yet.</p>
    </>
  )
}

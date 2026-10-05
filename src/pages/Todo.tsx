import { PageHeader } from '@/components/PageHeader'

export function Todo() {
  return (
    <>
      <PageHeader title="To-do" subtitle="Things that need your attention" />
      <p className="text-muted-foreground">Nothing needs attention yet.</p>
    </>
  )
}

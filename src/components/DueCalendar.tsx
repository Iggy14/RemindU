import { addDays, addMonths, endOfMonth, format, getDay, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDate, parseDate } from '@/ruleEngine/dates'
import type { DateString } from '@/ruleEngine'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type DueCalendarProps = {
  /** Due dates to mark with a dot (duplicates are fine, one dot per day) */
  dueDates: DateString[]
  today: DateString
}

/** Month grid with prev/next arrows; a dot marks each day that has a reminder. */
export function DueCalendar({ dueDates, today }: DueCalendarProps) {
  const [offset, setOffset] = useState(0)
  const first = addMonths(startOfMonth(parseDate(today)), offset)
  const lastDay = endOfMonth(first).getDate()
  const marked = new Set(dueDates)

  // Leading blanks so day 1 lands on its weekday column.
  const cells: (DateString | null)[] = [
    ...Array.from({ length: getDay(first) }, () => null),
    ...Array.from({ length: lastDay }, (_, i) => formatDate(addDays(first, i))),
  ]

  return (
    <Card size="sm" className="h-72">
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-center justify-between">
          <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => setOffset(offset - 1)}>
            <ChevronLeft />
          </Button>
          <p className="font-heading text-sm font-medium text-gold">{format(first, 'MMMM yyyy')}</p>
          <Button size="icon-sm" variant="ghost" aria-label="Next month" onClick={() => setOffset(offset + 1)}>
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7 content-evenly text-center text-sm">
          {cells.map((date, i) =>
            date === null ? (
              <span key={i} />
            ) : (
              <div key={date} className="flex flex-col items-center justify-center gap-0.5">
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full',
                    date === today && 'bg-primary text-primary-foreground',
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                <span className={cn('size-1.5 rounded-full', marked.has(date) ? 'bg-gold' : 'bg-transparent')} />
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  )
}

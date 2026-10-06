import { z } from 'zod'
import { CATEGORIES } from './draft.js'

/**
 * What the model may emit. It only EXTRACTS what the user said; it never works out a calendar date.
 * Dates arrive as parts ("20 Jan", "the 5th", "in 2 weeks") and `resolveDate` turns them into real dates.
 * Fields are permissive on purpose (plain numbers, nullable): code validates and asks for what's missing.
 */
export const dateSpecSchema = z.object({
  year: z.number().nullable().describe('Only if the user said a year'),
  month: z.number().nullable().describe('1-12, only if the user said a month'),
  day: z.number().nullable().describe('Day of month, 1-31, only if the user said it'),
  inAmount: z
    .number()
    .nullable()
    .describe('For relative dates: "in 2 weeks" = 2, "3 months ago" = -3. Do not convert to a calendar date'),
  inUnit: z.enum(['day', 'week', 'month', 'year']).nullable().describe('Unit for inAmount'),
})
export type DateSpec = z.infer<typeof dateSpecSchema>

export const aiReminderSchema = z.object({
  title: z.string().nullable().describe('Short name, e.g. "Netflix", "Passport expiry". Null if unclear'),
  category: z.enum(CATEGORIES).nullable().describe('Best fit; null if unsure'),
  shared: z
    .boolean()
    .nullable()
    .describe('true if it is for both partners / the household, false if just for the user, null if not stated'),
  kind: z
    .enum(['once', 'recurring', 'after_previous'])
    .nullable()
    .describe(
      'once = a single deadline/expiry date; recurring = repeats every N days/weeks/months/years (bills, subscriptions, chores); after_previous = due N days after it was last done',
    ),
  date: dateSpecSchema
    .nullable()
    .describe(
      'once: the due/expiry date. recurring: a date it falls on (monthly: just the day; yearly: month and day). after_previous: when it was last done',
    ),
  unit: z.enum(['day', 'week', 'month', 'year']).nullable().describe('recurring only: day, week, month or year'),
  interval: z
    .number()
    .nullable()
    .describe('recurring only: every N units. "every month" = 1, "every 2 weeks" = 2 weeks, "quarterly" = 3 months'),
  days: z.number().nullable().describe('after_previous only: due again N days after last done'),
  reminderDaysBefore: z
    .array(z.number())
    .nullable()
    .describe('Only if the user asked when to be reminded, e.g. "a week before" = [7]. Otherwise null'),
  followUpQuestion: z
    .string()
    .nullable()
    .describe('One short question for the user if something REQUIRED is missing or unclear. Otherwise null'),
})
export type AiReminder = z.infer<typeof aiReminderSchema>

/** Everything one chat message can turn into: a new reminder, a change to an existing one, or a question. */
export const aiMessageSchema = aiReminderSchema.extend({
  intent: z
    .enum(['add', 'edit', 'ask'])
    .describe(
      'add = the user wants a NEW reminder; edit = change an EXISTING reminder from the list; ask = a question about their reminders, or anything else',
    ),
  targetNumber: z
    .number()
    .nullable()
    .describe('edit only: the number of the existing reminder in the list. Null if unclear (then ask which one)'),
  answer: z
    .string()
    .nullable()
    .describe('ask only: a brief answer based ONLY on the list of reminders given. Never invent reminders or dates'),
})
export type AiMessage = z.infer<typeof aiMessageSchema>

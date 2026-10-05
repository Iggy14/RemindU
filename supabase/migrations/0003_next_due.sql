-- RemindU 0003: store the current due date on each responsibility.
-- Computed by the rule engine (src/ruleEngine) whenever an item is created, edited, or marked done.
-- NULL once an item is finished (status 'done').

alter table public.responsibilities add column next_due date;

create index responsibilities_next_due_idx
  on public.responsibilities (next_due) where status = 'active';

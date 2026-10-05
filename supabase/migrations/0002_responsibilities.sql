-- RemindU 0002: responsibilities, reminder offsets/events, push subscriptions, RLS.
-- Requires 0001. Run in the Supabase SQL Editor.
--
-- Visibility: owner_id NULL = shared with the whole group; owner_id set = private to that user.
-- The scheduler (/api/send-reminders) uses the service role key, which bypasses RLS.

-- ---------------------------------------------------------------- tables

create table public.responsibilities (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  owner_id   uuid references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title      text not null check (char_length(title) between 1 and 200),
  category   text not null default 'custom'
             check (category in ('subscription', 'bill', 'expiry', 'deadline', 'custom')),
  -- Rule shape is defined by src/ruleEngine/types.ts and validated client-side (zod); only require a type here.
  rule       jsonb not null check (rule ? 'type'),
  status     text not null default 'active' check (status in ('active', 'done', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index responsibilities_group_id_idx on public.responsibilities (group_id);
create index responsibilities_owner_id_idx on public.responsibilities (owner_id);

create table public.reminder_offsets (
  id                 uuid primary key default gen_random_uuid(),
  responsibility_id  uuid not null references public.responsibilities (id) on delete cascade,
  offset_days        integer not null check (offset_days >= 0),
  time_of_day        time not null default '09:00'
);

create index reminder_offsets_responsibility_id_idx on public.reminder_offsets (responsibility_id);

-- Materialised by the rule engine (planReminders) so the scheduler is a simple query.
create table public.reminder_events (
  id                 uuid primary key default gen_random_uuid(),
  responsibility_id  uuid not null references public.responsibilities (id) on delete cascade,
  offset_id          uuid references public.reminder_offsets (id) on delete set null,
  due_date           date not null,
  fire_at            timestamptz not null,
  sent_at            timestamptz,
  done_at            timestamptz
);

create index reminder_events_responsibility_id_idx on public.reminder_events (responsibility_id);
create index reminder_events_pending_idx on public.reminder_events (fire_at) where sent_at is null;

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- keep updated_at honest
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger responsibilities_touch_updated_at
  before update on public.responsibilities
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------ RLS

alter table public.responsibilities  enable row level security;
alter table public.reminder_offsets  enable row level security;
alter table public.reminder_events   enable row level security;
alter table public.push_subscriptions enable row level security;

-- A responsibility is visible to its owner (private) or to every member of its group (shared).
create policy "responsibilities: read visible"
  on public.responsibilities for select to authenticated
  using (public.is_group_member(group_id) and (owner_id is null or owner_id = auth.uid()));

-- You can only create items in your own group, as yourself, and only private-to-you or shared.
create policy "responsibilities: insert own"
  on public.responsibilities for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_group_member(group_id)
    and (owner_id is null or owner_id = auth.uid())
  );

-- Update/delete what you can see. The check stops moving an item into someone else's private space or another group.
create policy "responsibilities: update visible"
  on public.responsibilities for update to authenticated
  using (public.is_group_member(group_id) and (owner_id is null or owner_id = auth.uid()))
  with check (public.is_group_member(group_id) and (owner_id is null or owner_id = auth.uid()));

create policy "responsibilities: delete visible"
  on public.responsibilities for delete to authenticated
  using (public.is_group_member(group_id) and (owner_id is null or owner_id = auth.uid()));

-- Child tables inherit visibility from the parent: the subquery runs under the caller's RLS,
-- so it only finds responsibilities the caller can already see.
create policy "reminder_offsets: via parent"
  on public.reminder_offsets for all to authenticated
  using (exists (select 1 from public.responsibilities r where r.id = responsibility_id))
  with check (exists (select 1 from public.responsibilities r where r.id = responsibility_id));

create policy "reminder_events: via parent"
  on public.reminder_events for all to authenticated
  using (exists (select 1 from public.responsibilities r where r.id = responsibility_id))
  with check (exists (select 1 from public.responsibilities r where r.id = responsibility_id));

-- Push subscriptions are strictly per-user.
create policy "push_subscriptions: own"
  on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

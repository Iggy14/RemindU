-- RemindU 0001: profiles, groups, group membership, RLS.
-- Run in the Supabase SQL Editor (or `supabase db push`). Safe to read top to bottom.

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now()
);

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_id_idx on public.group_members (user_id);

-- ------------------------------------------------- profile on sign-up

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------- RLS helper functions
-- security definer so policies can look at group_members without recursing into its own policy.

create function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create function public.shares_group_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  );
$$;

-- ------------------------------------------------------------ RLS

alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- profiles: your own, plus people you share a group with (to show names)
create policy "profiles: read own or group mates"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- groups: members only. No insert/update/delete policies: creation goes through create_group().
create policy "groups: members read"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

-- group_members: see fellow members; you may remove only yourself (leave).
-- No insert policy: joining goes through join_group().
create policy "group_members: read own groups"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy "group_members: leave"
  on public.group_members for delete to authenticated
  using (user_id = auth.uid());

-- ------------------------------------------------- create / join RPCs

create function public.create_group(group_name text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 chars, no 0/O/1/I
  new_code text;
  bytes    bytea;
  result   public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  loop
    bytes := extensions.gen_random_bytes(8);
    new_code := '';
    for i in 0..7 loop
      new_code := new_code || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = new_code);
  end loop;

  insert into public.groups (name, invite_code, created_by)
  values (trim(group_name), new_code, auth.uid())
  returning * into result;

  insert into public.group_members (group_id, user_id) values (result.id, auth.uid());
  return result;
end;
$$;

create function public.join_group(code text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into result from public.groups where invite_code = upper(trim(code));
  if not found then
    raise exception 'Invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id)
  values (result.id, auth.uid())
  on conflict do nothing;
  return result;
end;
$$;

-- ------------------------------------------------- function privileges
-- Postgres grants EXECUTE to PUBLIC by default; lock everything down to signed-in users.

revoke all on function public.handle_new_user()     from public, anon, authenticated;
revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.shares_group_with(uuid) from public, anon;
revoke all on function public.create_group(text)    from public, anon;
revoke all on function public.join_group(text)      from public, anon;

grant execute on function public.is_group_member(uuid)   to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;
grant execute on function public.create_group(text)      to authenticated;
grant execute on function public.join_group(text)        to authenticated;

create extension if not exists pgcrypto;


create type public.user_role as enum (
  'student',
  'teacher'
);


create table public.profiles (

  id uuid primary key
    references auth.users(id)
    on delete cascade,

  email text unique not null,

  full_name text not null,

  role public.user_role not null,

  lrn text unique,

  created_at timestamptz
    not null default now()

);


create table public.announcements (

  id uuid primary key
    default gen_random_uuid(),

  title text not null,

  body text not null,

  created_by uuid not null
    references public.profiles(id)
    on delete cascade,

  created_at timestamptz
    not null default now()

);


create index announcements_created_idx
on public.announcements(created_at desc);


alter table public.profiles
enable row level security;


alter table public.announcements
enable row level security;


create policy
"profiles readable by authenticated users"

on public.profiles

for select

to authenticated

using (true);


create policy
"announcements readable by authenticated users"

on public.announcements

for select

to authenticated

using (true);


create policy
"teachers can create announcements"

on public.announcements

for insert

to authenticated

with check (

  created_by = auth.uid()

  and exists (

    select 1

    from public.profiles p

    where p.id = auth.uid()

    and p.role = 'teacher'

  )

);

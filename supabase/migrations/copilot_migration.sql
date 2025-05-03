-- Run this in your Supabase SQL editor
create table public.auth_sessions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    timestamp timestamptz default now(),
    ip_address text,
    user_agent text,
    location text,
    created_at timestamptz default now()
);

-- Add RLS policies
alter table public.auth_sessions enable row level security;

create policy "Users can only view their own sessions"
    on public.auth_sessions for select
    using (auth.uid() = user_id);
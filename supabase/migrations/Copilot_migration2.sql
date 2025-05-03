-- Create auth_sessions table
create table if not exists public.auth_sessions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    ip_address text,
    user_agent text,
    location text,
    is_current boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create user_profiles table
create table if not exists public.user_profiles (
    id uuid references auth.users primary key,
    email text not null,
    last_sign_in_at timestamptz,
    sign_in_count integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table public.auth_sessions enable row level security;
alter table public.user_profiles enable row level security;

-- Create policies for auth_sessions
create policy "Users can insert their own sessions"
    on public.auth_sessions
    for insert
    with check (auth.uid() = user_id);

create policy "Users can view their own sessions"
    on public.auth_sessions
    for select
    using (auth.uid() = user_id);

-- Create policies for user_profiles
create policy "Users can view their own profile"
    on public.user_profiles
    for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.user_profiles
    for update
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.user_profiles
    for insert
    with check (auth.uid() = id);
create table shared_items (
  id uuid default uuid_generate_v4() primary key,
  item_id uuid not null,
  item_type text not null check (item_type in ('memory', 'file')),
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone,
  is_active boolean default true not null,
  share_token text not null unique
);

-- Add RLS policies
alter table shared_items enable row level security;

create policy "Users can view their own shared items"
  on shared_items for select
  using (auth.uid() = created_by);

create policy "Users can create shared items"
  on shared_items for insert
  with check (auth.uid() = created_by);

create policy "Users can delete their own shared items"
  on shared_items for delete
  using (auth.uid() = created_by);



-- Drop existing policies
drop policy if exists "Users can view their own shared items" on shared_items;
drop policy if exists "Users can create shared items" on shared_items;
drop policy if exists "Users can delete their own shared items" on shared_items;

-- Create new policies
create policy "Public can view shared items"
  on shared_items for select
  using (is_active = true);

create policy "Users can create shared items"
  on shared_items for insert
  with check (auth.uid() = created_by);

create policy "Users can delete their own shared items"
  on shared_items for delete
  using (auth.uid() = created_by);
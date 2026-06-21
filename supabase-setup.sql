-- Run this in the Supabase SQL editor
create table if not exists kv (
  key   text primary key,
  value text not null
);

-- Allow anonymous read/write (app uses anon key)
alter table kv enable row level security;

create policy "anon read"  on kv for select using (true);
create policy "anon write" on kv for insert with check (true);
create policy "anon upsert" on kv for update using (true);

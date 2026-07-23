-- Run this in the Supabase SQL editor
create table if not exists kv (
  key   text primary key,
  value text not null
);

-- Allow anonymous read/write (app uses anon key)
alter table kv enable row level security;

create policy "anon read"   on kv for select using (true);
create policy "anon write"  on kv for insert with check (true);
create policy "anon upsert" on kv for update using (true);

-- Storage policies for the 'attachments' bucket
-- Run these AFTER creating the bucket in the Supabase dashboard (Storage > New bucket > name: attachments, Public: ON)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do update set public = true;

create policy "anon upload"  on storage.objects for insert with check (bucket_id = 'attachments');
create policy "anon update"  on storage.objects for update using (bucket_id = 'attachments');
create policy "anon read"    on storage.objects for select using (bucket_id = 'attachments');
create policy "anon delete"  on storage.objects for delete using (bucket_id = 'attachments');

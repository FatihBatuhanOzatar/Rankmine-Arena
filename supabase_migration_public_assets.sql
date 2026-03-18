-- Create a public storage bucket for arena assets
insert into storage.buckets (id, name, public)
values ('arena-assets', 'arena-assets', true)
on conflict (id) do nothing;

-- Allow public read access
create policy "Public read access"
  on storage.objects for select
  using ( bucket_id = 'arena-assets' );

-- Allow public inserts (MVP: open insert, similar to public submissions)
create policy "Public insert access"
  on storage.objects for insert
  with check ( bucket_id = 'arena-assets' );

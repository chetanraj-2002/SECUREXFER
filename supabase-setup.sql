-- SecureXfer — Full Supabase Setup
-- Paste in SQL Editor → Run
-- Safe to re-run: idempotent with IF NOT EXISTS / DROP IF EXISTS.

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null, display_name text not null,
  created_at timestamptz default now() not null
);
alter table public.profiles enable row level security;
drop policy if exists "p1" on public.profiles;
drop policy if exists "p2" on public.profiles;
drop policy if exists "p3" on public.profiles;
create policy "p1" on public.profiles for select using (auth.uid() = id);
create policy "p2" on public.profiles for update using (auth.uid() = id);
create policy "p3" on public.profiles for insert with check (auth.uid() = id);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  filename text not null, original_name text not null,
  size bigint not null, mime_type text not null default 'application/octet-stream',
  storage_path text not null, encryption_key text not null, iv text not null,
  share_token text unique, share_expires_at timestamptz,
  share_max_downloads integer, share_download_count integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- v1.1 additive columns (safe re-run)
alter table public.files add column if not exists share_password_hash text;
alter table public.files add column if not exists share_recipient_emails text[];
alter table public.files add column if not exists share_otp_code text;
alter table public.files add column if not exists share_message text;
alter table public.files add column if not exists share_view_count integer not null default 0;
alter table public.files add column if not exists share_self_destruct boolean not null default false;

alter table public.files enable row level security;
drop policy if exists "f1" on public.files;
drop policy if exists "f2" on public.files;
drop policy if exists "f3" on public.files;
create policy "f1" on public.files for all using (auth.uid() = owner_id);
create policy "f2" on public.files for select using (share_token is not null);
create policy "f3" on public.files for update using (share_token is not null) with check (share_token is not null);

create or replace function public.set_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists t_updated_at on public.files;
create trigger t_updated_at before update on public.files for each row execute procedure public.set_updated_at();

-- Audit log: every download attempt (success or denied)
create table if not exists public.download_logs (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.files(id) on delete cascade not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  recipient_email text,
  status text not null,                  -- success | denied_email | denied_password | denied_otp | denied_expired | denied_maxed
  user_agent text,
  ip_hint text,
  created_at timestamptz default now() not null
);
create index if not exists idx_download_logs_file on public.download_logs(file_id, created_at desc);
create index if not exists idx_download_logs_owner on public.download_logs(owner_id, created_at desc);

alter table public.download_logs enable row level security;
drop policy if exists "dl1" on public.download_logs;
drop policy if exists "dl2" on public.download_logs;
-- Owners can read their logs
create policy "dl1" on public.download_logs for select using (auth.uid() = owner_id);
-- Anyone may insert (anonymous public share downloads logged)
create policy "dl2" on public.download_logs for insert with check (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('encrypted-files', 'encrypted-files', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "s1" on storage.objects;
drop policy if exists "s2" on storage.objects;
drop policy if exists "s3" on storage.objects;
drop policy if exists "s4" on storage.objects;
create policy "s1" on storage.objects for insert to authenticated
  with check (bucket_id = 'encrypted-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "s2" on storage.objects for select to authenticated
  using (bucket_id = 'encrypted-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "s3" on storage.objects for delete to authenticated
  using (bucket_id = 'encrypted-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "s4" on storage.objects for select to anon, authenticated
  using (bucket_id = 'encrypted-files');

-- Applied 2026-11-22 to project dlhejkmuyyqvjzjxbwbg (eu-central-1).
alter table public.payments
  add column if not exists order_id uuid,
  add column if not exists idempotency_key text,
  add column if not exists environment text check (environment in ('live','sandbox')),
  add column if not exists kind text default 'qr' check (kind in ('qr','invoice')),
  add column if not exists tole_id uuid,
  add column if not exists tole_command_id uuid,
  add column if not exists tole_status text,
  add column if not exists payment_url text,
  add column if not exists qr_token text,
  add column if not exists expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists last_reconciled_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists payments_order_id_key on public.payments(order_id) where order_id is not null;
create unique index if not exists payments_idempotency_key_key on public.payments(idempotency_key) where idempotency_key is not null;
create unique index if not exists payments_tole_id_key on public.payments(tole_id) where tole_id is not null;
create index if not exists payments_open_idx on public.payments(status, created_at) where provider = 'tole';

create table if not exists public.tole_webhook_events (
  webhook_id uuid primary key, event_id uuid, event_type text not null, environment text,
  event_created_at timestamptz, ref jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','processed','failed')),
  error_code text, received_at timestamptz not null default now(), processed_at timestamptz
);
alter table public.tole_webhook_events enable row level security;
create policy "admin read tole webhooks" on public.tole_webhook_events for select to authenticated using (private.is_admin());

create table if not exists public.app_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by text
);
alter table public.app_settings enable row level security;
create policy "admin all app_settings" on public.app_settings for all to authenticated using (private.is_admin()) with check (private.is_admin());

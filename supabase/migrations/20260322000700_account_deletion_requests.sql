-- Phase (h): account deletion requests for store readiness.
-- RPC queues a request + deactivates push tokens. It does NOT wipe auth.users
-- or invent a completed deletion without admin/ops processing.

create type public.account_deletion_status as enum (
  'pending',
  'processing',
  'completed',
  'rejected',
  'cancelled'
);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.account_deletion_status not null default 'pending',
  reason text,
  requested_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  processed_by uuid references public.profiles (id),
  processor_note text,
  constraint account_deletion_reason_len check (
    reason is null or char_length(reason) <= 500
  )
);

create unique index account_deletion_one_open_per_profile
  on public.account_deletion_requests (profile_id)
  where status in ('pending', 'processing');

create index account_deletion_requests_status_idx
  on public.account_deletion_requests (status, requested_at desc);

alter table public.account_deletion_requests enable row level security;

create policy account_deletion_select_own on public.account_deletion_requests
  for select using (
    profile_id = auth.uid() or public.has_role('platform_admin')
  );

-- Inserts only via security definer RPC.
create policy account_deletion_admin_update on public.account_deletion_requests
  for update using (public.has_role('platform_admin'));

create or replace function public.request_account_deletion(
  p_reason text default null
)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.account_deletion_requests;
  v_reason text;
begin
  if auth.uid() is null then
    raise exception 'ACCOUNT_DELETION_AUTH_REQUIRED' using errcode = '42501';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'ACCOUNT_DELETION_REASON_TOO_LONG' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.account_deletion_requests d
    where d.profile_id = auth.uid()
      and d.status in ('pending', 'processing')
  ) then
    raise exception 'ACCOUNT_DELETION_ALREADY_OPEN' using errcode = 'P0001';
  end if;

  -- Soft-block commercial participation while deletion is open:
  -- deactivate push; staff memberships deactivated for this profile.
  update public.device_push_tokens
  set is_active = false
  where profile_id = auth.uid() and is_active = true;

  update public.staff_memberships
  set is_active = false
  where profile_id = auth.uid() and is_active = true;

  insert into public.account_deletion_requests (profile_id, reason, status)
  values (auth.uid(), v_reason, 'pending')
  returning * into r;

  return r;
end;
$$;

create or replace function public.cancel_own_account_deletion_request()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.account_deletion_requests;
begin
  if auth.uid() is null then
    raise exception 'ACCOUNT_DELETION_AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled',
      processed_at = timezone('utc', now()),
      processor_note = coalesce(processor_note, 'user_cancelled')
  where id = (
    select d.id
    from public.account_deletion_requests d
    where d.profile_id = auth.uid() and d.status = 'pending'
    order by d.requested_at desc
    limit 1
  )
  returning * into r;

  if r.id is null then
    raise exception 'ACCOUNT_DELETION_NO_PENDING' using errcode = 'P0001';
  end if;

  return r;
end;
$$;

-- Admin marks processing/completed/rejected. completed does NOT auto-delete
-- auth.users here — that remains an ops step (documented checklist).
create or replace function public.admin_update_account_deletion_request(
  p_request_id uuid,
  p_status public.account_deletion_status,
  p_note text default null
)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.account_deletion_requests;
begin
  if not public.has_role('platform_admin') then
    raise exception 'ACCOUNT_DELETION_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_status not in ('processing', 'completed', 'rejected', 'cancelled') then
    raise exception 'ACCOUNT_DELETION_INVALID_STATUS' using errcode = 'P0001';
  end if;

  update public.account_deletion_requests
  set status = p_status,
      processed_at = case
        when p_status in ('completed', 'rejected', 'cancelled')
          then timezone('utc', now())
        else processed_at
      end,
      processed_by = auth.uid(),
      processor_note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_request_id
  returning * into r;

  if r.id is null then
    raise exception 'ACCOUNT_DELETION_NOT_FOUND' using errcode = 'P0001';
  end if;

  return r;
end;
$$;

revoke all on function public.request_account_deletion(text) from public;
grant execute on function public.request_account_deletion(text) to authenticated;

revoke all on function public.cancel_own_account_deletion_request() from public;
grant execute on function public.cancel_own_account_deletion_request() to authenticated;

revoke all on function public.admin_update_account_deletion_request(uuid, public.account_deletion_status, text) from public;
grant execute on function public.admin_update_account_deletion_request(uuid, public.account_deletion_status, text) to authenticated;

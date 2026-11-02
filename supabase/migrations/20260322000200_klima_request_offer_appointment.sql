-- Klimacın Kapıda — phase (c)
-- Klima talep → teklif → geçici rezervasyon → randevu → ek iş onayı
-- Tutarlar kuruş; zaman damgaları UTC.

create type public.klima_job_type as enum (
  'bakim',
  'montaj',
  'sokme',
  'gaz',
  'ariza'
);

create type public.klima_request_status as enum (
  'draft',
  'open',
  'reserved',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'expired'
);

create type public.klima_offer_status as enum (
  'pending',
  'withdrawn',
  'accepted',
  'rejected',
  'expired'
);

create type public.klima_appointment_status as enum (
  'hold',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'expired'
);

create type public.klima_extra_work_status as enum (
  'proposed',
  'approved',
  'rejected',
  'cancelled'
);

create table public.klima_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  address_id uuid not null references public.customer_addresses (id),
  job_type public.klima_job_type not null,
  description text not null check (char_length(trim(description)) >= 8),
  preferred_window_start timestamptz,
  preferred_window_end timestamptz,
  city_code text not null,
  city_name text not null,
  district_code text not null,
  district_name text not null,
  status public.klima_request_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint klima_requests_window_order check (
    preferred_window_start is null
    or preferred_window_end is null
    or preferred_window_end > preferred_window_start
  )
);

create table public.klima_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.klima_requests (id) on delete cascade,
  business_id uuid not null references public.businesses (id),
  price_kurus integer not null check (price_kurus >= 0),
  -- Teşhis ücreti her zaman açıkça yazılır (0 olabilir, null olamaz).
  diagnosis_fee_kurus integer not null check (diagnosis_fee_kurus >= 0),
  scope_summary text not null check (char_length(trim(scope_summary)) >= 8),
  eta_minutes integer not null check (eta_minutes > 0 and eta_minutes <= 24 * 60),
  proposed_start timestamptz,
  proposed_end timestamptz,
  status public.klima_offer_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (request_id, business_id),
  constraint klima_offers_proposed_window check (
    proposed_start is null
    or proposed_end is null
    or proposed_end > proposed_start
  )
);

create table public.klima_appointments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.klima_requests (id),
  offer_id uuid not null unique references public.klima_offers (id),
  business_id uuid not null references public.businesses (id),
  customer_id uuid not null references public.profiles (id),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status public.klima_appointment_status not null default 'hold',
  hold_expires_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint klima_appointments_window check (scheduled_end > scheduled_start),
  constraint klima_appointments_hold_expiry check (
    status <> 'hold' or hold_expires_at is not null
  )
);

create table public.klima_extra_work_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.klima_appointments (id) on delete cascade,
  description text not null check (char_length(trim(description)) >= 4),
  price_kurus integer not null check (price_kurus >= 0),
  status public.klima_extra_work_status not null default 'proposed',
  proposed_by uuid not null references public.profiles (id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index klima_requests_customer_idx on public.klima_requests (customer_id, created_at desc);
create index klima_requests_open_region_idx on public.klima_requests (status, city_code, district_code);
create index klima_offers_request_idx on public.klima_offers (request_id, status);
create index klima_offers_business_idx on public.klima_offers (business_id, status);
create index klima_appointments_business_idx on public.klima_appointments (business_id, status);
create index klima_extra_work_appointment_idx on public.klima_extra_work_items (appointment_id, status);

create or replace view public.business_klima_stats
with (security_invoker = true)
as
select
  a.business_id,
  count(*) filter (where a.status = 'completed')::integer as completed_count
from public.klima_appointments a
group by a.business_id;

create trigger trg_klima_requests_updated before update on public.klima_requests
for each row execute function public.set_updated_at();

create trigger trg_klima_offers_updated before update on public.klima_offers
for each row execute function public.set_updated_at();

create trigger trg_klima_appointments_updated before update on public.klima_appointments
for each row execute function public.set_updated_at();

create trigger trg_klima_extra_work_updated before update on public.klima_extra_work_items
for each row execute function public.set_updated_at();

-- Region must be open for klima before a request can leave draft.
create or replace function public.assert_klima_region_open(
  p_city_code text,
  p_district_code text
)
returns void
language plpgsql
stable
as $$
begin
  if not exists (
    select 1
    from public.service_regions sr
    where sr.city_code = p_city_code
      and sr.district_code = p_district_code
      and sr.category = 'klima'
      and sr.is_open = true
  ) then
    raise exception 'KLIMA_REGION_CLOSED'
      using errcode = 'P0001',
            message = 'Bu bölgede klima hizmeti açık değil; kesin randevu oluşturulamaz';
  end if;
end;
$$;

create or replace function public.business_can_offer_klima(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    join public.business_category_approvals bca
      on bca.business_id = b.id
     and bca.category = 'klima'
     and bca.status = 'approved'
    where b.id = p_business_id
      and b.is_active = true
  );
$$;

create or replace function public.publish_klima_request(p_request_id uuid)
returns public.klima_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.klima_requests;
begin
  select * into r from public.klima_requests where id = p_request_id for update;
  if not found then
    raise exception 'KLIMA_REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;
  if r.customer_id <> auth.uid() then
    raise exception 'KLIMA_FORBIDDEN' using errcode = '42501';
  end if;
  if r.status <> 'draft' then
    raise exception 'KLIMA_INVALID_STATE' using errcode = 'P0001';
  end if;

  perform public.assert_klima_region_open(r.city_code, r.district_code);

  update public.klima_requests
  set status = 'open'
  where id = r.id
  returning * into r;

  return r;
end;
$$;

create or replace function public.submit_klima_offer(
  p_request_id uuid,
  p_business_id uuid,
  p_price_kurus integer,
  p_diagnosis_fee_kurus integer,
  p_scope_summary text,
  p_eta_minutes integer,
  p_proposed_start timestamptz default null,
  p_proposed_end timestamptz default null
)
returns public.klima_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.klima_requests;
  b public.businesses;
  o public.klima_offers;
begin
  if auth.uid() is null then
    raise exception 'KLIMA_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into r from public.klima_requests where id = p_request_id for update;
  if not found then
    raise exception 'KLIMA_REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;
  if r.status <> 'open' then
    raise exception 'KLIMA_REQUEST_NOT_OPEN' using errcode = 'P0001';
  end if;

  select * into b from public.businesses where id = p_business_id;
  if not found then
    raise exception 'KLIMA_BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;
  if b.owner_profile_id <> auth.uid() and not public.has_role('platform_admin') then
    raise exception 'KLIMA_FORBIDDEN' using errcode = '42501';
  end if;
  if not public.business_can_offer_klima(p_business_id) then
    raise exception 'KLIMA_BUSINESS_NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  if b.city_code <> r.city_code or b.district_code <> r.district_code then
    raise exception 'KLIMA_OUT_OF_AREA' using errcode = 'P0001';
  end if;

  insert into public.klima_offers (
    request_id,
    business_id,
    price_kurus,
    diagnosis_fee_kurus,
    scope_summary,
    eta_minutes,
    proposed_start,
    proposed_end,
    status
  ) values (
    p_request_id,
    p_business_id,
    p_price_kurus,
    p_diagnosis_fee_kurus,
    p_scope_summary,
    p_eta_minutes,
    p_proposed_start,
    p_proposed_end,
    'pending'
  )
  on conflict (request_id, business_id) do update
    set price_kurus = excluded.price_kurus,
        diagnosis_fee_kurus = excluded.diagnosis_fee_kurus,
        scope_summary = excluded.scope_summary,
        eta_minutes = excluded.eta_minutes,
        proposed_start = excluded.proposed_start,
        proposed_end = excluded.proposed_end,
        status = 'pending',
        updated_at = timezone('utc', now())
  returning * into o;

  return o;
end;
$$;

-- Atomic accept: temporary hold reservation; other pending offers rejected.
create or replace function public.accept_klima_offer(
  p_offer_id uuid,
  p_hold_minutes integer default 15
)
returns public.klima_appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.klima_offers;
  r public.klima_requests;
  a public.klima_appointments;
  v_start timestamptz;
  v_end timestamptz;
  v_hold timestamptz;
begin
  if auth.uid() is null then
    raise exception 'KLIMA_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_hold_minutes < 5 or p_hold_minutes > 60 then
    raise exception 'KLIMA_INVALID_HOLD' using errcode = 'P0001';
  end if;

  select * into o from public.klima_offers where id = p_offer_id for update;
  if not found then
    raise exception 'KLIMA_OFFER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if o.status <> 'pending' then
    raise exception 'KLIMA_OFFER_NOT_PENDING' using errcode = 'P0001';
  end if;

  select * into r from public.klima_requests where id = o.request_id for update;
  if r.customer_id <> auth.uid() then
    raise exception 'KLIMA_FORBIDDEN' using errcode = '42501';
  end if;
  if r.status <> 'open' then
    raise exception 'KLIMA_REQUEST_NOT_OPEN' using errcode = 'P0001';
  end if;

  perform public.assert_klima_region_open(r.city_code, r.district_code);

  v_start := coalesce(o.proposed_start, timezone('utc', now()) + make_interval(mins => o.eta_minutes));
  v_end := coalesce(o.proposed_end, v_start + interval '2 hours');
  v_hold := timezone('utc', now()) + make_interval(mins => p_hold_minutes);

  update public.klima_offers
  set status = 'accepted'
  where id = o.id;

  update public.klima_offers
  set status = 'rejected'
  where request_id = r.id
    and id <> o.id
    and status = 'pending';

  update public.klima_requests
  set status = 'reserved'
  where id = r.id;

  insert into public.klima_appointments (
    request_id,
    offer_id,
    business_id,
    customer_id,
    scheduled_start,
    scheduled_end,
    status,
    hold_expires_at
  ) values (
    r.id,
    o.id,
    o.business_id,
    r.customer_id,
    v_start,
    v_end,
    'hold',
    v_hold
  )
  returning * into a;

  return a;
end;
$$;

create or replace function public.confirm_klima_appointment(p_appointment_id uuid)
returns public.klima_appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.klima_appointments;
begin
  select * into a from public.klima_appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'KLIMA_APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if a.customer_id <> auth.uid() then
    raise exception 'KLIMA_FORBIDDEN' using errcode = '42501';
  end if;
  if a.status <> 'hold' then
    raise exception 'KLIMA_NOT_ON_HOLD' using errcode = 'P0001';
  end if;
  if a.hold_expires_at is not null and a.hold_expires_at < timezone('utc', now()) then
    update public.klima_appointments set status = 'expired' where id = a.id;
    update public.klima_requests set status = 'expired' where id = a.request_id;
    raise exception 'KLIMA_HOLD_EXPIRED' using errcode = 'P0001';
  end if;

  update public.klima_appointments
  set status = 'confirmed',
      confirmed_at = timezone('utc', now()),
      hold_expires_at = null
  where id = a.id
  returning * into a;

  update public.klima_requests
  set status = 'confirmed'
  where id = a.request_id;

  return a;
end;
$$;

create or replace function public.expire_klima_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
begin
  with expired as (
    update public.klima_appointments
    set status = 'expired'
    where status = 'hold'
      and hold_expires_at < timezone('utc', now())
    returning request_id, offer_id
  ),
  req as (
    update public.klima_requests r
    set status = 'expired'
    from expired e
    where r.id = e.request_id
      and r.status = 'reserved'
    returning r.id
  )
  select count(*)::integer into n from expired;
  return n;
end;
$$;

create or replace function public.decide_klima_extra_work(
  p_item_id uuid,
  p_approve boolean,
  p_note text default null
)
returns public.klima_extra_work_items
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.klima_extra_work_items;
  a public.klima_appointments;
begin
  select * into item from public.klima_extra_work_items where id = p_item_id for update;
  if not found then
    raise exception 'KLIMA_EXTRA_NOT_FOUND' using errcode = 'P0001';
  end if;
  if item.status <> 'proposed' then
    raise exception 'KLIMA_EXTRA_NOT_PROPOSED' using errcode = 'P0001';
  end if;

  select * into a from public.klima_appointments where id = item.appointment_id;
  if a.customer_id <> auth.uid() then
    raise exception 'KLIMA_FORBIDDEN' using errcode = '42501';
  end if;
  if a.status not in ('confirmed', 'in_progress') then
    raise exception 'KLIMA_INVALID_STATE' using errcode = 'P0001';
  end if;

  update public.klima_extra_work_items
  set status = case when p_approve then 'approved'::public.klima_extra_work_status else 'rejected'::public.klima_extra_work_status end,
      decided_at = timezone('utc', now()),
      decision_note = p_note
  where id = item.id
  returning * into item;

  return item;
end;
$$;

-- Completion blocked while proposed extra work awaits customer decision.
create or replace function public.complete_klima_appointment(p_appointment_id uuid)
returns public.klima_appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.klima_appointments;
begin
  select * into a from public.klima_appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'KLIMA_APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    exists (
      select 1 from public.businesses b
      where b.id = a.business_id and b.owner_profile_id = auth.uid()
    )
    or exists (
      select 1 from public.staff_memberships sm
      where sm.business_id = a.business_id
        and sm.profile_id = auth.uid()
        and sm.is_active
    )
    or public.has_role('platform_admin')
  ) then
    raise exception 'KLIMA_FORBIDDEN' using errcode = '42501';
  end if;

  if a.status not in ('confirmed', 'in_progress') then
    raise exception 'KLIMA_INVALID_STATE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.klima_extra_work_items x
    where x.appointment_id = a.id
      and x.status = 'proposed'
  ) then
    raise exception 'KLIMA_EXTRA_PENDING'
      using errcode = 'P0001',
            message = 'Onay bekleyen ek iş varken randevu tamamlanamaz';
  end if;

  update public.klima_appointments
  set status = 'completed',
      completed_at = timezone('utc', now())
  where id = a.id
  returning * into a;

  update public.klima_requests
  set status = 'completed'
  where id = a.request_id;

  return a;
end;
$$;

alter table public.klima_requests enable row level security;
alter table public.klima_offers enable row level security;
alter table public.klima_appointments enable row level security;
alter table public.klima_extra_work_items enable row level security;

create policy klima_requests_select on public.klima_requests
for select using (
  customer_id = auth.uid()
  or public.has_role('platform_admin')
  or (
    status = 'open'
    and exists (
      select 1
      from public.businesses b
      join public.business_category_approvals bca
        on bca.business_id = b.id
       and bca.category = 'klima'
       and bca.status = 'approved'
      where b.owner_profile_id = auth.uid()
        and b.is_active = true
        and b.city_code = klima_requests.city_code
        and b.district_code = klima_requests.district_code
    )
  )
);

create policy klima_requests_insert_own on public.klima_requests
for insert with check (customer_id = auth.uid());

create policy klima_requests_update_own_draft on public.klima_requests
for update using (
  customer_id = auth.uid()
  and status in ('draft', 'open', 'reserved', 'confirmed', 'cancelled')
);

create policy klima_offers_select on public.klima_offers
for select using (
  exists (
    select 1 from public.klima_requests r
    where r.id = request_id and r.customer_id = auth.uid()
  )
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or public.has_role('platform_admin')
);

create policy klima_appointments_select on public.klima_appointments
for select using (
  customer_id = auth.uid()
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or exists (
    select 1 from public.staff_memberships sm
    where sm.business_id = klima_appointments.business_id
      and sm.profile_id = auth.uid()
      and sm.is_active
  )
  or public.has_role('platform_admin')
);

create policy klima_extra_work_select on public.klima_extra_work_items
for select using (
  exists (
    select 1 from public.klima_appointments a
    where a.id = appointment_id
      and (
        a.customer_id = auth.uid()
        or exists (
          select 1 from public.businesses b
          where b.id = a.business_id and b.owner_profile_id = auth.uid()
        )
        or exists (
          select 1 from public.staff_memberships sm
          where sm.business_id = a.business_id
            and sm.profile_id = auth.uid()
            and sm.is_active
        )
      )
  )
  or public.has_role('platform_admin')
);

create policy klima_extra_work_insert_business on public.klima_extra_work_items
for insert with check (
  proposed_by = auth.uid()
  and exists (
    select 1
    from public.klima_appointments a
    join public.businesses b on b.id = a.business_id
    where a.id = appointment_id
      and a.status in ('confirmed', 'in_progress')
      and (
        b.owner_profile_id = auth.uid()
        or exists (
          select 1 from public.staff_memberships sm
          where sm.business_id = a.business_id
            and sm.profile_id = auth.uid()
            and sm.is_active
        )
      )
  )
);

grant select on public.business_klima_stats to authenticated;
grant execute on function public.publish_klima_request(uuid) to authenticated;
grant execute on function public.submit_klima_offer(uuid, uuid, integer, integer, text, integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.accept_klima_offer(uuid, integer) to authenticated;
grant execute on function public.confirm_klima_appointment(uuid) to authenticated;
grant execute on function public.decide_klima_extra_work(uuid, boolean, text) to authenticated;
grant execute on function public.complete_klima_appointment(uuid) to authenticated;
grant execute on function public.expire_klima_holds() to authenticated;

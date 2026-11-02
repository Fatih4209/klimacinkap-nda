-- Klimacın Kapıda — phase (e)
-- Personel atama + canlı takip
-- Sahte konum/ETA yok. Eski ping "canlı" sayılmaz. İş bitince konum kabulü kesilir.
-- Çifte aktif atama engellenir.

create type public.job_kind as enum (
  'klima_appointment',
  'product_order'
);

create type public.assignment_status as enum (
  'assigned',
  'accepted',
  'en_route',
  'on_site',
  'completed',
  'cancelled'
);

-- Canlı kabul eşiği (saniye): bundan eski received_at canlı değildir.
create or replace function public.live_location_max_age_seconds()
returns integer
language sql
immutable
as $$ select 90 $$;

create table public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  staff_profile_id uuid not null references public.profiles (id),
  assigned_by uuid not null references public.profiles (id),
  kind public.job_kind not null,
  klima_appointment_id uuid references public.klima_appointments (id),
  product_order_id uuid references public.product_orders (id),
  status public.assignment_status not null default 'assigned',
  completion_code text not null check (completion_code ~ '^[0-9]{6}$'),
  assigned_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  en_route_at timestamptz,
  on_site_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint job_assignments_one_target check (
    (
      kind = 'klima_appointment'
      and klima_appointment_id is not null
      and product_order_id is null
    )
    or (
      kind = 'product_order'
      and product_order_id is not null
      and klima_appointment_id is null
    )
  )
);

-- Aynı işe ikinci aktif atama yok (tamamlanan/iptal hariç).
create unique index job_assignments_active_klima_uidx
  on public.job_assignments (klima_appointment_id)
  where klima_appointment_id is not null
    and status not in ('completed', 'cancelled');

create unique index job_assignments_active_order_uidx
  on public.job_assignments (product_order_id)
  where product_order_id is not null
    and status not in ('completed', 'cancelled');

create index job_assignments_staff_idx
  on public.job_assignments (staff_profile_id, status, assigned_at desc);

create index job_assignments_business_idx
  on public.job_assignments (business_id, status, assigned_at desc);

create table public.staff_location_pings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.job_assignments (id) on delete cascade,
  staff_profile_id uuid not null references public.profiles (id),
  lat double precision not null check (lat >= -90 and lat <= 90),
  lng double precision not null check (lng >= -180 and lng <= 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m >= 0),
  recorded_at timestamptz not null,
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint staff_location_pings_not_future check (
    recorded_at <= timezone('utc', now()) + interval '2 minutes'
  )
);

create index staff_location_pings_assignment_received_idx
  on public.staff_location_pings (assignment_id, received_at desc);

create trigger trg_job_assignments_updated before update on public.job_assignments
for each row execute function public.set_updated_at();

create or replace function public.generate_completion_code()
returns text
language sql
volatile
as $$
  select lpad((floor(random() * 1000000))::int::text, 6, '0');
$$;

create or replace function public.assert_active_staff_member(
  p_business_id uuid,
  p_staff_profile_id uuid
)
returns void
language plpgsql
stable
as $$
begin
  if not exists (
    select 1
    from public.staff_memberships sm
    where sm.business_id = p_business_id
      and sm.profile_id = p_staff_profile_id
      and sm.is_active = true
  ) then
    raise exception 'STAFF_NOT_MEMBER' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.assign_staff_to_klima_appointment(
  p_appointment_id uuid,
  p_staff_profile_id uuid
)
returns public.job_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.klima_appointments;
  j public.job_assignments;
begin
  if auth.uid() is null then
    raise exception 'STAFF_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into a from public.klima_appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'STAFF_JOB_NOT_FOUND' using errcode = 'P0001';
  end if;
  if a.status not in ('confirmed', 'in_progress') then
    raise exception 'STAFF_INVALID_JOB_STATE' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = a.business_id and b.owner_profile_id = auth.uid()
  ) and not public.has_role('platform_admin') then
    raise exception 'STAFF_FORBIDDEN' using errcode = '42501';
  end if;

  perform public.assert_active_staff_member(a.business_id, p_staff_profile_id);

  insert into public.job_assignments (
    business_id, staff_profile_id, assigned_by, kind,
    klima_appointment_id, status, completion_code
  ) values (
    a.business_id, p_staff_profile_id, auth.uid(), 'klima_appointment',
    a.id, 'assigned', public.generate_completion_code()
  )
  returning * into j;

  return j;
exception
  when unique_violation then
    raise exception 'STAFF_ALREADY_ASSIGNED'
      using errcode = 'P0001',
            message = 'Bu işe zaten aktif personel atanmış';
end;
$$;

create or replace function public.assign_staff_to_product_order(
  p_order_id uuid,
  p_staff_profile_id uuid
)
returns public.job_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.product_orders;
  j public.job_assignments;
begin
  if auth.uid() is null then
    raise exception 'STAFF_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into o from public.product_orders where id = p_order_id for update;
  if not found then
    raise exception 'STAFF_JOB_NOT_FOUND' using errcode = 'P0001';
  end if;
  if o.status not in ('accepted', 'out_for_delivery') then
    raise exception 'STAFF_INVALID_JOB_STATE' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = o.business_id and b.owner_profile_id = auth.uid()
  ) and not public.has_role('platform_admin') then
    raise exception 'STAFF_FORBIDDEN' using errcode = '42501';
  end if;

  perform public.assert_active_staff_member(o.business_id, p_staff_profile_id);

  insert into public.job_assignments (
    business_id, staff_profile_id, assigned_by, kind,
    product_order_id, status, completion_code
  ) values (
    o.business_id, p_staff_profile_id, auth.uid(), 'product_order',
    o.id, 'assigned', public.generate_completion_code()
  )
  returning * into j;

  return j;
exception
  when unique_violation then
    raise exception 'STAFF_ALREADY_ASSIGNED'
      using errcode = 'P0001',
            message = 'Bu işe zaten aktif personel atanmış';
end;
$$;

create or replace function public.staff_update_assignment_status(
  p_assignment_id uuid,
  p_status public.assignment_status
)
returns public.job_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  j public.job_assignments;
  allowed boolean := false;
begin
  select * into j from public.job_assignments where id = p_assignment_id for update;
  if not found then
    raise exception 'STAFF_ASSIGNMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if j.staff_profile_id <> auth.uid() then
    raise exception 'STAFF_FORBIDDEN' using errcode = '42501';
  end if;
  if j.status in ('completed', 'cancelled') then
    raise exception 'STAFF_ASSIGNMENT_CLOSED' using errcode = 'P0001';
  end if;

  -- Tamamlama yalnızca completion_code RPC ile.
  if p_status = 'completed' then
    raise exception 'STAFF_USE_COMPLETE_RPC' using errcode = 'P0001';
  end if;

  if j.status = 'assigned' and p_status in ('accepted', 'cancelled') then
    allowed := true;
  elsif j.status = 'accepted' and p_status in ('en_route', 'cancelled') then
    allowed := true;
  elsif j.status = 'en_route' and p_status in ('on_site', 'cancelled') then
    allowed := true;
  elsif j.status = 'on_site' and p_status = 'cancelled' then
    allowed := true;
  end if;

  if not allowed then
    raise exception 'STAFF_INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  update public.job_assignments
  set status = p_status,
      accepted_at = case when p_status = 'accepted' then timezone('utc', now()) else accepted_at end,
      en_route_at = case when p_status = 'en_route' then timezone('utc', now()) else en_route_at end,
      on_site_at = case when p_status = 'on_site' then timezone('utc', now()) else on_site_at end,
      cancelled_at = case when p_status = 'cancelled' then timezone('utc', now()) else cancelled_at end
  where id = j.id
  returning * into j;

  if p_status = 'en_route' and j.kind = 'klima_appointment' then
    update public.klima_appointments
    set status = 'in_progress'
    where id = j.klima_appointment_id
      and status = 'confirmed';
  end if;

  if p_status = 'en_route' and j.kind = 'product_order' then
    update public.product_orders
    set status = 'out_for_delivery'
    where id = j.product_order_id
      and status = 'accepted';
  end if;

  return j;
end;
$$;

create or replace function public.staff_post_location(
  p_assignment_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy_m double precision default null,
  p_recorded_at timestamptz default null
)
returns public.staff_location_pings
language plpgsql
security definer
set search_path = public
as $$
declare
  j public.job_assignments;
  ping public.staff_location_pings;
  v_recorded timestamptz := coalesce(p_recorded_at, timezone('utc', now()));
begin
  if auth.uid() is null then
    raise exception 'STAFF_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into j from public.job_assignments where id = p_assignment_id for update;
  if not found then
    raise exception 'STAFF_ASSIGNMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if j.staff_profile_id <> auth.uid() then
    raise exception 'STAFF_FORBIDDEN' using errcode = '42501';
  end if;

  -- Konum paylaşımı yalnızca yolda / sahada; tamamlanınca/iptalde kesilir.
  if j.status not in ('en_route', 'on_site') then
    raise exception 'STAFF_LOCATION_NOT_ALLOWED'
      using errcode = 'P0001',
            message = 'Konum yalnızca yolda veya sahadayken paylaşılır';
  end if;

  insert into public.staff_location_pings (
    assignment_id, staff_profile_id, lat, lng, accuracy_m, recorded_at
  ) values (
    j.id, auth.uid(), p_lat, p_lng, p_accuracy_m, v_recorded
  )
  returning * into ping;

  return ping;
end;
$$;

create or replace function public.staff_complete_assignment(
  p_assignment_id uuid,
  p_completion_code text
)
returns public.job_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  j public.job_assignments;
begin
  select * into j from public.job_assignments where id = p_assignment_id for update;
  if not found then
    raise exception 'STAFF_ASSIGNMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if j.staff_profile_id <> auth.uid() then
    raise exception 'STAFF_FORBIDDEN' using errcode = '42501';
  end if;
  if j.status not in ('en_route', 'on_site') then
    raise exception 'STAFF_INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if j.completion_code <> p_completion_code then
    raise exception 'STAFF_BAD_COMPLETION_CODE' using errcode = 'P0001';
  end if;

  update public.job_assignments
  set status = 'completed',
      completed_at = timezone('utc', now())
  where id = j.id
  returning * into j;

  -- Konum kabulü status yüzünden otomatik kesilir (staff_post_location).
  return j;
end;
$$;

-- Takip okuma: canlı mı sunucuda hesaplanır; sahte ETA yok.
create or replace function public.get_assignment_tracking(p_assignment_id uuid)
returns table (
  assignment_id uuid,
  status public.assignment_status,
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  recorded_at timestamptz,
  received_at timestamptz,
  is_live boolean,
  tracking_active boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  j public.job_assignments;
  ping public.staff_location_pings;
begin
  select * into j from public.job_assignments where id = p_assignment_id;
  if not found then
    raise exception 'STAFF_ASSIGNMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    j.staff_profile_id = auth.uid()
    or exists (
      select 1 from public.businesses b
      where b.id = j.business_id and b.owner_profile_id = auth.uid()
    )
    or exists (
      select 1 from public.klima_appointments a
      where a.id = j.klima_appointment_id and a.customer_id = auth.uid()
    )
    or exists (
      select 1 from public.product_orders o
      where o.id = j.product_order_id and o.customer_id = auth.uid()
    )
    or public.has_role('platform_admin')
  ) then
    raise exception 'STAFF_FORBIDDEN' using errcode = '42501';
  end if;

  select * into ping
  from public.staff_location_pings p
  where p.assignment_id = j.id
  order by p.received_at desc
  limit 1;

  assignment_id := j.id;
  status := j.status;
  tracking_active := j.status in ('en_route', 'on_site');
  lat := ping.lat;
  lng := ping.lng;
  accuracy_m := ping.accuracy_m;
  recorded_at := ping.recorded_at;
  received_at := ping.received_at;
  is_live :=
    tracking_active
    and ping.id is not null
    and ping.received_at >= timezone('utc', now())
      - make_interval(secs => public.live_location_max_age_seconds());

  return next;
end;
$$;

alter table public.job_assignments enable row level security;
alter table public.staff_location_pings enable row level security;

-- Personel yalnızca kendi atamalarını görür.
create policy job_assignments_staff_select on public.job_assignments
for select using (
  staff_profile_id = auth.uid()
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or exists (
    select 1 from public.klima_appointments a
    where a.id = klima_appointment_id and a.customer_id = auth.uid()
  )
  or exists (
    select 1 from public.product_orders o
    where o.id = product_order_id and o.customer_id = auth.uid()
  )
  or public.has_role('platform_admin')
);

-- Personel completion_code'u kendi satırında görebilir (tamamlama için).
-- Müşteri/başkası completion_code kolonunu uygulamada göstermemeli; RLS satır bazlı.

create policy staff_location_pings_select on public.staff_location_pings
for select using (
  staff_profile_id = auth.uid()
  or exists (
    select 1
    from public.job_assignments j
    where j.id = assignment_id
      and (
        exists (
          select 1 from public.businesses b
          where b.id = j.business_id and b.owner_profile_id = auth.uid()
        )
        or exists (
          select 1 from public.klima_appointments a
          where a.id = j.klima_appointment_id and a.customer_id = auth.uid()
        )
        or exists (
          select 1 from public.product_orders o
          where o.id = j.product_order_id and o.customer_id = auth.uid()
        )
        or public.has_role('platform_admin')
      )
  )
);

-- İşletme sahibi aktif personel davet/üyelik ekler (açık kayıt yok).
create or replace function public.invite_staff_member(
  p_business_id uuid,
  p_staff_profile_id uuid
)
returns public.staff_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.staff_memberships;
begin
  if auth.uid() is null then
    raise exception 'STAFF_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_profile_id = auth.uid()
  ) and not public.has_role('platform_admin') then
    raise exception 'STAFF_FORBIDDEN' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_staff_profile_id) then
    raise exception 'STAFF_PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.staff_memberships (
    business_id, profile_id, invited_by, is_active
  ) values (
    p_business_id, p_staff_profile_id, auth.uid(), true
  )
  on conflict (business_id, profile_id) do update
    set is_active = true,
        invited_by = excluded.invited_by
  returning * into m;

  insert into public.profile_roles (profile_id, role)
  values (p_staff_profile_id, 'field_staff')
  on conflict do nothing;

  return m;
end;
$$;

grant execute on function public.assign_staff_to_klima_appointment(uuid, uuid) to authenticated;
grant execute on function public.assign_staff_to_product_order(uuid, uuid) to authenticated;
grant execute on function public.staff_update_assignment_status(uuid, public.assignment_status) to authenticated;
grant execute on function public.staff_post_location(uuid, double precision, double precision, double precision, timestamptz) to authenticated;
grant execute on function public.staff_complete_assignment(uuid, text) to authenticated;
grant execute on function public.get_assignment_tracking(uuid) to authenticated;
grant execute on function public.invite_staff_member(uuid, uuid) to authenticated;

-- Klimacın Kapıda — phase (g)
-- İşletme aboneliği: planlar, durumlar, yenileme/iptal, sunucu yetki kontrolü
-- Kart numarası/CVC kendi DB'mizde YOK. Sahte tahsilat yok.
-- 149 TL hipotez: subscription_plans.price_kurus ile yapılandırılır.

create type public.subscription_status as enum (
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired'
);

create type public.billing_checkout_status as enum (
  'created',
  'provider_redirect',
  'succeeded',
  'failed',
  'canceled',
  'blocked_no_provider'
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_kurus integer not null check (price_kurus >= 0),
  currency text not null default 'TRY',
  interval_months integer not null default 1 check (interval_months > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Hipotez plan: 149,00 TRY / ay (yapılandırılabilir).
insert into public.subscription_plans (code, name, description, price_kurus, interval_months)
values (
  'business_monthly_v1',
  'İşletme Aylık',
  'Hipotez fiyat — yönetim panelinden değiştirilebilir (149 TL).',
  14900,
  1
);

create table public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status public.subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  -- Provider referansları — kart verisi yok
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_subscriptions_period check (
    current_period_start is null
    or current_period_end is null
    or current_period_end > current_period_start
  )
);

-- Bir işletmenin en fazla bir "açık" aboneliği (canceled/expired hariç aktif hat).
create unique index business_subscriptions_one_open_uidx
  on public.business_subscriptions (business_id)
  where status in ('incomplete', 'trialing', 'active', 'past_due');

create table public.subscription_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  requested_by uuid not null references public.profiles (id),
  status public.billing_checkout_status not null default 'created',
  amount_kurus integer not null check (amount_kurus >= 0),
  currency text not null default 'TRY',
  provider text,
  provider_session_id text,
  checkout_url text,
  error_code text,
  error_detail text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
  -- Kart alanı yok bilerek.
);

create table public.subscription_billing_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete set null,
  subscription_id uuid references public.business_subscriptions (id) on delete set null,
  checkout_session_id uuid references public.subscription_checkout_sessions (id) on delete set null,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_digest text,
  processed_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_event_id)
);

create trigger trg_subscription_plans_updated before update on public.subscription_plans
for each row execute function public.set_updated_at();

create trigger trg_business_subscriptions_updated before update on public.business_subscriptions
for each row execute function public.set_updated_at();

create trigger trg_subscription_checkout_sessions_updated before update on public.subscription_checkout_sessions
for each row execute function public.set_updated_at();

create or replace function public.business_subscription_is_entitled(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_subscriptions s
    where s.business_id = p_business_id
      and s.status in ('trialing', 'active')
      and (
        s.current_period_end is null
        or s.current_period_end > timezone('utc', now())
      )
  );
$$;

create or replace function public.assert_business_subscription_entitled(p_business_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.business_subscription_is_entitled(p_business_id) then
    raise exception 'SUBSCRIPTION_REQUIRED'
      using errcode = 'P0001',
            message = 'Aktif işletme aboneliği gerekli';
  end if;
end;
$$;

create or replace function public.start_subscription_checkout(
  p_business_id uuid,
  p_plan_id uuid,
  p_provider_configured boolean default false
)
returns public.subscription_checkout_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.businesses;
  plan public.subscription_plans;
  sess public.subscription_checkout_sessions;
begin
  if auth.uid() is null then
    raise exception 'BILLING_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into b from public.businesses where id = p_business_id;
  if not found then
    raise exception 'BILLING_BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;
  if b.owner_profile_id <> auth.uid() and not public.has_role('platform_admin') then
    raise exception 'BILLING_FORBIDDEN' using errcode = '42501';
  end if;

  select * into plan from public.subscription_plans where id = p_plan_id and is_active;
  if not found then
    raise exception 'BILLING_PLAN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_provider_configured then
    insert into public.subscription_checkout_sessions (
      business_id, plan_id, requested_by, status, amount_kurus, currency, provider
    ) values (
      p_business_id, plan.id, auth.uid(), 'created', plan.price_kurus, plan.currency, 'stripe'
    )
    returning * into sess;
  else
    -- Anahtar yok: oturum blocked — asla succeeded yazılmaz.
    insert into public.subscription_checkout_sessions (
      business_id, plan_id, requested_by, status, amount_kurus, currency,
      error_code, error_detail
    ) values (
      p_business_id, plan.id, auth.uid(), 'blocked_no_provider', plan.price_kurus, plan.currency,
      'PAYMENT_PROVIDER_NOT_CONFIGURED',
      'Ödeme sağlayıcı anahtarları yok; tahsilat başarılı sayılmadı'
    )
    returning * into sess;
  end if;

  return sess;
end;
$$;

create or replace function public.attach_checkout_provider_session(
  p_checkout_id uuid,
  p_provider text,
  p_provider_session_id text,
  p_checkout_url text
)
returns public.subscription_checkout_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.subscription_checkout_sessions;
begin
  if p_provider_session_id is null or char_length(trim(p_provider_session_id)) = 0 then
    raise exception 'BILLING_FAKE_CHECKOUT_FORBIDDEN'
      using errcode = 'P0001',
            message = 'Provider session id required; fake checkout forbidden';
  end if;

  update public.subscription_checkout_sessions
  set status = 'provider_redirect',
      provider = p_provider,
      provider_session_id = p_provider_session_id,
      checkout_url = p_checkout_url,
      error_code = null,
      error_detail = null
  where id = p_checkout_id
    and status in ('created', 'provider_redirect')
  returning * into sess;

  if not found then
    raise exception 'BILLING_CHECKOUT_NOT_FOUND' using errcode = 'P0001';
  end if;
  return sess;
end;
$$;

create or replace function public.cancel_business_subscription(
  p_subscription_id uuid,
  p_at_period_end boolean default true
)
returns public.business_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.business_subscriptions;
begin
  if auth.uid() is null then
    raise exception 'BILLING_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into s from public.business_subscriptions where id = p_subscription_id for update;
  if not found then
    raise exception 'BILLING_SUBSCRIPTION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = s.business_id and b.owner_profile_id = auth.uid()
  ) and not public.has_role('platform_admin') then
    raise exception 'BILLING_FORBIDDEN' using errcode = '42501';
  end if;

  if s.status not in ('trialing', 'active', 'past_due') then
    raise exception 'BILLING_INVALID_STATE' using errcode = 'P0001';
  end if;

  if p_at_period_end then
    update public.business_subscriptions
    set cancel_at_period_end = true
    where id = s.id
    returning * into s;
  else
    update public.business_subscriptions
    set status = 'canceled',
        cancel_at_period_end = false,
        canceled_at = timezone('utc', now())
    where id = s.id
    returning * into s;
  end if;

  return s;
end;
$$;

-- Webhook sonrası: yalnızca imzası doğrulanmış worker çağırır (service_role).
create or replace function public.apply_subscription_provider_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_business_id uuid,
  p_plan_id uuid default null,
  p_provider_customer_id text default null,
  p_provider_subscription_id text default null,
  p_status public.subscription_status default 'active',
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_checkout_session_id uuid default null,
  p_payload_digest text default null
)
returns public.business_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.business_subscriptions;
  v_event_id uuid;
begin
  if p_provider_event_id is null or char_length(trim(p_provider_event_id)) = 0 then
    raise exception 'BILLING_FAKE_EVENT_FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_provider_subscription_id is null or char_length(trim(p_provider_subscription_id)) = 0 then
    raise exception 'BILLING_FAKE_EVENT_FORBIDDEN'
      using errcode = 'P0001',
            message = 'Provider subscription id required';
  end if;

  insert into public.subscription_billing_events (
    business_id, checkout_session_id, provider, provider_event_id,
    event_type, payload_digest
  ) values (
    p_business_id, p_checkout_session_id, p_provider, p_provider_event_id,
    p_event_type, p_payload_digest
  )
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    -- Idempotent replay
    select * into s
    from public.business_subscriptions
    where business_id = p_business_id
      and provider_subscription_id = p_provider_subscription_id
    order by created_at desc
    limit 1;
    if found then
      return s;
    end if;
  end if;

  select * into s
  from public.business_subscriptions
  where business_id = p_business_id
    and status in ('incomplete', 'trialing', 'active', 'past_due')
  for update;

  if found then
    update public.business_subscriptions
    set plan_id = coalesce(p_plan_id, plan_id),
        status = p_status,
        current_period_start = coalesce(p_period_start, current_period_start),
        current_period_end = coalesce(p_period_end, current_period_end),
        provider = p_provider,
        provider_customer_id = coalesce(p_provider_customer_id, provider_customer_id),
        provider_subscription_id = p_provider_subscription_id,
        canceled_at = case when p_status = 'canceled' then timezone('utc', now()) else canceled_at end
    where id = s.id
    returning * into s;
  else
    if p_plan_id is null then
      raise exception 'BILLING_PLAN_NOT_FOUND'
        using errcode = 'P0001',
              message = 'plan_id required when creating subscription from event';
    end if;
    insert into public.business_subscriptions (
      business_id, plan_id, status,
      current_period_start, current_period_end,
      provider, provider_customer_id, provider_subscription_id
    ) values (
      p_business_id, p_plan_id, p_status,
      p_period_start, p_period_end,
      p_provider, p_provider_customer_id, p_provider_subscription_id
    )
    returning * into s;
  end if;

  update public.subscription_billing_events
  set subscription_id = s.id
  where provider = p_provider and provider_event_id = p_provider_event_id;

  if p_checkout_session_id is not null and p_status in ('active', 'trialing') then
    update public.subscription_checkout_sessions
    set status = 'succeeded'
    where id = p_checkout_session_id
      and provider_session_id is not null;
  end if;

  return s;
end;
$$;

-- Entitlement: ticari RPC'lere abonelik kontrolü ekle (mevcut fonksiyonlar üzerine).
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

  perform public.assert_business_subscription_entitled(p_business_id);

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
    request_id, business_id, price_kurus, diagnosis_fee_kurus,
    scope_summary, eta_minutes, proposed_start, proposed_end, status
  ) values (
    p_request_id, p_business_id, p_price_kurus, p_diagnosis_fee_kurus,
    p_scope_summary, p_eta_minutes, p_proposed_start, p_proposed_end, 'pending'
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

create or replace function public.upsert_catalog_product(
  p_business_id uuid,
  p_category public.catalog_category,
  p_name text,
  p_unit_price_kurus integer,
  p_brand text default null,
  p_volume_liters numeric default null,
  p_size_label text default null,
  p_deposit_kurus integer default 0,
  p_requires_empty_return boolean default false,
  p_description text default null,
  p_initial_stock integer default 0,
  p_product_id uuid default null
)
returns public.catalog_products
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.businesses;
  p public.catalog_products;
begin
  if auth.uid() is null then
    raise exception 'CATALOG_AUTH_REQUIRED' using errcode = '42501';
  end if;

  perform public.assert_business_subscription_entitled(p_business_id);

  select * into b from public.businesses where id = p_business_id;
  if not found then
    raise exception 'CATALOG_BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;
  if b.owner_profile_id <> auth.uid() and not public.has_role('platform_admin') then
    raise exception 'CATALOG_FORBIDDEN' using errcode = '42501';
  end if;
  if not public.business_can_sell_catalog(p_business_id, p_category) then
    raise exception 'CATALOG_BUSINESS_NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  if p_initial_stock < 0 then
    raise exception 'CATALOG_INVALID_STOCK' using errcode = 'P0001';
  end if;
  if p_category = 'tup' and p_description is not null then
    if p_description ~* '(montaj|kurulum|bağla|vanayı|kaçak|ateş|kaynak)' then
      raise exception 'TUP_NO_INSTALL_GUIDANCE' using errcode = 'P0001';
    end if;
  end if;

  if p_product_id is null then
    insert into public.catalog_products (
      business_id, category, name, brand, volume_liters, size_label,
      unit_price_kurus, deposit_kurus, requires_empty_return, description
    ) values (
      p_business_id, p_category, p_name, p_brand, p_volume_liters, p_size_label,
      p_unit_price_kurus, coalesce(p_deposit_kurus, 0), coalesce(p_requires_empty_return, false), p_description
    )
    returning * into p;
    insert into public.product_stock (product_id, quantity_on_hand, quantity_reserved)
    values (p.id, p_initial_stock, 0);
  else
    update public.catalog_products
    set name = p_name,
        brand = p_brand,
        volume_liters = p_volume_liters,
        size_label = p_size_label,
        unit_price_kurus = p_unit_price_kurus,
        deposit_kurus = coalesce(p_deposit_kurus, 0),
        requires_empty_return = coalesce(p_requires_empty_return, false),
        description = p_description
    where id = p_product_id
      and business_id = p_business_id
      and category = p_category
    returning * into p;
    if not found then
      raise exception 'CATALOG_PRODUCT_NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;

  return p;
end;
$$;

alter table public.subscription_plans enable row level security;
alter table public.business_subscriptions enable row level security;
alter table public.subscription_checkout_sessions enable row level security;
alter table public.subscription_billing_events enable row level security;

create policy subscription_plans_public_read on public.subscription_plans
for select using (is_active = true or public.has_role('platform_admin'));

create policy business_subscriptions_owner_select on public.business_subscriptions
for select using (
  exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or public.has_role('platform_admin')
);

create policy subscription_checkout_owner_select on public.subscription_checkout_sessions
for select using (
  requested_by = auth.uid()
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or public.has_role('platform_admin')
);

create policy subscription_billing_events_admin_select on public.subscription_billing_events
for select using (public.has_role('platform_admin'));

grant execute on function public.business_subscription_is_entitled(uuid) to authenticated;
grant execute on function public.assert_business_subscription_entitled(uuid) to authenticated;
grant execute on function public.start_subscription_checkout(uuid, uuid, boolean) to authenticated;
grant execute on function public.cancel_business_subscription(uuid, boolean) to authenticated;
grant execute on function public.attach_checkout_provider_session(uuid, text, text, text) to service_role;
grant execute on function public.apply_subscription_provider_event(text, text, text, uuid, uuid, text, text, public.subscription_status, timestamptz, timestamptz, uuid, text) to service_role;

-- Personel atama da ticari yetkiye bağlı
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

  perform public.assert_business_subscription_entitled(a.business_id);

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
    raise exception 'STAFF_ALREADY_ASSIGNED' using errcode = 'P0001';
end;
$$;

-- Klimacın Kapıda — phase (f)
-- Bildirim (in-app), sipariş mesajlaşması, sorun/anlaşmazlık
-- Push kaynak doğruluk değildir; sipariş durumu sunucu tablolarından okunur.
-- Push sağlayıcı yoksa gönderim "başarılı" sayılmaz (skipped/skipped_skipped).

create type public.notification_kind as enum (
  'order_status',
  'klima_status',
  'assignment',
  'message',
  'issue',
  'system'
);

create type public.push_attempt_status as enum (
  'queued',
  'sent',
  'failed',
  'skipped_no_provider'
);

create type public.message_thread_kind as enum (
  'klima_appointment',
  'product_order',
  'job_assignment'
);

create type public.issue_status as enum (
  'open',
  'under_review',
  'resolved',
  'closed',
  'rejected'
);

create type public.issue_subject_kind as enum (
  'klima_appointment',
  'product_order',
  'job_assignment'
);

create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  app_surface text not null check (app_surface in ('customer', 'staff', 'business_web')),
  is_active boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, token)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null check (char_length(trim(title)) >= 2),
  body text not null check (char_length(trim(body)) >= 2),
  -- Referanslar bilgilendirme içindir; durum kaynağı ilgili iş tablosudur.
  product_order_id uuid references public.product_orders (id) on delete set null,
  klima_appointment_id uuid references public.klima_appointments (id) on delete set null,
  job_assignment_id uuid references public.job_assignments (id) on delete set null,
  issue_id uuid,
  message_thread_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.push_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  device_token_id uuid references public.device_push_tokens (id) on delete set null,
  status public.push_attempt_status not null default 'queued',
  provider text,
  provider_message_id text,
  error_code text,
  error_detail text,
  attempted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  -- Sahte başarı yok: 'sent' yalnızca gerçek provider_message_id ile.
  constraint push_sent_requires_provider_id check (
    status <> 'sent'
    or (provider_message_id is not null and char_length(provider_message_id) > 0)
  )
);

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  kind public.message_thread_kind not null,
  business_id uuid not null references public.businesses (id),
  customer_id uuid not null references public.profiles (id),
  klima_appointment_id uuid references public.klima_appointments (id),
  product_order_id uuid references public.product_orders (id),
  job_assignment_id uuid references public.job_assignments (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint message_threads_one_subject check (
    (
      kind = 'klima_appointment'
      and klima_appointment_id is not null
      and product_order_id is null
      and job_assignment_id is null
    )
    or (
      kind = 'product_order'
      and product_order_id is not null
      and klima_appointment_id is null
      and job_assignment_id is null
    )
    or (
      kind = 'job_assignment'
      and job_assignment_id is not null
      and klima_appointment_id is null
      and product_order_id is null
    )
  )
);

create unique index message_threads_klima_uidx
  on public.message_threads (klima_appointment_id)
  where klima_appointment_id is not null;

create unique index message_threads_order_uidx
  on public.message_threads (product_order_id)
  where product_order_id is not null;

create unique index message_threads_assignment_uidx
  on public.message_threads (job_assignment_id)
  where job_assignment_id is not null;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null check (char_length(trim(body)) >= 1 and char_length(body) <= 4000),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id),
  business_id uuid references public.businesses (id),
  subject_kind public.issue_subject_kind not null,
  klima_appointment_id uuid references public.klima_appointments (id),
  product_order_id uuid references public.product_orders (id),
  job_assignment_id uuid references public.job_assignments (id),
  title text not null check (char_length(trim(title)) >= 4),
  description text not null check (char_length(trim(description)) >= 8),
  status public.issue_status not null default 'open',
  resolution_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  constraint issues_one_subject check (
    (
      subject_kind = 'klima_appointment'
      and klima_appointment_id is not null
      and product_order_id is null
      and job_assignment_id is null
    )
    or (
      subject_kind = 'product_order'
      and product_order_id is not null
      and klima_appointment_id is null
      and job_assignment_id is null
    )
    or (
      subject_kind = 'job_assignment'
      and job_assignment_id is not null
      and klima_appointment_id is null
      and product_order_id is null
    )
  )
);

alter table public.notifications
  add constraint notifications_issue_fk
  foreign key (issue_id) references public.issues (id) on delete set null;

alter table public.notifications
  add constraint notifications_thread_fk
  foreign key (message_thread_id) references public.message_threads (id) on delete set null;

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index messages_thread_idx
  on public.messages (thread_id, created_at);
create index issues_reporter_idx
  on public.issues (reporter_id, created_at desc);
create index issues_business_idx
  on public.issues (business_id, status, created_at desc);

create trigger trg_device_push_tokens_updated before update on public.device_push_tokens
for each row execute function public.set_updated_at();

create trigger trg_message_threads_updated before update on public.message_threads
for each row execute function public.set_updated_at();

create trigger trg_issues_updated before update on public.issues
for each row execute function public.set_updated_at();

create or replace function public.register_push_token(
  p_token text,
  p_platform text,
  p_app_surface text
)
returns public.device_push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.device_push_tokens;
begin
  if auth.uid() is null then
    raise exception 'NOTIFY_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_token is null or char_length(trim(p_token)) < 8 then
    raise exception 'NOTIFY_INVALID_TOKEN' using errcode = 'P0001';
  end if;

  insert into public.device_push_tokens (
    profile_id, token, platform, app_surface, is_active, last_seen_at
  ) values (
    auth.uid(), trim(p_token), p_platform, p_app_surface, true, timezone('utc', now())
  )
  on conflict (profile_id, token) do update
    set platform = excluded.platform,
        app_surface = excluded.app_surface,
        is_active = true,
        last_seen_at = timezone('utc', now())
  returning * into t;

  return t;
end;
$$;

create or replace function public.create_in_app_notification(
  p_recipient_id uuid,
  p_kind public.notification_kind,
  p_title text,
  p_body text,
  p_product_order_id uuid default null,
  p_klima_appointment_id uuid default null,
  p_job_assignment_id uuid default null,
  p_issue_id uuid default null,
  p_message_thread_id uuid default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.notifications;
begin
  -- Çağrı sunucu/RPC içinden; istemci doğrudan sahte "push delivered" yazamaz.
  if auth.uid() is null then
    raise exception 'NOTIFY_AUTH_REQUIRED' using errcode = '42501';
  end if;

  insert into public.notifications (
    recipient_id, kind, title, body,
    product_order_id, klima_appointment_id, job_assignment_id,
    issue_id, message_thread_id
  ) values (
    p_recipient_id, p_kind, p_title, p_body,
    p_product_order_id, p_klima_appointment_id, p_job_assignment_id,
    p_issue_id, p_message_thread_id
  )
  returning * into n;

  return n;
end;
$$;

-- Push kuyruğu: sağlayıcı yoksa skipped_no_provider — asla sent değil.
create or replace function public.enqueue_push_attempts(
  p_notification_id uuid,
  p_provider_configured boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.notifications;
  tok record;
  n_count integer := 0;
begin
  select * into n from public.notifications where id = p_notification_id;
  if not found then
    raise exception 'NOTIFY_NOT_FOUND' using errcode = 'P0001';
  end if;

  for tok in
    select *
    from public.device_push_tokens d
    where d.profile_id = n.recipient_id
      and d.is_active = true
  loop
    insert into public.push_delivery_attempts (
      notification_id,
      device_token_id,
      status,
      provider,
      error_code,
      error_detail,
      attempted_at
    ) values (
      n.id,
      tok.id,
      case when p_provider_configured then 'queued'::public.push_attempt_status
           else 'skipped_no_provider'::public.push_attempt_status end,
      case when p_provider_configured then 'expo' else null end,
      case when p_provider_configured then null else 'PUSH_PROVIDER_NOT_CONFIGURED' end,
      case when p_provider_configured then null
           else 'Push anahtarları yok; gönderim başarılı sayılmadı' end,
      timezone('utc', now())
    );
    n_count := n_count + 1;
  end loop;

  if n_count = 0 and not p_provider_configured then
    insert into public.push_delivery_attempts (
      notification_id, status, error_code, error_detail, attempted_at
    ) values (
      n.id,
      'skipped_no_provider',
      'PUSH_PROVIDER_NOT_CONFIGURED',
      'Aktif cihaz tokenı yok ve/veya push sağlayıcı yapılandırılmadı',
      timezone('utc', now())
    );
    n_count := 1;
  end if;

  return n_count;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.notifications;
begin
  update public.notifications
  set read_at = timezone('utc', now())
  where id = p_notification_id
    and recipient_id = auth.uid()
  returning * into n;

  if not found then
    raise exception 'NOTIFY_NOT_FOUND' using errcode = 'P0001';
  end if;
  return n;
end;
$$;

-- Select-then-insert (partial unique indexes + ON CONFLICT is fragile across PG versions).
create or replace function public.open_or_get_order_thread(
  p_kind public.message_thread_kind,
  p_subject_id uuid
)
returns public.message_threads
language plpgsql
security definer
set search_path = public
as $$
declare
  thr public.message_threads;
  a public.klima_appointments;
  o public.product_orders;
  j public.job_assignments;
  v_business uuid;
  v_customer uuid;
begin
  if auth.uid() is null then
    raise exception 'NOTIFY_AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_kind = 'klima_appointment' then
    select * into a from public.klima_appointments where id = p_subject_id;
    if not found then
      raise exception 'NOTIFY_SUBJECT_NOT_FOUND' using errcode = 'P0001';
    end if;
    v_business := a.business_id;
    v_customer := a.customer_id;
    select * into thr from public.message_threads where klima_appointment_id = p_subject_id;
  elsif p_kind = 'product_order' then
    select * into o from public.product_orders where id = p_subject_id;
    if not found then
      raise exception 'NOTIFY_SUBJECT_NOT_FOUND' using errcode = 'P0001';
    end if;
    v_business := o.business_id;
    v_customer := o.customer_id;
    select * into thr from public.message_threads where product_order_id = p_subject_id;
  else
    select * into j from public.job_assignments where id = p_subject_id;
    if not found then
      raise exception 'NOTIFY_SUBJECT_NOT_FOUND' using errcode = 'P0001';
    end if;
    v_business := j.business_id;
    if j.klima_appointment_id is not null then
      select customer_id into v_customer from public.klima_appointments where id = j.klima_appointment_id;
    else
      select customer_id into v_customer from public.product_orders where id = j.product_order_id;
    end if;
    select * into thr from public.message_threads where job_assignment_id = p_subject_id;
  end if;

  if not (
    auth.uid() = v_customer
    or exists (
      select 1 from public.businesses b
      where b.id = v_business and b.owner_profile_id = auth.uid()
    )
    or exists (
      select 1 from public.staff_memberships sm
      where sm.business_id = v_business
        and sm.profile_id = auth.uid()
        and sm.is_active
    )
    or public.has_role('platform_admin')
  ) then
    raise exception 'NOTIFY_FORBIDDEN' using errcode = '42501';
  end if;

  if thr.id is not null then
    return thr;
  end if;

  insert into public.message_threads (
    kind, business_id, customer_id,
    klima_appointment_id, product_order_id, job_assignment_id
  ) values (
    p_kind, v_business, v_customer,
    case when p_kind = 'klima_appointment' then p_subject_id end,
    case when p_kind = 'product_order' then p_subject_id end,
    case when p_kind = 'job_assignment' then p_subject_id end
  )
  returning * into thr;

  return thr;
end;
$$;

create or replace function public.send_thread_message(
  p_thread_id uuid,
  p_body text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  thr public.message_threads;
  msg public.messages;
  recipient uuid;
  n public.notifications;
begin
  if auth.uid() is null then
    raise exception 'NOTIFY_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into thr from public.message_threads where id = p_thread_id for update;
  if not found then
    raise exception 'NOTIFY_THREAD_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    auth.uid() = thr.customer_id
    or exists (
      select 1 from public.businesses b
      where b.id = thr.business_id and b.owner_profile_id = auth.uid()
    )
    or exists (
      select 1 from public.staff_memberships sm
      where sm.business_id = thr.business_id
        and sm.profile_id = auth.uid()
        and sm.is_active
    )
  ) then
    raise exception 'NOTIFY_FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.messages (thread_id, sender_id, body)
  values (thr.id, auth.uid(), trim(p_body))
  returning * into msg;

  update public.message_threads
  set updated_at = timezone('utc', now())
  where id = thr.id;

  recipient := case
    when auth.uid() = thr.customer_id then (
      select b.owner_profile_id from public.businesses b where b.id = thr.business_id
    )
    else thr.customer_id
  end;

  if recipient is not null and recipient <> auth.uid() then
    n := public.create_in_app_notification(
      recipient,
      'message',
      'Yeni mesaj',
      left(trim(p_body), 120),
      thr.product_order_id,
      thr.klima_appointment_id,
      thr.job_assignment_id,
      null,
      thr.id
    );
    -- Push sağlayıcı yapılandırması Edge/worker'da; burada varsayılan false (sahte sent yok).
    perform public.enqueue_push_attempts(n.id, false);
  end if;

  return msg;
end;
$$;

create or replace function public.open_issue(
  p_subject_kind public.issue_subject_kind,
  p_subject_id uuid,
  p_title text,
  p_description text
)
returns public.issues
language plpgsql
security definer
set search_path = public
as $$
declare
  iss public.issues;
  v_business uuid;
  a public.klima_appointments;
  o public.product_orders;
  j public.job_assignments;
  owner_id uuid;
  n public.notifications;
begin
  if auth.uid() is null then
    raise exception 'NOTIFY_AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_subject_kind = 'klima_appointment' then
    select * into a from public.klima_appointments where id = p_subject_id;
    if not found then
      raise exception 'NOTIFY_SUBJECT_NOT_FOUND' using errcode = 'P0001';
    end if;
    if a.customer_id <> auth.uid()
       and not exists (
         select 1 from public.businesses b
         where b.id = a.business_id and b.owner_profile_id = auth.uid()
       ) then
      raise exception 'NOTIFY_FORBIDDEN' using errcode = '42501';
    end if;
    v_business := a.business_id;
  elsif p_subject_kind = 'product_order' then
    select * into o from public.product_orders where id = p_subject_id;
    if not found then
      raise exception 'NOTIFY_SUBJECT_NOT_FOUND' using errcode = 'P0001';
    end if;
    if o.customer_id <> auth.uid()
       and not exists (
         select 1 from public.businesses b
         where b.id = o.business_id and b.owner_profile_id = auth.uid()
       ) then
      raise exception 'NOTIFY_FORBIDDEN' using errcode = '42501';
    end if;
    v_business := o.business_id;
  else
    select * into j from public.job_assignments where id = p_subject_id;
    if not found then
      raise exception 'NOTIFY_SUBJECT_NOT_FOUND' using errcode = 'P0001';
    end if;
    v_business := j.business_id;
    if j.staff_profile_id <> auth.uid()
       and not exists (
         select 1 from public.businesses b
         where b.id = j.business_id and b.owner_profile_id = auth.uid()
       ) then
      raise exception 'NOTIFY_FORBIDDEN' using errcode = '42501';
    end if;
  end if;

  insert into public.issues (
    reporter_id, business_id, subject_kind,
    klima_appointment_id, product_order_id, job_assignment_id,
    title, description, status
  ) values (
    auth.uid(), v_business, p_subject_kind,
    case when p_subject_kind = 'klima_appointment' then p_subject_id end,
    case when p_subject_kind = 'product_order' then p_subject_id end,
    case when p_subject_kind = 'job_assignment' then p_subject_id end,
    trim(p_title), trim(p_description), 'open'
  )
  returning * into iss;

  select owner_profile_id into owner_id from public.businesses where id = v_business;
  if owner_id is not null and owner_id <> auth.uid() then
    n := public.create_in_app_notification(
      owner_id,
      'issue',
      'Yeni sorun kaydı',
      iss.title,
      iss.product_order_id,
      iss.klima_appointment_id,
      iss.job_assignment_id,
      iss.id,
      null
    );
    perform public.enqueue_push_attempts(n.id, false);
  end if;

  return iss;
end;
$$;

create or replace function public.update_issue_status(
  p_issue_id uuid,
  p_status public.issue_status,
  p_resolution_note text default null
)
returns public.issues
language plpgsql
security definer
set search_path = public
as $$
declare
  iss public.issues;
  n public.notifications;
begin
  select * into iss from public.issues where id = p_issue_id for update;
  if not found then
    raise exception 'NOTIFY_ISSUE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    public.has_role('platform_admin')
    or exists (
      select 1 from public.businesses b
      where b.id = iss.business_id and b.owner_profile_id = auth.uid()
    )
  ) then
    raise exception 'NOTIFY_FORBIDDEN' using errcode = '42501';
  end if;

  update public.issues
  set status = p_status,
      resolution_note = p_resolution_note,
      resolved_at = case
        when p_status in ('resolved', 'closed', 'rejected') then timezone('utc', now())
        else resolved_at
      end
  where id = iss.id
  returning * into iss;

  if iss.reporter_id <> auth.uid() then
    n := public.create_in_app_notification(
      iss.reporter_id,
      'issue',
      'Sorun durumu güncellendi',
      coalesce(p_resolution_note, iss.title),
      iss.product_order_id,
      iss.klima_appointment_id,
      iss.job_assignment_id,
      iss.id,
      null
    );
    perform public.enqueue_push_attempts(n.id, false);
  end if;

  return iss;
end;
$$;

-- Worker/edge: gerçek push sonucunu kaydet (sent yalnızca provider id ile).
create or replace function public.record_push_attempt_result(
  p_attempt_id uuid,
  p_status public.push_attempt_status,
  p_provider text default null,
  p_provider_message_id text default null,
  p_error_code text default null,
  p_error_detail text default null
)
returns public.push_delivery_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  att public.push_delivery_attempts;
begin
  if p_status = 'sent' and (p_provider_message_id is null or char_length(p_provider_message_id) = 0) then
    raise exception 'NOTIFY_FAKE_PUSH_FORBIDDEN'
      using errcode = 'P0001',
            message = 'Push sent status requires real provider message id';
  end if;

  update public.push_delivery_attempts
  set status = p_status,
      provider = coalesce(p_provider, provider),
      provider_message_id = p_provider_message_id,
      error_code = p_error_code,
      error_detail = p_error_detail,
      attempted_at = timezone('utc', now())
  where id = p_attempt_id
  returning * into att;

  if not found then
    raise exception 'NOTIFY_PUSH_ATTEMPT_NOT_FOUND' using errcode = 'P0001';
  end if;
  return att;
end;
$$;

alter table public.device_push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.push_delivery_attempts enable row level security;
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.issues enable row level security;

create policy device_push_tokens_own on public.device_push_tokens
for all using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy notifications_recipient_select on public.notifications
for select using (recipient_id = auth.uid() or public.has_role('platform_admin'));

create policy push_attempts_own_select on public.push_delivery_attempts
for select using (
  exists (
    select 1 from public.notifications n
    where n.id = notification_id
      and (n.recipient_id = auth.uid() or public.has_role('platform_admin'))
  )
);

create policy message_threads_participants_select on public.message_threads
for select using (
  customer_id = auth.uid()
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or exists (
    select 1 from public.staff_memberships sm
    where sm.business_id = message_threads.business_id
      and sm.profile_id = auth.uid()
      and sm.is_active
  )
  or public.has_role('platform_admin')
);

create policy messages_participants_select on public.messages
for select using (
  exists (
    select 1 from public.message_threads t
    where t.id = thread_id
      and (
        t.customer_id = auth.uid()
        or exists (
          select 1 from public.businesses b
          where b.id = t.business_id and b.owner_profile_id = auth.uid()
        )
        or exists (
          select 1 from public.staff_memberships sm
          where sm.business_id = t.business_id
            and sm.profile_id = auth.uid()
            and sm.is_active
        )
        or public.has_role('platform_admin')
      )
  )
);

create policy issues_participants_select on public.issues
for select using (
  reporter_id = auth.uid()
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or public.has_role('platform_admin')
);

grant execute on function public.register_push_token(text, text, text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.open_or_get_order_thread(public.message_thread_kind, uuid) to authenticated;
grant execute on function public.send_thread_message(uuid, text) to authenticated;
grant execute on function public.open_issue(public.issue_subject_kind, uuid, text, text) to authenticated;
grant execute on function public.update_issue_status(uuid, public.issue_status, text) to authenticated;
-- create_in_app_notification / enqueue_push_attempts / record_push_attempt_result:
-- yalnızca security definer akışları + service_role worker (istemci sahte push yazamaz).
grant execute on function public.create_in_app_notification(uuid, public.notification_kind, text, text, uuid, uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.enqueue_push_attempts(uuid, boolean) to service_role;
grant execute on function public.record_push_attempt_result(uuid, public.push_attempt_status, text, text, text, text) to service_role;

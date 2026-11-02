-- Phase (b) completion: business application RPCs, region upsert,
-- secure first platform-admin bootstrap (no public admin signup).

-- ---------------------------------------------------------------------------
-- Draft save / submit (authenticated applicant)
-- ---------------------------------------------------------------------------
create or replace function public.save_business_application_draft(
  p_legal_name text,
  p_trade_name text,
  p_tax_id text,
  p_phone text,
  p_email text,
  p_city_code text,
  p_city_name text,
  p_district_code text,
  p_district_name text,
  p_categories public.service_category[],
  p_claims_authorized_service boolean default false,
  p_notes text default null,
  p_application_id uuid default null
)
returns public.business_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.business_applications;
begin
  if auth.uid() is null then
    raise exception 'APPLICATION_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_categories is null or cardinality(p_categories) < 1 then
    raise exception 'APPLICATION_CATEGORIES_REQUIRED' using errcode = 'P0001';
  end if;

  if p_application_id is null then
    insert into public.business_applications (
      applicant_profile_id, legal_name, trade_name, tax_id, phone, email,
      city_code, city_name, district_code, district_name,
      categories, claims_authorized_service, notes, status
    ) values (
      auth.uid(), trim(p_legal_name), trim(p_trade_name), trim(p_tax_id),
      trim(p_phone), trim(p_email),
      trim(p_city_code), trim(p_city_name), trim(p_district_code), trim(p_district_name),
      p_categories, coalesce(p_claims_authorized_service, false),
      nullif(trim(coalesce(p_notes, '')), ''), 'draft'
    )
    returning * into r;
  else
    update public.business_applications
    set legal_name = trim(p_legal_name),
        trade_name = trim(p_trade_name),
        tax_id = trim(p_tax_id),
        phone = trim(p_phone),
        email = trim(p_email),
        city_code = trim(p_city_code),
        city_name = trim(p_city_name),
        district_code = trim(p_district_code),
        district_name = trim(p_district_name),
        categories = p_categories,
        claims_authorized_service = coalesce(p_claims_authorized_service, false),
        notes = nullif(trim(coalesce(p_notes, '')), '')
    where id = p_application_id
      and applicant_profile_id = auth.uid()
      and status in ('draft', 'needs_info')
    returning * into r;

    if r.id is null then
      raise exception 'APPLICATION_NOT_EDITABLE' using errcode = 'P0001';
    end if;
  end if;

  return r;
end;
$$;

create or replace function public.submit_business_application(
  p_application_id uuid
)
returns public.business_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.business_applications;
begin
  if auth.uid() is null then
    raise exception 'APPLICATION_AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.business_applications
  set status = 'submitted'
  where id = p_application_id
    and applicant_profile_id = auth.uid()
    and status in ('draft', 'needs_info')
  returning * into r;

  if r.id is null then
    raise exception 'APPLICATION_SUBMIT_FORBIDDEN' using errcode = 'P0001';
  end if;

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin review: approve creates business + category approvals + owner role.
-- claims_authorized_service never implies verified/active alone.
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_business_application(
  p_application_id uuid,
  p_decision text,
  p_reviewer_note text default null,
  p_activate_business boolean default false
)
returns public.business_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.business_applications;
  biz public.businesses;
  cat public.service_category;
  v_note text;
begin
  if not public.has_role('platform_admin') then
    raise exception 'APPLICATION_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into app
  from public.business_applications
  where id = p_application_id
  for update;

  if app.id is null then
    raise exception 'APPLICATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if app.status not in ('submitted', 'under_review', 'needs_info') then
    raise exception 'APPLICATION_NOT_REVIEWABLE' using errcode = 'P0001';
  end if;

  v_note := nullif(trim(coalesce(p_reviewer_note, '')), '');

  if p_decision = 'needs_info' then
    update public.business_applications
    set status = 'needs_info',
        notes = coalesce(v_note, notes)
    where id = app.id
    returning * into app;
    return app;
  end if;

  if p_decision = 'reject' then
    update public.business_applications
    set status = 'rejected',
        notes = coalesce(v_note, notes)
    where id = app.id
    returning * into app;
    return app;
  end if;

  if p_decision <> 'approve' then
    raise exception 'APPLICATION_INVALID_DECISION' using errcode = 'P0001';
  end if;

  -- Mark under_review briefly then approve atomically in this transaction.
  insert into public.businesses (
    owner_profile_id, legal_name, trade_name, tax_id, phone, email,
    city_code, city_name, district_code, district_name,
    claims_authorized_service, is_active
  ) values (
    app.applicant_profile_id, app.legal_name, app.trade_name, app.tax_id,
    app.phone, app.email, app.city_code, app.city_name, app.district_code,
    app.district_name, app.claims_authorized_service, false
  )
  returning * into biz;

  foreach cat in array app.categories
  loop
    insert into public.business_category_approvals (
      business_id, category, status, reviewed_at, reviewer_profile_id, reviewer_note
    ) values (
      biz.id, cat, 'approved', timezone('utc', now()), auth.uid(), v_note
    )
    on conflict (business_id, category) do update
      set status = 'approved',
          reviewed_at = timezone('utc', now()),
          reviewer_profile_id = auth.uid(),
          reviewer_note = excluded.reviewer_note;
  end loop;

  insert into public.profile_roles (profile_id, role)
  values (app.applicant_profile_id, 'business_owner')
  on conflict do nothing;

  if coalesce(p_activate_business, false) then
    update public.businesses
    set is_active = true
    where id = biz.id;
  end if;

  update public.business_applications
  set status = 'approved',
      business_id = biz.id,
      notes = coalesce(v_note, notes)
  where id = app.id
  returning * into app;

  return app;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service regions upsert (platform admin)
-- ---------------------------------------------------------------------------
create or replace function public.admin_upsert_service_region(
  p_city_code text,
  p_city_name text,
  p_district_code text,
  p_district_name text,
  p_category public.service_category,
  p_is_open boolean
)
returns public.service_regions
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.service_regions;
begin
  if not public.has_role('platform_admin') then
    raise exception 'REGION_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  insert into public.service_regions (
    city_code, city_name, district_code, district_name, category, is_open
  ) values (
    trim(p_city_code), trim(p_city_name), trim(p_district_code),
    trim(p_district_name), p_category, coalesce(p_is_open, false)
  )
  on conflict (city_code, district_code, category) do update
    set city_name = excluded.city_name,
        district_name = excluded.district_name,
        is_open = excluded.is_open,
        updated_at = timezone('utc', now())
  returning * into r;

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- First platform admin bootstrap — service_role ONLY.
-- No public admin signup. Refuses if any platform_admin already exists.
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_first_platform_admin(
  p_profile_id uuid
)
returns public.profile_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.profile_roles;
begin
  if p_profile_id is null then
    raise exception 'BOOTSTRAP_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_profile_id) then
    raise exception 'BOOTSTRAP_PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.profile_roles pr where pr.role = 'platform_admin'
  ) then
    raise exception 'BOOTSTRAP_ALREADY_DONE' using errcode = 'P0001';
  end if;

  insert into public.profile_roles (profile_id, role)
  values (p_profile_id, 'platform_admin')
  on conflict do nothing
  returning * into r;

  if r.profile_id is null then
    select * into r
    from public.profile_roles
    where profile_id = p_profile_id and role = 'platform_admin';
  end if;

  return r;
end;
$$;

revoke all on function public.save_business_application_draft(
  text, text, text, text, text, text, text, text, text,
  public.service_category[], boolean, text, uuid
) from public;
grant execute on function public.save_business_application_draft(
  text, text, text, text, text, text, text, text, text,
  public.service_category[], boolean, text, uuid
) to authenticated;

revoke all on function public.submit_business_application(uuid) from public;
grant execute on function public.submit_business_application(uuid) to authenticated;

revoke all on function public.admin_review_business_application(uuid, text, text, boolean) from public;
grant execute on function public.admin_review_business_application(uuid, text, text, boolean) to authenticated;

revoke all on function public.admin_upsert_service_region(
  text, text, text, text, public.service_category, boolean
) from public;
grant execute on function public.admin_upsert_service_region(
  text, text, text, text, public.service_category, boolean
) to authenticated;

-- Bootstrap: service_role only (no anon/authenticated).
revoke all on function public.bootstrap_first_platform_admin(uuid) from public;
revoke all on function public.bootstrap_first_platform_admin(uuid) from anon, authenticated;
grant execute on function public.bootstrap_first_platform_admin(uuid) to service_role;

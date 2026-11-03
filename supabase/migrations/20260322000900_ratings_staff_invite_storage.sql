-- Ratings, pending staff invites, private storage stub + grants hardening.

-- ---------------------------------------------------------------------------
-- Job ratings (real averages only — never invent scores in app code)
-- ---------------------------------------------------------------------------
create table public.business_job_ratings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.profiles (id),
  klima_appointment_id uuid references public.klima_appointments (id) on delete cascade,
  product_order_id uuid references public.product_orders (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint business_job_ratings_one_target check (
    (klima_appointment_id is not null and product_order_id is null)
    or (klima_appointment_id is null and product_order_id is not null)
  ),
  constraint business_job_ratings_comment_len check (
    comment is null or char_length(comment) <= 1000
  )
);

create unique index business_job_ratings_klima_uniq
  on public.business_job_ratings (klima_appointment_id)
  where klima_appointment_id is not null;

create unique index business_job_ratings_order_uniq
  on public.business_job_ratings (product_order_id)
  where product_order_id is not null;

create index business_job_ratings_business_idx
  on public.business_job_ratings (business_id);

alter table public.business_job_ratings enable row level security;

create policy business_job_ratings_select on public.business_job_ratings
for select using (true);

create policy business_job_ratings_insert_own on public.business_job_ratings
for insert with check (customer_id = auth.uid());

create or replace view public.business_rating_stats
with (security_invoker = true)
as
select
  business_id,
  avg(score)::numeric(3, 2) as rating_average,
  count(*)::integer as rating_count
from public.business_job_ratings
group by business_id;

grant select on public.business_rating_stats to authenticated, anon;

create or replace function public.submit_job_rating(
  p_score smallint,
  p_comment text default null,
  p_klima_appointment_id uuid default null,
  p_product_order_id uuid default null
)
returns public.business_job_ratings
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.business_job_ratings;
  v_business uuid;
begin
  if auth.uid() is null then
    raise exception 'RATING_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_score is null or p_score < 1 or p_score > 5 then
    raise exception 'RATING_INVALID_SCORE' using errcode = 'P0001';
  end if;

  if p_klima_appointment_id is not null then
    select a.business_id into v_business
    from public.klima_appointments a
    join public.klima_requests req on req.id = a.request_id
    where a.id = p_klima_appointment_id
      and a.status = 'completed'
      and req.customer_id = auth.uid();
  elsif p_product_order_id is not null then
    select o.business_id into v_business
    from public.product_orders o
    where o.id = p_product_order_id
      and o.status = 'delivered'
      and o.customer_id = auth.uid();
  else
    raise exception 'RATING_TARGET_REQUIRED' using errcode = 'P0001';
  end if;

  if v_business is null then
    raise exception 'RATING_NOT_ELIGIBLE' using errcode = 'P0001';
  end if;

  insert into public.business_job_ratings (
    business_id, customer_id, klima_appointment_id, product_order_id, score, comment
  ) values (
    v_business, auth.uid(), p_klima_appointment_id, p_product_order_id, p_score,
    nullif(trim(coalesce(p_comment, '')), '')
  )
  returning * into r;

  return r;
end;
$$;

revoke all on function public.submit_job_rating(smallint, text, uuid, uuid) from public;
grant execute on function public.submit_job_rating(smallint, text, uuid, uuid) to authenticated;
grant select, insert on public.business_job_ratings to authenticated;

-- ---------------------------------------------------------------------------
-- Staff invite: pending until accept (no force-active on invite)
-- ---------------------------------------------------------------------------
alter table public.staff_memberships
  add column if not exists invite_token text,
  add column if not exists invite_accepted_at timestamptz;

create unique index if not exists staff_memberships_invite_token_uniq
  on public.staff_memberships (invite_token)
  where invite_token is not null;

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
  v_token text;
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

  v_token := encode(gen_random_bytes(16), 'hex');

  insert into public.staff_memberships (
    business_id, profile_id, invited_by, is_active, invite_token
  ) values (
    p_business_id, p_staff_profile_id, auth.uid(), false, v_token
  )
  on conflict (business_id, profile_id) do update
    set invited_by = excluded.invited_by,
        invite_token = case
          when staff_memberships.is_active then staff_memberships.invite_token
          else excluded.invite_token
        end,
        is_active = staff_memberships.is_active
  returning * into m;

  return m;
end;
$$;

create or replace function public.accept_staff_invite(
  p_invite_token text
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
  if p_invite_token is null or char_length(trim(p_invite_token)) < 16 then
    raise exception 'STAFF_INVITE_INVALID' using errcode = 'P0001';
  end if;

  update public.staff_memberships
  set is_active = true,
      invite_accepted_at = timezone('utc', now()),
      invite_token = null
  where invite_token = trim(p_invite_token)
    and profile_id = auth.uid()
    and is_active = false
  returning * into m;

  if m.id is null then
    raise exception 'STAFF_INVITE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.profile_roles (profile_id, role)
  values (auth.uid(), 'field_staff')
  on conflict do nothing;

  return m;
end;
$$;

revoke all on function public.accept_staff_invite(text) from public;
grant execute on function public.accept_staff_invite(text) to authenticated;
grant execute on function public.invite_staff_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Private storage stub (no public bucket)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-attachments',
  'job-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = false;

-- Path convention: {profile_id}/{filename}
create policy job_attachments_select_own on storage.objects
for select using (
  bucket_id = 'job-attachments'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role('platform_admin')
  )
);

create policy job_attachments_insert_own on storage.objects
for insert with check (
  bucket_id = 'job-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy job_attachments_update_own on storage.objects
for update using (
  bucket_id = 'job-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy job_attachments_delete_own on storage.objects
for delete using (
  bucket_id = 'job-attachments'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.has_role('platform_admin')
  )
);

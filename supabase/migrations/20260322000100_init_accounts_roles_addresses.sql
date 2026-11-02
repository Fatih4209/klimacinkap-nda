-- Klimacın Kapıda — phase (b) skeleton
-- UTC timestamps; amounts elsewhere use integer kuruş.
-- RLS enabled on all public tables.

create extension if not exists "pgcrypto";

create type public.user_role as enum (
  'customer',
  'business_owner',
  'field_staff',
  'platform_admin'
);

create type public.service_category as enum ('klima', 'su', 'tup');

create type public.business_application_status as enum (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'needs_info'
);

create type public.category_approval_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profile_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, role)
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text,
  city_code text not null,
  city_name text not null,
  district_code text not null,
  district_name text not null,
  neighborhood text,
  line1 text not null,
  line2 text,
  postal_code text,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id),
  legal_name text not null,
  trade_name text not null,
  tax_id text not null,
  phone text not null,
  email text not null,
  city_code text not null,
  city_name text not null,
  district_code text not null,
  district_name text not null,
  claims_authorized_service boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.business_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_profile_id uuid not null references public.profiles (id),
  business_id uuid references public.businesses (id),
  legal_name text not null,
  trade_name text not null,
  tax_id text not null,
  phone text not null,
  email text not null,
  city_code text not null,
  city_name text not null,
  district_code text not null,
  district_name text not null,
  categories public.service_category[] not null,
  claims_authorized_service boolean not null default false,
  status public.business_application_status not null default 'draft',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_applications_categories_nonempty check (
    cardinality(categories) >= 1
  )
);

create table public.business_category_approvals (
  business_id uuid not null references public.businesses (id) on delete cascade,
  category public.service_category not null,
  status public.category_approval_status not null default 'pending',
  reviewed_at timestamptz,
  reviewer_profile_id uuid references public.profiles (id),
  reviewer_note text,
  primary key (business_id, category)
);

-- Enforce activation via trigger (requires at least one approved category).
create or replace function public.enforce_business_activation()
returns trigger
language plpgsql
as $$
begin
  if new.is_active = true then
    if not exists (
      select 1
      from public.business_category_approvals bca
      where bca.business_id = new.id
        and bca.status = 'approved'
    ) then
      raise exception 'Business cannot be active without at least one approved category';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_businesses_activation
before insert or update of is_active on public.businesses
for each row execute function public.enforce_business_activation();

create table public.service_regions (
  id uuid primary key default gen_random_uuid(),
  city_code text not null,
  city_name text not null,
  district_code text not null,
  district_name text not null,
  category public.service_category not null,
  is_open boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (city_code, district_code, category)
);

create table public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, profile_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_addresses_updated before update on public.customer_addresses
for each row execute function public.set_updated_at();

create trigger trg_businesses_updated before update on public.businesses
for each row execute function public.set_updated_at();

create trigger trg_applications_updated before update on public.business_applications
for each row execute function public.set_updated_at();

create trigger trg_regions_updated before update on public.service_regions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;

  insert into public.profile_roles (profile_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.has_role(target_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    where pr.profile_id = auth.uid()
      and pr.role = target_role
  );
$$;

alter table public.profiles enable row level security;
alter table public.profile_roles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.businesses enable row level security;
alter table public.business_applications enable row level security;
alter table public.business_category_approvals enable row level security;
alter table public.service_regions enable row level security;
alter table public.staff_memberships enable row level security;

create policy profiles_select_own on public.profiles
for select using (id = auth.uid() or public.has_role('platform_admin'));

create policy profiles_update_own on public.profiles
for update using (id = auth.uid());

create policy profile_roles_select_own on public.profile_roles
for select using (profile_id = auth.uid() or public.has_role('platform_admin'));

create policy addresses_own_all on public.customer_addresses
for all using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy applications_select on public.business_applications
for select using (
  applicant_profile_id = auth.uid()
  or public.has_role('platform_admin')
);

create policy applications_insert_own on public.business_applications
for insert with check (applicant_profile_id = auth.uid());

create policy applications_update_own_draft on public.business_applications
for update using (
  applicant_profile_id = auth.uid()
  and status in ('draft', 'needs_info')
);

create policy applications_admin_update on public.business_applications
for update using (public.has_role('platform_admin'));

create policy businesses_select on public.businesses
for select using (
  owner_profile_id = auth.uid()
  or public.has_role('platform_admin')
  or exists (
    select 1 from public.staff_memberships sm
    where sm.business_id = businesses.id
      and sm.profile_id = auth.uid()
      and sm.is_active
  )
);

create policy businesses_admin_update on public.businesses
for update using (public.has_role('platform_admin'));

create policy category_approvals_select on public.business_category_approvals
for select using (
  public.has_role('platform_admin')
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
);

create policy category_approvals_admin on public.business_category_approvals
for all using (public.has_role('platform_admin'))
with check (public.has_role('platform_admin'));

create policy regions_public_read on public.service_regions
for select using (true);

create policy regions_admin_write on public.service_regions
for all using (public.has_role('platform_admin'))
with check (public.has_role('platform_admin'));

create policy staff_memberships_select on public.staff_memberships
for select using (
  profile_id = auth.uid()
  or public.has_role('platform_admin')
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
);

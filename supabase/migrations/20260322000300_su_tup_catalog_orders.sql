-- Klimacın Kapıda — phase (d)
-- Damacana su + tüp: katalog, atomik stok, depozito/boş kap, sipariş
-- Tutarlar kuruş; zaman damgaları UTC.
-- Tüp ürün kartında tehlikeli kurulum talimatı alanı YOK.

create type public.catalog_category as enum ('su', 'tup');

create type public.product_order_status as enum (
  'pending',
  'accepted',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

create type public.door_payment_method as enum (
  'cash_on_delivery',
  'pos_on_delivery'
);

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category public.catalog_category not null,
  name text not null check (char_length(trim(name)) >= 2),
  brand text,
  -- Su: hacim (litre). Tüp: net ürün boyutu (ör. 12 kg) volume_liters null olabilir; size_label kullanılır.
  volume_liters numeric(8, 2) check (volume_liters is null or volume_liters > 0),
  size_label text,
  unit_price_kurus integer not null check (unit_price_kurus >= 0),
  deposit_kurus integer not null default 0 check (deposit_kurus >= 0),
  requires_empty_return boolean not null default false,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint catalog_products_su_rules check (
    category <> 'su'
    or (
      brand is not null
      and char_length(trim(brand)) >= 1
      and volume_liters is not null
    )
  ),
  constraint catalog_products_tup_rules check (
    category <> 'tup'
    or (
      size_label is not null
      and char_length(trim(size_label)) >= 1
    )
  ),
  constraint catalog_products_deposit_empty check (
    (not requires_empty_return and deposit_kurus = 0)
    or (requires_empty_return and deposit_kurus >= 0)
  )
);

create table public.product_stock (
  product_id uuid primary key references public.catalog_products (id) on delete cascade,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint product_stock_available check (quantity_on_hand >= quantity_reserved)
);

create table public.product_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  business_id uuid not null references public.businesses (id),
  address_id uuid not null references public.customer_addresses (id),
  category public.catalog_category not null,
  status public.product_order_status not null default 'pending',
  city_code text not null,
  city_name text not null,
  district_code text not null,
  district_name text not null,
  subtotal_kurus integer not null check (subtotal_kurus >= 0),
  deposit_kurus_total integer not null default 0 check (deposit_kurus_total >= 0),
  empty_containers_expected integer not null default 0 check (empty_containers_expected >= 0),
  empty_containers_returned integer check (
    empty_containers_returned is null
    or empty_containers_returned >= 0
  ),
  deposit_refund_kurus integer check (
    deposit_refund_kurus is null
    or deposit_refund_kurus >= 0
  ),
  payment_method public.door_payment_method not null,
  -- Platform müşteri bedelini tahsil etmiş gibi gösterme; kapıda ödeme.
  customer_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  constraint product_orders_empty_on_deliver check (
    status <> 'delivered'
    or empty_containers_returned is not null
  )
);

create table public.product_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.product_orders (id) on delete cascade,
  product_id uuid not null references public.catalog_products (id),
  quantity integer not null check (quantity > 0),
  unit_price_kurus integer not null check (unit_price_kurus >= 0),
  deposit_kurus integer not null default 0 check (deposit_kurus >= 0),
  requires_empty_return boolean not null default false,
  name_snapshot text not null,
  brand_snapshot text,
  volume_liters_snapshot numeric(8, 2),
  size_label_snapshot text,
  created_at timestamptz not null default timezone('utc', now())
);

create index catalog_products_business_idx
  on public.catalog_products (business_id, category, is_active);
create index product_orders_customer_idx
  on public.product_orders (customer_id, created_at desc);
create index product_orders_business_idx
  on public.product_orders (business_id, status, created_at desc);
create index product_order_items_order_idx
  on public.product_order_items (order_id);

create trigger trg_catalog_products_updated before update on public.catalog_products
for each row execute function public.set_updated_at();

create trigger trg_product_stock_updated before update on public.product_stock
for each row execute function public.set_updated_at();

create trigger trg_product_orders_updated before update on public.product_orders
for each row execute function public.set_updated_at();

create or replace function public.assert_catalog_region_open(
  p_category public.catalog_category,
  p_city_code text,
  p_district_code text
)
returns void
language plpgsql
stable
as $$
declare
  v_service public.service_category;
begin
  v_service := p_category::text::public.service_category;
  if not exists (
    select 1
    from public.service_regions sr
    where sr.city_code = p_city_code
      and sr.district_code = p_district_code
      and sr.category = v_service
      and sr.is_open = true
  ) then
    raise exception 'CATALOG_REGION_CLOSED'
      using errcode = 'P0001',
            message = 'Bu bölgede seçilen kategori için hizmet açık değil';
  end if;
end;
$$;

create or replace function public.business_can_sell_catalog(
  p_business_id uuid,
  p_category public.catalog_category
)
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
     and bca.category = p_category::text::public.service_category
     and bca.status = 'approved'
    where b.id = p_business_id
      and b.is_active = true
  );
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
  -- Tüp: tehlikeli kurulum içeriği kabul edilmez (basit anahtar kelime koruması).
  if p_category = 'tup' and p_description is not null then
    if p_description ~* '(montaj|kurulum|bağla|vanayı|kaçak|ateş|kaynak)' then
      raise exception 'TUP_NO_INSTALL_GUIDANCE'
        using errcode = 'P0001',
              message = 'Tüp ürün açıklamasında kurulum/tehlikeli yönlendirme olamaz';
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

create or replace function public.adjust_product_stock(
  p_product_id uuid,
  p_quantity_on_hand integer
)
returns public.product_stock
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.catalog_products;
  s public.product_stock;
begin
  if auth.uid() is null then
    raise exception 'CATALOG_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_quantity_on_hand < 0 then
    raise exception 'CATALOG_INVALID_STOCK' using errcode = 'P0001';
  end if;

  select * into p from public.catalog_products where id = p_product_id;
  if not found then
    raise exception 'CATALOG_PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p.business_id
      and (b.owner_profile_id = auth.uid() or public.has_role('platform_admin'))
  ) then
    raise exception 'CATALOG_FORBIDDEN' using errcode = '42501';
  end if;

  select * into s from public.product_stock where product_id = p_product_id for update;
  if not found then
    raise exception 'CATALOG_STOCK_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_quantity_on_hand < s.quantity_reserved then
    raise exception 'CATALOG_STOCK_BELOW_RESERVED' using errcode = 'P0001';
  end if;

  update public.product_stock
  set quantity_on_hand = p_quantity_on_hand
  where product_id = p_product_id
  returning * into s;

  return s;
end;
$$;

-- Atomik sipariş: stok rezervasyonu + satır snapshot (istemci fiyata güvenilmez).
create or replace function public.place_product_order(
  p_business_id uuid,
  p_address_id uuid,
  p_category public.catalog_category,
  p_payment_method public.door_payment_method,
  p_items jsonb,
  p_customer_note text default null
)
returns public.product_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid := auth.uid();
  addr public.customer_addresses;
  biz public.businesses;
  item jsonb;
  prod public.catalog_products;
  stock public.product_stock;
  qty integer;
  subtotal integer := 0;
  deposit_total integer := 0;
  empty_expected integer := 0;
  ord public.product_orders;
begin
  if v_customer is null then
    raise exception 'CATALOG_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'CATALOG_EMPTY_CART' using errcode = 'P0001';
  end if;

  select * into addr from public.customer_addresses where id = p_address_id;
  if not found or addr.profile_id <> v_customer then
    raise exception 'CATALOG_ADDRESS_INVALID' using errcode = 'P0001';
  end if;

  select * into biz from public.businesses where id = p_business_id;
  if not found then
    raise exception 'CATALOG_BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not public.business_can_sell_catalog(p_business_id, p_category) then
    raise exception 'CATALOG_BUSINESS_NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  if biz.city_code <> addr.city_code or biz.district_code <> addr.district_code then
    raise exception 'CATALOG_OUT_OF_AREA' using errcode = 'P0001';
  end if;

  perform public.assert_catalog_region_open(p_category, addr.city_code, addr.district_code);

  -- First pass: lock stock and validate; compute totals from DB prices.
  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := (item->>'quantity')::integer;
    if qty is null or qty <= 0 then
      raise exception 'CATALOG_INVALID_QTY' using errcode = 'P0001';
    end if;

    select * into prod
    from public.catalog_products
    where id = (item->>'productId')::uuid
    for update;

    if not found
       or prod.business_id <> p_business_id
       or prod.category <> p_category
       or prod.is_active = false then
      raise exception 'CATALOG_PRODUCT_NOT_FOUND' using errcode = 'P0001';
    end if;

    select * into stock
    from public.product_stock
    where product_id = prod.id
    for update;

    if not found then
      raise exception 'CATALOG_STOCK_NOT_FOUND' using errcode = 'P0001';
    end if;
    if stock.quantity_on_hand - stock.quantity_reserved < qty then
      raise exception 'CATALOG_INSUFFICIENT_STOCK' using errcode = 'P0001';
    end if;

    subtotal := subtotal + (prod.unit_price_kurus * qty);
    deposit_total := deposit_total + (prod.deposit_kurus * qty);
    if prod.requires_empty_return then
      empty_expected := empty_expected + qty;
    end if;
  end loop;

  insert into public.product_orders (
    customer_id, business_id, address_id, category, status,
    city_code, city_name, district_code, district_name,
    subtotal_kurus, deposit_kurus_total, empty_containers_expected,
    payment_method, customer_note
  ) values (
    v_customer, p_business_id, p_address_id, p_category, 'pending',
    addr.city_code, addr.city_name, addr.district_code, addr.district_name,
    subtotal, deposit_total, empty_expected,
    p_payment_method, p_customer_note
  )
  returning * into ord;

  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := (item->>'quantity')::integer;

    select * into prod
    from public.catalog_products
    where id = (item->>'productId')::uuid;

    update public.product_stock
    set quantity_reserved = quantity_reserved + qty
    where product_id = prod.id
      and quantity_on_hand - quantity_reserved >= qty;

    if not found then
      raise exception 'CATALOG_INSUFFICIENT_STOCK' using errcode = 'P0001';
    end if;

    insert into public.product_order_items (
      order_id, product_id, quantity,
      unit_price_kurus, deposit_kurus, requires_empty_return,
      name_snapshot, brand_snapshot, volume_liters_snapshot, size_label_snapshot
    ) values (
      ord.id, prod.id, qty,
      prod.unit_price_kurus, prod.deposit_kurus, prod.requires_empty_return,
      prod.name, prod.brand, prod.volume_liters, prod.size_label
    );
  end loop;

  return ord;
end;
$$;

create or replace function public.accept_product_order(p_order_id uuid)
returns public.product_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.product_orders;
begin
  select * into ord from public.product_orders where id = p_order_id for update;
  if not found then
    raise exception 'CATALOG_ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = ord.business_id and b.owner_profile_id = auth.uid()
  ) and not public.has_role('platform_admin') then
    raise exception 'CATALOG_FORBIDDEN' using errcode = '42501';
  end if;
  if ord.status <> 'pending' then
    raise exception 'CATALOG_INVALID_STATE' using errcode = 'P0001';
  end if;

  update public.product_orders
  set status = 'accepted', accepted_at = timezone('utc', now())
  where id = ord.id
  returning * into ord;

  return ord;
end;
$$;

create or replace function public.cancel_product_order(p_order_id uuid)
returns public.product_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.product_orders;
  line record;
begin
  select * into ord from public.product_orders where id = p_order_id for update;
  if not found then
    raise exception 'CATALOG_ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    ord.customer_id = auth.uid()
    or exists (
      select 1 from public.businesses b
      where b.id = ord.business_id and b.owner_profile_id = auth.uid()
    )
    or public.has_role('platform_admin')
  ) then
    raise exception 'CATALOG_FORBIDDEN' using errcode = '42501';
  end if;

  if ord.status not in ('pending', 'accepted') then
    raise exception 'CATALOG_INVALID_STATE' using errcode = 'P0001';
  end if;

  for line in
    select product_id, quantity from public.product_order_items where order_id = ord.id
  loop
    update public.product_stock
    set quantity_reserved = greatest(0, quantity_reserved - line.quantity)
    where product_id = line.product_id;
  end loop;

  update public.product_orders
  set status = 'cancelled', cancelled_at = timezone('utc', now())
  where id = ord.id
  returning * into ord;

  return ord;
end;
$$;

create or replace function public.deliver_product_order(
  p_order_id uuid,
  p_empty_containers_returned integer default 0
)
returns public.product_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.product_orders;
  line record;
  refund integer := 0;
  deposit_unit integer;
begin
  if p_empty_containers_returned < 0 then
    raise exception 'CATALOG_INVALID_EMPTY_RETURN' using errcode = 'P0001';
  end if;

  select * into ord from public.product_orders where id = p_order_id for update;
  if not found then
    raise exception 'CATALOG_ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    exists (
      select 1 from public.businesses b
      where b.id = ord.business_id and b.owner_profile_id = auth.uid()
    )
    or exists (
      select 1 from public.staff_memberships sm
      where sm.business_id = ord.business_id
        and sm.profile_id = auth.uid()
        and sm.is_active
    )
    or public.has_role('platform_admin')
  ) then
    raise exception 'CATALOG_FORBIDDEN' using errcode = '42501';
  end if;

  if ord.status not in ('accepted', 'out_for_delivery') then
    raise exception 'CATALOG_INVALID_STATE' using errcode = 'P0001';
  end if;

  if p_empty_containers_returned > ord.empty_containers_expected then
    raise exception 'CATALOG_EMPTY_RETURN_EXCEEDS' using errcode = 'P0001';
  end if;

  for line in
    select * from public.product_order_items where order_id = ord.id
  loop
    update public.product_stock
    set quantity_on_hand = quantity_on_hand - line.quantity,
        quantity_reserved = greatest(0, quantity_reserved - line.quantity)
    where product_id = line.product_id
      and quantity_on_hand >= line.quantity
      and quantity_reserved >= line.quantity;

    if not found then
      raise exception 'CATALOG_STOCK_CONSUME_FAILED' using errcode = 'P0001';
    end if;
  end loop;

  -- Depozito iadesi: iade edilen boş kap oranında (eşit birim varsayımı).
  if ord.empty_containers_expected > 0 and ord.deposit_kurus_total > 0 then
    deposit_unit := ord.deposit_kurus_total / ord.empty_containers_expected;
    refund := deposit_unit * p_empty_containers_returned;
  end if;

  update public.product_orders
  set status = 'delivered',
      delivered_at = timezone('utc', now()),
      empty_containers_returned = p_empty_containers_returned,
      deposit_refund_kurus = refund
  where id = ord.id
  returning * into ord;

  return ord;
end;
$$;

alter table public.catalog_products enable row level security;
alter table public.product_stock enable row level security;
alter table public.product_orders enable row level security;
alter table public.product_order_items enable row level security;

create policy catalog_products_select on public.catalog_products
for select using (
  is_active = true
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or public.has_role('platform_admin')
);

create policy product_stock_select on public.product_stock
for select using (
  exists (
    select 1 from public.catalog_products p
    where p.id = product_id
      and (
        p.is_active = true
        or exists (
          select 1 from public.businesses b
          where b.id = p.business_id and b.owner_profile_id = auth.uid()
        )
        or public.has_role('platform_admin')
      )
  )
);

create policy product_orders_select on public.product_orders
for select using (
  customer_id = auth.uid()
  or exists (
    select 1 from public.businesses b
    where b.id = business_id and b.owner_profile_id = auth.uid()
  )
  or exists (
    select 1 from public.staff_memberships sm
    where sm.business_id = product_orders.business_id
      and sm.profile_id = auth.uid()
      and sm.is_active
  )
  or public.has_role('platform_admin')
);

create policy product_order_items_select on public.product_order_items
for select using (
  exists (
    select 1 from public.product_orders o
    where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or exists (
          select 1 from public.businesses b
          where b.id = o.business_id and b.owner_profile_id = auth.uid()
        )
        or exists (
          select 1 from public.staff_memberships sm
          where sm.business_id = o.business_id
            and sm.profile_id = auth.uid()
            and sm.is_active
        )
        or public.has_role('platform_admin')
      )
  )
);

grant execute on function public.upsert_catalog_product(uuid, public.catalog_category, text, integer, text, numeric, text, integer, boolean, text, integer, uuid) to authenticated;
grant execute on function public.adjust_product_stock(uuid, integer) to authenticated;
grant execute on function public.place_product_order(uuid, uuid, public.catalog_category, public.door_payment_method, jsonb, text) to authenticated;
grant execute on function public.accept_product_order(uuid) to authenticated;
grant execute on function public.cancel_product_order(uuid) to authenticated;
grant execute on function public.deliver_product_order(uuid, integer) to authenticated;

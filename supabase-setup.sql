-- =====================================================
-- STEPX DATABASE SETUP — Run this in Supabase SQL Editor
-- Project: gmlsowdzymxtawwxiffe
-- =====================================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  brand           text DEFAULT '',
  category        text,
  description     text DEFAULT '',
  wholesale_price numeric NOT NULL DEFAULT 0,
  retail_price    numeric NOT NULL DEFAULT 0,
  stock           jsonb NOT NULL DEFAULT '{}',
  images          text[] DEFAULT '{}',
  active          boolean NOT NULL DEFAULT true,
  age_group       text,
  color           jsonb,
  size_type       text NOT NULL DEFAULT 'single',
  is_trending     boolean NOT NULL DEFAULT false,
  is_new          boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2. MSAFIRI_USERS TABLE
CREATE TABLE IF NOT EXISTS public.msafiri_users (
  id            uuid PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL,
  phone         text DEFAULT '',
  role          text NOT NULL DEFAULT 'user',
  customer_type text NOT NULL DEFAULT 'retail',
  disabled      boolean NOT NULL DEFAULT false,
  push_token    text,
  created_at    timestamptz DEFAULT now()
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  user_name         text NOT NULL,
  user_phone        text NOT NULL,
  user_email        text,
  delivery_address  text,
  items             jsonb NOT NULL DEFAULT '[]',
  order_type        text,
  subtotal          numeric NOT NULL DEFAULT 0,
  total             numeric NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'pending',
  payment_method    text,
  payment_status    text NOT NULL DEFAULT 'pending',
  mpesa_ref         text,
  payment_proof_url text,
  vehicle_number    text,
  conductor_phone   text,
  brand_name        text,
  transit_location  text,
  transport_company text,
  transport_phone   text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 4. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  label      text NOT NULL DEFAULT 'Nyumbani',
  name       text NOT NULL,
  phone      text NOT NULL,
  region     text NOT NULL,
  location   text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  type       text NOT NULL DEFAULT 'order',
  order_id   uuid,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active   ON public.products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_notifs_user       ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user    ON public.addresses(user_id);

-- 7. ENABLE RLS
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msafiri_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES — Products (public read, admin write)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "products_admin_all" ON public.products
  FOR ALL TO service_role USING (true);

-- 9. RLS POLICIES — Orders (user sees own, service_role all)
CREATE POLICY "orders_user_read" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "orders_user_insert" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_service_all" ON public.orders
  FOR ALL TO service_role USING (true);

-- 10. RLS POLICIES — msafiri_users
CREATE POLICY "users_own_read" ON public.msafiri_users
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "users_own_update" ON public.msafiri_users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.msafiri_users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "users_service_all" ON public.msafiri_users
  FOR ALL TO service_role USING (true);

-- 11. RLS POLICIES — Addresses
CREATE POLICY "addresses_user_all" ON public.addresses
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "addresses_service_all" ON public.addresses
  FOR ALL TO service_role USING (true);

-- 12. RLS POLICIES — Notifications
CREATE POLICY "notifs_user_read" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notifs_service_all" ON public.notifications
  FOR ALL TO service_role USING (true);

-- 13. AUTO-CREATE USER PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.msafiri_users (id, name, email, phone, role, customer_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user',
    'retail'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. ADMIN USER — StepX Admin
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@stepx.com') THEN
    RAISE NOTICE 'Admin user already exists';
    RETURN;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id, 'authenticated', 'authenticated',
    'admin@stepx.com',
    crypt('Msafili@2024!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Administrator"}',
    NOW(), NOW(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, id
  ) VALUES (
    'admin@stepx.com', new_user_id,
    json_build_object('sub', new_user_id::text, 'email', 'admin@stepx.com'),
    'email', NOW(), NOW(), NOW(), gen_random_uuid()
  );

  RAISE NOTICE 'Admin user created: %', new_user_id;
END $$;

-- PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_service_role" ON public.push_subscriptions USING (true) WITH CHECK (true);

-- LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  address     text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations_service_role" ON public.locations USING (true) WITH CHECK (true);

-- VERIFY
SELECT 'products' as tbl, count(*) FROM public.products
UNION ALL SELECT 'orders', count(*) FROM public.orders
UNION ALL SELECT 'msafiri_users', count(*) FROM public.msafiri_users
UNION ALL SELECT 'addresses', count(*) FROM public.addresses
UNION ALL SELECT 'notifications', count(*) FROM public.notifications;

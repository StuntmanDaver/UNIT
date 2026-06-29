BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS tests;

SELECT plan(17);

CREATE OR REPLACE FUNCTION tests.authenticate_as(user_id uuid, email text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', user_id::text, true);
  PERFORM set_config('request.jwt.claim.email', email, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id::text, 'email', email, 'role', 'authenticated')::text,
    true
  );
END;
$$;

CREATE OR REPLACE FUNCTION tests.visible_post_count(user_id uuid, email text, target_property_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  count_visible integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  SELECT count(*) INTO count_visible FROM posts WHERE property_id = target_property_id;
  RESET ROLE;
  RETURN count_visible;
END;
$$;

CREATE OR REPLACE FUNCTION tests.visible_business_count(user_id uuid, email text, target_property_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  count_visible integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  SELECT count(*) INTO count_visible FROM businesses WHERE property_id = target_property_id;
  RESET ROLE;
  RETURN count_visible;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_post(user_id uuid, email text, target_property_id uuid, target_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  INSERT INTO posts (property_id, business_id, type, title, content)
  VALUES (target_property_id, target_business_id, 'announcement', 'RLS test post', 'blocked unless active');
  RESET ROLE;
  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR foreign_key_violation THEN
    RESET ROLE;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_insert_promotion(user_id uuid, email text, target_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  INSERT INTO promotions (
    advertiser_id,
    property_id,
    business_name,
    headline,
    description,
    start_date,
    end_date,
    review_status,
    payment_status
  )
  VALUES (
    user_id,
    target_property_id,
    'RLS Business',
    'RLS Promotion',
    'Blocked unless assigned property',
    now(),
    now() + interval '7 days',
    'draft',
    'unpaid'
  );
  RESET ROLE;
  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation OR foreign_key_violation THEN
    RESET ROLE;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_move_business_owner(user_id uuid, email text, target_business_id uuid, new_owner text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  UPDATE businesses SET owner_email = new_owner WHERE id = target_business_id;
  RESET ROLE;
  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR raise_exception OR check_violation THEN
    RESET ROLE;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_duplicate_unit_claim(user_id uuid, email text, target_property_id uuid, target_unit_number text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  INSERT INTO businesses (property_id, owner_email, business_name, category, unit_number)
  VALUES (target_property_id, email, 'Duplicate Unit Claim', 'services', target_unit_number);
  RESET ROLE;
  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR unique_violation OR check_violation THEN
    RESET ROLE;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.create_property_as_landlord(user_id uuid, email text, target_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  INSERT INTO properties (id, name, address, city, state, type, total_units, created_by_landlord_id)
  VALUES (target_property_id, 'Attached Property', '2 Test Way', 'Testville', 'FL', 'commercial', 1, user_id);
  RESET ROLE;
  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN
    RESET ROLE;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_self_activate(user_id uuid, email text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  UPDATE profiles SET status = 'active' WHERE id = user_id;
  RESET ROLE;
  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR raise_exception OR check_violation THEN
    RESET ROLE;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.admin_update_tenant_status(admin_id uuid, admin_email text, tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  changed integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(admin_id, admin_email);
  UPDATE profiles SET status = 'inactive' WHERE id = tenant_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RESET ROLE;
  RETURN changed;
EXCEPTION
  WHEN insufficient_privilege OR raise_exception OR check_violation THEN
    RESET ROLE;
    RETURN -1;
END;
$$;

CREATE OR REPLACE FUNCTION tests.try_self_mark_promotion_paid(user_id uuid, email text, target_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  promo_id uuid;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  INSERT INTO promotions (
    advertiser_id, property_id, business_name, headline, description,
    start_date, end_date, review_status, payment_status
  )
  VALUES (
    user_id, target_property_id, 'RLS Business', 'Pay Guard Promo',
    'guard test', now(), now() + interval '7 days', 'draft', 'unpaid'
  )
  RETURNING id INTO promo_id;

  -- guard_promotion_billing_columns must block this self-paid attempt.
  UPDATE promotions SET payment_status = 'paid' WHERE id = promo_id;
  RESET ROLE;
  RETURN true;
EXCEPTION
  WHEN insufficient_privilege OR raise_exception OR check_violation THEN
    RESET ROLE;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION tests.visible_advertiser_count(user_id uuid, email text, target_advertiser uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  count_visible integer;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM tests.authenticate_as(user_id, email);
  SELECT count(*) INTO count_visible FROM advertiser_profiles WHERE id = target_advertiser;
  RESET ROLE;
  RETURN count_visible;
END;
$$;

GRANT USAGE ON SCHEMA tests TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated;

WITH ids AS (
  SELECT
    '00000000-0000-4000-8000-000000000101'::uuid AS property_a,
    '00000000-0000-4000-8000-000000000102'::uuid AS property_b,
    '00000000-0000-4000-8000-000000000201'::uuid AS admin_a,
    '00000000-0000-4000-8000-000000000202'::uuid AS admin_b,
    '00000000-0000-4000-8000-000000000301'::uuid AS active_tenant,
    '00000000-0000-4000-8000-000000000302'::uuid AS pending_tenant,
    '00000000-0000-4000-8000-000000000303'::uuid AS outside_tenant,
    '00000000-0000-4000-8000-000000000401'::uuid AS active_business,
    '00000000-0000-4000-8000-000000000402'::uuid AS pending_business,
    '00000000-0000-4000-8000-000000000501'::uuid AS active_post
)
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
SELECT user_id, 'authenticated', 'authenticated', email, 'test', now(), now(), now()
FROM ids
CROSS JOIN LATERAL (
  VALUES
    (admin_a, 'admin-a@example.test'),
    (admin_b, 'admin-b@example.test'),
    (active_tenant, 'active@example.test'),
    (pending_tenant, 'pending@example.test'),
    (outside_tenant, 'outside@example.test')
) AS users(user_id, email)
ON CONFLICT (id) DO UPDATE
SET email = excluded.email,
    updated_at = now();

WITH ids AS (
  SELECT
    '00000000-0000-4000-8000-000000000101'::uuid AS property_a,
    '00000000-0000-4000-8000-000000000102'::uuid AS property_b,
    '00000000-0000-4000-8000-000000000201'::uuid AS admin_a,
    '00000000-0000-4000-8000-000000000202'::uuid AS admin_b,
    '00000000-0000-4000-8000-000000000301'::uuid AS active_tenant,
    '00000000-0000-4000-8000-000000000302'::uuid AS pending_tenant,
    '00000000-0000-4000-8000-000000000303'::uuid AS outside_tenant,
    '00000000-0000-4000-8000-000000000401'::uuid AS active_business,
    '00000000-0000-4000-8000-000000000402'::uuid AS pending_business,
    '00000000-0000-4000-8000-000000000501'::uuid AS active_post
)
INSERT INTO properties (id, name, address, city, state, type, total_units, created_by_landlord_id)
SELECT property_id, name, '1 Test Way', 'Testville', 'FL', 'commercial', 1, creator_id
FROM ids
CROSS JOIN LATERAL (
  VALUES
    (property_a, 'Security Test A', admin_a),
    (property_b, 'Security Test B', admin_b)
) AS properties(property_id, name, creator_id)
ON CONFLICT (id) DO UPDATE
SET name = excluded.name,
    created_by_landlord_id = excluded.created_by_landlord_id;

WITH ids AS (
  SELECT
    '00000000-0000-4000-8000-000000000101'::uuid AS property_a,
    '00000000-0000-4000-8000-000000000102'::uuid AS property_b,
    '00000000-0000-4000-8000-000000000201'::uuid AS admin_a,
    '00000000-0000-4000-8000-000000000202'::uuid AS admin_b,
    '00000000-0000-4000-8000-000000000301'::uuid AS active_tenant,
    '00000000-0000-4000-8000-000000000302'::uuid AS pending_tenant,
    '00000000-0000-4000-8000-000000000303'::uuid AS outside_tenant
)
INSERT INTO profiles (id, role, property_ids, email, status, activated_at)
SELECT profile_id, role_name, property_ids, email, status, activated_at
FROM ids
CROSS JOIN LATERAL (
  VALUES
    (admin_a, 'landlord', ARRAY[property_a], 'admin-a@example.test', 'active', now()),
    (admin_b, 'landlord', ARRAY[property_b], 'admin-b@example.test', 'active', now()),
    (active_tenant, 'tenant', ARRAY[property_a], 'active@example.test', 'active', now()),
    (pending_tenant, 'tenant', ARRAY[property_a], 'pending@example.test', 'invited', null),
    (outside_tenant, 'tenant', ARRAY[property_b], 'outside@example.test', 'active', now())
) AS profiles(profile_id, role_name, property_ids, email, status, activated_at)
ON CONFLICT (id) DO UPDATE
SET role = excluded.role,
    property_ids = excluded.property_ids,
    email = excluded.email,
    status = excluded.status,
    activated_at = excluded.activated_at;

WITH ids AS (
  SELECT
    '00000000-0000-4000-8000-000000000101'::uuid AS property_a,
    '00000000-0000-4000-8000-000000000401'::uuid AS active_business,
    '00000000-0000-4000-8000-000000000402'::uuid AS pending_business,
    '00000000-0000-4000-8000-000000000501'::uuid AS active_post
)
INSERT INTO businesses (id, property_id, owner_email, business_name, category)
SELECT business_id, property_a, email, name, 'services'
FROM ids
CROSS JOIN LATERAL (
  VALUES
    (active_business, 'active@example.test', 'Active Business'),
    (pending_business, 'pending@example.test', 'Pending Business')
) AS businesses(business_id, email, name)
ON CONFLICT (id) DO UPDATE
SET property_id = excluded.property_id,
    owner_email = excluded.owner_email,
    business_name = excluded.business_name,
    category = excluded.category;

UPDATE businesses
SET unit_number = 'Suite 101'
WHERE id = '00000000-0000-4000-8000-000000000401'::uuid;

INSERT INTO posts (id, property_id, business_id, type, title, content)
VALUES (
  '00000000-0000-4000-8000-000000000501'::uuid,
  '00000000-0000-4000-8000-000000000101'::uuid,
  '00000000-0000-4000-8000-000000000401'::uuid,
  'announcement',
  'Visible to active tenants',
  'RLS test fixture'
)
ON CONFLICT (id) DO UPDATE
SET property_id = excluded.property_id,
    business_id = excluded.business_id,
    type = excluded.type,
    title = excluded.title,
    content = excluded.content;

INSERT INTO advertiser_profiles (id, business_name, contact_email, status)
VALUES (
  '00000000-0000-4000-8000-000000000301'::uuid,
  'Active Business',
  'active@example.test',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET business_name = excluded.business_name,
    contact_email = excluded.contact_email,
    status = excluded.status;

SELECT is(
  tests.visible_post_count(
    '00000000-0000-4000-8000-000000000301'::uuid,
    'active@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid
  ),
  1,
  'active tenant can read posts for own property'
);

SELECT is(
  tests.visible_post_count(
    '00000000-0000-4000-8000-000000000302'::uuid,
    'pending@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid
  ),
  0,
  'pending tenant cannot read property posts'
);

SELECT is(
  tests.visible_business_count(
    '00000000-0000-4000-8000-000000000302'::uuid,
    'pending@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid
  ),
  1,
  'pending tenant can only read own pending business claim'
);

SELECT is(
  tests.visible_business_count(
    '00000000-0000-4000-8000-000000000303'::uuid,
    'outside@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid
  ),
  0,
  'tenant cannot read businesses outside assigned property'
);

SELECT is(
  tests.try_insert_post(
    '00000000-0000-4000-8000-000000000302'::uuid,
    'pending@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid,
    '00000000-0000-4000-8000-000000000402'::uuid
  ),
  false,
  'pending tenant cannot create posts'
);

SELECT is(
  tests.try_self_activate(
    '00000000-0000-4000-8000-000000000302'::uuid,
    'pending@example.test'
  ),
  false,
  'pending tenant cannot self-activate profile'
);

SELECT is(
  tests.admin_update_tenant_status(
    '00000000-0000-4000-8000-000000000201'::uuid,
    'admin-a@example.test',
    '00000000-0000-4000-8000-000000000303'::uuid
  ),
  0,
  'landlord cannot update tenant outside assigned property'
);

SELECT is(
  tests.admin_update_tenant_status(
    '00000000-0000-4000-8000-000000000201'::uuid,
    'admin-a@example.test',
    '00000000-0000-4000-8000-000000000302'::uuid
  ),
  1,
  'landlord can update invited tenant in assigned property'
);

SELECT is(
  tests.try_insert_promotion(
    '00000000-0000-4000-8000-000000000301'::uuid,
    'active@example.test',
    '00000000-0000-4000-8000-000000000102'::uuid
  ),
  false,
  'tenant cannot insert promotion for outside property'
);

SELECT is(
  tests.try_insert_promotion(
    '00000000-0000-4000-8000-000000000301'::uuid,
    'active@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid
  ),
  true,
  'tenant can insert draft promotion for own property'
);

SELECT is(
  tests.try_insert_post(
    '00000000-0000-4000-8000-000000000301'::uuid,
    'active@example.test',
    '00000000-0000-4000-8000-000000000102'::uuid,
    '00000000-0000-4000-8000-000000000401'::uuid
  ),
  false,
  'tenant cannot create post with mismatched business property'
);

SELECT is(
  tests.try_move_business_owner(
    '00000000-0000-4000-8000-000000000301'::uuid,
    'active@example.test',
    '00000000-0000-4000-8000-000000000401'::uuid,
    'attacker@example.test'
  ),
  false,
  'tenant cannot change business owner_email'
);

SELECT is(
  tests.try_duplicate_unit_claim(
    '00000000-0000-4000-8000-000000000302'::uuid,
    'pending@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid,
    'Suite 101'
  ),
  false,
  'database rejects duplicate claimed unit per property'
);

SELECT is(
  tests.create_property_as_landlord(
    '00000000-0000-4000-8000-000000000201'::uuid,
    'admin-a@example.test',
    '00000000-0000-4000-8000-000000000199'::uuid
  ),
  true,
  'landlord can create a property that attaches through trigger'
);

SELECT is(
  tests.try_self_mark_promotion_paid(
    '00000000-0000-4000-8000-000000000301'::uuid,
    'active@example.test',
    '00000000-0000-4000-8000-000000000101'::uuid
  ),
  false,
  'tenant cannot self-mark own promotion payment_status = paid'
);

-- Multi-landlord isolation: advertiser 301 ran a promotion in property_a (the
-- persisted draft from the "tenant can insert draft promotion" assertion above).
-- admin_a (landlord of property_a) may see that advertiser; admin_b (landlord of
-- property_b only) must not.
SELECT is(
  tests.visible_advertiser_count(
    '00000000-0000-4000-8000-000000000201'::uuid,
    'admin-a@example.test',
    '00000000-0000-4000-8000-000000000301'::uuid
  ),
  1,
  'landlord can see advertiser linked to a promotion in own property'
);

SELECT is(
  tests.visible_advertiser_count(
    '00000000-0000-4000-8000-000000000202'::uuid,
    'admin-b@example.test',
    '00000000-0000-4000-8000-000000000301'::uuid
  ),
  0,
  'landlord cannot see advertiser linked only to another landlord''s property'
);

SELECT * FROM finish();

ROLLBACK;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS tests;

SELECT plan(8);

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

SELECT * FROM finish();

ROLLBACK;

-- Relationship audit: run against a target database connection.
-- Intended for cross-surface production sanity checks.

-- 1) Auth/profile sync
SELECT 'profiles_without_auth' AS check_name, COUNT(*) AS count
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

SELECT 'auth_without_profile' AS check_name, COUNT(*) AS count
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- 2) Tenant accounts and property ownership
SELECT 'tenant_profiles_missing_property_ids' AS check_name, COUNT(*) AS count
FROM profiles
WHERE role = 'tenant' AND (property_ids IS NULL OR array_length(property_ids, 1) = 0);

SELECT 'properties_without_owner' AS check_name, COUNT(*) AS count
FROM properties p
WHERE NOT EXISTS (
  SELECT 1 FROM profiles pr
  WHERE pr.role = 'landlord'
    AND p.id = ANY (pr.property_ids)
);

-- 3) Advertiser profile parity
SELECT 'active_advertiser_without_active_tenant_profile' AS check_name, COUNT(*) AS count
FROM advertiser_profiles ap
LEFT JOIN profiles p ON p.id = ap.id
WHERE ap.status = 'active'
  AND (
    p.id IS NULL
    OR p.role <> 'tenant'
    OR p.status <> 'active'
  );

SELECT 'active_advertiser_without_property_assignment' AS check_name, COUNT(*) AS count
FROM advertiser_profiles ap
JOIN profiles p ON p.id = ap.id
WHERE ap.status = 'active'
  AND p.role = 'tenant'
  AND COALESCE(array_length(p.property_ids, 1), 0) = 0;

SELECT 'tenant_advertiser_status_mismatch' AS check_name, COUNT(*) AS count
FROM profiles p
JOIN advertiser_profiles ap ON ap.id = p.id
WHERE p.role = 'tenant'
  AND (
    (p.status = 'active' AND ap.status <> 'active')
    OR (p.status = 'inactive' AND ap.status <> 'suspended')
    OR (p.status = 'invited' AND ap.status <> 'pending')
  );

SELECT 'profiles_not_in_advertiser_profiles' AS check_name, COUNT(*) AS count
FROM profiles p
WHERE p.role = 'tenant'
  AND p.status IN ('active', 'invited')
  AND NOT EXISTS (
    SELECT 1 FROM advertiser_profiles ap
    WHERE ap.id = p.id
  );

SELECT 'advertiser_profiles_without_profile' AS check_name, COUNT(*) AS count
FROM advertiser_profiles ap
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = ap.id);

SELECT 'advertiser_profiles_not_active_for_tenant_advertisers' AS check_name, COUNT(*) AS count
FROM profiles p
JOIN advertiser_profiles ap ON ap.id = p.id
WHERE p.role = 'tenant'
  AND p.status = 'active'
  AND ap.status <> 'active';

-- 4) Promotions relationship integrity
SELECT 'promotions_missing_property' AS check_name, COUNT(*) AS count
FROM promotions p
WHERE NOT EXISTS (SELECT 1 FROM properties pr WHERE pr.id = p.property_id);

SELECT 'promotions_missing_advertiser_profile' AS check_name, COUNT(*) AS count
FROM promotions p
WHERE p.advertiser_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM advertiser_profiles ap
    WHERE ap.id = p.advertiser_id
  );

SELECT 'promotion_property_not_in_advertiser_profile' AS check_name, COUNT(*) AS count
FROM promotions promo
JOIN profiles p ON p.id = promo.advertiser_id
WHERE promo.advertiser_id IS NOT NULL
  AND p.role = 'tenant'
  AND NOT (promo.property_id = ANY (COALESCE(p.property_ids, '{}')));

SELECT 'external_promotions_without_business_name' AS check_name, COUNT(*) AS count
FROM promotions p
WHERE p.advertiser_id IS NULL
  AND COALESCE(NULLIF(TRIM(p.business_name), ''), '') = '';

SELECT 'approved_promotions_without_approval_event' AS check_name, COUNT(*) AS count
FROM promotions p
WHERE p.review_status = 'approved'
  AND NOT EXISTS (
    SELECT 1
    FROM promotion_status_events pse
    WHERE pse.promotion_id = p.id
      AND pse.to_review_status = 'approved'
      AND (p.advertiser_id IS NULL OR pse.actor_type IN ('admin', 'system', 'webhook'))
  );

SELECT 'paid_promotions_without_completed_attempt' AS check_name, COUNT(*) AS count
FROM promotions p
WHERE p.payment_status = 'paid'
  AND NOT EXISTS (
    SELECT 1
    FROM promotion_payment_attempts a
    WHERE a.promotion_id = p.id
      AND a.status = 'completed'
  );

-- 5) Notification ownership and property scope
SELECT 'notifications_user_not_found' AS check_name, COUNT(*) AS count
FROM notifications n
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = n.user_id);

SELECT 'notifications_property_not_in_user_profile' AS check_name, COUNT(*) AS count
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE COALESCE(p.property_ids, '{}') = '{}' OR NOT (n.property_id = ANY (p.property_ids));

-- 6) Owner links and business attribution
SELECT 'businesses_without_owner_profile' AS check_name, COUNT(*) AS count
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.email = b.owner_email
);

SELECT 'business_owner_property_mismatch' AS check_name, COUNT(*) AS count
FROM businesses b
JOIN profiles p ON p.email = b.owner_email
WHERE p.role = 'tenant'
  AND NOT (b.property_id = ANY (COALESCE(p.property_ids, '{}')));

-- 7) Admin actions ready-state checks
SELECT 'promotion_payment_attempts_without_promotion' AS check_name, COUNT(*) AS count
FROM promotion_payment_attempts pa
WHERE NOT EXISTS (SELECT 1 FROM promotions p WHERE p.id = pa.promotion_id);

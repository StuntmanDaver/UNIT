-- Promote a user to landlord role with access to specific properties
-- Run this in Supabase Dashboard -> SQL Editor
--
-- Usage:
--   1. Replace 'landlord@example.com' with the user's actual email
--   2. Replace the property UUIDs with actual property IDs from your properties table
--   3. Run in Supabase SQL Editor (requires service_role or superuser access)

-- Step 1: Find the user's auth ID by email
-- SELECT id, email FROM auth.users WHERE email = 'landlord@example.com';

-- Step 2: Promote to landlord with property access
UPDATE public.profiles
SET
  role = 'landlord',
  property_ids = ARRAY[
    '00000000-0000-0000-0000-000000000001'  -- Replace with actual property UUID(s)
    -- Add more: , '00000000-0000-0000-0000-000000000002'
  ]::uuid[]
WHERE email = 'landlord@example.com';

-- Step 3: Verify the update
-- SELECT id, role, property_ids, email FROM public.profiles WHERE email = 'landlord@example.com';

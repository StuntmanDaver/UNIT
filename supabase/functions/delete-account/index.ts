import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';
import { captureEdgeException } from '../_shared/sentry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BusinessRow = {
  id: string;
  logo_url: string | null;
};

type AssetRow = {
  image_url: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function publicAssetPath(url: string | null): string | null {
  if (!url) return null;

  const marker = '/storage/v1/object/public/public-assets/';
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;

  const pathWithQuery = url.slice(markerIndex + marker.length);
  const [path] = pathWithQuery.split('?');
  return path ? decodeURIComponent(path) : null;
}

async function assertNoError<T>(
  result: { data: T | null; error: { message: string } | null },
  label: string
): Promise<T | null> {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userEmail = user.email ?? '';

    const businesses = await assertNoError<BusinessRow[]>(
      await adminClient
        .from('businesses')
        .select('id, logo_url')
        .eq('owner_email', userEmail),
      'Fetch businesses'
    );
    const businessRows = businesses ?? [];
    const businessIds = businessRows.map((business) => business.id);

    const assetPaths = new Set<string>();
    for (const business of businessRows) {
      const path = publicAssetPath(business.logo_url);
      if (path) assetPaths.add(path);
    }

    if (businessIds.length > 0) {
      const postAssets = await assertNoError<AssetRow[]>(
        await adminClient
          .from('posts')
          .select('image_url')
          .in('business_id', businessIds),
        'Fetch post assets'
      );
      for (const post of postAssets ?? []) {
        const path = publicAssetPath(post.image_url);
        if (path) assetPaths.add(path);
      }

      await assertNoError(
        await adminClient.from('recommendations').delete().in('business_id', businessIds),
        'Delete recommendations'
      );
      await assertNoError(
        await adminClient.from('posts').delete().in('business_id', businessIds),
        'Delete posts'
      );
    }

    const promotionAssets = await assertNoError<AssetRow[]>(
      await adminClient
        .from('promotions')
        .select('image_url')
        .eq('advertiser_id', user.id),
      'Fetch promotion assets'
    );
    for (const promotion of promotionAssets ?? []) {
      const path = publicAssetPath(promotion.image_url);
      if (path) assetPaths.add(path);
    }

    if (assetPaths.size > 0) {
      const { error: storageError } = await adminClient.storage
        .from('public-assets')
        .remove([...assetPaths]);
      if (storageError) {
        console.warn('delete-account storage cleanup failed:', storageError.message);
      }
    }

    await assertNoError(
      await adminClient
        .from('promotions')
        .update({ reviewed_by: null })
        .eq('reviewed_by', user.id),
      'Clear reviewed promotions'
    );
    await assertNoError(
      await adminClient
        .from('promotions')
        .update({ refunded_by: null })
        .eq('refunded_by', user.id),
      'Clear refunded promotions'
    );
    await assertNoError(
      await adminClient
        .from('promotions')
        .update({ created_by_admin_id: null })
        .eq('created_by_admin_id', user.id),
      'Clear admin-authored promotions'
    );
    await assertNoError(
      await adminClient
        .from('promotion_status_events')
        .update({ actor_user_id: null })
        .eq('actor_user_id', user.id),
      'Clear promotion events'
    );
    await assertNoError(
      await adminClient
        .from('promotion_leads')
        .update({ owner_user_id: null })
        .eq('owner_user_id', user.id),
      'Clear promotion leads'
    );
    await assertNoError(
      await adminClient
        .from('audit_log')
        .update({ performed_by_user_id: null, performed_by_email: null })
        .eq('performed_by_user_id', user.id),
      'Clear audit log user fields'
    );
    if (userEmail) {
      await assertNoError(
        await adminClient
          .from('audit_log')
          .update({ performed_by_user_id: null, performed_by_email: null })
          .eq('performed_by_email', userEmail),
        'Clear audit log email fields'
      );
    }

    await assertNoError(
      await adminClient.from('ad_analytics').delete().eq('tenant_id', user.id),
      'Delete analytics'
    );
    await assertNoError(
      await adminClient
        .from('notifications')
        .delete()
        .eq('user_id', user.id),
      'Delete notifications'
    );
    if (userEmail) {
      await assertNoError(
        await adminClient
          .from('notifications')
          .delete()
          .eq('user_email', userEmail),
        'Delete email notifications'
      );
    }
    await assertNoError(
      await adminClient.from('activity_logs').delete().eq('user_id', user.id),
      'Delete activity logs'
    );
    await assertNoError(
      await adminClient.from('promotions').delete().eq('advertiser_id', user.id),
      'Delete tenant promotions'
    );
    await assertNoError(
      await adminClient.from('advertiser_profiles').delete().eq('id', user.id),
      'Delete advertiser profile'
    );
    await assertNoError(
      await adminClient.from('businesses').delete().eq('owner_email', userEmail),
      'Delete businesses'
    );

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      throw new Error(`Delete auth user: ${deleteUserError.message}`);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete account';
    console.error('delete-account failed:', message);
    await captureEdgeException(error, {
      functionName: 'delete-account',
      tags: { subsystem: 'account_deletion' },
    });
    return jsonResponse({ error: message }, 500);
  }
});

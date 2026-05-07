export const dynamic = 'force-dynamic';

import { AdminProfilePanel } from '@/components/admin/AdminProfilePanel';
import { getAdminProperties, logoutAdminAction } from '@/lib/admin/actions';
import { requireAdmin } from '@/lib/admin/auth';

export default async function AdminProfilePage() {
  const [context, properties] = await Promise.all([requireAdmin(), getAdminProperties()]);
  return <AdminProfilePanel profile={context.profile} properties={properties} logoutAction={logoutAdminAction} />;
}

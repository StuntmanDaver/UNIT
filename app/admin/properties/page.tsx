export const dynamic = 'force-dynamic';

import { PropertiesAdminClient } from '@/components/admin/PropertiesAdminClient';
import { createPropertyAction, getAdminProperties } from '@/lib/admin/actions';

export default async function AdminPropertiesPage() {
  const properties = await getAdminProperties();
  return <PropertiesAdminClient properties={properties} onCreateProperty={createPropertyAction} />;
}

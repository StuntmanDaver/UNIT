import type { AdminProfile, AdminProperty } from '@/lib/admin/types';

type Props = {
  profile: AdminProfile;
  properties: AdminProperty[];
  logoutAction: () => Promise<void>;
  pushPermissionGranted?: boolean | null;
};

export function AdminProfilePanel({ profile, properties, logoutAction, pushPermissionGranted }: Props) {
  const pushPermissionLabel =
    pushPermissionGranted === undefined || pushPermissionGranted === null
      ? 'Unknown'
      : pushPermissionGranted
        ? 'Granted'
        : 'Not granted';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">Admin Profile</h1>
          <p className="mt-1 text-sm text-[#465A75]">Review account access and mobile push status.</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="unit-btn unit-btn-secondary">Logout</button>
        </form>
      </header>

      <section className="unit-card p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-bold text-[#465A75]">Name</dt>
            <dd className="mt-1 font-black">{profile.full_name || profile.display_name || 'Admin'}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-[#465A75]">Email</dt>
            <dd className="mt-1 font-black">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-[#465A75]">Role</dt>
            <dd className="mt-1 font-black capitalize">{profile.role}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-[#465A75]">Push Token</dt>
            <dd className="mt-1 break-all font-black">{profile.push_token ?? 'Not registered'}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-[#465A75]">Push Permission</dt>
            <dd className="mt-1 font-black">{pushPermissionLabel}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-black">Assigned Properties</h2>
          <span className="text-sm font-bold text-[#465A75]">{properties.length} total</span>
        </div>
        {properties.map((property) => (
          <article key={property.id} className="unit-card p-4">
            <h3 className="font-black">{property.name}</h3>
            <p className="mt-1 text-sm text-[#465A75]">
              {property.address}, {property.city}, {property.state}
            </p>
          </article>
        ))}
        {properties.length === 0 && (
          <div className="unit-card py-12 text-center text-sm text-[#465A75]">
            No properties are assigned to this admin account.
          </div>
        )}
      </section>
    </div>
  );
}

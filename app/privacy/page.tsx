export const metadata = {
  title: 'Privacy Policy | UNIT',
  description: 'UNIT privacy policy for tenants, property admins, and advertisers.',
};

export default function PrivacyPage() {
  return (
    <main className="unit-page">
      <div className="unit-shell max-w-3xl">
        <p className="unit-muted text-sm font-bold uppercase tracking-wide">UNIT</p>
        <h1 className="mt-3 text-4xl font-bold">Privacy Policy</h1>
        <p className="unit-muted mt-3">Effective May 12, 2026</p>

        <section className="unit-card mt-8 space-y-5 p-6 leading-7">
          <p>
            UNIT helps tenants in commercial properties discover, contact, and promote local businesses in their property community. We collect the account, business profile, content, payment status, support, and device information needed to provide that service.
          </p>
          <p>
            We use Supabase for authentication, database, storage, and Edge Functions; Expo services for mobile updates and push notifications; Sentry for diagnostics; Google Play Billing for Android promotion purchases; and Stripe for eligible web portal payments.
          </p>
          <p>
            User-submitted business profiles, posts, promotions, logos, and images may be visible to other authorized users in the same property or to property admins for review and moderation. Payment card details are handled by the payment processor and are not stored by UNIT.
          </p>
          <p>
            You can request access, correction, or deletion of account data by using the in-app Delete Account control or the public deletion request page. Some operational, legal, payment, moderation, and security records may be retained when required.
          </p>
          <p>
            Contact: <a className="unit-link" href="mailto:support@unitapp.com">support@unitapp.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}

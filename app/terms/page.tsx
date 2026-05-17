export const metadata = {
  title: 'Terms of Use | UNIT',
  description: 'UNIT terms for tenant community and promotion content.',
};

export default function TermsPage() {
  return (
    <main className="unit-page">
      <div className="unit-shell max-w-3xl">
        <p className="unit-muted text-sm font-bold uppercase tracking-wide">UNIT</p>
        <h1 className="mt-3 text-4xl font-bold">Terms of Use</h1>
        <p className="unit-muted mt-3">Effective May 12, 2026</p>

        <section className="unit-card mt-8 space-y-5 p-6 leading-7">
          <p>
            By using UNIT, you agree to use the app only for lawful business and property-community purposes. You are responsible for content you post, upload, promote, or submit for review.
          </p>
          <p>
            Do not post spam, harassment, threats, illegal content, impersonation, misleading claims, private information without permission, or images and materials you do not have rights to share.
          </p>
          <p>
            Property admins may review reported content, hide or reject promotions, restrict abusive accounts, and preserve moderation records needed to keep the property community safe.
          </p>
          <p>
            Android promotion purchases inside the mobile app are processed through Google Play Billing. Web portal purchases, where available, may be processed by Stripe.
          </p>
          <p>
            Contact: <a className="unit-link" href="mailto:support@unitapp.com">support@unitapp.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}

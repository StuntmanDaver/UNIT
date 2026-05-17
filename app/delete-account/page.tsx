export const metadata = {
  title: 'Delete Account | UNIT',
  description: 'Request deletion of your UNIT account and related data.',
};

export default function DeleteAccountPage() {
  return (
    <main className="unit-page">
      <div className="unit-shell max-w-3xl">
        <p className="unit-muted text-sm font-bold uppercase tracking-wide">UNIT</p>
        <h1 className="mt-3 text-4xl font-bold">Delete Your Account</h1>
        <p className="unit-muted mt-3">Use this page for Google Play account deletion requests.</p>

        <section className="unit-card mt-8 space-y-5 p-6 leading-7">
          <p>
            The fastest way to delete your UNIT account is inside the mobile app: open Profile, choose Delete Account, and confirm. This deletes your account, profile, business listing, posts, promotions, notifications, and related account data.
          </p>
          <p>
            If you cannot access the app, email <a className="unit-link" href="mailto:support@unitapp.com?subject=UNIT%20account%20deletion%20request">support@unitapp.com</a> from the email address on your UNIT account with the subject &quot;UNIT account deletion request.&quot;
          </p>
          <p>
            UNIT may retain limited records required for security, legal, payment, tax, fraud prevention, or moderation obligations. Retained records are no longer used to provide an active account.
          </p>
        </section>
      </div>
    </main>
  );
}

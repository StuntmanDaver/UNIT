# End-to-End Submission Coverage

Updated: 2026-06-28

This matrix tracks the user-accessible paths where a user can create, save, send,
submit, or approve data. Production verification avoids completing a real Stripe
payment; live-money payment proof must be done manually with an owner-approved
low-value charge.

## Mobile Tenant

| Surface | Flow | Production proof |
| --- | --- | --- |
| Sign up | `qa-auth-02-signup-edge` | Creates a QA-marked account and validates signup edge cases. |
| Complete onboarding | `qa-auth-04-onboarding-edge` | Submits tenant profile and property onboarding inputs. |
| Create announcement | `qa-community-01-create-announcement` | Submits a tenant announcement. |
| Create event | `qa-community-02-create-event` | Submits a tenant event. |
| Create promotion draft | `qa-promotions-02-create-cancel-paths` | Submits a promotion through the form and verifies `Pending Payment`. |
| iOS App Store promotion access | `qa-promotions-ios-app-store-readonly` | Verifies paid promotion creation is not exposed in the App Store-safe iOS build. |
| Profile edits | `qa-profile-03-edit-full` | Saves editable profile fields. |
| Push settings | `qa-profile-02-push-toggle` | Saves the push notification toggle. |
| Alerts | `qa-alerts-01-mark-read` | Marks notifications as read. |

## Mobile Admin

| Surface | Flow | Production proof |
| --- | --- | --- |
| Invite tenant | `qa-admin-02-tenants-add-invite` | Submits a tenant invite from the admin UI. |
| Create property | `qa-admin-03-properties-create` | Submits a new property. |
| Review promotions | `qa-admin-05-promo-review-all-actions` | Submits approve, revision, repayment, reject, suspend, and reinstate actions. |
| Create external promotion | `qa-admin-06-new-external-promo` | Cancels the form once, then submits an admin-created external promotion and verifies it in the External segment. |
| Pricing tiers | `qa-admin-07-pricing-tier-crud` | Cancels the add-tier modal once, then creates and deactivates a pricing tier. |
| Push broadcast | `qa-admin-08-push-broadcast-full` | Sends an admin broadcast. |
| Tenant/promotion sync | `qa-admin-09-tenant-sync` | Verifies admin visibility for tenant rows and draft promotions. |

## Portal Advertiser And Admin

| Surface | Flow | Production proof |
| --- | --- | --- |
| Auth gates | `portal/e2e/auth.spec.ts` | Verifies unauthenticated users cannot submit from protected pages. |
| Admin review queue | `portal/e2e/admin-full.spec.ts` | Seeds QA data, approves a pending promotion, and approves a pending advertiser account. |
| Advertiser promotion checkout | `portal/e2e/admin-full.spec.ts` | Active advertiser creates a promotion, selects a tier, and reaches Stripe Checkout. |

## Live-Payment Boundary

`m5-02-tenant-paid-promotion` covers the full test-card payment happy path and is
valid only with Stripe test-mode credentials. With live Stripe credentials, use
`qa-promotions-02-create-cancel-paths` plus the portal Checkout reachability test
for automated production proof. Complete an actual live payment only with explicit
owner approval for a low-value charge, then verify the Stripe webhook delivery and
promotion status transition.

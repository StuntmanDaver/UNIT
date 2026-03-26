# Phase 1: Security & Access Control - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 01-security-access-control
**Areas discussed:** Landlord login flow, Auth migration path, Multi-property switcher, Audit trail design

---

## Landlord Login Flow

### Q1: How should landlords authenticate?

| Option | Description | Selected |
|--------|-------------|----------|
| Email/password | Same Supabase auth as tenants. Landlord role stored in user metadata or profiles table. | |
| Magic link (email) | Passwordless via Supabase magic links. Landlord clicks email link to log in. | ✓ |
| Keep code + add Supabase | Keep code entry as secondary login option alongside Supabase accounts. | |

**User's choice:** Magic link (email)

### Q2: Should landlords and tenants share the same login page?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared login page | Single /login page. After auth, route based on role. | |
| Separate pages | Keep /LandlordLogin as a distinct entry point with landlord-specific branding. | ✓ |
| You decide | Claude picks based on current code. | |

**User's choice:** Separate pages

### Q3: How should the landlord role be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase user_metadata | Store role in auth.users user_metadata. Simple, no extra table. | |
| Profiles table | Create profiles table with user_id, role, and property associations. | ✓ |
| You decide | Claude picks based on multi-property support needs. | |

**User's choice:** Profiles table

---

## Auth Migration Path

### Q1: How should existing landlords transition to real accounts?

| Option | Description | Selected |
|--------|-------------|----------|
| Invitation email | Admin sends invitation emails. Landlords click link, set up Supabase account. | ✓ |
| Self-registration | Landlords visit new login page, sign up, then admin approves/assigns role and properties. | |
| Hard cutover | Replace code login page immediately. Landlords must create accounts. | |

**User's choice:** Invitation email

### Q2: What happens to the old code-based login during transition?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep active for 2 weeks | Both code and magic link work during transition window. Banner says "Migrate." | |
| Disable immediately | Once invitation sent, code login is gone. Forces migration. | ✓ |
| You decide | Claude decides the transition timeline. | |

**User's choice:** Disable immediately

---

## Multi-Property Switcher

### Q1: Where should the property switcher live?

| Option | Description | Selected |
|--------|-------------|----------|
| Header dropdown | Property name in top navbar with dropdown to switch. Always visible. | ✓ |
| Sidebar panel | Dedicated sidebar section showing all properties. | |
| Dedicated page | A /properties page where landlord selects property first. | |

**User's choice:** Header dropdown

### Q2: What should happen when switching properties?

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on same page | Switch property context, data reloads in place. | ✓ |
| Redirect to dashboard | Always land on LandlordDashboard after switching. | |
| You decide | Claude picks based on TanStack Query cache invalidation. | |

**User's choice:** Stay on same page

### Q3: Should the property switcher be visible to landlords who only have one property?

| Option | Description | Selected |
|--------|-------------|----------|
| Hide if one property | Only show switcher when landlord has 2+ properties. | ✓ |
| Always show | Show property name in header regardless. | |

**User's choice:** Hide if one property

### Q4: Should the active property be remembered across sessions?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, localStorage | Remember last active property. On login, auto-select it. | ✓ |
| No, choose each time | After login, always show property selection. | |
| You decide | Claude picks the best approach. | |

**User's choice:** Yes, localStorage

---

## Audit Trail Design

### Q1: Who should be able to see the audit trail?

| Option | Description | Selected |
|--------|-------------|----------|
| Landlords only | Audit trail is landlord-facing. Tenants don't see it. | ✓ |
| Both landlords and tenants | Tenants can see entries affecting their records. | |
| You decide | Claude picks based on property management expectations. | |

**User's choice:** Landlords only

### Q2: Where should the audit trail appear in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline history on records | Each entity shows timeline of changes at bottom. No separate page. | |
| Dedicated audit log page | Separate /audit page. Filterable by entity type, date, actor. | |
| Both | Inline history + dedicated page for searching across all records. | ✓ |

**User's choice:** Both (inline + dedicated page)

### Q3: Should the audit trail capture who made the change?

| Option | Description | Selected |
|--------|-------------|----------|
| Full actor tracking | Log user ID, email, and role for every mutation. | ✓ |
| System-level only | Log that change happened and when, but not who. | |

**User's choice:** Full actor tracking

## Claude's Discretion

- RLS policy structure and exact SQL
- PropertyContext React implementation
- LandlordGuard component internals
- AuditLogger utility module design
- Header dropdown component styling

## Deferred Ideas

None — discussion stayed within phase scope.

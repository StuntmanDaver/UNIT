import { getAuthRedirectTarget, type AuthRedirectInput } from '@/lib/authRedirectPolicy';

function buildInput(overrides: Partial<AuthRedirectInput> = {}): AuthRedirectInput {
  return {
    segments: ['(tabs)', 'home'],
    isAuthenticated: true,
    needsPasswordChange: false,
    needsOnboarding: false,
    needsApproval: false,
    isInactive: false,
    isAdmin: false,
    ...overrides,
  };
}

describe('getAuthRedirectTarget', () => {
  it('redirects unauthenticated users to login except from login/signup', () => {
    expect(getAuthRedirectTarget(buildInput({ isAuthenticated: false, segments: ['(tabs)', 'home'] }))).toBe(
      '/(auth)/login'
    );
    expect(getAuthRedirectTarget(buildInput({ isAuthenticated: false, segments: ['(auth)', 'login'] }))).toBeNull();
    expect(getAuthRedirectTarget(buildInput({ isAuthenticated: false, segments: ['(auth)', 'signup'] }))).toBeNull();
  });

  it('prioritizes password reset over other authenticated states', () => {
    expect(
      getAuthRedirectTarget(
        buildInput({
          needsPasswordChange: true,
          needsOnboarding: true,
          segments: ['(tabs)', 'home'],
        })
      )
    ).toBe('/(auth)/reset-password');
    expect(
      getAuthRedirectTarget(buildInput({ needsPasswordChange: true, segments: ['(auth)', 'reset-password'] }))
    ).toBeNull();
  });

  it('routes onboarding users to onboarding unless already there', () => {
    expect(getAuthRedirectTarget(buildInput({ needsOnboarding: true, segments: ['(auth)', 'signup'] }))).toBe(
      '/(auth)/onboarding'
    );
    expect(getAuthRedirectTarget(buildInput({ needsOnboarding: true, segments: ['(auth)', 'onboarding'] }))).toBeNull();
  });

  it('routes pending approval and inactive users to the pending approval screen', () => {
    expect(getAuthRedirectTarget(buildInput({ needsApproval: true, segments: ['(tabs)', 'home'] }))).toBe(
      '/(auth)/pending-approval'
    );
    expect(getAuthRedirectTarget(buildInput({ isInactive: true, segments: ['(tabs)', 'home'] }))).toBe(
      '/(auth)/pending-approval'
    );
    expect(
      getAuthRedirectTarget(buildInput({ needsApproval: true, segments: ['(auth)', 'pending-approval'] }))
    ).toBeNull();
  });

  it('sends fully authenticated tenants stranded in auth routes to home', () => {
    expect(getAuthRedirectTarget(buildInput({ segments: ['(auth)', 'login'] }))).toBe('/(tabs)/home');
  });

  it('sends fully authenticated admins stranded in auth routes to admin home', () => {
    expect(getAuthRedirectTarget(buildInput({ isAdmin: true, segments: ['(auth)', 'login'] }))).toBe('/(admin)/');
  });

  it('sends users finishing reset password to profile edit', () => {
    expect(getAuthRedirectTarget(buildInput({ segments: ['(auth)', 'reset-password'] }))).toBe(
      '/(tabs)/profile/edit'
    );
  });

  it('redirects admins away from tenant tabs', () => {
    expect(getAuthRedirectTarget(buildInput({ isAdmin: true, segments: ['(tabs)', 'home'] }))).toBe('/(admin)/');
  });

  it('does not redirect settled tenants already in tenant tabs', () => {
    expect(getAuthRedirectTarget(buildInput({ segments: ['(tabs)', 'home'] }))).toBeNull();
  });
});

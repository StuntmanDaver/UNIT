export type AuthRedirectInput = {
  segments: readonly string[];
  isAuthenticated: boolean;
  needsPasswordChange: boolean;
  needsOnboarding: boolean;
  needsApproval: boolean;
  isInactive: boolean;
  isAdmin: boolean;
};

export function getAuthRedirectTarget({
  segments,
  isAuthenticated,
  needsPasswordChange,
  needsOnboarding,
  needsApproval,
  isInactive,
  isAdmin,
}: AuthRedirectInput): string | null {
  const inAuthGroup = segments[0] === '(auth)';
  const inTabsGroup = segments[0] === '(tabs)';
  const onLogin = segments.includes('login');
  const onSignup = segments.includes('signup');
  const onResetPassword = segments.includes('reset-password');
  const onOnboarding = segments.includes('onboarding');
  const onPendingApproval = segments.includes('pending-approval');

  if (!isAuthenticated) {
    return onLogin || onSignup ? null : '/(auth)/login';
  }

  if (needsPasswordChange && !onResetPassword) {
    return '/(auth)/reset-password';
  }

  if (!needsPasswordChange && needsOnboarding && !onOnboarding) {
    return '/(auth)/onboarding';
  }

  if (!needsPasswordChange && !needsOnboarding && (needsApproval || isInactive) && !onPendingApproval) {
    return '/(auth)/pending-approval';
  }

  if (!needsPasswordChange && !needsOnboarding && !needsApproval && !isInactive && inAuthGroup) {
    if (onResetPassword) return '/(tabs)/profile/edit';
    return isAdmin ? '/(admin)/' : '/(tabs)/home';
  }

  if (!needsPasswordChange && !needsOnboarding && !needsApproval && !isInactive && isAdmin && inTabsGroup) {
    return '/(admin)/';
  }

  return null;
}

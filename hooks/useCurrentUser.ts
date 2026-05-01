import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { businessesService, type Business } from '@/services/businesses';

export function useCurrentUser() {
  const { user } = useAuth();

  return useQuery<Business | null>({
    queryKey: ['currentUser', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const controller = new AbortController();
      // 10s hard cap: if Supabase auth-token refresh hangs this request
      // never resolves, keeping isLoading true forever. Abort and surface
      // an error so TanStack Query settles and the spinner clears.
      const timer = setTimeout(() => controller.abort(), 10_000);
      try {
        const businesses = await businessesService.filter(
          { owner_email: user.email },
          undefined,
          controller.signal
        );
        return businesses[0] ?? null;
      } finally {
        clearTimeout(timer);
      }
    },
    enabled: !!user?.email,
    retry: 0,
    networkMode: 'always',
  });
}

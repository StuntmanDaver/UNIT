import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { businessesService, type Business } from '@/services/businesses';

export function useCurrentUser() {
  const { user } = useAuth();

  return useQuery<Business | null>({
    queryKey: ['currentUser', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const businesses = await businessesService.filter({ owner_email: user.email });
      return businesses[0] ?? null;
    },
    enabled: !!user?.email,
  });
}

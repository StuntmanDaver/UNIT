import { useQuery } from '@tanstack/react-query';
import { postsService, type Post } from '@/services/posts';

export function usePosts(propertyId: string, type?: string, excludeType?: string) {
  return useQuery<Post[]>({
    queryKey: ['posts', propertyId, { type, excludeType }],
    queryFn: async () => {
      const filters: Record<string, string> = { property_id: propertyId };
      if (type) filters.type = type;
      let posts = await postsService.filter(filters);
      if (excludeType) {
        posts = posts.filter((post) => post.type !== excludeType);
      }
      return posts;
    },
    enabled: !!propertyId,
  });
}

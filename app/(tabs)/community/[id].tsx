import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { postsService, type Post } from '@/services/posts';
import { businessesService } from '@/services/businesses';
import { firstParam } from '@/lib/routeParams';

const TYPE_COLORS: Record<Post['type'], { bg: string; text: string }> = {
  announcement: { bg: '#DBEAFE', text: '#1D4ED8' },
  event: { bg: '#D1FAE5', text: '#065F46' },
  offer: { bg: '#FEF3C7', text: '#92400E' },
};

function formatTypeLabel(type: Post['type']): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatEventDate(date: string | null, time: string | null): string | null {
  if (!date) return null;
  const parts = [date];
  if (time) parts.push(time);
  return parts.join(' at ');
}

export default function CommunityPostDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsService.getById(id ?? ''),
    enabled: !!id,
  });

  const { data: authorBusiness } = useQuery({
    queryKey: ['business', post?.business_id],
    queryFn: () => businessesService.getById(post?.business_id ?? ''),
    enabled: !!post?.business_id,
  });

  if (isLoading) {
    return <LoadingScreen message="Loading post..." />;
  }

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cloud px-6">
        <Text className="text-base font-nunito text-brand-ink leading-relaxed">
          Post not found.
        </Text>
      </View>
    );
  }

  const authorName = authorBusiness?.business_name ?? 'Unknown Business';
  const relativeTime = formatDistanceToNow(new Date(post.created_date), { addSuffix: true });

  return (
    <ScrollView
      className="flex-1 bg-brand-cloud"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <GradientHeader>
        <Pressable
          testID="back-btn"
          onPress={() => router.back()}
          className="flex-row items-center gap-1.5 mb-3"
          hitSlop={8}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
          <Text className="text-base font-nunito text-white leading-relaxed">Back</Text>
        </Pressable>
        <Text className="font-lora-semibold text-3xl text-white leading-tight">
          Community Post
        </Text>
      </GradientHeader>

      <View className="px-4 pt-6">
        {post.image_url && (
          <View className="rounded-xl overflow-hidden mb-6">
            <Image
              source={{ uri: post.image_url }}
              style={{ aspectRatio: 16 / 9, width: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}

        <Card className="p-5">
          <View className="flex-row items-center gap-2 mb-4">
            <Avatar
              imageUrl={authorBusiness?.logo_url}
              name={authorName}
              size={36}
            />
            <View className="flex-1 min-w-0">
              <Text className="text-base font-nunito-semibold text-brand-ink leading-relaxed" numberOfLines={1}>
                {authorName}
              </Text>
              <Text className="text-sm font-nunito text-brand-ink leading-normal">
                {relativeTime}
              </Text>
            </View>
            <Badge label={formatTypeLabel(post.type)} color={TYPE_COLORS[post.type]} size="sm" />
          </View>

          <Text className="text-2xl font-lora-semibold text-brand-ink leading-tight mb-3">
            {post.title}
          </Text>
          <Text className="text-base font-nunito text-brand-ink leading-relaxed">
            {post.content}
          </Text>

          {post.type === 'event' && post.event_date && (
            <Text className="text-sm font-nunito-semibold text-brand-ink leading-normal mt-4">
              {formatEventDate(post.event_date, post.event_time)}
            </Text>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

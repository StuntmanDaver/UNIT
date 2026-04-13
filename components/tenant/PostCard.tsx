import { View, Text } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Post } from '@/services/posts';
import { Business } from '@/services/businesses';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

type PostCardProps = {
  post: Post;
  authorBusiness?: Business | null;
  onPress?: () => void;
};

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

export function PostCard({ post, authorBusiness, onPress }: PostCardProps) {
  const typeColor = TYPE_COLORS[post.type];
  const authorName = authorBusiness?.business_name ?? 'Unknown Business';

  const relativeTime = formatDistanceToNow(new Date(post.created_date), { addSuffix: true });

  return (
    <Card onPress={onPress} className="p-4">
      {/* Author Row */}
      <View className="flex-row items-center gap-2 mb-3">
        <Avatar
          imageUrl={authorBusiness?.logo_url}
          name={authorName}
          size={32}
        />
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-nunito-semibold text-brand-gray" numberOfLines={1}>
            {authorName}
          </Text>
          <Text className="text-sm font-nunito text-brand-gray">{relativeTime}</Text>
        </View>
        <Badge label={formatTypeLabel(post.type)} color={typeColor} size="sm" />
      </View>

      {/* Content */}
      <Text className="text-base font-nunito-semibold text-brand-gray mb-1 leading-relaxed">{post.title}</Text>
      <Text className="text-base font-nunito text-brand-gray leading-relaxed" numberOfLines={3}>
        {post.content}
      </Text>

      {/* Event Date */}
      {post.type === 'event' && post.event_date && (
        <View className="mt-2 flex-row items-center">
          <Text className="text-sm font-nunito-semibold text-green-700">
            {formatEventDate(post.event_date, post.event_time)}
          </Text>
        </View>
      )}
    </Card>
  );
}

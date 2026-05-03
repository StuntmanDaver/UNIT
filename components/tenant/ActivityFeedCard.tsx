import { View, Text, Image, Pressable } from 'react-native';
import { Bell, Megaphone, Tag, Building2 } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import type { ActivityFeedItem } from '@/services/activityFeed';

type Props = {
  item: ActivityFeedItem;
  onPress?: () => void;
};

const CTA_LABELS: Record<ActivityFeedItem['kind'], string> = {
  promotion: 'View promotion',
  post: 'Read more',
  alert: 'View alerts',
  tenant_signup: 'View directory',
  business_update: 'View update',
  announcement: '',
};

function KindRow({ item }: { item: ActivityFeedItem }) {
  if (item.kind === 'tenant_signup') {
    return (
      <View className="flex-row items-center gap-2 mb-2">
        <Avatar imageUrl={item.imageUrl} name={item.title.split(' ')[0]} size={28} />
        <Text className="text-sm font-nunito text-brand-ink-muted leading-normal">New Tenant</Text>
      </View>
    );
  }

  const Icon =
    item.kind === 'alert'
      ? Bell
      : item.kind === 'announcement'
        ? Megaphone
        : item.kind === 'business_update'
          ? Building2
          : Tag;

  const LABELS: Record<ActivityFeedItem['kind'], string> = {
    promotion: 'Promotion',
    post: 'Post',
    announcement: 'Announcement',
    alert: 'Alert',
    tenant_signup: 'New Tenant',
    business_update: 'Update',
  };

  return (
    <View className="flex-row items-center gap-2 mb-2">
      <Icon size={16} color="#465A75" />
      <Text className="text-sm font-nunito text-brand-ink-muted leading-normal">
        {LABELS[item.kind]}
      </Text>
    </View>
  );
}

function RelativeTime({ isoDate }: { isoDate: string }) {
  try {
    return (
      <Text className="text-sm font-nunito text-brand-ink-muted leading-normal">
        {formatDistanceToNow(new Date(isoDate), { addSuffix: true })}
      </Text>
    );
  } catch {
    return null;
  }
}

/**
 * Light-surface activity card for the Home Feed (US-007).
 * Uses brand-mist / brand-paper / brand-ink tokens — permitted only here
 * and on screens explicitly migrated to the light-surface design per CLAUDE.md.
 */
export function ActivityFeedCard({ item, onPress }: Props) {
  const hasHeroImage = item.kind === 'promotion' && !!item.imageUrl;
  const ctaLabel = CTA_LABELS[item.kind];
  const showCta = !!onPress && !!ctaLabel;

  const body = (
    <>
      {hasHeroImage && (
        <Image
          source={{ uri: item.imageUrl! }}
          style={{ aspectRatio: 16 / 9, width: '100%' }}
          resizeMode="cover"
        />
      )}
      <View className="p-4">
        <KindRow item={item} />
        <Text
          className="font-lora-semibold text-2xl text-brand-ink leading-tight mb-1"
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {!!item.subtitle && (
          <Text
            className="font-nunito text-base text-brand-ink-muted leading-relaxed mb-2"
            numberOfLines={3}
          >
            {item.subtitle}
          </Text>
        )}
        <View className="flex-row items-center justify-between mt-1">
          <RelativeTime isoDate={item.occurredAt} />
          {showCta && (
            <Text className="text-sm font-nunito-semibold text-brand-blue leading-normal">
              {ctaLabel} →
            </Text>
          )}
        </View>
      </View>
    </>
  );

  const baseClass = 'bg-brand-mist border border-brand-paper rounded-2xl overflow-hidden';

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, minHeight: 88 })}
        className={baseClass}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={{ minHeight: 88 }} className={baseClass}>
      {body}
    </View>
  );
}

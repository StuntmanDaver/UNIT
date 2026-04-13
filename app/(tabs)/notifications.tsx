import { useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Megaphone, Users, CheckCircle } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import Toast from 'react-native-toast-message';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useAuth } from '@/lib/AuthContext';
import { notificationsService, type Notification } from '@/services/notifications';
import { BRAND } from '@/constants/colors';

// Unread tint: brand-navy-light +10% lightness — stays on-brand, subtle enough to feel like a state, not a new surface
const UNREAD_BG = '#22304A';

function getIcon(type: string) {
  switch (type) {
    case 'broadcast':
      return Bell;
    case 'offer':
    case 'promotion':
      return Megaphone;
    case 'post':
      return Users;
    case 'advertiser_approved':
      return CheckCircle;
    default:
      return Bell;
  }
}

function navigateByType(type: string) {
  switch (type) {
    case 'post':
      router.push('/(tabs)/community');
      break;
    case 'offer':
    case 'promotion':
    case 'advertiser_approved':
      router.push('/(tabs)/promotions');
      break;
    default:
      // stay on current screen
      break;
  }
}

type NotificationRowProps = {
  item: Notification;
  onPress: (item: Notification) => void;
};

function NotificationRow({ item, onPress }: NotificationRowProps) {
  const Icon = getIcon(item.type);
  const isUnread = !item.read;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: isUnread ? UNREAD_BG : BRAND.navyLight }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Icon size={20} color={isUnread ? BRAND.blue : BRAND.steel} />
      </View>
      <View style={styles.textContainer}>
        <Text
          className={`text-base leading-relaxed ${isUnread ? 'font-nunito-semibold text-white' : 'font-nunito text-brand-gray'}`}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text className="text-sm font-nunito text-brand-steel leading-normal" numberOfLines={1}>
          {item.message}
        </Text>
        <Text className="text-sm font-nunito text-brand-steel leading-normal">
          {formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
        </Text>
      </View>
      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { user, propertyIds } = useAuth();
  const userId = user?.id ?? '';
  const propertyId = propertyIds[0] ?? '';

  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications(userId, propertyId);
  const { data: unreadCount } = useUnreadCount(userId, propertyId);

  const handlePress = useCallback(
    async (item: Notification) => {
      if (!item.read) {
        try {
          await notificationsService.update(item.id, { read: true });
          await queryClient.invalidateQueries({ queryKey: ['notifications', userId, propertyId] });
          await queryClient.invalidateQueries({ queryKey: ['unreadCount', userId, propertyId] });
        } catch {
          // best-effort mark read; navigate anyway
        }
      }
      navigateByType(item.type);
    },
    [userId, propertyId, queryClient]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsService.markAllRead(userId, propertyId);
      await queryClient.invalidateQueries({ queryKey: ['notifications', userId, propertyId] });
      await queryClient.invalidateQueries({ queryKey: ['unreadCount', userId, propertyId] });
      Toast.show({ type: 'success', text1: 'All notifications marked as read' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to mark notifications as read' });
    }
  }, [userId, propertyId, queryClient]);

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationRow item={item} onPress={handlePress} />
    ),
    [handlePress]
  );

  if (isLoading && !notifications) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-lora-semibold text-white leading-tight">Notifications</Text>
          {unreadCount != null && unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
              <Text className="text-base font-nunito text-white leading-relaxed">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </GradientHeader>

      <FlatList
        data={notifications ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            message="New activity from your property will appear here."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#465A75',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1D263A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.blue,
    flexShrink: 0,
  },
});

import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Bell, Send, ChevronLeft } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { formatDistanceToNow } from 'date-fns';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/AuthContext';
import { adminService } from '@/services/admin';
import { useNotifications } from '@/hooks/useNotifications';
import { BRAND } from '@/constants/colors';

const AUDIENCE_SEGMENTS = ['All Tenants', 'Active Only'] as const;
type AudienceSegment = (typeof AUDIENCE_SEGMENTS)[number];

const TITLE_MAX = 50;
const MESSAGE_MAX = 200;
const HISTORY_LIMIT = 20;

export default function AdminPushScreen() {
  const { user, propertyIds } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<AudienceSegment>('All Tenants');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [sending, setSending] = useState(false);

  const userEmail = user?.email ?? '';
  const activePropertyId = selectedPropertyId ?? '';

  const { data: notifications } = useNotifications(userEmail, activePropertyId);

  const broadcastHistory = (notifications ?? [])
    .filter((n) => n.type === 'broadcast')
    .slice(0, HISTORY_LIMIT);

  const handleTitleChange = useCallback(
    (text: string) => {
      if (text.length <= TITLE_MAX) setTitle(text);
    },
    []
  );

  const handleMessageChange = useCallback(
    (text: string) => {
      if (text.length <= MESSAGE_MAX) setMessage(text);
    },
    []
  );

  const canSend = activePropertyId && title.trim().length > 0 && message.trim().length > 0;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setConfirmVisible(false);
    try {
      const result = await adminService.sendPush({
        property_id: activePropertyId,
        title: title.trim(),
        message: message.trim(),
        audience: audience === 'All Tenants' ? 'all' : 'active',
        data: { type: 'broadcast' },
      });
      Toast.show({
        type: 'success',
        text1: 'Notification Sent',
        text2: `Delivered to ${result.sent} recipient${result.sent !== 1 ? 's' : ''}`,
      });
      setTitle('');
      setMessage('');
      setAudience('All Tenants');
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Send Failed',
        text2: 'Could not send notification. Please try again.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="mb-2 self-start"
        >
          <ChevronLeft size={24} color={BRAND.gray} />
        </Pressable>
        <Text className="text-2xl font-lora-semibold text-white leading-tight">Push Notifications</Text>
        <View className="mt-3">
          <PropertySelector
            propertyIds={propertyIds}
            selected={selectedPropertyId}
            onSelect={setSelectedPropertyId}
          />
        </View>
      </GradientHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Compose section */}
        <View className="px-4 pt-4">
          <Text className="text-2xl font-lora-semibold text-white leading-tight mb-4">Compose</Text>

          {/* Title input */}
          <View className="mb-1">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-nunito-semibold text-brand-gray">Title</Text>
              <Text className="text-sm font-nunito text-brand-steel">
                {title.length}/{TITLE_MAX}
              </Text>
            </View>
            <Input
              label=""
              value={title}
              onChangeText={handleTitleChange}
              placeholder="e.g. Building Update"
              maxLength={TITLE_MAX}
              returnKeyType="next"
            />
          </View>

          {/* Message input */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-sm font-nunito-semibold text-brand-gray">Message</Text>
              <Text className="text-sm font-nunito text-brand-steel">
                {message.length}/{MESSAGE_MAX}
              </Text>
            </View>
            <Input
              label=""
              value={message}
              onChangeText={handleMessageChange}
              placeholder="Write your message here..."
              multiline
              numberOfLines={4}
              maxLength={MESSAGE_MAX}
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />
          </View>

          {/* Audience */}
          <View className="mb-4">
            <Text className="text-sm font-nunito-semibold text-brand-gray mb-2">Audience</Text>
            <SegmentedControl
              segments={[...AUDIENCE_SEGMENTS]}
              selected={audience}
              onChange={(seg) => setAudience(seg as AudienceSegment)}
            />
          </View>
        </View>

        {/* Preview card */}
        <View className="px-4 mb-4">
          <Text className="text-sm font-nunito-semibold text-brand-steel uppercase tracking-wide mb-2">
            Preview
          </Text>
          <Card className="p-4">
            <View className="flex-row items-start gap-3">
              <View
                className="rounded-full p-2"
                style={{ backgroundColor: BRAND.blue + '1A' }}
              >
                <Bell size={20} color={BRAND.blue} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-nunito-semibold text-white"
                  numberOfLines={2}
                >
                  {title.trim() || 'Notification title'}
                </Text>
                <Text
                  className="text-sm font-nunito text-brand-gray mt-0.5"
                  numberOfLines={3}
                >
                  {message.trim() || 'Your message will appear here.'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Send button */}
        <View className="px-4 mb-8">
          <Button
            onPress={() => setConfirmVisible(true)}
            disabled={!canSend || sending}
            loading={sending}
          >
            Send Notification
          </Button>
        </View>

        {/* Sent history */}
        <View className="px-4">
          <Text className="text-2xl font-lora-semibold text-white leading-tight mb-3">Sent History</Text>

          {!activePropertyId ? (
            <Text className="font-nunito text-brand-steel text-sm text-center py-4">
              Select a property to view history
            </Text>
          ) : broadcastHistory.length === 0 ? (
            <View className="items-center py-8">
              <Bell size={32} color={BRAND.steel} />
              <Text className="font-nunito text-brand-steel text-sm mt-2">No broadcasts sent yet</Text>
            </View>
          ) : (
            <View className="gap-3">
              {broadcastHistory.map((item) => (
                <Card key={item.id} className="p-4">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <Text className="text-sm font-nunito-semibold text-white" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text className="text-sm font-nunito text-brand-gray mt-0.5" numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>
                    <Text className="text-sm font-nunito text-brand-steel shrink-0">
                      {formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirmation modal */}
      <Modal
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        title="Send Notification?"
        actions={[
          {
            label: 'Send',
            variant: 'primary',
            onPress: handleSend,
          },
          {
            label: 'Cancel',
            variant: 'secondary',
            onPress: () => setConfirmVisible(false),
          },
        ]}
      >
        <View className="pb-2">
          <Text className="text-sm font-nunito text-brand-gray mb-3">
            This will send a push notification to{' '}
            <Text className="font-nunito-semibold text-white">
              {audience === 'All Tenants' ? 'all tenants' : 'active tenants only'}
            </Text>{' '}
            at the selected property.
          </Text>
          <Card className="p-4">
            <Text className="text-sm font-nunito-semibold text-white uppercase tracking-wide mb-1">
              {title}
            </Text>
            <Text className="text-sm font-nunito text-brand-gray">{message}</Text>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

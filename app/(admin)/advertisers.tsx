import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { useAuth } from '@/lib/AuthContext';
import { useAdvertiserPromotions } from '@/hooks/useAdvertiserPromotions';
import { advertiserPromotionsService, type AdvertiserPromotion } from '@/services/advertiser-promotions';

const STATUS_SEGMENTS = ['Pending', 'Approved', 'Rejected'];

export default function AdvertisersScreen() {
  const { propertyIds, user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formBusinessName, setFormBusinessName] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [ctaLink, setCtaLink] = useState('');

  const activePropertyId = selectedPropertyId ?? '';

  const { data: promotions, isLoading } = useAdvertiserPromotions(
    activePropertyId,
    statusFilter.toLowerCase()
  );

  const resetForm = () => {
    setFormBusinessName('');
    setHeadline('');
    setDescription('');
    setCtaLink('');
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleUpdateStatus = async (
    promotion: AdvertiserPromotion,
    newStatus: 'approved' | 'rejected'
  ) => {
    if (!user) return;
    try {
      await advertiserPromotionsService.updateStatus(promotion.id, newStatus, user.id);
      Toast.show({
        type: 'success',
        text1: newStatus === 'approved' ? 'Promotion approved' : 'Promotion rejected',
      });
      await queryClient.invalidateQueries({ queryKey: ['advertiserPromotions'] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update promotion';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    }
  };

  const handleAddPromotion = async () => {
    if (!formBusinessName.trim() || !headline.trim() || !activePropertyId || !user) {
      Toast.show({ type: 'error', text1: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    try {
      await advertiserPromotionsService.create({
        property_id: activePropertyId,
        business_name: formBusinessName.trim(),
        headline: headline.trim(),
        description: description.trim() || null,
        cta_link: ctaLink.trim() || null,
        approval_status: 'approved',
        approved_by: user.id,
      });
      Toast.show({ type: 'success', text1: 'Promotion created' });
      await queryClient.invalidateQueries({ queryKey: ['advertiserPromotions'] });
      handleCloseModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create promotion';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const renderPromotion = ({ item }: { item: AdvertiserPromotion }) => (
    <Card className="mx-4 mb-3 p-4">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-base font-bold text-brand-navy">{item.headline}</Text>
          <Text className="text-sm text-brand-steel mt-0.5">{item.business_name}</Text>
        </View>
        <StatusBadge status={item.approval_status} size="sm" />
      </View>

      {item.description ? (
        <Text className="text-sm text-brand-steel leading-5 mb-3" numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      {/* Action Buttons */}
      <View className="flex-row gap-2 mt-1">
        {item.approval_status === 'pending' && (
          <>
            <View className="flex-1">
              <Button
                variant="primary"
                onPress={() => handleUpdateStatus(item, 'approved')}
              >
                Approve
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="destructive"
                onPress={() => handleUpdateStatus(item, 'rejected')}
              >
                Reject
              </Button>
            </View>
          </>
        )}
        {item.approval_status === 'approved' && (
          <View className="flex-1">
            <Button
              variant="destructive"
              onPress={() => handleUpdateStatus(item, 'rejected')}
            >
              Revoke
            </Button>
          </View>
        )}
        {item.approval_status === 'rejected' && (
          <View className="flex-1">
            <Button
              variant="primary"
              onPress={() => handleUpdateStatus(item, 'approved')}
            >
              Approve
            </Button>
          </View>
        )}
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Advertisers</Text>
        <View className="mt-3">
          <PropertySelector
            propertyIds={propertyIds}
            selected={selectedPropertyId}
            onSelect={setSelectedPropertyId}
          />
        </View>
      </GradientHeader>

      {!activePropertyId ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-brand-steel text-base text-center">
            Select a property to manage promotions
          </Text>
        </View>
      ) : (
        <>
          <View className="px-4 pt-4 gap-3">
            <SegmentedControl
              segments={STATUS_SEGMENTS}
              selected={statusFilter}
              onChange={setStatusFilter}
            />
            <Button onPress={() => setModalVisible(true)}>Add Promotion</Button>
          </View>

          {isLoading ? (
            <LoadingScreen message="Loading promotions..." />
          ) : (
            <FlatList
              data={promotions ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderPromotion}
              contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon={Megaphone}
                  title="No promotions"
                  message={`No ${statusFilter.toLowerCase()} promotions for this property`}
                />
              }
            />
          )}
        </>
      )}

      {/* Add Promotion Modal */}
      <Modal
        visible={modalVisible}
        onClose={handleCloseModal}
        title="Add Promotion"
        actions={[
          {
            label: submitting ? 'Creating...' : 'Create Promotion',
            onPress: handleAddPromotion,
            variant: 'primary',
          },
          { label: 'Cancel', onPress: handleCloseModal, variant: 'secondary' },
        ]}
      >
        <View className="gap-1 pb-2">
          <Input
            label="Business Name *"
            value={formBusinessName}
            onChangeText={setFormBusinessName}
            placeholder="Acme Corp"
          />
          <Input
            label="Headline *"
            value={headline}
            onChangeText={setHeadline}
            placeholder="Summer Sale — 20% Off"
          />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Tell tenants about this promotion..."
            multiline
            numberOfLines={3}
          />
          <Input
            label="CTA Link"
            value={ctaLink}
            onChangeText={setCtaLink}
            placeholder="https://example.com"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
      </Modal>
    </View>
  );
}

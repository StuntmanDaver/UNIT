import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { ChevronLeft, Plus, DollarSign, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { BRAND } from '@/constants/colors';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import {
  usePromotionPriceTiers,
  useUpsertPriceTier,
  useDeactivatePriceTier,
} from '@/hooks/usePromotionPricing';
import { type PromotionPriceTier } from '@/services/promotionPricing';

type EditState = {
  id?: string;
  name: string;
  duration_days: string;
  price_dollars: string;
  is_featured: boolean;
  is_active: boolean;
};

const EMPTY_EDIT: EditState = {
  id: undefined,
  name: '',
  duration_days: '',
  price_dollars: '',
  is_featured: false,
  is_active: true,
};

function tierToEditState(tier: PromotionPriceTier): EditState {
  return {
    id: tier.id,
    name: tier.name,
    duration_days: String(tier.duration_days),
    price_dollars: (tier.price_cents / 100).toFixed(2),
    is_featured: tier.is_featured,
    is_active: tier.is_active,
  };
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function tierTestKey(tier: PromotionPriceTier): string {
  return tier.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminPricingScreen() {
  const { data: tiers, isLoading, isError, error, refetch } = usePromotionPriceTiers();
  const { mutateAsync: upsertTier } = useUpsertPriceTier();
  const { mutateAsync: deactivateTier } = useDeactivatePriceTier();

  const [modalVisible, setModalVisible] = useState(false);
  const [editState, setEditState] = useState<EditState>(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditState(EMPTY_EDIT);
    setModalVisible(true);
  }

  function openEdit(tier: PromotionPriceTier) {
    setEditState(tierToEditState(tier));
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditState(EMPTY_EDIT);
  }

  function validateEdit(): string | null {
    if (!editState.name.trim()) return 'Name is required.';
    const days = parseInt(editState.duration_days, 10);
    if (!days || days <= 0) return 'Duration must be a positive whole number.';
    const price = parseFloat(editState.price_dollars);
    if (isNaN(price) || price < 0) return 'Price must be a non-negative number.';
    return null;
  }

  async function handleSave() {
    const err = validateEdit();
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }
    setSaving(true);
    try {
      await upsertTier({
        id: editState.id,
        name: editState.name.trim(),
        duration_days: parseInt(editState.duration_days, 10),
        price_cents: Math.round(parseFloat(editState.price_dollars) * 100),
        is_featured: editState.is_featured,
        is_active: editState.is_active,
      });
      closeModal();
      Toast.show({ type: 'success', text1: editState.id ? 'Tier updated' : 'Tier added' });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save tier.' });
    } finally {
      setSaving(false);
    }
  }

  function confirmDeactivate(tier: PromotionPriceTier) {
    Alert.alert(
      'Deactivate Tier',
      `Deactivate "${tier.name}"? Tenants will no longer see it in checkout. Existing payment attempts are unaffected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateTier(tier.id);
              Toast.show({ type: 'success', text1: 'Tier deactivated' });
            } catch {
              Toast.show({ type: 'error', text1: 'Failed to deactivate tier.' });
            }
          },
        },
      ]
    );
  }

  const renderItem = ({ item }: { item: PromotionPriceTier }) => {
    const testKey = tierTestKey(item);

    return (
      <Card testID={`pricing-tier-card-${testKey}`} className="mx-4 mb-3 p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-base font-nunito-semibold text-brand-ink">{item.name}</Text>
              {item.is_featured && (
                <Badge label="Featured" color={{ bg: BRAND.blue, text: '#FFFFFF' }} size="sm" />
              )}
              {!item.is_active && (
                <Badge label="Inactive" color={{ bg: BRAND.steel, text: '#FFFFFF' }} size="sm" />
              )}
            </View>
            <Text className="text-sm font-nunito text-brand-ink mt-1">
              {item.duration_days} days
            </Text>
          </View>
          <Text className="text-base font-nunito-semibold text-brand-ink">
            {formatPrice(item.price_cents)}
          </Text>
        </View>

        <View className="flex-row gap-3 mt-3">
          <View className="flex-1">
            <Button
              testID={`pricing-tier-edit-${testKey}`}
              onPress={() => openEdit(item)}
              variant="secondary"
            >
              Edit
            </Button>
          </View>
          {item.is_active && (
            <View className="flex-1">
              <Button
                testID={`pricing-tier-deactivate-${testKey}`}
                onPress={() => confirmDeactivate(item)}
                variant="destructive"
              >
                Deactivate
              </Button>
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-brand-cloud">
      <GradientHeader>
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            testID="back-btn"
            onPress={() => router.push('/(admin)/')}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-3"
          >
            <ChevronLeft size={24} color={BRAND.gray} />
          </Pressable>
          <Pressable
            testID="btn-add-price-tier"
            onPress={openAdd}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-3"
            accessibilityLabel="Add Price Tier"
          >
            <Plus size={22} color={BRAND.gray} />
          </Pressable>
        </View>
        <Text className="text-2xl font-lora-semibold text-white leading-tight">
          Promotion Pricing
        </Text>
        <Text className="text-sm font-nunito text-white mt-1">
          Set prices tenants pay for promotions
        </Text>
      </GradientHeader>

      {isLoading ? (
        <LoadingScreen message="Loading tiers..." />
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-nunito text-red-700 text-center mb-3">
            {error?.message ?? 'Failed to load pricing tiers'}
          </Text>
          <Button onPress={() => refetch()} variant="secondary">Retry</Button>
        </View>
      ) : (
        <FlatList
          data={tiers ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={DollarSign}
              title="No price tiers"
              message="Tap + to add a pricing tier for tenant promotions"
            />
          }
        />
      )}

      {/* Add / Edit Tier Modal */}
      <Modal
        visible={modalVisible}
        onClose={closeModal}
        title={editState.id ? 'Edit Tier' : 'Add Tier'}
        actions={[
          { label: saving ? 'Saving…' : 'Save', onPress: handleSave, variant: 'primary' },
          { label: 'Cancel', onPress: closeModal, variant: 'ghost' },
        ]}
      >
        <View className="mb-4">
          <Text className="text-sm font-nunito text-brand-ink mb-2">Name</Text>
          <TextInput
            testID="pricing-tier-name"
            value={editState.name}
            onChangeText={(v) => setEditState((s) => ({ ...s, name: v }))}
            placeholder="e.g. 7-day Standard"
            placeholderTextColor={BRAND.steel}
            className="border border-brand-blue/40 rounded-xl px-4 py-3 text-base text-brand-ink font-nunito bg-brand-cloud"
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-nunito text-brand-ink mb-2">Duration (days)</Text>
          <TextInput
            testID="pricing-tier-duration"
            value={editState.duration_days}
            onChangeText={(v) => setEditState((s) => ({ ...s, duration_days: v.replace(/[^0-9]/g, '') }))}
            placeholder="7"
            placeholderTextColor={BRAND.steel}
            keyboardType="number-pad"
            className="border border-brand-blue/40 rounded-xl px-4 py-3 text-base text-brand-ink font-nunito bg-brand-cloud"
          />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-nunito text-brand-ink mb-2">Price (USD)</Text>
          <TextInput
            testID="pricing-tier-price"
            value={editState.price_dollars}
            onChangeText={(v) => setEditState((s) => ({ ...s, price_dollars: v }))}
            placeholder="25.00"
            placeholderTextColor={BRAND.steel}
            keyboardType="decimal-pad"
            className="border border-brand-blue/40 rounded-xl px-4 py-3 text-base text-brand-ink font-nunito bg-brand-cloud"
          />
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Star size={16} color={BRAND.steel} />
            <Text className="text-sm font-nunito text-brand-ink">Featured placement</Text>
          </View>
          <Switch
            testID="pricing-tier-featured"
            value={editState.is_featured}
            onValueChange={(v) => setEditState((s) => ({ ...s, is_featured: v }))}
            trackColor={{ false: BRAND.navyLight, true: BRAND.blue }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-sm font-nunito text-brand-ink">Active (visible to tenants)</Text>
          <Switch
            testID="pricing-tier-active"
            value={editState.is_active}
            onValueChange={(v) => setEditState((s) => ({ ...s, is_active: v }))}
            trackColor={{ false: BRAND.navyLight, true: BRAND.blue }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Modal>
    </View>
  );
}

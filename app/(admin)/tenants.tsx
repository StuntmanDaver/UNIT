import { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Users, ChevronLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BRAND } from '@/constants/colors';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { TenantRow } from '@/components/admin/TenantRow';
import { CSVImporter } from '@/components/admin/CSVImporter';
import { useAuth } from '@/lib/AuthContext';
import { useTenants, type TenantWithBusiness } from '@/hooks/useTenants';
import { useDebounce } from '@/hooks/useDebounce';
import { adminService } from '@/services/admin';
import { profilesService } from '@/services/profiles';
import { firstParam } from '@/lib/routeParams';

const STATUS_SEGMENTS = ['All', 'Invited', 'Active', 'Inactive'];

export default function TenantsScreen() {
  const { propertyIds } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ filter?: string; propertyId?: string }>();
  const initialPropertyId = firstParam(params.propertyId);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(() =>
    initialPropertyId && initialPropertyId.length > 0 ? initialPropertyId : null
  );
  const [searchText, setSearchText] = useState('');

  const initialFilter = (() => {
    const f = params.filter?.toLowerCase();
    if (f === 'active') return 'Active';
    if (f === 'invited') return 'Invited';
    if (f === 'inactive') return 'Inactive';
    return 'All';
  })();

  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');

  const debouncedSearch = useDebounce(searchText, 300);
  const activePropertyId = selectedPropertyId ?? '';
  const statusParam = statusFilter === 'All' ? undefined : statusFilter.toLowerCase();

  const { data: tenants, isLoading, isError, error, refetch } = useTenants(activePropertyId, statusParam, debouncedSearch);

  const resetForm = () => {
    setEmail('');
    setBusinessName('');
    setCategory('');
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleInvite = async () => {
    if (!email.trim() || !businessName.trim() || !activePropertyId) {
      Toast.show({ type: 'error', text1: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminService.inviteTenants([
        {
          email: email.trim(),
          business_name: businessName.trim(),
          category: category.trim() || 'other',
          property_id: activePropertyId,
        },
      ]);

      if (result.failed.length > 0) {
        Toast.show({
          type: 'error',
          text1: 'Invite failed',
          text2: result.failed[0]?.reason ?? 'Unknown error',
        });
      } else {
        Toast.show({ type: 'success', text1: 'Tenant invited successfully' });
        await queryClient.invalidateQueries({ queryKey: ['tenants'] });
        handleCloseModal();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to invite tenant';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant: TenantWithBusiness) => {
    try {
      if (tenant.profile.status === 'inactive') {
        await profilesService.reactivate(tenant.profile.id);
        Toast.show({ type: 'success', text1: 'Tenant reactivated' });
      } else {
        await profilesService.disable(tenant.profile.id);
        Toast.show({ type: 'success', text1: 'Tenant disabled' });
      }
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update tenant';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    }
  };

  // Export CSV remains web-only because it writes to the browser file system;
  // a native export would require expo-sharing + FileSystem write which is
  // out of scope for 02-02 (import, not export, is M1-04).
  const handleExportCSV = () => {
    if (typeof document === 'undefined') return;
    if (!tenants || tenants.length === 0) {
      Toast.show({ type: 'info', text1: 'No tenants to export' });
      return;
    }

    const headers = ['email', 'business_name', 'category', 'status', 'contact_name', 'contact_phone', 'unit_number'];
    const rows = tenants.map(t => [
      t.profile.email || '',
      t.business?.business_name || '',
      t.business?.category || '',
      t.profile.status || '',
      t.business?.contact_name || '',
      t.business?.contact_phone || '',
      t.business?.unit_number || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tenants_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Pressable
          testID="back-btn"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="mb-2 self-start"
        >
          <ChevronLeft size={24} color={BRAND.gray} />
        </Pressable>
        <Text className="text-2xl font-lora-semibold text-white leading-tight">Tenants</Text>
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
          <Text className="text-base font-nunito text-brand-steel text-center">
            Select a property to manage tenants
          </Text>
        </View>
      ) : (
        <>
          {/* Filters */}
          <View className="px-4 pt-4 gap-3">
            <SearchBar
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search tenants..."
            />
            <SegmentedControl
              segments={STATUS_SEGMENTS}
              selected={statusFilter}
              onChange={setStatusFilter}
            />
            {typeof document !== 'undefined' ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button onPress={() => setModalVisible(true)}>Add Tenant</Button>
                </View>
                <View className="flex-1">
                  <Button variant="secondary" onPress={handleExportCSV}>Export CSV</Button>
                </View>
              </View>
            ) : (
              <Button onPress={() => setModalVisible(true)}>Add Tenant</Button>
            )}
          </View>

          {/* List */}
          {isLoading ? (
            <LoadingScreen message="Loading tenants..." />
          ) : isError ? (
            <View className="flex-1 items-center justify-center px-6">
              <Text className="text-base font-nunito text-red-400 text-center mb-3">
                {error?.message ?? 'Failed to load tenants'}
              </Text>
              <Button onPress={() => refetch()} variant="secondary">Retry</Button>
            </View>
          ) : (
            <FlatList
              data={tenants ?? []}
              keyExtractor={(item) => item.profile.id}
              ListHeaderComponent={
                <CSVImporter propertyId={activePropertyId} />
              }
              renderItem={({ item }) => (
                <TenantRow
                  profile={item.profile}
                  business={item.business}
                  onPress={() => handleToggleStatus(item)}
                />
              )}
              ListEmptyComponent={
                <EmptyState
                  icon={Users}
                  title="No tenants found"
                  message={
                    searchText
                      ? 'Try adjusting your search or filter'
                      : 'Invite tenants to get started'
                  }
                />
              }
              ListFooterComponent={null}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* Add Tenant Modal */}
      <Modal
        visible={modalVisible}
        onClose={handleCloseModal}
        title="Add Tenant"
        actions={[
          {
            label: submitting ? 'Sending...' : 'Send Invite',
            onPress: handleInvite,
            variant: 'primary',
          },
          { label: 'Cancel', onPress: handleCloseModal, variant: 'secondary' },
        ]}
      >
        <View className="gap-1 pb-2">
          <Input
            testID="tenant-invite-email"
            label="Email *"
            value={email}
            onChangeText={setEmail}
            placeholder="tenant@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            testID="tenant-invite-business-name"
            label="Business Name *"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Acme Corp"
          />
          <Input
            testID="tenant-invite-category"
            label="Category"
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. restaurant, retail, technology"
            autoCapitalize="none"
          />
        </View>
      </Modal>
    </View>
  );
}

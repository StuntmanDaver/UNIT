import { useState } from 'react';
import { View, Text, FlatList, Platform } from 'react-native';
import { Users } from 'lucide-react-native';
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

const STATUS_SEGMENTS = ['All', 'Invited', 'Active', 'Inactive'];

export default function TenantsScreen() {
  const { propertyIds } = useAuth();
  const queryClient = useQueryClient();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');

  const debouncedSearch = useDebounce(searchText, 300);
  const activePropertyId = selectedPropertyId ?? '';
  const statusParam = statusFilter === 'All' ? undefined : statusFilter.toLowerCase();

  const { data: tenants, isLoading } = useTenants(activePropertyId, statusParam, debouncedSearch);

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

  const handleExportCSV = () => {
    if (Platform.OS !== 'web') return;
    if (!tenants || tenants.length === 0) {
      Toast.show({ type: 'info', text1: 'No tenants to export' });
      return;
    }

    const headers = ['email', 'business_name', 'category', 'status', 'contact_name', 'contact_phone'];
    const rows = tenants.map(t => [
      t.profile.email || '',
      t.business?.business_name || '',
      t.business?.category || '',
      t.profile.status || '',
      t.business?.contact_name || '',
      t.business?.contact_phone || ''
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
    <View className="flex-1 bg-gray-50">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Tenants</Text>
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
            {Platform.OS === 'web' ? (
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
          ) : (
            <FlatList
              data={tenants ?? []}
              keyExtractor={(item) => item.profile.id}
              ListHeaderComponent={
                Platform.OS === 'web' ? <CSVImporter propertyId={activePropertyId} /> : null
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
              ListFooterComponent={
                Platform.OS !== 'web' ? (
                  <View className="px-4 py-3 mt-4">
                    <Text className="text-xs text-brand-steel text-center">
                      For bulk import, use the admin web panel
                    </Text>
                  </View>
                ) : null
              }
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
            label="Email *"
            value={email}
            onChangeText={setEmail}
            placeholder="tenant@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Business Name *"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Acme Corp"
          />
          <Input
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

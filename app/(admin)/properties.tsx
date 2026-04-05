import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Building2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/AuthContext';
import { useProperties } from '@/hooks/useProperties';
import { propertiesService, type Property } from '@/services/properties';
import { adminService } from '@/services/admin';

export default function PropertiesScreen() {
  const { propertyIds } = useAuth();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [type, setType] = useState('');
  const [totalUnits, setTotalUnits] = useState('');

  const { data: properties, isLoading } = useProperties(propertyIds);

  const resetForm = () => {
    setName('');
    setAddress('');
    setCity('');
    setState('');
    setType('');
    setTotalUnits('');
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleAddProperty = async () => {
    if (!name.trim() || !address.trim() || !city.trim() || !state.trim()) {
      Toast.show({ type: 'error', text1: 'Please fill in all required fields' });
      return;
    }

    const units = parseInt(totalUnits, 10);
    if (totalUnits && isNaN(units)) {
      Toast.show({ type: 'error', text1: 'Total units must be a number' });
      return;
    }

    setSubmitting(true);
    try {
      const newProperty = await propertiesService.create({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        type: type.trim() || 'commercial',
        total_units: units || 0,
        image_url: null,
      });

      await adminService.addPropertyToAdmin(newProperty.id);

      Toast.show({ type: 'success', text1: 'Property created' });
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      handleCloseModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create property';
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    } finally {
      setSubmitting(false);
    }
  };

  const renderProperty = ({ item }: { item: Property }) => (
    <Card className="mx-4 mb-3 p-4">
      <Text className="text-base font-bold text-brand-navy">{item.name}</Text>
      <Text className="text-sm text-brand-steel mt-1">{item.address}</Text>
      <Text className="text-sm text-brand-steel">
        {item.city}, {item.state}
      </Text>
      <View className="flex-row items-center gap-3 mt-2">
        {item.type ? (
          <View className="bg-gray-100 rounded-md px-2 py-0.5">
            <Text className="text-xs text-brand-steel capitalize">{item.type}</Text>
          </View>
        ) : null}
        {item.total_units > 0 ? (
          <Text className="text-xs text-brand-steel">{item.total_units} units</Text>
        ) : null}
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Properties</Text>
      </GradientHeader>

      <View className="px-4 pt-4">
        <Button onPress={() => setModalVisible(true)}>Add Property</Button>
      </View>

      {isLoading ? (
        <LoadingScreen message="Loading properties..." />
      ) : (
        <FlatList
          data={properties ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderProperty}
          contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={Building2}
              title="No properties"
              message="Add your first property to get started"
            />
          }
        />
      )}

      {/* Add Property Modal */}
      <Modal
        visible={modalVisible}
        onClose={handleCloseModal}
        title="Add Property"
        actions={[
          {
            label: submitting ? 'Creating...' : 'Create Property',
            onPress: handleAddProperty,
            variant: 'primary',
          },
          { label: 'Cancel', onPress: handleCloseModal, variant: 'secondary' },
        ]}
      >
        <View className="gap-1 pb-2">
          <Input
            label="Property Name *"
            value={name}
            onChangeText={setName}
            placeholder="Riverfront Plaza"
          />
          <Input
            label="Address *"
            value={address}
            onChangeText={setAddress}
            placeholder="123 Main St"
          />
          <Input
            label="City *"
            value={city}
            onChangeText={setCity}
            placeholder="San Francisco"
          />
          <Input
            label="State *"
            value={state}
            onChangeText={setState}
            placeholder="CA"
            autoCapitalize="characters"
            maxLength={2}
          />
          <Input
            label="Type"
            value={type}
            onChangeText={setType}
            placeholder="e.g. commercial, residential, mixed-use"
            autoCapitalize="none"
          />
          <Input
            label="Total Units"
            value={totalUnits}
            onChangeText={setTotalUnits}
            placeholder="0"
            keyboardType="number-pad"
          />
        </View>
      </Modal>
    </View>
  );
}

import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { propertiesService, type Property } from '@/services/properties';
import { businessesService } from '@/services/businesses';
import { storageService } from '@/services/storage';
import { adminService } from '@/services/admin';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/constants/categories';

const businessSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  business_description: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  website: z.string().optional(),
});

type BusinessForm = z.infer<typeof businessSchema>;

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<'property' | 'profile'>('property');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertySearch, setPropertySearch] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesService.list,
  });

  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.address.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.city.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      business_name: '',
      category: '',
      business_description: '',
      contact_name: '',
      contact_email: user?.email ?? '',
      contact_phone: '',
      website: '',
    },
  });

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    setStep('profile');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (data: BusinessForm) => {
    if (!selectedProperty || !user?.email) return;

    setLoading(true);

    try {
      let logoUrl: string | null = null;
      if (logoUri) {
        const ext = logoUri.split('.').pop() ?? 'jpg';
        const { file_url } = await storageService.uploadFile(logoUri, ext);
        logoUrl = file_url;
      }

      await businessesService.create({
        property_id: selectedProperty.id,
        owner_email: user.email,
        business_name: data.business_name,
        category: data.category,
        business_description: data.business_description || null,
        contact_name: data.contact_name || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        website: data.website || null,
        logo_url: logoUrl,
      });

      // Set property_ids and activate profile via Edge Function
      await adminService.completeOnboarding(selectedProperty.id);

      Toast.show({ type: 'success', text1: 'Profile created!' });

      // AuthGuard detects onboarding complete and redirects to tabs
      // Force re-check by refreshing session
      await supabase.auth.refreshSession();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Profile creation failed',
        text2: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'property') {
    return (
      <View className="flex-1 bg-brand-navy px-6 pt-16">
        <Text className="text-2xl font-bold text-white mb-2">Select Your Property</Text>
        <Text className="text-brand-steel mb-6">Which business park are you located in?</Text>

        <View className="flex-row items-center bg-brand-navy-light rounded-xl px-4 mb-4">
          <Search size={20} color="#7C8DA7" />
          <Input
            label=""
            placeholder="Search properties..."
            value={propertySearch}
            onChangeText={setPropertySearch}
            className="flex-1 mb-0 border-0"
          />
        </View>

        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectProperty(item)}
              className="bg-brand-navy-light rounded-xl p-4 mb-3"
            >
              <Text className="text-white font-semibold text-base">{item.name}</Text>
              <Text className="text-brand-steel text-sm mt-1">
                {item.address}, {item.city}, {item.state}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="text-brand-steel text-center mt-8">No properties found</Text>
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-navy"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-16 pb-10">
          <Text className="text-2xl font-bold text-white mb-2">Create Your Profile</Text>
          <Text className="text-brand-steel mb-6">
            at {selectedProperty?.name}
          </Text>

          {/* Logo picker */}
          <Pressable onPress={pickImage} className="items-center mb-6">
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                className="w-24 h-24 rounded-2xl"
              />
            ) : (
              <View className="w-24 h-24 rounded-2xl bg-brand-navy-light items-center justify-center">
                <Text className="text-brand-steel text-sm">Add Logo</Text>
              </View>
            )}
            <Text className="text-brand-steel text-sm mt-2">Tap to upload</Text>
          </Pressable>

          <Controller
            control={control}
            name="business_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Business Name"
                placeholder="Your business name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.business_name?.message}
              />
            )}
          />

          <Text className="text-sm font-medium text-brand-navy mb-1.5">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <Controller
              control={control}
              name="category"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-2">
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => onChange(cat)}
                      className={`px-4 py-2 rounded-full ${
                        value === cat ? 'bg-white' : 'bg-brand-navy-light'
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          value === cat ? 'text-brand-navy font-semibold' : 'text-brand-steel'
                        }`}
                      >
                        {getCategoryLabel(cat)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </ScrollView>
          {errors.category && (
            <Text className="text-sm text-red-500 -mt-2 mb-4">{errors.category.message}</Text>
          )}

          <Controller
            control={control}
            name="business_description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Description"
                placeholder="What does your business do?"
                multiline
                numberOfLines={3}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="contact_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Contact Name"
                placeholder="Primary contact"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="contact_email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Contact Email"
                placeholder="you@business.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.contact_email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="contact_phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone"
                placeholder="(555) 555-5555"
                keyboardType="phone-pad"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="website"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Website"
                placeholder="https://yourbusiness.com"
                keyboardType="url"
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4">
            Create Profile
          </Button>

          <Pressable onPress={() => setStep('property')} className="mt-4 items-center">
            <Text className="text-brand-steel">Change property</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

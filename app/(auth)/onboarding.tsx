import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import { propertiesService, type Property } from '@/services/properties';
import { businessesService } from '@/services/businesses';
import { storageService } from '@/services/storage';
import { adminService } from '@/services/admin';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/constants/categories';

function isOptionalHttpUrl(value: string | undefined): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const businessSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  business_description: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  website: z.string().optional().refine(isOptionalHttpUrl, 'Website must start with http:// or https://'),
});

type BusinessForm = z.infer<typeof businessSchema>;

// Defined outside the screen component so its type identity is stable across re-renders
function SignOutLink({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <Pressable onPress={onSignOut} className="mt-4 py-3 items-center">
      <Text className="font-nunito text-sm text-red-700">Sign out</Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

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
      p.address?.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.city?.toLowerCase().includes(propertySearch.toLowerCase())
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
      contact_name: user?.email ?? '',
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
      // Logo upload is best-effort — a stalled upload should not block profile creation
      let logoUrl: string | null = null;
      if (logoUri) {
        try {
          const ext = logoUri.split('.').pop() ?? 'jpg';
          const { file_url } = await storageService.uploadFile(logoUri, ext);
          logoUrl = file_url;
        } catch {
          // Per D-05 / Risk Area 5: continue without logo so the user is not
          // blocked, but surface a warning so they know the upload failed and
          // can retry from profile edit later.
          Toast.show({
            type: 'info',
            text1: 'Logo upload failed',
            text2: 'You can try again from your profile settings.',
          });
        }
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
        unit_number: null,
      });

      // Set property_ids. New tenant signups remain invited until a landlord
      // approves them from the admin tenant list.
      await adminService.completeOnboarding(selectedProperty.id);

      Toast.show({ type: 'success', text1: 'Profile submitted for approval' });

      // Update auth state — needsOnboarding becomes false, which triggers
      // AuthGuard to navigate to /(tabs)/directory automatically.
      // Do NOT call router.replace here: AuthGuard must be the one to navigate
      // so it sees needsOnboarding=false before leaving the auth group.
      await refreshProfile();
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
      <View className="flex-1 bg-brand-cloud px-6" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-lora-semibold text-brand-ink mb-2">Select Your Property</Text>
        <Text className="font-nunito text-base text-brand-ink-muted mb-6">
          Which business park are you located in?
        </Text>

        <View className="flex-row items-center bg-brand-mist rounded-xl px-4 mb-4">
          <Search size={20} color="#5F708A" />
          <TextInput
            placeholder="Search properties..."
            placeholderTextColor="#5F708A"
            value={propertySearch}
            onChangeText={setPropertySearch}
            className="flex-1 py-3 ml-2 text-base text-brand-ink font-nunito"
          />
        </View>

        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              testID="property-list-item"
              onPress={() => handleSelectProperty(item)}
              className="bg-brand-mist rounded-xl p-4 mb-3"
            >
              <Text className="text-brand-ink font-nunito-semibold text-base">{item.name}</Text>
              <Text className="text-brand-ink-muted font-nunito text-sm mt-1">
                {item.address}, {item.city}, {item.state}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="font-nunito text-base text-brand-ink-muted text-center mt-8">
              No properties found
            </Text>
          }
          ListFooterComponent={<SignOutLink onSignOut={logout} />}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-cloud"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pb-10" style={{ paddingTop: insets.top + 16 }}>
          <Text className="text-2xl font-lora-semibold text-brand-ink mb-2">Create Your Profile</Text>
          <Text className="font-nunito text-base text-brand-ink-muted mb-6">
            at {selectedProperty?.name}
          </Text>

          {/* Logo picker */}
          <Pressable onPress={pickImage} className="items-center mb-6">
            {logoUri ? (
              <Image source={{ uri: logoUri }} className="w-24 h-24 rounded-2xl" />
            ) : (
              <View className="w-24 h-24 rounded-2xl bg-brand-mist items-center justify-center">
                <Text className="font-nunito text-sm text-brand-ink-muted">Add Logo</Text>
              </View>
            )}
            <Text className="font-nunito text-sm text-brand-ink-muted mt-2">Tap to upload</Text>
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

          <Text className="text-sm font-nunito-semibold text-brand-ink mb-2 leading-normal">
            Category
          </Text>
          <ScrollView
            testID="onboarding-category-scroll"
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
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
                        value === cat ? 'bg-brand-blue' : 'bg-brand-mist border border-brand-blue/40'
                      }`}
                    >
                      <Text
                        className={`text-sm font-nunito ${
                          value === cat ? 'text-white font-nunito-semibold' : 'text-brand-ink'
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
            <Text className="text-sm font-nunito text-red-700 -mt-2 mb-4">
              {errors.category.message}
            </Text>
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

          <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4" testID="btn-create-profile">
            Create Profile
          </Button>

          <Pressable
            onPress={() => {
              setStep('property');
            }}
            className="mt-4 items-center py-3"
          >
            <Text className="font-nunito-semibold text-base text-brand-ink-muted">Back to properties</Text>
          </Pressable>
          <SignOutLink onSignOut={logout} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

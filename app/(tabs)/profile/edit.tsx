import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Camera } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { businessesService } from '@/services/businesses';
import { storageService } from '@/services/storage';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { CATEGORY_COLORS } from '@/constants/colors';

const editProfileSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  business_description: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z
    .string()
    .optional()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Please enter a valid email address',
    }),
  website: z
    .string()
    .optional()
    .refine((val) => !val || /^https?:\/\/.+/.test(val), {
      message: 'Website must start with http:// or https://',
    }),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const { data: business, isLoading } = useCurrentUser();
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    values: business
      ? {
          business_name: business.business_name,
          category: business.category,
          business_description: business.business_description ?? '',
          contact_name: business.contact_name ?? '',
          contact_phone: business.contact_phone ?? '',
          contact_email: business.contact_email ?? '',
          website: business.website ?? '',
        }
      : undefined,
  });

  const selectedCategory = watch('category');

  const handlePickLogo = async () => {
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

  const onSubmit = async (data: EditProfileFormData) => {
    if (!business) return;
    setIsSaving(true);
    try {
      let logo_url = business.logo_url;

      if (logoUri) {
        const ext = logoUri.split('.').pop() ?? 'jpg';
        const { file_url } = await storageService.uploadFile(logoUri, ext);
        logo_url = file_url;
      }

      await businessesService.update(business.id, {
        business_name: data.business_name,
        category: data.category,
        business_description: data.business_description || null,
        contact_name: data.contact_name || null,
        contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null,
        website: data.website || null,
        logo_url,
      });

      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['businesses'] });

      Toast.show({
        type: 'success',
        text1: 'Profile updated',
        text2: 'Your business profile has been saved.',
      });

      router.back();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  const displayLogoUri = logoUri ?? business?.logo_url ?? null;
  const displayName = watch('business_name') || business?.business_name || 'Business';

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Text className="text-3xl font-lora-semibold text-white leading-tight">Edit Profile</Text>
      </GradientHeader>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo picker */}
        <View className="items-center mb-6">
          <Pressable onPress={handlePickLogo} className="items-center gap-2">
            <View className="relative">
              <Avatar imageUrl={displayLogoUri} name={displayName} size={80} />
              <View className="absolute bottom-0 right-0 w-6 h-6 bg-brand-blue rounded-full items-center justify-center border-2 border-brand-navy">
                <Camera size={12} color="#FFFFFF" />
              </View>
            </View>
            <Text className="text-sm font-nunito text-brand-gray leading-normal">Change Logo</Text>
          </Pressable>
        </View>

        {/* Business Name */}
        <Controller
          control={control}
          name="business_name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Business Name *"
              value={value}
              onChangeText={onChange}
              placeholder="Your business name"
              error={errors.business_name?.message}
            />
          )}
        />

        {/* Category picker */}
        <View className="mb-4">
          <Text className="text-sm font-nunito-semibold text-brand-gray mb-2 leading-normal">Category *</Text>
          <FlatList
            data={BUSINESS_CATEGORIES as unknown as string[]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item;
              const color = CATEGORY_COLORS[item] ?? '#465A75';
              return (
                <Pressable
                  onPress={() => setValue('category', item)}
                  className="rounded-full px-4 py-2 border border-brand-blue/40"
                  style={{
                    backgroundColor: isSelected ? color : '#1D263A',
                    borderColor: isSelected ? color : undefined,
                  }}
                >
                  <Text
                    className="text-sm font-nunito-semibold leading-normal"
                    style={{ color: isSelected ? '#FFFFFF' : '#E0E1DE' }}
                  >
                    {getCategoryLabel(item)}
                  </Text>
                </Pressable>
              );
            }}
          />
          {errors.category && (
            <Text className="text-sm font-nunito text-red-500 mt-2 leading-normal">{errors.category.message}</Text>
          )}
        </View>

        {/* Description */}
        <Controller
          control={control}
          name="business_description"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Description"
              value={value}
              onChangeText={onChange}
              placeholder="Tell people about your business"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
              error={errors.business_description?.message}
            />
          )}
        />

        {/* Contact Name */}
        <Controller
          control={control}
          name="contact_name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Contact Name"
              value={value}
              onChangeText={onChange}
              placeholder="Contact person's name"
              error={errors.contact_name?.message}
            />
          )}
        />

        {/* Contact Phone */}
        <Controller
          control={control}
          name="contact_phone"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Phone"
              value={value}
              onChangeText={onChange}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              error={errors.contact_phone?.message}
            />
          )}
        />

        {/* Contact Email */}
        <Controller
          control={control}
          name="contact_email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              value={value}
              onChangeText={onChange}
              placeholder="contact@business.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.contact_email?.message}
            />
          )}
        />

        {/* Website */}
        <Controller
          control={control}
          name="website"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Website"
              value={value}
              onChangeText={onChange}
              placeholder="https://yourbusiness.com"
              keyboardType="url"
              autoCapitalize="none"
              error={errors.website?.message}
            />
          )}
        />

        {/* Actions */}
        <View className="gap-3 mt-2">
          <Button onPress={handleSubmit(onSubmit)} loading={isSaving} disabled={isSaving}>
            Save Changes
          </Button>
          <Button onPress={() => router.back()} variant="ghost" disabled={isSaving}>
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

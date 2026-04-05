import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ImagePlus, X } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { postsService } from '@/services/posts';
import { storageService } from '@/services/storage';
import { useAuth } from '@/lib/AuthContext';

const createOfferSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  expiry_date: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val),
      { message: 'Date must be in YYYY-MM-DD format' }
    ),
});

type CreateOfferFormData = z.infer<typeof createOfferSchema>;

export default function CreatePromotionScreen() {
  const queryClient = useQueryClient();
  const { propertyIds } = useAuth();
  const { data: business } = useCurrentUser();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const propertyId = propertyIds[0] ?? '';

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOfferFormData>({
    resolver: zodResolver(createOfferSchema),
    defaultValues: {
      title: '',
      description: '',
      expiry_date: '',
    },
  });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (data: CreateOfferFormData) => {
    if (!business) {
      Toast.show({ type: 'error', text1: 'No business profile found' });
      return;
    }
    setIsSaving(true);
    try {
      let image_url: string | null = null;

      if (imageUri) {
        const ext = imageUri.split('.').pop() ?? 'jpg';
        const { file_url } = await storageService.uploadFile(imageUri, ext);
        image_url = file_url;
      }

      await postsService.create({
        property_id: propertyId,
        business_id: business.id,
        type: 'offer',
        title: data.title,
        content: data.description,
        expiry_date: data.expiry_date || null,
        image_url,
      });

      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
      await queryClient.invalidateQueries({ queryKey: ['posts'] });

      Toast.show({
        type: 'success',
        text1: 'Offer posted',
        text2: 'Your promotion is now live.',
      });

      router.back();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to post offer',
        text2: 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Post an Offer</Text>
      </GradientHeader>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Title *"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. 20% off this week only"
              error={errors.title?.message}
            />
          )}
        />

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Description *"
              value={value}
              onChangeText={onChange}
              placeholder="Describe your offer..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
              error={errors.description?.message}
            />
          )}
        />

        {/* Expiry Date */}
        <Controller
          control={control}
          name="expiry_date"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Expiry Date (optional)"
              value={value}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
              error={errors.expiry_date?.message}
            />
          )}
        />

        {/* Image picker */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-brand-navy mb-1.5">Image (optional)</Text>
          {imageUri ? (
            <View className="relative rounded-xl overflow-hidden">
              <Image
                source={{ uri: imageUri }}
                className="w-full h-48"
                resizeMode="cover"
              />
              <Pressable
                onPress={() => setImageUri(null)}
                className="absolute top-2 right-2 bg-black/60 rounded-full w-8 h-8 items-center justify-center"
              >
                <X size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickImage}
              className="border-2 border-dashed border-brand-steel/40 rounded-xl h-32 items-center justify-center gap-2"
            >
              <ImagePlus size={24} color="#7C8DA7" />
              <Text className="text-sm text-brand-steel">Add an image</Text>
            </Pressable>
          )}
        </View>

        {/* Actions */}
        <View className="gap-3 mt-2">
          <Button onPress={handleSubmit(onSubmit)} loading={isSaving} disabled={isSaving}>
            Post Offer
          </Button>
          <Button onPress={() => router.back()} variant="ghost" disabled={isSaving}>
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ImagePlus, X, Calendar } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { promotionsService } from '@/services/promotions';
import { storageService } from '@/services/storage';
import { useAuth } from '@/lib/AuthContext';

const schema = z.object({
  headline: z.string().min(1, 'Headline is required'),
  description: z.string().min(1, 'Description is required'),
  cta_text: z.string().optional(),
  cta_link: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type ActivePicker = null | 'start' | 'end';

export default function CreatePromotionScreen() {
  const queryClient = useQueryClient();
  const { propertyIds, user } = useAuth();
  const { data: business } = useCurrentUser();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const propertyId = propertyIds[0] ?? '';
  const today = new Date();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { headline: '', description: '', cta_text: '', cta_link: '' },
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

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (!date) return;
    if (activePicker === 'start') {
      setStartDate(date);
      // Auto-advance to end picker on iOS
      if (Platform.OS !== 'android') setActivePicker('end');
    } else if (activePicker === 'end') {
      setEndDate(date);
      if (Platform.OS !== 'android') setActivePicker(null);
    }
  };

  const pickerValue = activePicker === 'start'
    ? (startDate ?? today)
    : (endDate ?? startDate ?? today);

  const onSubmit = async (data: FormData) => {
    if (!business) {
      Toast.show({ type: 'error', text1: 'No business profile found' });
      return;
    }
    if (!user?.id) {
      Toast.show({ type: 'error', text1: 'Not signed in' });
      return;
    }
    if (!startDate) {
      Toast.show({ type: 'error', text1: 'Start date is required' });
      return;
    }
    if (!endDate) {
      Toast.show({ type: 'error', text1: 'End date is required' });
      return;
    }
    if (endDate <= startDate) {
      Toast.show({ type: 'error', text1: 'End date must be after start date' });
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

      const newPromo = await promotionsService.createTenant(
        {
          property_id: propertyId,
          advertiser_id: user.id,
          business_name: business.business_name,
          headline: data.headline,
          description: data.description || null,
          image_url,
          cta_text: data.cta_text || null,
          cta_link: data.cta_link || null,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        },
        user.id
      );

      await queryClient.invalidateQueries({ queryKey: ['promotions'] });

      router.replace(`/(tabs)/promotions/pending-payment?id=${newPromo.id}` as Parameters<typeof router.replace>[0]);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Failed to create promotion',
        text2: 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const pickerLabel = activePicker === 'start' ? 'Start Date' : 'End Date';

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Text className="text-3xl font-lora-semibold text-white leading-tight">Promote My Business</Text>
      </GradientHeader>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Headline */}
        <Controller
          control={control}
          name="headline"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Headline *"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. 20% off this week only"
              error={errors.headline?.message}
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

        {/* Date pickers */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-nunito-semibold text-brand-gray mb-2 leading-normal">Start Date *</Text>
            <Pressable
              onPress={() => setActivePicker('start')}
              className="flex-row items-center bg-brand-navy-light border border-brand-blue/40 rounded-xl px-3 h-12"
            >
              <Calendar size={16} color="#7C8DA7" />
              <Text className={`flex-1 ml-2 text-sm font-nunito leading-normal ${startDate ? 'text-brand-gray' : 'text-brand-steel'}`}>
                {startDate ? format(startDate, 'MMM d, yyyy') : 'Select'}
              </Text>
            </Pressable>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-nunito-semibold text-brand-gray mb-2 leading-normal">End Date *</Text>
            <Pressable
              onPress={() => setActivePicker('end')}
              className="flex-row items-center bg-brand-navy-light border border-brand-blue/40 rounded-xl px-3 h-12"
            >
              <Calendar size={16} color="#7C8DA7" />
              <Text className={`flex-1 ml-2 text-sm font-nunito leading-normal ${endDate ? 'text-brand-gray' : 'text-brand-steel'}`}>
                {endDate ? format(endDate, 'MMM d, yyyy') : 'Select'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* iOS date picker modal */}
        {Platform.OS === 'ios' && activePicker !== null && (
          <Modal visible transparent animationType="slide">
            <Pressable
              className="flex-1 bg-black/50 justify-end"
              onPress={() => setActivePicker(null)}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View className="bg-brand-navy-light rounded-t-2xl pb-8">
                  <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
                    <Pressable onPress={() => setActivePicker(null)}>
                      <Text className="text-sm font-nunito-semibold text-brand-steel leading-normal">Cancel</Text>
                    </Pressable>
                    <Text className="text-base font-nunito-semibold text-brand-gray leading-relaxed">{pickerLabel}</Text>
                    <Pressable onPress={() => setActivePicker(null)}>
                      <Text className="text-sm font-nunito-semibold text-white leading-normal">Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={pickerValue}
                    mode="date"
                    display="spinner"
                    minimumDate={activePicker === 'end' && startDate ? startDate : today}
                    onChange={handleDateChange}
                    themeVariant="dark"
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* Android inline date picker */}
        {Platform.OS === 'android' && activePicker !== null && (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="default"
            minimumDate={activePicker === 'end' && startDate ? startDate : today}
            onChange={handleDateChange}
          />
        )}

        {/* CTA fields */}
        <Controller
          control={control}
          name="cta_text"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Button Label (optional)"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="e.g. Claim Offer"
              error={errors.cta_text?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="cta_link"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Button Link (optional)"
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
              error={errors.cta_link?.message}
            />
          )}
        />

        {/* Image picker */}
        <View className="mb-4">
          <Text className="text-sm font-nunito-semibold text-brand-gray mb-2 leading-normal">Image (optional)</Text>
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
              <Text className="text-sm font-nunito text-brand-steel leading-normal">Add an image</Text>
            </Pressable>
          )}
        </View>

        {/* Actions */}
        <View className="gap-3 mt-2">
          <Button onPress={handleSubmit(onSubmit)} loading={isSaving} disabled={isSaving}>
            Continue to Payment
          </Button>
          <Button onPress={() => router.back()} variant="ghost" disabled={isSaving}>
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

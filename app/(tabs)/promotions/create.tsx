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
import { postsService } from '@/services/posts';
import { storageService } from '@/services/storage';
import { adminService } from '@/services/admin';
import { useAuth } from '@/lib/AuthContext';

const createOfferSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
});

type CreateOfferFormData = z.infer<typeof createOfferSchema>;

export default function CreatePromotionScreen() {
  const queryClient = useQueryClient();
  const { propertyIds, user } = useAuth();
  const { data: business } = useCurrentUser();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const propertyId = propertyIds[0] ?? '';
  const minDate = new Date();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOfferFormData>({
    resolver: zodResolver(createOfferSchema),
    defaultValues: { title: '', description: '' },
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
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
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
        expiry_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        image_url,
      });

      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
      await queryClient.invalidateQueries({ queryKey: ['posts'] });

      Toast.show({
        type: 'success',
        text1: 'Offer posted',
        text2: 'Your promotion is now live.',
      });

      if (business) {
        adminService.sendPush({
          property_id: propertyId,
          title: `${business.business_name} posted an offer`,
          message: data.title,
          data: { type: 'offer' },
          exclude_email: user?.email ?? undefined,
        }).catch(() => {});
      }

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
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Text className="text-3xl font-lora-semibold text-white leading-tight">Post an Offer</Text>
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

        {/* Expiry Date picker */}
        <View className="mb-4">
          <Text className="text-sm font-nunito-semibold text-brand-gray mb-2 leading-normal">
            Expiry Date (optional)
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center bg-brand-navy-light border border-brand-blue/40 rounded-xl px-4 h-12"
          >
            <Calendar size={18} color="#7C8DA7" />
            <Text className={`flex-1 ml-3 text-base font-nunito leading-relaxed ${selectedDate ? 'text-brand-gray' : 'text-brand-steel'}`}>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </Text>
            {selectedDate && (
              <Pressable
                onPress={() => setSelectedDate(null)}
                hitSlop={8}
              >
                <X size={16} color="#7C8DA7" />
              </Pressable>
            )}
          </Pressable>
        </View>

        {/* iOS date picker modal */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
          >
            <Pressable
              className="flex-1 bg-black/50 justify-end"
              onPress={() => setShowDatePicker(false)}
            >
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View className="bg-brand-navy-light rounded-t-2xl pb-8">
                  <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
                    <Pressable onPress={() => { setSelectedDate(null); setShowDatePicker(false); }}>
                      <Text className="text-sm font-nunito-semibold text-brand-steel leading-normal">Clear</Text>
                    </Pressable>
                    <Text className="text-base font-nunito-semibold text-brand-gray leading-relaxed">Expiry Date</Text>
                    <Pressable onPress={() => setShowDatePicker(false)}>
                      <Text className="text-sm font-nunito-semibold text-white leading-normal">Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={selectedDate ?? minDate}
                    mode="date"
                    display="spinner"
                    minimumDate={minDate}
                    onChange={handleDateChange}
                    themeVariant="dark"
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* Android date picker (inline native dialog) */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={selectedDate ?? minDate}
            mode="date"
            display="default"
            minimumDate={minDate}
            onChange={handleDateChange}
          />
        )}

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
            Create promotion
          </Button>
          <Button onPress={() => router.back()} variant="ghost" disabled={isSaving}>
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

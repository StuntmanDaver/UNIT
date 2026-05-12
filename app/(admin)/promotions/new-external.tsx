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
import { addDays, format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ChevronLeft, ImagePlus, X, Calendar } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { useAuth } from '@/lib/AuthContext';
import { storageService } from '@/services/storage';
import { promotionsService } from '@/services/promotions';
import { firstParam } from '@/lib/routeParams';

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const schema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  headline: z.string().min(1, 'Headline is required'),
  description: z.string().min(1, 'Description is required'),
  cta_text: z.string().min(1, 'CTA label is required'),
  cta_link: z.string().min(1, 'CTA URL is required').refine(isHttpUrl, 'CTA URL must start with http:// or https://'),
  ext_contact_name: z.string().optional(),
  ext_contact_email: z.string().optional(),
  ext_contact_phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type ActiveDatePicker = null | 'start' | 'end';

export default function NewExternalPromotionScreen() {
  const { propertyIds, user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const initialPropertyId = firstParam(params.propertyId);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(() =>
    initialPropertyId && initialPropertyId.length > 0 ? initialPropertyId : null
  );
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activePicker, setActivePicker] = useState<ActiveDatePicker>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name: '',
      headline: '',
      description: '',
      cta_text: '',
      cta_link: '',
      ext_contact_name: '',
      ext_contact_email: '',
      ext_contact_phone: '',
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

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setActivePicker(null);
    if (!date) return;
    if (activePicker === 'start') {
      setStartDate(date);
      setEndDate((currentEndDate) =>
        !currentEndDate || currentEndDate <= date ? addDays(date, 7) : currentEndDate
      );
    } else if (activePicker === 'end') {
      setEndDate(startDate && date <= startDate ? addDays(startDate, 7) : date);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!selectedPropertyId) {
      Toast.show({ type: 'error', text1: 'Select a property first' });
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
    if (!user) {
      Toast.show({ type: 'error', text1: 'Not authenticated' });
      return;
    }

    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (imageUri) {
        const ext = imageUri.split('.').pop() ?? 'jpg';
        const { file_url } = await storageService.uploadFile(imageUri, ext);
        image_url = file_url;
      }

      await promotionsService.createExternal({
        property_id: selectedPropertyId,
        created_by_admin_id: user.id,
        business_name: data.business_name.trim(),
        headline: data.headline.trim(),
        description: data.description.trim(),
        image_url,
        cta_text: data.cta_text.trim(),
        cta_link: data.cta_link.trim(),
        external_contact_name: data.ext_contact_name?.trim() || null,
        external_contact_email: data.ext_contact_email?.trim() || null,
        external_contact_phone: data.ext_contact_phone?.trim() || null,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      });

      await queryClient.invalidateQueries({ queryKey: ['admin-promotions-all', selectedPropertyId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });

      Toast.show({ type: 'success', text1: 'External promotion created' });
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create promotion';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date();
  const pickerValue =
    activePicker === 'start' ? (startDate ?? today) : (endDate ?? startDate ?? today);

  return (
    <View className="flex-1 bg-brand-cloud">
      <GradientHeader>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="mb-2 self-start"
          testID="back-btn"
        >
          <ChevronLeft size={24} color={BRAND.gray} />
        </Pressable>
        <Text className="text-2xl font-lora-semibold text-white leading-tight">
          New External Promotion
        </Text>
      </GradientHeader>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Property selector */}
        <View className="mb-4">
          <Text className="text-sm font-nunito text-brand-ink mb-2">Target Property *</Text>
          <PropertySelector
            propertyIds={propertyIds}
            selected={selectedPropertyId}
            onSelect={setSelectedPropertyId}
          />
        </View>

        {/* Business name */}
        <Controller
          control={control}
          name="business_name"
          render={({ field: { onChange, value } }) => (
            <Input
              testID="external-promo-business-name"
              label="Business Name *"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Starbucks"
              error={errors.business_name?.message}
            />
          )}
        />

        {/* Headline */}
        <Controller
          control={control}
          name="headline"
          render={({ field: { onChange, value } }) => (
            <Input
              testID="external-promo-headline"
              label="Headline *"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. 10% off for all tenants"
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
              testID="external-promo-description"
              label="Description *"
              value={value}
              onChangeText={onChange}
              placeholder="Describe the promotion..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
              error={errors.description?.message}
            />
          )}
        />

        {/* CTA */}
        <Controller
          control={control}
          name="cta_text"
          render={({ field: { onChange, value } }) => (
            <Input
              testID="external-promo-cta-label"
              label="CTA Label *"
              value={value}
              onChangeText={onChange}
              placeholder="e.g. Claim offer"
              error={errors.cta_text?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="cta_link"
          render={({ field: { onChange, value } }) => (
            <Input
              testID="external-promo-cta-url"
              label="CTA URL *"
              value={value}
              onChangeText={onChange}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
              error={errors.cta_link?.message}
            />
          )}
        />

        {/* Date range */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-nunito text-brand-ink mb-2">Start Date *</Text>
            <Pressable
              testID="external-promo-start-date"
              onPress={() => setActivePicker('start')}
              className="flex-row items-center bg-brand-mist border border-brand-blue/40 rounded-xl px-4 h-12"
            >
              <Calendar size={16} color={BRAND.steel} />
              <Text
                className={`flex-1 ml-2 text-base font-nunito leading-relaxed ${
                  startDate ? 'text-brand-ink' : 'text-brand-ink-muted'
                }`}
                numberOfLines={1}
              >
                {startDate ? format(startDate, 'MMM d, yyyy') : 'Select'}
              </Text>
            </Pressable>
          </View>

          <View className="flex-1">
            <Text className="text-sm font-nunito text-brand-ink mb-2">End Date *</Text>
            <Pressable
              testID="external-promo-end-date"
              onPress={() => setActivePicker('end')}
              className="flex-row items-center bg-brand-mist border border-brand-blue/40 rounded-xl px-4 h-12"
            >
              <Calendar size={16} color={BRAND.steel} />
              <Text
                className={`flex-1 ml-2 text-base font-nunito leading-relaxed ${
                  endDate ? 'text-brand-ink' : 'text-brand-ink-muted'
                }`}
                numberOfLines={1}
              >
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
                <View className="bg-brand-mist rounded-t-2xl pb-8">
                  <View className="flex-row justify-between items-center px-4 pt-4 pb-2">
                    <Pressable
                      onPress={() => {
                        if (activePicker === 'start') setStartDate(null);
                        else setEndDate(null);
                        setActivePicker(null);
                      }}
                    >
                      <Text className="text-sm font-nunito-semibold text-brand-ink-muted leading-normal">
                        Clear
                      </Text>
                    </Pressable>
                    <Text className="text-base font-nunito-semibold text-brand-ink leading-relaxed">
                      {activePicker === 'start' ? 'Start Date' : 'End Date'}
                    </Text>
                    <Pressable onPress={() => setActivePicker(null)}>
                      <Text className="text-sm font-nunito-semibold text-brand-blue leading-normal">
                        Done
                      </Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={pickerValue}
                    mode="date"
                    display="spinner"
                    minimumDate={activePicker === 'end' ? (startDate ?? today) : today}
                    onChange={handleDateChange}
                    themeVariant="dark"
                  />
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* Android date picker */}
        {Platform.OS === 'android' && activePicker !== null && (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="default"
            minimumDate={activePicker === 'end' ? (startDate ?? today) : today}
            onChange={handleDateChange}
          />
        )}

        {/* Image */}
        <View className="mb-4">
          <Text className="text-sm font-nunito-semibold text-brand-ink mb-2 leading-normal">
            Promotion Image (optional)
          </Text>
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
              <ImagePlus size={24} color={BRAND.steel} />
              <Text className="text-sm font-nunito text-brand-ink-muted leading-normal">
                Add an image
              </Text>
            </Pressable>
          )}
        </View>

        {/* External contact (optional) */}
        <View className="mb-2">
          <Text className="text-sm font-nunito-semibold text-brand-ink mb-3 leading-normal">
            External Contact (optional)
          </Text>
          <Controller
            control={control}
            name="ext_contact_name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Contact Name"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Jane Smith"
              />
            )}
          />
          <Controller
            control={control}
            name="ext_contact_email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Contact Email"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="jane@business.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}
          />
          <Controller
            control={control}
            name="ext_contact_phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Contact Phone"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="+1 555 000 0000"
                keyboardType="phone-pad"
              />
            )}
          />
        </View>

        {/* Actions */}
        <View className="gap-3 mt-4">
          <Button
            testID="external-promo-create"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            disabled={submitting}
          >
            Create Promotion
          </Button>
          <Button
            testID="external-promo-cancel"
            onPress={() => router.back()}
            variant="ghost"
            disabled={submitting}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

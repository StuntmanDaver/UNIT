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
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { postsService } from '@/services/posts';
import { storageService } from '@/services/storage';
import { adminService } from '@/services/admin';
import { useAuth } from '@/lib/AuthContext';

const POST_TYPES = ['announcement', 'event'] as const;
type PostType = (typeof POST_TYPES)[number];

const createPostSchema = z
  .object({
    type: z.enum(POST_TYPES),
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    event_date: z.string().optional(),
    event_time: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'event') {
        return !!data.event_date && /^\d{4}-\d{2}-\d{2}$/.test(data.event_date);
      }
      return true;
    },
    { message: 'Event date is required (YYYY-MM-DD)', path: ['event_date'] }
  );

type CreatePostFormData = z.infer<typeof createPostSchema>;

export default function CreateCommunityPostScreen() {
  const queryClient = useQueryClient();
  const { propertyIds, user } = useAuth();
  const { data: business } = useCurrentUser();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const propertyId = propertyIds[0] ?? '';

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      type: 'announcement',
      title: '',
      content: '',
      event_date: '',
      event_time: '',
    },
  });

  const postType = watch('type');

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

  const onSubmit = async (data: CreatePostFormData) => {
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
        type: data.type,
        title: data.title,
        content: data.content,
        event_date: data.type === 'event' ? (data.event_date || null) : null,
        event_time: data.type === 'event' ? (data.event_time || null) : null,
        image_url,
      });

      await queryClient.invalidateQueries({ queryKey: ['posts'] });

      Toast.show({
        type: 'success',
        text1: 'Post published',
        text2: 'Your post is now live in the community.',
      });

      if (business) {
        const titleMap: Record<string, string> = {
          announcement: `New announcement from ${business.business_name}`,
          event: `${business.business_name} is hosting an event`,
        };
        adminService.sendPush({
          property_id: propertyIds[0],
          title: titleMap[data.type] ?? `New post from ${business.business_name}`,
          message: data.title,
          data: { type: 'post' },
          exclude_email: user?.email ?? undefined,
        }).catch(() => {});
      }

      router.back();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to publish post',
        text2: 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Text className="text-3xl font-lora-semibold text-white leading-tight">New Post</Text>
      </GradientHeader>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type selector */}
        <View className="mb-5">
          <Text className="text-sm font-nunito-semibold text-brand-gray mb-2 leading-normal">Post Type *</Text>
          <SegmentedControl
            segments={['announcement', 'event']}
            selected={postType}
            onChange={(s) => setValue('type', s as PostType)}
          />
        </View>

        {/* Title */}
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Title *"
              value={value}
              onChangeText={onChange}
              placeholder={
                postType === 'event' ? 'e.g. Rooftop Networking Night' : 'e.g. Building maintenance notice'
              }
              error={errors.title?.message}
            />
          )}
        />

        {/* Content */}
        <Controller
          control={control}
          name="content"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Content *"
              value={value}
              onChangeText={onChange}
              placeholder="Write your post here..."
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
              error={errors.content?.message}
            />
          )}
        />

        {/* Event-specific fields */}
        {postType === 'event' && (
          <>
            <Controller
              control={control}
              name="event_date"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Event Date *"
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numeric"
                  error={errors.event_date?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="event_time"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Event Time (optional)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. 6:00 PM"
                  error={errors.event_time?.message}
                />
              )}
            />
          </>
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
            Post update
          </Button>
          <Button onPress={() => router.back()} variant="ghost" disabled={isSaving}>
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

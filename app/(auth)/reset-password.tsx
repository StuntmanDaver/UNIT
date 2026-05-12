import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetForm = z.infer<typeof resetSchema>;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

export default function ResetPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    setLoading(true);

    try {
      const updateResult = await withTimeout(
        supabase.functions.invoke('complete-password-reset', {
          body: {
            password: data.password,
          },
        }),
        15000
      );

      if (!updateResult) {
        Toast.show({
          type: 'error',
          text1: 'Password update timed out',
          text2: 'Please try again',
        });
        return;
      }

      if (updateResult?.error) {
        Toast.show({
          type: 'error',
          text1: 'Password update failed',
          text2: updateResult.error.message,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Password updated',
        text2: 'You can now use the app',
      });

      await refreshProfile();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Something went wrong',
        text2: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-cloud"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-10">
          <Text className="text-3xl font-lora-semibold text-brand-ink text-center mb-2 leading-tight">Set New Password</Text>
          <Text className="text-base font-nunito text-brand-ink-muted text-center mb-10 leading-relaxed">
            Please create a new password to secure your account
          </Text>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="New Password"
                placeholder="At least 8 characters"
                secureTextEntry
                testID="reset-password-new"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                secureTextEntry
                testID="reset-password-confirm"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-2" testID="btn-update-password">
            Update Password
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

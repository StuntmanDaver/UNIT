import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable, Image } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: error.message,
      });
    }
    // On success, onAuthStateChange fires and AuthGuard handles navigation
  };

  const handleForgotPassword = async () => {
    const email = watch('email');
    if (!email || !email.includes('@')) {
      Toast.show({
        type: 'info',
        text1: 'Enter your email above, then tap here again',
      });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: error.message });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Check your email',
          text2: 'We sent a password reset link',
        });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Something went wrong' });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-navy"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-10 w-full max-w-md mx-auto">
          <View className="items-center mb-8">
            <Image
              source={require('../../assets/logo-transparent-light.png')}
              style={{ width: 160, height: 160 }}
              resizeMode="contain"
            />
          </View>

          <View className="bg-brand-navy-light p-6 rounded-3xl border border-brand-blue shadow-xl">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="you@business.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry
                  textContentType="oneTimeCode"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />

            <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4">
              Log In
            </Button>
          </View>

          <Pressable onPress={handleForgotPassword} className="mt-8 items-center">
            <Text className="text-brand-steel text-sm font-arcadia">Forgot password?</Text>
          </Pressable>

          <View className="mt-6 flex-row justify-center items-center gap-2">
            <Text className="text-brand-steel font-arcadia">
              Don't have an account?
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable className="p-2 -m-2">
                <Text className="text-white font-semibold font-arcadia">Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

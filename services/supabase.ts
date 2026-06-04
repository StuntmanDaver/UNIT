import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigStatus = {
  hasRequiredConfig: Boolean(supabaseUrl && supabaseAnonKey),
  missing: [
    supabaseUrl ? null : 'EXPO_PUBLIC_SUPABASE_URL',
    supabaseAnonKey ? null : 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter((key): key is string => Boolean(key)),
};

export const supabase = createClient(
  supabaseUrl ?? 'https://missing-supabase-url.invalid',
  supabaseAnonKey ?? 'missing-supabase-anon-key',
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  }
);

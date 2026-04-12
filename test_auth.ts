import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const email = `test_${Date.now()}@example.com`;
  const password = 'password123';
  
  console.log('Attempting signup with:', email);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (signUpError) {
    console.error('Signup error:', signUpError.message);
    return;
  }
  
  console.log('Signup success! User:', signUpData.user?.id, 'Session:', !!signUpData.session);
  
  console.log('Attempting login...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (signInError) {
    console.error('Login error:', signInError.message);
  } else {
    console.log('Login success! Session:', !!signInData.session);
  }
}

test();

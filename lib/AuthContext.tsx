import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { supabase } from '@/services/supabase';
import { type Profile } from '@/services/profiles';
import type { User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  needsPasswordChange: boolean;
  needsOnboarding: boolean;
  propertyIds: string[];
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchProfile = async (userId: string, userEmail: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    setProfile(profileData);

    if (profileData && !profileData.needs_password_change) {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_email', userEmail)
        .limit(1);

      setNeedsOnboarding(!businesses || businesses.length === 0);
    } else {
      setNeedsOnboarding(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email ?? '');
        }
      } catch (err) {
        console.error('initAuth error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id, session.user.email ?? '');
          } else {
            setUser(null);
            setProfile(null);
            setNeedsOnboarding(false);
          }
        } catch (err) {
          console.error('onAuthStateChange error:', err);
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    setUser(null);
    setProfile(null);
    setNeedsOnboarding(false);
    await supabase.auth.signOut();
  };

  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'landlord';
  const needsPasswordChange = profile?.needs_password_change ?? false;
  const propertyIds = profile?.property_ids ?? [];

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        isLoading,
        isAdmin,
        needsPasswordChange,
        needsOnboarding,
        propertyIds,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

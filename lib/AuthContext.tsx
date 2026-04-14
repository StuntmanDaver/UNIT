import React, { createContext, useState, useContext, useEffect, useRef, type ReactNode } from 'react';
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
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  // BUG-01 guard: supabase-js synchronously emits INITIAL_SESSION the moment
  // onAuthStateChange is subscribed. Without this guard, initAuth() and the
  // subscription both race to fetch the profile on cold start. isInitializedRef
  // flips true inside initAuth()'s finally; the subscription skips
  // INITIAL_SESSION until init is the sole writer of the cold-start state.
  const isInitializedRef = useRef(false);

  const fetchProfile = async (userId: string, userEmail: string) => {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    setProfile(profileData);

    if (profileData && !profileData.needs_password_change) {
      // Landlords never have a business profile — skip the check to avoid
      // bouncing admins to the tenant onboarding flow.
      if (profileData.role === 'landlord') {
        setNeedsOnboarding(false);
      } else {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_email', userEmail)
          .limit(1);

        setNeedsOnboarding(!businesses || businesses.length === 0);
      }
    } else {
      setNeedsOnboarding(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          // No session — cleanly settled, nothing to fetch.
          setUser(null);
          setProfile(null);
          setNeedsOnboarding(false);
          return;
        }

        setUser(session.user);
        try {
          await fetchProfile(session.user.id, session.user.email ?? '');
        } catch (profileErr) {
          // BUG-13: fetchProfile failed while a session existed. Do NOT proceed
          // as "authenticated with null profile" — that state leaks through the
          // AuthGuard with `needsPasswordChange=false` / `needsOnboarding=false`
          // defaults and flashes the wrong screen. Sign out and clear state.
          console.error('initAuth fetchProfile failed, signing out:', profileErr);
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setNeedsOnboarding(false);
        }
      } catch (err) {
        console.error('initAuth error:', err);
        setUser(null);
        setProfile(null);
        setNeedsOnboarding(false);
      } finally {
        // Mark init complete BEFORE releasing the loading screen so the
        // subscription's INITIAL_SESSION skip is already armed.
        isInitializedRef.current = true;
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // BUG-01: Skip the synchronous INITIAL_SESSION event emitted at subscribe
        // time. initAuth() is the single source of truth for the cold-start
        // session. We deliberately DO NOT skip TOKEN_REFRESHED, SIGNED_IN, or
        // SIGNED_OUT — reset-password.tsx relies on TOKEN_REFRESHED to refetch
        // the profile after clearing needs_password_change.
        if (event === 'INITIAL_SESSION' && !isInitializedRef.current) {
          return;
        }
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

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email ?? '');
    }
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
        refreshProfile,
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

import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [propertyIds, setPropertyIds] = useState([]);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, property_ids, email')
      .eq('id', userId)
      .single();

    if (error || !data) {
      setUserRole('tenant');
      setPropertyIds([]);
      return;
    }

    setUserRole(data.role);
    setPropertyIds(data.property_ids ?? []);
  };

  useEffect(() => {
    checkAppState();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setUserRole(null);
          setPropertyIds([]);
        }
        setIsLoadingAuth(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // With Supabase, no separate "public settings" endpoint needed
      // The app is always available; auth state comes from Supabase session
      setAppPublicSettings({ id: 'unit-app', public_settings: {} });
      setIsLoadingPublicSettings(false);

      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check failed:', error);
        setAuthError({
          type: 'unknown',
          message: error.message
        });
        setIsLoadingAuth(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        await fetchUserProfile(session.user.id);
      }

      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    setPropertyIds([]);
    await supabase.auth.signOut();

    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    // Redirect to the app's login page
    window.location.href = '/LandlordLogin';
  };

  const isLandlord = userRole === 'landlord';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      isLandlord,
      userRole,
      propertyIds
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

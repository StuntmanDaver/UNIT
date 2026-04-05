import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';

const PropertyContext = createContext(null);

export function PropertyProvider({ children }) {
  const queryClient = useQueryClient();
  const { propertyIds } = useAuth();
  const [activePropertyId, setActivePropertyId] = useState(
    () => localStorage.getItem('active_property_id') ?? null
  );

  // Auto-select first property if none is active (D-10)
  useEffect(() => {
    if (!activePropertyId && propertyIds?.length > 0) {
      const firstId = propertyIds[0];
      localStorage.setItem('active_property_id', firstId);
      setActivePropertyId(firstId);
    }
  }, [activePropertyId, propertyIds]);

  const switchProperty = useCallback((propertyId) => {
    localStorage.setItem('active_property_id', propertyId);
    setActivePropertyId(propertyId);
    queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <PropertyContext.Provider value={{ activePropertyId, switchProperty }}>
      {children}
    </PropertyContext.Provider>
  );
}

export const useProperty = () => {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider');
  return ctx;
};

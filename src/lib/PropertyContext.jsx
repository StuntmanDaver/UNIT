import { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const PropertyContext = createContext(null);

export function PropertyProvider({ children }) {
  const queryClient = useQueryClient();
  const [activePropertyId, setActivePropertyId] = useState(
    () => localStorage.getItem('active_property_id') ?? null
  );

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

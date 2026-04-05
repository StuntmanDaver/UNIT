import { useQuery } from '@tanstack/react-query';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { useProperty } from '@/lib/PropertyContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/services/supabaseClient';
import { useState } from 'react';

export default function PropertySwitcher() {
  const { activePropertyId, switchProperty } = useProperty();
  const { propertyIds } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['landlord-properties', propertyIds],
    queryFn: async () => {
      if (!propertyIds || propertyIds.length === 0) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .in('id', propertyIds);
      if (error) throw error;
      return data;
    },
    enabled: propertyIds?.length > 0
  });

  // D-09: hidden if landlord has only one property
  if (!properties || properties.length <= 1) return null;

  const activeProperty = properties.find(p => p.id === activePropertyId);

  const handleSwitch = (propertyId) => {
    if (propertyId === activePropertyId) return;
    setIsSwitching(true);
    switchProperty(propertyId);
    setTimeout(() => setIsSwitching(false), 500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-white gap-2 max-w-[240px]">
          {isSwitching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="truncate">{activeProperty?.name ?? 'Select property'}</span>
              <ChevronDown className="w-4 h-4 shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        {properties.map(property => (
          <DropdownMenuItem
            key={property.id}
            onClick={() => handleSwitch(property.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{property.name}</span>
            {property.id === activePropertyId && (
              <Check className="w-4 h-4 text-brand-slate shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

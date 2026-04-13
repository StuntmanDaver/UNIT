import { supabase } from './supabase';

export type Unit = {
  id: string;
  property_id: string;
  unit_number: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  building: string | null;
  status: string | null;
  created_at: string;
};

const UNIT_COLUMNS = 'id, property_id, unit_number, street_address, city, state, zip, building, status, created_at';

export const unitsService = {
  async listByProperty(propertyId: string): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select(UNIT_COLUMNS)
      .eq('property_id', propertyId)
      .order('unit_number', { ascending: true });
    if (error) throw error;
    return data;
  },
};

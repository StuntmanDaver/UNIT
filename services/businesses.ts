import { supabase } from './supabase';

export type Business = {
  id: string;
  property_id: string;
  owner_email: string;
  business_name: string;
  unit_number: string | null;
  category: string;
  business_description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  logo_url: string | null;
  is_featured: boolean;
  created_at: string;
};

export const businessesService = {
  async filter(
    filters: Record<string, string | string[]>,
    search?: string,
    signal?: AbortSignal
  ): Promise<Business[]> {
    let query = supabase.from('businesses').select('*');
    for (const [key, value] of Object.entries(filters)) {
      // Array values (e.g., property_ids for grouped feeds) → SQL IN
      if (Array.isArray(value)) {
        if (value.length === 0) return [];
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
    if (search) {
      // Strip PostgREST `.or()` filter metacharacters before interpolating user
      // input into the filter string. A raw `,` starts a new OR-condition and
      // `()` group/nest conditions, so an unsanitized search term could break
      // out of the intended two-column ilike match and inject arbitrary filter
      // clauses (column/boolean enumeration against RLS-readable rows). `"` and
      // `\` (value quoting/escaping) and `*` (wildcard) are stripped too.
      const safeSearch = search.replace(/[,()"\\*]/g, ' ').replace(/\s+/g, ' ').trim();
      if (safeSearch) {
        query = query.or(
          `business_name.ilike.%${safeSearch}%,business_description.ilike.%${safeSearch}%`
        );
      }
    }
    if (signal) {
      query = query.abortSignal(signal);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(businessData: Partial<Business>): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .insert(businessData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Business>): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getOccupiedUnits(propertyId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('businesses')
      .select('unit_number')
      .eq('property_id', propertyId);
    if (error) throw error;
    return new Set(
      (data ?? [])
        .map((row: { unit_number: string | null }) => row.unit_number)
        .filter((unitNumber): unitNumber is string => !!unitNumber)
    );
  },
};

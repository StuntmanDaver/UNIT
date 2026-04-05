import { supabase } from './supabase';

export type Profile = {
  id: string;
  role: 'tenant' | 'landlord';
  property_ids: string[];
  email: string;
  push_token: string | null;
  needs_password_change: boolean;
  display_name: string | null;
  invited_at: string | null;
  activated_at: string | null;
  status: 'invited' | 'active' | 'inactive';
  created_at: string;
};

export const profilesService = {
  async getCurrent(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) return null;
    return data;
  },

  async update(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listByProperty(propertyId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .contains('property_ids', [propertyId]);
    if (error) throw error;
    return data;
  },

  async disable(id: string): Promise<Profile> {
    return this.update(id, { status: 'inactive' });
  },

  async reactivate(id: string): Promise<Profile> {
    return this.update(id, { status: 'active' });
  },
};

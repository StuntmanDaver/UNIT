import { supabase } from './supabase';

export const pushService = {
  async registerToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id);
    if (error) throw error;
  },

  async unregisterToken(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: null })
      .eq('id', user.id);
    if (error) throw error;
  },
};

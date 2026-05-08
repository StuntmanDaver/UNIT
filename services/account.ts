import { supabase } from './supabase';

type DeleteAccountResponse = {
  success?: boolean;
  error?: string;
};

export const accountService = {
  async deleteCurrentAccount(): Promise<void> {
    const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>(
      'delete-account'
    );

    if (error) {
      throw new Error(error.message);
    }

    if (data?.error) {
      throw new Error(data.error);
    }
  },
};

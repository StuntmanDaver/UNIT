import { supabase } from './supabaseClient';

// Generic CRUD factory for accounting entities
function createAccountingService(tableName) {
  return {
    async filter(filters, orderBy = null, ascending = false) {
      let query = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async create(record) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  };
}

export const leasesService = createAccountingService('leases');
export const recurringPaymentsService = createAccountingService('recurring_payments');
export const invoicesService = createAccountingService('invoices');
export const expensesService = createAccountingService('expenses');
export const paymentsService = createAccountingService('payments');

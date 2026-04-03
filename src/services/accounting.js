import { supabase } from './supabaseClient';
import { writeAudit } from '@/lib/AuditLogger';

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

export const ALLOWED_TRANSITIONS = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: [],
  void: []
};

export async function transitionInvoiceStatus(invoiceId, newStatus, { userId, userEmail }) {
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .single();
  if (fetchError) throw fetchError;

  const allowed = ALLOWED_TRANSITIONS[invoice.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${invoice.status} → ${newStatus}`);
  }

  const { data: updated, error: updateError } = await supabase
    .from('invoices')
    .update({ status: newStatus })
    .eq('id', invoiceId)
    .select()
    .single();
  if (updateError) throw updateError;

  writeAudit({
    entityType: 'invoice',
    entityId: invoiceId,
    action: 'status_changed',
    oldValue: { status: invoice.status },
    newValue: { status: newStatus },
    userId,
    userEmail
  }).catch(() => {});

  return updated;
}

import { supabase } from '@/services/supabaseClient';

/**
 * Write an audit log entry. Call with .catch(() => {}) to ensure
 * audit failures never block the primary mutation.
 *
 * @param {Object} params
 * @param {string} params.entityType - 'recommendation', 'invoice', 'lease', 'expense', 'payment', 'recurring_payment'
 * @param {string} params.entityId - UUID of the entity being modified
 * @param {string} params.action - 'created', 'updated', 'deleted', 'status_changed'
 * @param {Object|null} params.oldValue - Previous state (null for creates)
 * @param {Object|null} params.newValue - New state (null for deletes)
 * @param {string} params.userId - UUID of the acting user
 * @param {string} params.userEmail - Email of the acting user
 */
export async function writeAudit({ entityType, entityId, action, oldValue, newValue, userId, userEmail }) {
  return supabase.from('audit_log').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    performed_by_user_id: userId,
    performed_by_email: userEmail
  });
}

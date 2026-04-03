import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
  supabase: { from: vi.fn() }
}));

import { writeAudit } from '@/lib/AuditLogger';
import { supabase } from '@/services/supabaseClient';

describe('writeAudit', () => {
  let mockInsert;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    supabase.from.mockReturnValue({ insert: mockInsert });
  });

  it('calls supabase.from with audit_log table', async () => {
    await writeAudit({
      entityType: 'invoice',
      entityId: 'inv-1',
      action: 'status_changed',
      oldValue: { status: 'draft' },
      newValue: { status: 'sent' },
      userId: 'user-1',
      userEmail: 'test@example.com'
    });

    expect(supabase.from).toHaveBeenCalledWith('audit_log');
  });

  it('calls insert() with correct snake_case column names and mapped values', async () => {
    await writeAudit({
      entityType: 'invoice',
      entityId: 'inv-1',
      action: 'status_changed',
      oldValue: { status: 'draft' },
      newValue: { status: 'sent' },
      userId: 'user-1',
      userEmail: 'test@example.com'
    });

    expect(mockInsert).toHaveBeenCalledWith({
      entity_type: 'invoice',
      entity_id: 'inv-1',
      action: 'status_changed',
      old_value: { status: 'draft' },
      new_value: { status: 'sent' },
      performed_by_user_id: 'user-1',
      performed_by_email: 'test@example.com'
    });
  });

  it('defaults oldValue to null when undefined', async () => {
    await writeAudit({
      entityType: 'lease',
      entityId: 'l-1',
      action: 'created',
      oldValue: undefined,
      newValue: { rent: 1000 },
      userId: 'u-1',
      userEmail: 'x@y.com'
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ old_value: null })
    );
  });

  it('defaults newValue to null when undefined', async () => {
    await writeAudit({
      entityType: 'lease',
      entityId: 'l-1',
      action: 'deleted',
      oldValue: { rent: 1000 },
      newValue: undefined,
      userId: 'u-1',
      userEmail: 'x@y.com'
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ new_value: null })
    );
  });
});

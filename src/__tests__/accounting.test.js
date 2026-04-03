import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/services/supabaseClient', () => ({
  supabase: { from: vi.fn() }
}));

vi.mock('@/lib/AuditLogger', () => ({
  writeAudit: vi.fn().mockResolvedValue({})
}));

import { ALLOWED_TRANSITIONS, transitionInvoiceStatus } from '@/services/accounting';
import { supabase } from '@/services/supabaseClient';

describe('ALLOWED_TRANSITIONS', () => {
  it('draft allows sent and void', () => {
    expect(ALLOWED_TRANSITIONS.draft).toEqual(['sent', 'void']);
  });

  it('sent allows paid, overdue, and void', () => {
    expect(ALLOWED_TRANSITIONS.sent).toEqual(['paid', 'overdue', 'void']);
  });

  it('overdue allows paid and void', () => {
    expect(ALLOWED_TRANSITIONS.overdue).toEqual(['paid', 'void']);
  });

  it('paid has no allowed transitions', () => {
    expect(ALLOWED_TRANSITIONS.paid).toEqual([]);
  });

  it('void has no allowed transitions', () => {
    expect(ALLOWED_TRANSITIONS.void).toEqual([]);
  });
});

describe('transitionInvoiceStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws on invalid transition (paid -> draft)', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'inv-1', status: 'paid' },
        error: null
      })
    });

    await expect(
      transitionInvoiceStatus('inv-1', 'draft', { userId: 'u1', userEmail: 'a@b.com' })
    ).rejects.toThrow(/Invalid transition/);
  });

  it('resolves with updated invoice on valid transition (draft -> sent)', async () => {
    // First call: SELECT invoice
    supabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'inv-1', status: 'draft' },
        error: null
      })
    });

    // Second call: UPDATE invoice
    supabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'inv-1', status: 'sent' },
        error: null
      })
    });

    const result = await transitionInvoiceStatus('inv-1', 'sent', {
      userId: 'u1',
      userEmail: 'a@b.com'
    });

    expect(result).toEqual({ id: 'inv-1', status: 'sent' });
  });
});

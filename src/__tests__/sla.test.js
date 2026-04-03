import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSlaDeadline, SLA_DAYS } from '@/lib/sla';

describe('SLA_DAYS', () => {
  it('has correct values for all priorities', () => {
    expect(SLA_DAYS).toEqual({ high: 1, medium: 3, low: 7 });
  });
});

describe('getSlaDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns ISO string 1 day from pinned time for high priority', () => {
    expect(getSlaDeadline('high')).toBe(new Date('2026-01-06T12:00:00.000Z').toISOString());
  });

  it('returns ISO string 3 days from pinned time for medium priority', () => {
    expect(getSlaDeadline('medium')).toBe(new Date('2026-01-08T12:00:00.000Z').toISOString());
  });

  it('returns ISO string 7 days from pinned time for low priority', () => {
    expect(getSlaDeadline('low')).toBe(new Date('2026-01-12T12:00:00.000Z').toISOString());
  });

  it('falls back to 3 days for unknown priority', () => {
    expect(getSlaDeadline('banana')).toBe(new Date('2026-01-08T12:00:00.000Z').toISOString());
  });
});

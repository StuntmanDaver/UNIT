import { addDays } from 'date-fns';

export const SLA_DAYS = { high: 1, medium: 3, low: 7 };

export function getSlaDeadline(priority) {
  return addDays(new Date(), SLA_DAYS[priority] ?? 3).toISOString();
}

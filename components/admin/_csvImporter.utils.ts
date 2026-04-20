// Pure helpers for CSVImporter. Extracted here so they are unit-testable
// without mounting the React Native component or loading expo-document-picker.
//
// Covers:
//   BUG-09 quoted-comma parsing (via papaparse with header: true)
//   BUG-10 progress clamp to 100
//   BUG-11 per-row error capture (shape only — the component owns the async batch loop)
//   BUG-08 unit_number optional pass-through

import Papa from 'papaparse';
import { z } from 'zod';
import { BUSINESS_CATEGORIES } from '@/constants/categories';

export type ParsedRow = {
  email: string;
  business_name: string;
  category: string;
  contact_name?: string;
  contact_phone?: string;
  services?: string;
  unit_number?: string;
  _rowIndex: number;
  _isValid: boolean;
  _errors: string[];
};

const rowSchema = z.object({
  email: z.string().email('Invalid email'),
  business_name: z.string().min(1, 'business_name required'),
  category: z.enum(BUSINESS_CATEGORIES as unknown as [string, ...string[]], {
    message: `Invalid category (allowed: ${BUSINESS_CATEGORIES.join(', ')})`,
  }),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  services: z.string().optional(),
  unit_number: z.string().optional(),
});

// Normalize CSV header cells: trim, lowercase, collapse whitespace to
// underscore so `Business Name` and `business_name` both resolve to
// `business_name`.
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_');
}

// Parse a raw CSV string into validated ParsedRow[]. Uses papaparse so that
// quoted fields like `"Consulting, LLC"` are preserved as a single column
// (BUG-09). Returns an empty array when the CSV has no data rows.
export function parseCSV(csvText: string): ParsedRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
    dynamicTyping: false,
  });

  const rows = parsed.data ?? [];
  return rows.map((raw, index) => validateRow(raw, index));
}

// Validate a single parsed row (record of header → string value) and
// produce a ParsedRow with _isValid and _errors populated.
export function validateRow(
  raw: Record<string, string>,
  index: number,
): ParsedRow {
  // Normalize empty strings to undefined for optional fields so zod
  // `.optional()` is honored (an empty string would otherwise pass through
  // into the UI as a populated value).
  const normalized = {
    email: (raw.email ?? '').trim(),
    business_name: (raw.business_name ?? '').trim(),
    category: (raw.category ?? '').trim().toLowerCase(),
    contact_name: emptyToUndef(raw.contact_name),
    contact_phone: emptyToUndef(raw.contact_phone),
    services: emptyToUndef(raw.services),
    unit_number: emptyToUndef(raw.unit_number),
  };

  const result = rowSchema.safeParse(normalized);

  if (result.success) {
    return {
      ...result.data,
      _rowIndex: index,
      _isValid: true,
      _errors: [],
    };
  }

  const errors = result.error.issues.map((issue) => issue.message);
  return {
    email: normalized.email,
    business_name: normalized.business_name,
    category: normalized.category,
    contact_name: normalized.contact_name,
    contact_phone: normalized.contact_phone,
    services: normalized.services,
    unit_number: normalized.unit_number,
    _rowIndex: index,
    _isValid: false,
    _errors: errors,
  };
}

function emptyToUndef(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

// Clamp progress so it never exceeds 100%. BUG-10 fix: the previous
// implementation divided `i + batchSize` by total, which overshoots when the
// last batch is partial (e.g. 47 rows / batch 25 → batch 2 processed count is
// `25 + 25 = 50` → 106%).
export function computeProgress(processed: number, total: number): number {
  if (total <= 0) return 0;
  const floored = Math.max(0, processed);
  const clamped = Math.min(floored, total);
  return Math.min(100, Math.round((clamped / total) * 100));
}

// Convert a ParsedRow into the InviteTenantRow payload for adminService.
// Drops the `_`-prefixed diagnostic fields and injects the caller-supplied
// property_id (property selection happens in the UI, NOT in the CSV — per
// threat model T-02-10 the CSV must not carry property_id).
export function toInviteRow(
  row: ParsedRow,
  propertyId: string,
): {
  email: string;
  business_name: string;
  category: string;
  contact_name?: string;
  contact_phone?: string;
  description?: string;
  unit_number?: string;
  property_id: string;
} {
  return {
    email: row.email,
    business_name: row.business_name,
    category: row.category,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    description: row.services ? `Services: ${row.services}` : undefined,
    unit_number: row.unit_number,
    property_id: propertyId,
  };
}

// Rough upper bound on file size: 2MB ~ 20k rows of typical tenant CSV.
// Exceeding this risks OOMing the RN bridge on readAsStringAsync (T-02-14).
export const MAX_CSV_BYTES = 2 * 1024 * 1024;

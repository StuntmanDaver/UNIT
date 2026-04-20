// Tests for CSVImporter pure helpers.
//
// The component itself is a thin React Native wrapper around the pure
// parse/validate functions exported from `_csvImporter.utils.ts`. We test the
// pure layer exhaustively because it is where all of the bug fixes land
// (BUG-08, BUG-09, BUG-10, BUG-11 error capture shape). Mounting the
// component under @testing-library/react-native would require driving
// expo-document-picker, which is not meaningful in a jest environment.

import {
  parseCSV,
  validateRow,
  computeProgress,
  toInviteRow,
  normalizeHeader,
  type ParsedRow,
} from '../_csvImporter.utils';

describe('CSVImporter — parseCSV', () => {
  test('Test 1 (BUG-09): quoted comma inside business_name keeps comma in one field', () => {
    const csv =
      'email,business_name,category\n' +
      'foo@bar.com,"Consulting, LLC",retail\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]._isValid).toBe(true);
    expect(rows[0].business_name).toBe('Consulting, LLC');
    // Downstream fields are NOT shifted — category must still be "retail"
    expect(rows[0].category).toBe('retail');
  });

  test('Test 2 (BUG-09): multi-comma quoted services field is preserved', () => {
    const csv =
      'email,business_name,category,services\n' +
      'foo@bar.com,Acme,retail,"copy, print, scan"\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]._isValid).toBe(true);
    expect(rows[0].services).toBe('copy, print, scan');
  });

  test('Test 3: invalid email is marked _isValid=false with "Invalid email" error', () => {
    const csv =
      'email,business_name,category\n' +
      'not-an-email,Acme,retail\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]._isValid).toBe(false);
    expect(rows[0]._errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Invalid email')]),
    );
  });

  test('Test 4: missing business_name is _isValid=false with "business_name required"', () => {
    const csv =
      'email,business_name,category\n' +
      'foo@bar.com,,retail\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]._isValid).toBe(false);
    expect(rows[0]._errors).toEqual(
      expect.arrayContaining([expect.stringContaining('business_name required')]),
    );
  });

  test('Test 5: unknown category surfaces an "Invalid category" error listing allowed values', () => {
    const csv =
      'email,business_name,category\n' +
      'foo@bar.com,Acme,nonsense-category\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]._isValid).toBe(false);
    const joined = rows[0]._errors.join(' | ');
    expect(joined).toMatch(/Invalid category/i);
    // One of the known categories must be listed to help the admin fix the CSV
    expect(joined).toMatch(/retail|restaurant|healthcare/);
  });

  test('Test 7 (BUG-11 shape): row with multiple errors surfaces ALL of them', () => {
    // Empty business_name AND bad category — both should be reported.
    const csv =
      'email,business_name,category\n' +
      'foo@bar.com,,bogus\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]._isValid).toBe(false);
    expect(rows[0]._errors.length).toBeGreaterThanOrEqual(2);
    const joined = rows[0]._errors.join(' | ');
    expect(joined).toMatch(/business_name required/i);
    expect(joined).toMatch(/Invalid category/i);
  });

  test('Test 8a (BUG-08): unit_number column carries through when present', () => {
    const csv =
      'email,business_name,category,unit_number\n' +
      'foo@bar.com,Acme,retail,B5-101\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]._isValid).toBe(true);
    expect(rows[0].unit_number).toBe('B5-101');
  });

  test('Test 8b (BUG-08): unit_number absent / empty is still _isValid=true (optional)', () => {
    const csvNoColumn =
      'email,business_name,category\n' +
      'foo@bar.com,Acme,retail\n';
    const rowsNoColumn = parseCSV(csvNoColumn);
    expect(rowsNoColumn[0]._isValid).toBe(true);
    expect(rowsNoColumn[0].unit_number).toBeUndefined();

    const csvEmptyColumn =
      'email,business_name,category,unit_number\n' +
      'foo@bar.com,Acme,retail,\n';
    const rowsEmpty = parseCSV(csvEmptyColumn);
    expect(rowsEmpty[0]._isValid).toBe(true);
    expect(rowsEmpty[0].unit_number).toBeUndefined();
  });

  test('Test 9 (header transform): mixed-case / spaced headers normalize to snake_case', () => {
    expect(normalizeHeader('Email')).toBe('email');
    expect(normalizeHeader('Business Name')).toBe('business_name');
    expect(normalizeHeader('  Contact Phone  ')).toBe('contact_phone');
    expect(normalizeHeader('Unit Number')).toBe('unit_number');

    const csv =
      'Email,Business Name,Category,Unit Number\n' +
      'foo@bar.com,Acme,retail,B5-101\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]._isValid).toBe(true);
    expect(rows[0].email).toBe('foo@bar.com');
    expect(rows[0].business_name).toBe('Acme');
    expect(rows[0].unit_number).toBe('B5-101');
  });

  test('multi-row CSV with mix of valid + invalid rows preserves row order + indices', () => {
    const csv =
      'email,business_name,category\n' +
      'a@b.com,Alpha,retail\n' +
      'not-an-email,Beta,retail\n' +
      'c@d.com,Charlie,retail\n';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r._isValid)).toEqual([true, false, true]);
    expect(rows.map((r) => r._rowIndex)).toEqual([0, 1, 2]);
  });
});

describe('CSVImporter — validateRow', () => {
  test('trims whitespace on email and lowercases category before validating', () => {
    const row = validateRow(
      {
        email: '  Foo@Bar.com  ',
        business_name: 'Acme',
        category: 'RETAIL',
      },
      0,
    );
    expect(row._isValid).toBe(true);
    expect(row.email).toBe('Foo@Bar.com');
    expect(row.category).toBe('retail');
  });
});

describe('CSVImporter — computeProgress (BUG-10 clamp)', () => {
  test('Test 6a: 47 rows, batch size 25 — batch 1 processed=25 → 53%', () => {
    expect(computeProgress(25, 47)).toBe(53);
  });

  test('Test 6b: 47 rows, batch size 25 — batch 2 processed=47 → 100% (never 106%)', () => {
    // The bug the production code guards: batch loop naively computes
    // `(i + batchSize) / total` = (25 + 25) / 47 = 1.0638... = 106% rounded.
    // With the clamp the answer MUST be 100.
    expect(computeProgress(50, 47)).toBe(100);
    expect(computeProgress(47, 47)).toBe(100);
  });

  test('guards against total=0 / negative inputs', () => {
    expect(computeProgress(0, 0)).toBe(0);
    expect(computeProgress(5, 0)).toBe(0);
    expect(computeProgress(-3, 10)).toBe(0);
  });
});

describe('CSVImporter — toInviteRow', () => {
  const baseRow: ParsedRow = {
    email: 'foo@bar.com',
    business_name: 'Acme',
    category: 'retail',
    contact_name: 'Alice',
    contact_phone: '555-0101',
    services: 'copy, print',
    unit_number: 'B5-101',
    _rowIndex: 0,
    _isValid: true,
    _errors: [],
  };

  test('injects caller-supplied property_id, not a CSV-supplied one (T-02-10)', () => {
    const payload = toInviteRow(baseRow, 'prop-uuid-1');
    expect(payload.property_id).toBe('prop-uuid-1');
  });

  test('passes unit_number through when present (BUG-08)', () => {
    const payload = toInviteRow(baseRow, 'prop-uuid-1');
    expect(payload.unit_number).toBe('B5-101');
  });

  test('services is folded into description; empty services drops description', () => {
    const withServices = toInviteRow(baseRow, 'p1');
    expect(withServices.description).toBe('Services: copy, print');

    const withoutServices: ParsedRow = { ...baseRow, services: undefined };
    const withoutResult = toInviteRow(withoutServices, 'p1');
    expect(withoutResult.description).toBeUndefined();
  });

  test('omits unit_number when row has no unit (BUG-08 tenant-claims-on-login path)', () => {
    const row: ParsedRow = { ...baseRow, unit_number: undefined };
    const payload = toInviteRow(row, 'p1');
    expect(payload.unit_number).toBeUndefined();
  });
});

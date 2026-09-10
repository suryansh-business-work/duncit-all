import { describe, expect, it } from 'vitest';
import { makeHostFormSchema } from '../../../src/hosts/editor/schema';
import { hostToValues } from '../../../src/hosts/editor/mappers';
import { hostRecord } from '../../fixtures';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const schema = makeHostFormSchema(t);
const valid = () => hostToValues(hostRecord);

function errorAt(values: unknown, path: string): string {
  const result = schema.safeParse(values);
  if (result.success) return '';
  return result.error.issues.find((i) => i.path.join('.') === path)?.message ?? '';
}

describe('makeHostFormSchema', () => {
  it('accepts the record the server just gave us', () => {
    // Including its half-filled second category row: the FORM must hold it so it
    // can be finished, and the mapper is what drops it on save.
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it('requires an account to attach the record to', () => {
    expect(errorAt({ ...valid(), user_id: '' }, 'user_id')).toBe(
      'directory.hostEditor.errPickAccount',
    );
  });

  it('checks Aadhaar only when it is filled in', () => {
    expect(errorAt({ ...valid(), aadhar_number: '123' }, 'aadhar_number')).toBe(
      'directory.hostEditor.errAadhaar',
    );
    expect(schema.safeParse({ ...valid(), aadhar_number: '' }).success).toBe(true);
  });

  it('checks PAN only when it is filled in, and upper-cases it', () => {
    expect(errorAt({ ...valid(), pan_number: 'nope' }, 'pan_number')).toBe(
      'directory.venueEditor.errPan',
    );
    const result = schema.safeParse({ ...valid(), pan_number: 'afzpi1234k' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pan_number).toBe('AFZPI1234K');
  });

  it('requires an address', () => {
    expect(errorAt({ ...valid(), full_address: '' }, 'full_address')).toContain('errRequired');
  });

  it('ALLOWS a partial category row, because the server stores them', () => {
    // A host seeded from a meeting approved before the sub level was captured has
    // a Super and a Category and no Sub. Requiring all three here made that
    // record unsaveable: Save blocked on a row the admin never touched. The
    // mapper drops it from the payload instead.
    const values = valid();
    values.categories = [
      { super_id: 'a', super_name: '', category_id: 'b', category_name: '', sub_id: '', sub_name: '' },
    ];
    expect(schema.safeParse(values).success).toBe(true);
  });

  it('accepts a host with no categories at all', () => {
    // A drafted host has none yet; the console is where they are added.
    const values = valid();
    values.categories = [];
    expect(schema.safeParse(values).success).toBe(true);
  });

  it('coerces and bounds the commission', () => {
    const result = schema.safeParse({ ...valid(), host_commission_pct: '18' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.host_commission_pct).toBe(18);
    expect(errorAt({ ...valid(), host_commission_pct: 150 }, 'host_commission_pct')).toContain(
      'errMax',
    );
  });

  it('validates the contact through the shared rules', () => {
    expect(errorAt({ ...valid(), email: 'nope' }, 'email')).toBeTruthy();
    expect(errorAt({ ...valid(), phone: '12' }, 'phone')).toBeTruthy();
    expect(errorAt({ ...valid(), full_name: '' }, 'full_name')).toBeTruthy();
  });

  it('accepts every status the lifecycle allows', () => {
    for (const status of ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const) {
      expect(schema.safeParse({ ...valid(), status }).success).toBe(true);
    }
    expect(schema.safeParse({ ...valid(), status: 'PAUSED' }).success).toBe(false);
  });
});

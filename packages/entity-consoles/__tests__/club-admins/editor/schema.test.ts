import { describe, expect, it } from 'vitest';
import { makeClubAdminFormSchema } from '../../../src/club-admins/editor/schema';
import { clubAdminToValues } from '../../../src/club-admins/editor/mappers';
import { clubAdminStatusOptions } from '../../../src/club-admins/editor/statusOptions';
import { clubAdminRecord } from '../../fixtures';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const schema = makeClubAdminFormSchema(t);
const valid = () => clubAdminToValues(clubAdminRecord);

function errorAt(values: unknown, path: string): string {
  const result = schema.safeParse(values);
  if (result.success) return '';
  return result.error.issues.find((i) => i.path.join('.') === path)?.message ?? '';
}

describe('makeClubAdminFormSchema', () => {
  it('accepts the record the server just gave us', () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it('requires an account to appoint', () => {
    expect(errorAt({ ...valid(), user_id: '' }, 'user_id')).toBe(
      'directory.clubAdminEditor.errPickAccount',
    );
  });

  it('accepts a record with no phone at all', () => {
    // Deliberately optional, unlike a host's: the record is drafted from a
    // meeting or a role grant, neither of which is guaranteed to carry a number.
    // Requiring one would make an existing record unsaveable.
    expect(schema.safeParse({ ...valid(), phone: '' }).success).toBe(true);
  });

  it('still refuses a phone that is present but malformed', () => {
    expect(errorAt({ ...valid(), phone: '12' }, 'phone')).toBeTruthy();
  });

  it('coerces and bounds the commission', () => {
    const result = schema.safeParse({ ...valid(), commission_pct: '20' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.commission_pct).toBe(20);
    expect(errorAt({ ...valid(), commission_pct: 101 }, 'commission_pct')).toContain('errMax');
    expect(errorAt({ ...valid(), commission_pct: -5 }, 'commission_pct')).toContain('errMin');
  });

  it('accepts a record with no clubs assigned yet', () => {
    expect(schema.safeParse({ ...valid(), club_ids: [] }).success).toBe(true);
  });

  it('has THREE statuses, not four — a club admin never applies', () => {
    for (const status of ['DRAFT', 'APPROVED', 'REJECTED'] as const) {
      expect(schema.safeParse({ ...valid(), status }).success).toBe(true);
    }
    // SUBMITTED would mean "waiting on them", and nothing ever is.
    expect(schema.safeParse({ ...valid(), status: 'SUBMITTED' }).success).toBe(false);
  });

  it('offers exactly those three in the picker', () => {
    expect(clubAdminStatusOptions(t).map((option) => option.value)).toEqual([
      'DRAFT',
      'APPROVED',
      'REJECTED',
    ]);
  });

  it('validates the name and email through the shared rules', () => {
    expect(errorAt({ ...valid(), email: 'nope' }, 'email')).toBeTruthy();
    expect(errorAt({ ...valid(), full_name: '' }, 'full_name')).toBeTruthy();
  });
});

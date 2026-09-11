import { describe, expect, it } from 'vitest';
import { makeVenueFormSchema } from '../../../src/venues/editor/schema';
import { venueToValues } from '../../../src/venues/editor/mappers';
import { venueRecord } from '../../fixtures';

/**
 * The venue form's validation.
 *
 * Bounds match the server's own, so the point of every case here is that the
 * admin is TOLD rather than finding out later that what they typed was silently
 * clamped or refused.
 */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const schema = makeVenueFormSchema(t);
const valid = () => venueToValues(venueRecord);

/** The first error on a field path, or '' when the field passed. */
function errorAt(values: unknown, path: string): string {
  const result = schema.safeParse(values);
  if (result.success) return '';
  const issue = result.error.issues.find((i) => i.path.join('.') === path);
  return issue?.message ?? '';
}

describe('makeVenueFormSchema', () => {
  it('accepts the record the server just gave us', () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it('coerces a number typed into an MUI field from its string', () => {
    // The whole reason the numeric rules are z.coerce: a number input hands back
    // a STRING, and without coercion every numeric field fails on first keypress.
    const values = { ...valid(), capacity: '75' as unknown as number };
    const result = schema.safeParse(values);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.capacity).toBe(75);
  });

  it('refuses a capacity below one', () => {
    expect(errorAt({ ...valid(), capacity: 0 }, 'capacity')).toContain('errMin');
  });

  it('refuses a fractional capacity', () => {
    expect(errorAt({ ...valid(), capacity: 12.5 }, 'capacity')).toContain('errWhole');
  });

  it('requires an owner account and a city', () => {
    expect(errorAt({ ...valid(), owner_user_id: '' }, 'owner_user_id')).toBe(
      'directory.venueEditor.errPickOwner',
    );
    const values = valid();
    values.location = { ...values.location, location_id: '' };
    expect(errorAt(values, 'location.location_id')).toBe('directory.venueEditor.errPickCity');
  });

  it('holds max_advance_days to the 60 the server clamps at', () => {
    const values = valid();
    values.settings.rules.max_advance_days = 90;
    expect(errorAt(values, 'settings.rules.max_advance_days')).toContain('errMax');
  });

  it('rejects a closing time that is not after the opening time', () => {
    const values = valid();
    values.settings.close = '08:00';
    expect(errorAt(values, 'settings.close')).toBe('directory.venueEditor.errCloseAfterOpen');
  });

  it('rejects a clock value that is not HH:mm', () => {
    const values = valid();
    values.settings.open = '8am';
    expect(errorAt(values, 'settings.open')).toContain('errClock');
  });

  it('rejects two cancellation bands sharing a notice window', () => {
    // Two bands with the same window is a policy that cannot be read — the later
    // one silently wins — so the server refuses it and so does the form.
    const values = valid();
    values.settings.charge_tiers = [
      { hours_before: 24, charge_type: 'PERCENT', value: 50 },
      { hours_before: 24, charge_type: 'AMOUNT', value: 100 },
    ];
    expect(errorAt(values, 'settings.charge_tiers')).toBe(
      'directory.venueEditor.errDuplicateBand',
    );
  });

  it('rejects two refund bands sharing a notice window', () => {
    const values = valid();
    values.settings.refund_tiers = [
      { hours_before: 24, refund_pct: 100 },
      { hours_before: 24, refund_pct: 50 },
    ];
    expect(errorAt(values, 'settings.refund_tiers')).toBe(
      'directory.venueEditor.errDuplicateBand',
    );
  });

  it('caps a PERCENT charge at 100 but lets a flat AMOUNT exceed it', () => {
    const percent = valid();
    percent.settings.charge_tiers = [{ hours_before: 24, charge_type: 'PERCENT', value: 150 }];
    expect(errorAt(percent, 'settings.charge_tiers.0.value')).toBe(
      'directory.venueEditor.errPercentCeiling',
    );

    const flat = valid();
    flat.settings.charge_tiers = [{ hours_before: 24, charge_type: 'AMOUNT', value: 5000 }];
    expect(schema.safeParse(flat).success).toBe(true);
  });

  it('caps both money percentages at 100', () => {
    expect(errorAt({ ...valid(), venue_share_pct: 120 }, 'venue_share_pct')).toContain('errMax');
    expect(errorAt({ ...valid(), venue_commission_pct: -1 }, 'venue_commission_pct')).toContain(
      'errMin',
    );
  });

  it('checks GSTIN and PAN only when they are filled in', () => {
    expect(errorAt({ ...valid(), gstin: 'nope' }, 'gstin')).toBe('directory.venueEditor.errGstin');
    expect(errorAt({ ...valid(), pan: 'nope' }, 'pan')).toBe('directory.venueEditor.errPan');
    // Both are optional — a venue without paperwork on file still saves.
    expect(schema.safeParse({ ...valid(), gstin: '', pan: '' }).success).toBe(true);
  });

  it('accepts a blank pincode but refuses a malformed one', () => {
    const blank = valid();
    blank.location = { ...blank.location, pincode: '' };
    expect(schema.safeParse(blank).success).toBe(true);

    const bad = valid();
    bad.location = { ...bad.location, pincode: '!!' };
    expect(errorAt(bad, 'location.pincode')).toBe('directory.venueEditor.errPincode');
  });

  it('requires a name of at least two characters and an address of three', () => {
    expect(errorAt({ ...valid(), venue_name: 'A' }, 'venue_name')).toContain('errMinLen');
    expect(errorAt({ ...valid(), address_line1: 'x' }, 'address_line1')).toContain('errMinLen');
  });

  it('requires a venue type', () => {
    expect(errorAt({ ...valid(), venue_type: '' }, 'venue_type')).toContain('errRequired');
  });

  it('requires both halves of every capacity row', () => {
    const values = valid();
    values.capacity_items = [{ label: '', capacity: 10 }];
    expect(errorAt(values, 'capacity_items.0.label')).toContain('errRequired');
  });

  it('requires both halves of every document row', () => {
    const values = valid();
    values.documents = [{ type: '', url: '' }];
    expect(errorAt(values, 'documents.0.type')).toContain('errRequired');
    expect(errorAt(values, 'documents.0.url')).toContain('errRequired');
  });

  it('validates the owner contact through the shared rules', () => {
    expect(errorAt({ ...valid(), owner_email: 'not-an-email' }, 'owner_email')).toBeTruthy();
    expect(errorAt({ ...valid(), owner_phone: '123' }, 'owner_phone')).toBeTruthy();
    expect(errorAt({ ...valid(), owner_name: '' }, 'owner_name')).toBeTruthy();
  });

  it('bounds the auto-extend horizon to a year', () => {
    const values = valid();
    values.settings.auto_extend_horizon_days = 400;
    expect(errorAt(values, 'settings.auto_extend_horizon_days')).toContain('errMax');
  });

  it('bounds the auto-cancel trigger to a year of hours', () => {
    const values = valid();
    values.settings.trigger_hours = 9000;
    expect(errorAt(values, 'settings.trigger_hours')).toContain('errMax');
  });

  it('accepts every status the lifecycle allows and refuses anything else', () => {
    for (const status of ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const) {
      expect(schema.safeParse({ ...valid(), status }).success).toBe(true);
    }
    expect(schema.safeParse({ ...valid(), status: 'LIVE' }).success).toBe(false);
  });

  it('upper-cases GSTIN and PAN so a lower-case entry still matches', () => {
    const result = schema.safeParse({ ...valid(), gstin: '29abcde1234f1z5', pan: 'abcde1234f' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstin).toBe('29ABCDE1234F1Z5');
      expect(result.data.pan).toBe('ABCDE1234F');
    }
  });
});

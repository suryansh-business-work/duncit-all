import { describe, expect, it } from 'vitest';
import { blankStatusValues, statusSchema, toStatusInput, toStatusValues } from './status.types';
import type { OfficialStatusRow } from '../queries';

// The schema is built per-render from the surface's translator, so every call
// site asks for one rather than importing a ready-made object.
const schema = statusSchema();

const messages = (result: ReturnType<typeof schema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

const valid = () => ({
  ...blankStatusValues(),
  title: 'Diwali sale is live',
  media_url: 'https://cdn.duncit.com/status/diwali.jpg',
});

const makeRow = (over: Partial<OfficialStatusRow> = {}): OfficialStatusRow => ({
  id: 'os1',
  title: 'Diwali sale is live',
  media_url: 'https://cdn.duncit.com/status/diwali.jpg',
  media_type: 'IMAGE',
  caption: '20% off badminton pods',
  link_url: '/shop',
  scope: 'GLOBAL',
  location_ids: [],
  location_names: [],
  expires_at: null,
  is_active: true,
  is_live: true,
  view_count: 10,
  created_by: 'Asha Verma',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('statusSchema', () => {
  it('accepts a fully filled, global, 24-hour status', () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });

  it('requires a title with something meaningful in it', () => {
    expect(messages(schema.safeParse({ ...valid(), title: 'a' }))).toMatch(/at least 2/i);
  });

  it('requires media to be picked', () => {
    expect(messages(schema.safeParse({ ...valid(), media_url: '' }))).toMatch(/image or a video/i);
  });

  it('rejects unusable media — only an http(s) URL is a real upload', () => {
    expect(messages(schema.safeParse({ ...valid(), media_url: 'not-a-url' }))).toMatch(/media/i);
    expect(
      schema.safeParse({ ...valid(), media_url: 'data:image/png;base64,aaaa' }).success,
    ).toBe(false);
    // http (not just https) is still a usable media host.
    expect(schema.safeParse({ ...valid(), media_url: 'http://cdn/x.jpg' }).success).toBe(true);
  });

  it('needs at least one city when scoped to LOCATION', () => {
    expect(
      messages(schema.safeParse({ ...valid(), scope: 'LOCATION', location_ids: [] })),
    ).toMatch(/at least one city/i);
    expect(
      schema.safeParse({ ...valid(), scope: 'LOCATION', location_ids: ['loc1'] }).success,
    ).toBe(true);
  });

  it('needs a date when the expiry is CUSTOM, and it must be in the future', () => {
    expect(
      messages(schema.safeParse({ ...valid(), expiry: 'CUSTOM', custom_expires_at: null })),
    ).toMatch(/pick the date/i);
    expect(
      messages(
        schema.safeParse({
          ...valid(),
          expiry: 'CUSTOM',
          custom_expires_at: new Date(Date.now() - 60_000),
        }),
      ),
    ).toMatch(/future/i);
    expect(
      schema.safeParse({
        ...valid(),
        expiry: 'CUSTOM',
        custom_expires_at: new Date(Date.now() + 3_600_000),
      }).success,
    ).toBe(true);
  });

  it('never needs a date for HOURS_24 or NEVER', () => {
    expect(schema.safeParse({ ...valid(), expiry: 'HOURS_24' }).success).toBe(true);
    expect(schema.safeParse({ ...valid(), expiry: 'NEVER' }).success).toBe(true);
  });

  it("accepts an empty link, an in-app path, or an https URL — nothing else", () => {
    expect(schema.safeParse({ ...valid(), link_url: '' }).success).toBe(true);
    expect(schema.safeParse({ ...valid(), link_url: '/shop' }).success).toBe(true);
    expect(schema.safeParse({ ...valid(), link_url: 'https://duncit.com/shop' }).success).toBe(
      true,
    );
    expect(messages(schema.safeParse({ ...valid(), link_url: 'http://duncit.com/shop' }))).toMatch(
      /link/i,
    );
    expect(messages(schema.safeParse({ ...valid(), link_url: 'javascript:alert(1)' }))).toMatch(
      /link/i,
    );
  });

  it('caps the caption length', () => {
    expect(
      messages(schema.safeParse({ ...valid(), caption: 'x'.repeat(301) })),
    ).toMatch(/300/);
  });
});

describe('blankStatusValues', () => {
  it('is a global, 24-hour, active status with nothing picked yet', () => {
    expect(blankStatusValues()).toEqual({
      title: '',
      media_url: '',
      media_type: 'IMAGE',
      caption: '',
      link_url: '',
      scope: 'GLOBAL',
      location_ids: [],
      expiry: 'HOURS_24',
      custom_expires_at: null,
      is_active: true,
    });
  });
});

describe('toStatusValues', () => {
  it('reads a never-expiring row back as NEVER with no date picked', () => {
    const values = toStatusValues(makeRow({ expires_at: null }));
    expect(values.expiry).toBe('NEVER');
    expect(values.custom_expires_at).toBeNull();
  });

  // The server stores the RESULT of the expiry choice, not the choice itself —
  // a row that once said "24 hours" reopens as the date it landed on.
  it('reads any expiring row back as CUSTOM at the date it lands on', () => {
    const values = toStatusValues(makeRow({ expires_at: '2026-08-01T10:00:00.000Z' }));
    expect(values.expiry).toBe('CUSTOM');
    expect(values.custom_expires_at).toEqual(new Date('2026-08-01T10:00:00.000Z'));
  });

  it('copies the scope, location_ids and media straight through', () => {
    const values = toStatusValues(
      makeRow({ scope: 'LOCATION', location_ids: ['loc1', 'loc2'], media_type: 'VIDEO' }),
    );
    expect(values.scope).toBe('LOCATION');
    expect(values.location_ids).toEqual(['loc1', 'loc2']);
    expect(values.media_type).toBe('VIDEO');
  });
});

describe('toStatusInput', () => {
  it('sends an empty location list for a GLOBAL status even if some were left behind', () => {
    const input = toStatusInput({
      ...valid(),
      scope: 'GLOBAL',
      location_ids: ['stale-city'],
    });
    expect(input.scope).toBe('GLOBAL');
    expect(input.location_ids).toEqual([]);
  });

  it('keeps the picked cities for a LOCATION status', () => {
    const input = toStatusInput({
      ...valid(),
      scope: 'LOCATION',
      location_ids: ['loc1'],
    });
    expect(input.location_ids).toEqual(['loc1']);
  });

  it('serialises the custom date only for a CUSTOM expiry', () => {
    const future = new Date(Date.now() + 3_600_000);
    const custom = toStatusInput({ ...valid(), expiry: 'CUSTOM', custom_expires_at: future });
    expect(custom.custom_expires_at).toBe(future.toISOString());

    const never = toStatusInput({ ...valid(), expiry: 'NEVER', custom_expires_at: future });
    expect(never.custom_expires_at).toBeNull();
  });

  it('refuses to serialise values the schema would reject', () => {
    expect(() => toStatusInput({ ...valid(), title: '' })).toThrow();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emptyValues,
  toSendInput,
  valuesFromCampaign,
  waCampaignSchema,
  type WaCampaignValues,
} from '../../src/pages/whatsapp-page/wa-campaign-form';
import type { WaCampaignRow } from '../../src/pages/whatsapp-page/queries';

const t = (key: string) => key;
const schema = waCampaignSchema(t);

const valid = (over: Partial<WaCampaignValues> = {}): WaCampaignValues => ({
  ...emptyValues('diwali_camp'),
  name: 'Diwali blast',
  ...over,
});

const issuePaths = (values: WaCampaignValues) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('waCampaignSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T10:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('accepts a send to everyone with a name and a campaign', () => {
    expect(issuePaths(valid())).toEqual([]);
  });

  it('requires a name of at least three characters and a campaign', () => {
    expect(issuePaths(valid({ name: 'ab' }))).toContain('name');
    expect(issuePaths(valid({ wa_campaign_name: '' }))).toContain('wa_campaign_name');
  });

  it('requires the source that the chosen audience needs', () => {
    expect(issuePaths(valid({ audience: 'AUDIENCE_LIST' }))).toContain('audience_list_id');
    expect(issuePaths(valid({ audience: 'AUDIENCE_LIST', audience_list_id: 'L1' }))).toEqual([]);
    expect(issuePaths(valid({ audience: 'SPECIFIC_USERS' }))).toContain('users');
    expect(
      issuePaths(valid({ audience: 'SPECIFIC_USERS', users: [{ id: 'u1', name: 'Asha' }] }))
    ).toEqual([]);
    expect(issuePaths(valid({ audience: 'MANUAL_NUMBERS' }))).toContain('contacts');
  });

  it('validates a typed-in contact country code and number', () => {
    const bad = valid({
      audience: 'MANUAL_NUMBERS',
      contacts: [{ name: 'Asha', extension: '+91', number: '123' }],
    });
    expect(issuePaths(bad)).toEqual(expect.arrayContaining(['contacts.0.extension', 'contacts.0.number']));
    const good = valid({
      audience: 'MANUAL_NUMBERS',
      contacts: [{ name: 'Asha', extension: '91', number: '9000000000' }],
    });
    expect(issuePaths(good)).toEqual([]);
  });

  it('refuses a schedule in the past and accepts one in the future', () => {
    expect(issuePaths(valid({ scheduled_at: '2026-08-06T09:00:00.000Z' }))).toContain('scheduled_at');
    expect(issuePaths(valid({ scheduled_at: '2026-08-06T11:00:00.000Z' }))).toEqual([]);
  });

  it('takes a repeat of 0 to 90 whole days, and blank for a one-off', () => {
    const list = { audience: 'AUDIENCE_LIST' as const, audience_list_id: 'L1' };
    expect(issuePaths(valid({ ...list, repeat_every_days: '' }))).toEqual([]);
    expect(issuePaths(valid({ ...list, repeat_every_days: '7' }))).toEqual([]);
    expect(issuePaths(valid({ ...list, repeat_every_days: '91' }))).toContain('repeat_every_days');
    expect(issuePaths(valid({ ...list, repeat_every_days: '1.5' }))).toContain('repeat_every_days');
    expect(issuePaths(valid({ ...list, repeat_every_days: '-1' }))).toContain('repeat_every_days');
  });

  it('requires the header asset a media template needs', () => {
    expect(issuePaths(valid({ media_required: true }))).toContain('media_url');
  });
});

describe('valuesFromCampaign', () => {
  const row = {
    name: 'Diwali blast',
    wa_campaign_name: 'diwali_camp',
    audience: 'SPECIFIC_USERS',
    audience_list_id: null,
    user_ids: ['u1', 'u2'],
    contacts: [{ name: 'Asha', extension: '91', number: '9000000000' }],
    template_params: ['Asha', 'Diwali'],
    scheduled_at: '2026-01-01T00:00:00.000Z',
  } as unknown as WaCampaignRow;

  it('repeats the recipients and params but never the schedule, and marks the copy', () => {
    const values = valuesFromCampaign(row);
    expect(values.name).toBe('Diwali blast (copy)');
    expect(values.wa_campaign_name).toBe('diwali_camp');
    expect(values.users).toEqual([
      { id: 'u1', name: '' },
      { id: 'u2', name: '' },
    ]);
    expect(values.contacts).toEqual([{ name: 'Asha', extension: '91', number: '9000000000' }]);
    expect(values.template_params).toEqual([{ value: 'Asha' }, { value: 'Diwali' }]);
    expect(values.scheduled_at).toBe('');
  });

  it('falls back to everyone for an audience this portal does not know', () => {
    expect(valuesFromCampaign({ ...row, audience: 'SOMETHING_NEW' }).audience).toBe('ALL_USERS');
  });

  it('tolerates a record with no stored recipients', () => {
    const values = valuesFromCampaign({
      ...row,
      user_ids: undefined,
      contacts: undefined,
      audience_list_id: 'L1',
      audience: 'AUDIENCE_LIST',
    } as unknown as WaCampaignRow);
    expect(values.users).toEqual([]);
    expect(values.contacts).toEqual([]);
    expect(values.audience_list_id).toBe('L1');
  });

  it('repeats a recurring send as recurring, and a one-off as a one-off', () => {
    const recurring = { ...row, audience: 'AUDIENCE_LIST', audience_list_id: 'L1', repeat_every_days: 7 };
    expect(valuesFromCampaign(recurring as unknown as WaCampaignRow).repeat_every_days).toBe('7');
    expect(valuesFromCampaign({ ...row, repeat_every_days: 0 } as unknown as WaCampaignRow).repeat_every_days).toBe('');
  });
});

describe('toSendInput', () => {
  it('sends only the source the audience uses, trimming names and params', () => {
    const input = toSendInput(
      valid({
        name: '  Diwali blast ',
        audience: 'SPECIFIC_USERS',
        users: [{ id: 'u1', name: 'Asha' }],
        audience_list_id: 'stale',
        contacts: [{ name: 'X', extension: '91', number: '9000000000' }],
        template_params: [{ value: ' Asha ' }],
        scheduled_at: '2026-08-07T10:00:00.000Z',
      })
    );
    expect(input).toMatchObject({
      name: 'Diwali blast',
      audience: 'SPECIFIC_USERS',
      audience_list_id: null,
      user_ids: ['u1'],
      contacts: [],
      template_params: ['Asha'],
      scheduled_at: '2026-08-07T10:00:00.000Z',
      media: null,
      buttons: [],
    });
  });

  it('carries the list id for a list and the contacts for typed numbers', () => {
    expect(toSendInput(valid({ audience: 'AUDIENCE_LIST', audience_list_id: 'L1' })).audience_list_id).toBe('L1');
    const manual = toSendInput(
      valid({
        audience: 'MANUAL_NUMBERS',
        contacts: [{ name: 'Asha', extension: '91', number: '9000000000' }],
      })
    );
    expect(manual.contacts).toHaveLength(1);
    expect(manual.scheduled_at).toBeNull();
  });

  it('repeats only a send to a list, as whole days, and treats blank as once', () => {
    const list = { audience: 'AUDIENCE_LIST' as const, audience_list_id: 'L1' };
    expect(toSendInput(valid({ ...list, repeat_every_days: '14' })).repeat_every_days).toBe(14);
    expect(toSendInput(valid({ ...list, repeat_every_days: '' })).repeat_every_days).toBe(0);
    // A stale value left behind after switching away from a list never repeats a broadcast.
    expect(toSendInput(valid({ audience: 'ALL_USERS', repeat_every_days: '14' })).repeat_every_days).toBe(0);
  });
});

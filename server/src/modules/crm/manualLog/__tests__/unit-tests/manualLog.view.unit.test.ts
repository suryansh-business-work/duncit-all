import { activityId, canChangeLog, mentionIdsIn, toActivity } from '../../manualLog.view';

/**
 * How activity entries leave the server: a deleted log keeps its place but
 * loses its words, logs written before ids existed get a positional id, and
 * mentions are read only from real mention spans.
 */

const ALICE = '64b7f0c2a1b2c3d4e5f60718';
const BOB = '64b7f0c2a1b2c3d4e5f60719';

describe('toActivity', () => {
  it('serves a live log with its words, mentions and edit stamps', () => {
    const edited = new Date('2026-11-20T10:00:00Z');
    const out = toActivity({
      type: 'NOTE',
      log_id: 'log-1',
      summary: 'Call',
      body_html: '<p>Hi</p>',
      body_text: 'Hi',
      mention_user_ids: [ALICE],
      created_by: 'u1',
      created_at: new Date('2026-11-19T10:00:00Z'),
      updated_by: 'u1',
      updated_at: edited,
    });
    expect(out).toMatchObject({
      id: 'log-1',
      summary: 'Call',
      body_html: '<p>Hi</p>',
      mention_user_ids: [ALICE],
      created_at: '2026-11-19T10:00:00.000Z',
      updated_at: edited.toISOString(),
      deleted_at: null,
      is_deleted: false,
    });
  });

  it('keeps a deleted log in place but never serves its words', () => {
    const out = toActivity({
      type: 'NOTE',
      log_id: 'log-2',
      summary: 'Secret plan',
      body_html: '<p>do not show</p>',
      body_text: 'do not show',
      mention_user_ids: [ALICE],
      created_by: 'u1',
      deleted_by: 'u2',
      deleted_at: '2026-11-21T08:00:00.000Z',
    });
    expect(out).toMatchObject({
      id: 'log-2',
      summary: '',
      body_html: '',
      body_text: '',
      mention_user_ids: [],
      created_by: 'u1',
      deleted_by: 'u2',
      deleted_at: '2026-11-21T08:00:00.000Z',
      is_deleted: true,
    });
  });

  it('defaults every optional field of an old EMAIL row', () => {
    expect(toActivity({ type: 'EMAIL' })).toEqual({
      id: null,
      type: 'EMAIL',
      summary: '',
      status: '',
      target: '',
      body_html: '',
      body_text: '',
      mention_user_ids: [],
      created_by: null,
      created_at: null,
      updated_by: null,
      updated_at: null,
      deleted_by: null,
      deleted_at: null,
      is_deleted: false,
    });
  });
});

describe('canChangeLog', () => {
  const author = { id: 'u1', roles: ['CRM_MANAGER'] };
  const teammate = { id: 'u2', roles: ['CRM_MANAGER'] };
  const admin = { id: 'u9', roles: ['SUPER_ADMIN'] };

  it('lets the author and a SUPER_ADMIN change a live log, and no one else', () => {
    const log = { type: 'NOTE', created_by: 'u1' };
    expect(canChangeLog(log, author)).toBe(true);
    expect(canChangeLog(log, admin)).toBe(true);
    expect(canChangeLog(log, teammate)).toBe(false);
    expect(canChangeLog(log, null)).toBe(false);
    expect(canChangeLog(log, undefined)).toBe(false);
  });

  it('refuses everyone on a deleted log, an authorless log for non-admins, and anything that is not a log', () => {
    expect(canChangeLog({ type: 'NOTE', created_by: 'u1', deleted_at: '2026-11-21T00:00:00Z' }, admin)).toBe(false);
    expect(canChangeLog({ type: 'NOTE', created_by: 'u1', is_deleted: true }, author)).toBe(false);
    expect(canChangeLog({ type: 'NOTE', created_by: null }, { id: '', roles: [] })).toBe(false);
    expect(canChangeLog({ type: 'NOTE_CREATED', created_by: 'u1' }, author)).toBe(false);
  });
});

describe('activityId', () => {
  it('addresses a log by its own id, a legacy note by position, and nothing else at all', () => {
    expect(activityId({ type: 'NOTE', log_id: 'abc' }, 4)).toBe('abc');
    expect(activityId({ type: 'NOTE' }, 3)).toBe('legacy-3');
    expect(activityId({ type: 'NOTE' })).toBeNull();
    expect(activityId({ type: 'CALL' }, 1)).toBeNull();
    expect(activityId({ type: 'NOTE_CREATED', target: 'abc' }, 2)).toBeNull();
  });
});

describe('mentionIdsIn', () => {
  it('reads each mentioned user once, in order', () => {
    const html =
      `<p>Hey <span data-type="mention" data-id="${ALICE}" data-label="Alice">@Alice</span> and ` +
      `<span class="rich-text-mention" data-type="mention" data-id="${BOB.toUpperCase()}">@Bob</span>, ` +
      `again <span data-type="mention" data-id="${ALICE}">@Alice</span></p>`;
    expect(mentionIdsIn(html)).toEqual([ALICE, BOB]);
  });

  it('ignores spans that are not mentions, malformed ids and empty input', () => {
    expect(mentionIdsIn(`<span data-id="${ALICE}">plain</span>`)).toEqual([]);
    expect(mentionIdsIn('<span data-type="mention" data-id="not-an-id">@x</span>')).toEqual([]);
    expect(mentionIdsIn('<span data-type="mention">@nobody</span>')).toEqual([]);
    expect(mentionIdsIn('')).toEqual([]);
    expect(mentionIdsIn(null)).toEqual([]);
    expect(mentionIdsIn(undefined)).toEqual([]);
  });
});

/**
 * Analytics > Communications' readers against a real database: per-day send
 * outcomes from every log, the splits by category/source/campaign, the
 * notification scopes and the top email templates. Rows are written raw so the
 * aggregations read exactly the stored shape, legacy gaps (no rate) included.
 */
import { EmailLogModel } from '@modules/content/emailLog/emailLog.model';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { WaCampaignModel } from '@modules/crm/marketing/waCampaign.model';
import { NotificationModel } from '@modules/engagement/notification/notification.model';
import { CommunicationLogModel } from '@modules/crm/communicationLog/communicationLog.model';
import {
  emailSplits,
  loadCommsPeriod,
  notificationScopes,
  topTemplates,
  whatsappSplits,
} from '../../entity/communications.data';

const ZONE = 'UTC';
const FROM = new Date('2026-03-01T00:00:00.000Z');
const TO = new Date('2026-03-03T00:00:00.000Z');
const DAY1 = new Date('2026-03-01T10:00:00.000Z');
const DAY2 = new Date('2026-03-02T10:00:00.000Z');
/** Outside the period on both sides — never counted. */
const BEFORE = new Date('2026-02-28T23:00:00.000Z');
const AT_END = TO;

const byDay = <T extends { _id: string }>(rows: T[]) => [...rows].sort((a, b) => a._id.localeCompare(b._id));

async function seedEmails() {
  await EmailLogModel.collection.insertMany([
    { status: 'SENT', template: 'welcome', category: 'transactional', source: 'signup', duration_ms: 100, created_at: DAY1 },
    { status: 'SENT', template: 'welcome', category: 'transactional', source: 'signup', duration_ms: 300, created_at: DAY1 },
    { status: 'FAILED', template: 'welcome', category: 'transactional', source: 'signup', duration_ms: 900, created_at: DAY2 },
    { status: 'SKIPPED', template: 'digest', category: 'marketing', source: 'cron', created_at: DAY2 },
    { status: 'SENT', template: '', category: 'internal', source: 'raw', duration_ms: 50, created_at: DAY2 },
    { status: 'SENT', template: 'welcome', category: 'transactional', source: 'signup', created_at: BEFORE },
    { status: 'SENT', template: 'welcome', category: 'transactional', source: 'signup', created_at: AT_END },
  ]);
}

async function seedWhatsapp() {
  await WaMessageLogModel.collection.insertMany([
    { status: 'SENT', msg_rate: 0.5, template_category: 'UTILITY', campaign: 'auto-a', created_at: DAY1 },
    { status: 'SENT', template_category: 'UTILITY', campaign: 'auto-a', created_at: DAY1 },
    { status: 'FAILED', msg_rate: 0.5, template_category: 'UTILITY', campaign: 'auto-a', created_at: DAY1 },
    { status: 'SKIPPED', template_category: 'MARKETING', campaign: null, created_at: DAY2 },
    { status: 'SENT', msg_rate: 9, template_category: 'UTILITY', campaign: 'auto-a', created_at: BEFORE },
  ]);
  await WaCampaignModel.collection.insertMany([
    {
      campaign_id: 'c-diwali',
      wa_campaign_name: 'Diwali',
      template_category: 'MARKETING',
      sent_count: 10,
      failed_count: 2,
      skipped_count: 1,
      msg_rate: 0.8,
      created_at: DAY2,
    },
    {
      campaign_id: 'c-legacy',
      wa_campaign_name: 'Legacy',
      template_category: 'MARKETING',
      sent_count: 4,
      failed_count: 0,
      skipped_count: 0,
      created_at: DAY2,
    },
    { campaign_id: 'c-old', wa_campaign_name: 'Old', template_category: 'MARKETING', sent_count: 99, created_at: BEFORE },
  ]);
}

async function seedNotifications() {
  await NotificationModel.collection.insertMany([
    { scope: 'USER', delivered_count: 3, failed_count: 1, created_at: DAY1 },
    { scope: 'USER', created_at: DAY1 },
    { scope: 'BROADCAST', delivered_count: 5, failed_count: 0, created_at: DAY2 },
    { scope: 'BROADCAST', delivered_count: 50, created_at: BEFORE },
  ]);
  await CommunicationLogModel.collection.insertMany([{ created_at: DAY1 }, { created_at: DAY2 }, { created_at: BEFORE }]);
}

beforeEach(async () => {
  await seedEmails();
  await seedWhatsapp();
  await seedNotifications();
});

describe('loadCommsPeriod', () => {
  it('reads every log for the period only, one row per day per log', async () => {
    const period = await loadCommsPeriod(FROM, TO, ZONE);

    expect(byDay(period.emails)).toEqual([
      { _id: '2026-03-01', sent: 2, failed: 0, skipped: 0 },
      { _id: '2026-03-02', sent: 1, failed: 1, skipped: 1 },
    ]);
    // Automatic log first, then campaigns; a missing rate costs nothing rather than NaN.
    const automatic = byDay(period.whatsapp.filter((row) => row._id === '2026-03-01'));
    expect(automatic).toEqual([{ _id: '2026-03-01', sent: 2, failed: 1, skipped: 0, cost: 0.5 }]);
    const day2 = period.whatsapp.filter((row) => row._id === '2026-03-02');
    expect(day2).toHaveLength(2);
    expect(day2).toEqual(
      expect.arrayContaining([
        { _id: '2026-03-02', sent: 0, failed: 0, skipped: 1, cost: 0 },
        { _id: '2026-03-02', sent: 14, failed: 2, skipped: 1, cost: 8 },
      ])
    );
    expect(byDay(period.notifications)).toEqual([
      { _id: '2026-03-01', created: 2, delivered: 3, failed: 1 },
      { _id: '2026-03-02', created: 1, delivered: 5, failed: 0 },
    ]);
    expect(period.crm).toBe(2);
  });

  it('returns empty series and zero CRM logs for a quiet period', async () => {
    const quiet = await loadCommsPeriod(new Date('2025-01-01T00:00:00.000Z'), new Date('2025-01-02T00:00:00.000Z'), ZONE);
    expect(quiet).toEqual({ emails: [], whatsapp: [], notifications: [], crm: 0 });
  });
});

describe('emailSplits', () => {
  it('splits only the emails that went out by category and by source', async () => {
    const [split] = await emailSplits(FROM, TO);
    const asMap = (rows: Array<{ _id: string | null; count: number }>) =>
      Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
    expect(asMap(split.categories)).toEqual({ transactional: 2, internal: 1 });
    expect(asMap(split.sources)).toEqual({ signup: 2, raw: 1 });
  });
});

describe('whatsappSplits', () => {
  it('counts sent automatic messages and campaign sends by category and campaign', async () => {
    const rows = await whatsappSplits(FROM, TO);
    expect(rows).toHaveLength(3);
    expect(rows).toEqual(
      expect.arrayContaining([
        { _id: { category: 'UTILITY', campaign: 'auto-a' }, count: 2 },
        { _id: { category: 'MARKETING', campaign: 'Diwali' }, count: 10 },
        { _id: { category: 'MARKETING', campaign: 'Legacy' }, count: 4 },
      ])
    );
  });
});

describe('notificationScopes', () => {
  it('counts notifications in the period by scope', async () => {
    const rows = await notificationScopes(FROM, TO);
    expect(Object.fromEntries(rows.map((row) => [row._id, row.count]))).toEqual({ USER: 2, BROADCAST: 1 });
  });
});

describe('topTemplates', () => {
  it('ranks named templates by attempts with outcomes and the mean time of sends that went out', async () => {
    const rows = await topTemplates(FROM, TO);
    // The raw-HTML send (no template) is not a template.
    expect(rows.map((row) => row._id)).toEqual(['welcome', 'digest']);
    expect(rows[0]).toMatchObject({ sent: 2, failed: 1, skipped: 0, duration: 200 });
    // Nothing went out for this one, so it has no mean send time.
    expect(rows[1]).toMatchObject({ sent: 0, failed: 0, skipped: 1, duration: null });
  });
});

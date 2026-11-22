/**
 * Admin › Email Validations › Dashboard (Analytics `EMAIL_VALIDATIONS`)
 * against a real database: verdict totals and rates by period, the per-console
 * split (a legacy row counting as the CRM's), which tests failed, and re-runs
 * told apart from first checks.
 */
import { EmailVerificationModel } from '@modules/crm/emailVerification/emailVerification.model';
import { emailValidationsAnalytics } from '../../entity/emailValidations.analytics';
import { resolveWindow } from '../../entity/window';
import type { AnalyticsBreakdown, EntityAnalyticsSections } from '../../entity/shapes';

const DAY = 86_400_000;
const NOW = new Date();
const ago = (days: number) => new Date(NOW.getTime() - days * DAY - 3_600_000);
const window = resolveWindow(30, NOW);

interface Row {
  email: string;
  status: 'VERIFIED' | 'RISKY' | 'INVALID' | 'UNKNOWN';
  portal?: string;
  at: Date;
  source?: 'SINGLE' | 'BULK';
  revalidatedFrom?: string;
  suggestion?: string;
  flags?: Record<string, boolean>;
}

const insert = (rows: Row[]) =>
  EmailVerificationModel.collection.insertMany(
    rows.map((row) => ({
      email: row.email,
      status: row.status,
      is_valid_syntax: true,
      accepts_mail: true,
      can_connect_smtp: true,
      is_deliverable: row.status === 'VERIFIED',
      is_catch_all: row.status === 'RISKY',
      has_full_inbox: false,
      is_disabled: false,
      is_disposable: false,
      is_role_account: false,
      ...row.flags,
      suggestion: row.suggestion ?? '',
      source: row.source ?? 'SINGLE',
      ...(row.portal ? { portal: row.portal } : {}),
      revalidated_from: row.revalidatedFrom ?? null,
      job_id: null,
      checked_by: { id: 's1', email: 'staff@duncit.com' },
      created_at: row.at,
    }))
  );

const kpi = (page: EntityAnalyticsSections, key: string) => page.kpis.find((k) => k.key === key);
const slices = (page: EntityAnalyticsSections, key: string) =>
  Object.fromEntries(
    (page.breakdowns.find((b) => b.key === key) as AnalyticsBreakdown).slices.map((s) => [s.key, s.value])
  );

describe('emailValidationsAnalytics', () => {
  beforeEach(async () => {
    await insert([
      { email: 'a@x.com', status: 'VERIFIED', portal: 'finance', at: ago(1) },
      { email: 'a@x.com', status: 'VERIFIED', portal: 'admin', at: ago(1), revalidatedFrom: 'r1' },
      { email: 'b@x.com', status: 'RISKY', portal: 'finance', at: ago(2) },
      { email: 'c@x.com', status: 'UNKNOWN', at: ago(3), flags: { can_connect_smtp: false } },
      { email: 'd@gmial.com', status: 'INVALID', portal: 'support', at: ago(4), suggestion: 'd@gmail.com', flags: { accepts_mail: false } },
      { email: 'e@x.com', status: 'VERIFIED', portal: 'crm', at: ago(5), source: 'BULK' },
      // The previous period, for the comparison.
      { email: 'old@x.com', status: 'INVALID', portal: 'finance', at: ago(40) },
    ]);
  });

  it('totals the period’s checks by verdict, with the previous period beside them', async () => {
    const page = await emailValidationsAnalytics(window);

    expect(kpi(page, 'ev_validations')).toMatchObject({ value: 6, previous: 1 });
    expect(kpi(page, 'ev_unique_emails')).toMatchObject({ value: 5, previous: 1 });
    expect(kpi(page, 'ev_valid')).toMatchObject({ value: 3, previous: 0 });
    // UNKNOWN joins RISKY: neither proof the mailbox exists nor that it does not.
    expect(kpi(page, 'ev_risky')).toMatchObject({ value: 2, higher_is_better: false });
    expect(kpi(page, 'ev_invalid')).toMatchObject({ value: 1, previous: 1 });
    expect(kpi(page, 'ev_valid_rate')).toMatchObject({ value: 50, previous: 0, format: 'PERCENT' });
    expect(kpi(page, 'ev_revalidations')?.value).toBe(1);
    expect(kpi(page, 'ev_typos')?.value).toBe(1);
  });

  it('splits checks by verdict, console and source, a console-less row being the CRM’s', async () => {
    const page = await emailValidationsAnalytics(window);

    expect(slices(page, 'ev_by_verdict')).toEqual({ VALID: 3, RISKY: 2, INVALID: 1 });
    expect(slices(page, 'ev_by_portal')).toEqual({ finance: 2, crm: 2, admin: 1, support: 1 });
    expect(slices(page, 'ev_by_source')).toEqual({ SINGLE: 4, BULK: 1, REVALIDATE: 1 });
  });

  it('counts only the tests that ran and failed', async () => {
    const page = await emailValidationsAnalytics(window);

    expect(slices(page, 'ev_failed_checks')).toMatchObject({
      NOT_CATCH_ALL: 1,
      SMTP_CONNECTION: 1,
      MAIL_SERVER: 1,
      SYNTAX: 0,
    });
    // Only b@x.com's (the server answered, no deliverable mailbox). c@x.com's server never answered and
    // d@gmial.com has none, so their stored "not deliverable" is no answer, not a failure.
    expect(slices(page, 'ev_failed_checks').MAILBOX_EXISTS).toBe(1);
  });

  it('ranks consoles by checks, named, with their verdicts and valid rate', async () => {
    const page = await emailValidationsAnalytics(window);
    const rows = page.leaderboard?.rows ?? [];

    expect(rows[0]).toMatchObject({ id: 'crm', name: 'CRM', values: [2, 1, 1, 0, 50] });
    expect(rows.find((row) => row.id === 'finance')).toMatchObject({ name: 'Finance', values: [2, 1, 1, 0, 50] });
    expect(rows.map((row) => row.id)).toHaveLength(4);
  });

  it('links every widget to the Admin console', async () => {
    const page = await emailValidationsAnalytics(window);
    expect(page.link).toEqual({ surface: 'admin', path: '/email-validations/dashboard' });
    expect(page.kpis.every((k) => k.link)).toBe(true);
  });
});

import { GraphQLError } from 'graphql';
import {
  MSG91_ANALYTICS_MAX_DAYS,
  MSG91_LOGS_MAX_DAYS,
  msg91WidgetAnalytics,
  msg91WidgetLogs,
  runtimeMsg91Credentials,
  type Msg91AnalyticsRow,
  type Msg91LogRow,
} from './msg91.gateway';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/**
 * A `yyyy-MM-dd` window MSG91 will accept, refused here with a sentence rather
 * than a round trip. MSG91 still has the last word (a future end date is
 * judged on its own IST calendar), and its refusal reaches the portal as-is.
 */
function windowOf(start: string, end: string, maxDays: number) {
  const startDate = String(start ?? '').trim();
  const endDate = String(end ?? '').trim();
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    throw badInput('Dates must be yyyy-MM-dd');
  }
  const span = (Date.parse(endDate) - Date.parse(startDate)) / DAY_MS;
  if (Number.isNaN(span)) throw badInput('Dates must be real calendar dates');
  if (span < 0) throw badInput('The start date must not be after the end date');
  if (span > maxDays) throw badInput(`MSG91 allows at most ${maxDays} days in one window`);
  return { startDate, endDate };
}

async function credentials() {
  const creds = await runtimeMsg91Credentials();
  if (!creds) {
    throw new GraphQLError(
      'MSG91 is not configured. Add the widget ID and auth key in Tech → Environment → MSG91.',
      { extensions: { code: 'BAD_REQUEST' } }
    );
  }
  return creds;
}

/**
 * MSG91 reports log times as `yyyy-MM-dd HH:mm:ss` on its own clock (IST) with
 * no zone. Pinned to that zone here, so the portal can show it in the
 * admin-configured zone and format like every other instant. '' when unreadable.
 */
const MSG91_ZONE_OFFSET = '+05:30';

function toInstant(value: unknown): string {
  const local = String(value ?? '').trim().replace(' ', 'T');
  const date = new Date(local + MSG91_ZONE_OFFSET);
  return local && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
}

const toLog = (row: Readonly<Msg91LogRow>) => ({
  request_id: String(row.requestId ?? ''),
  identifier: String(row.identifier ?? ''),
  requested_at: toInstant(row.requestTime),
  verified: row.verified === true,
  token_verified: row.tokenVerified === true,
  verify_attempts: Number(row.verifyRetryCount ?? 0),
  retries: Number(row.retryCount ?? 0),
  user_ip: String(row.userIp ?? ''),
  sms: Number(row.sms ?? 0),
  whatsapp: Number(row.whatsapp ?? 0),
  email: Number(row.email ?? 0),
  voice: Number(row.voice ?? 0),
});

const toDay = (row: Readonly<Msg91AnalyticsRow>) => ({
  date: String(row.date ?? ''),
  total: Number(row.total ?? 0),
  verified: Number(row.verified ?? 0),
  token_verified: Number(row.tokenVerified ?? 0),
  retries: Number(row.retry ?? 0),
  sms: Number(row.sms ?? 0),
  whatsapp: Number(row.whatsapp ?? 0),
  email: Number(row.email ?? 0),
  voice: Number(row.voice ?? 0),
});

/**
 * The Tech portal's window onto MSG91's own records of the OTP widget.
 *
 * Nothing is stored here: MSG91 already keeps every request, and a local copy
 * would be a second record to disagree with it. Both reads go through the
 * running platform's default MSG91 entry — the one every SMS code is sent with.
 */
export const msg91Service = {
  async configured(): Promise<boolean> {
    return (await runtimeMsg91Credentials()) !== null;
  },

  async logs(start: string, end: string) {
    const range = windowOf(start, end, MSG91_LOGS_MAX_DAYS);
    const { rows, total } = await msg91WidgetLogs(await credentials(), range);
    return { rows: rows.map(toLog), total };
  },

  async analytics(start: string, end: string) {
    const range = windowOf(start, end, MSG91_ANALYTICS_MAX_DAYS);
    const { days, total } = await msg91WidgetAnalytics(await credentials(), range);
    return { days: days.map(toDay), total: total ? toDay(total) : null };
  },
};

import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';

/**
 * MSG91's OTP widget — the SMS provider, and the only file in the server that
 * knows MSG91's URLs and field names.
 *
 * MSG91 generates and checks the code itself: `sendOtp` answers with a request
 * id, and that id plus what the person typed is what `verifyOtp` is asked
 * about. Duncit therefore never sees an SMS code — it keeps the request id on
 * the challenge (see `otpService`) and lets MSG91 answer.
 *
 * Every call reports MSG91's own verdict as a value, never as an exception.
 * MSG91 says `type: "success"` or `type: "error"` (with a numeric `code`) under
 * HTTP 200, and its report API says `{ error }` or `{ status: "fail" }`
 * instead, so `res.ok` alone would report a refusal as a send. Only a wire
 * failure throws, from `outboundFetch`.
 *
 * The credentials are owned by the Tech portal (MSG91 env category), never
 * `.env`, and are read fresh per call so a rotated key applies without a
 * restart.
 */
const WIDGET_BASE_URL = 'https://api.msg91.com/api/v5/widget';
const REPORT_BASE_URL = 'https://control.msg91.com/api/v5/report';

/** No MSG91 call gets longer than this to answer. */
const TIMEOUT_MS = 12_000;

/** MSG91's channel codes, as `retryOtp` takes them. */
export const MSG91_RETRY_CHANNELS = { SMS: 11, VOICE: 4, EMAIL: 3, WHATSAPP: 12 } as const;

/** The widget reports' own ceilings on how wide a window may be, in days. */
export const MSG91_LOGS_MAX_DAYS = 3;
export const MSG91_ANALYTICS_MAX_DAYS = 31;

export interface Msg91Credentials {
  widget_id: string;
  auth_key: string;
}

/** MSG91's answer to one widget call. */
export interface Msg91Answer {
  ok: boolean;
  /**
   * On success: the request id (sendOtp / retryOtp) or the access token
   * (verifyOtp). On failure: MSG91's reason.
   */
  message: string;
  /** MSG91's error code, '' on success. */
  code: string;
}

/** The widget credentials the running platform uses, or null when unset. */
export async function runtimeMsg91Credentials(): Promise<Msg91Credentials | null> {
  const [widget_id, auth_key] = await Promise.all([
    getRuntimeEnvValue('MSG91_WIDGET_ID'),
    getRuntimeEnvValue('MSG91_AUTH_KEY'),
  ]);
  return widget_id && auth_key ? { widget_id, auth_key } : null;
}

/** MSG91 takes the country code and the number as one run of digits, no `+`. */
export const msg91Identifier = (extension: string, number: string): string =>
  `${extension}${number}`.replaceAll(/\D/g, '');

/** The reason out of any of MSG91's error bodies. */
function reasonOf(body: Record<string, any>, status: number): string {
  return String(body.message ?? body.error ?? body.errors ?? `HTTP ${status}`);
}

async function readBody(res: Response): Promise<Record<string, any>> {
  // A gateway error page is HTML, not JSON; the status still has to survive.
  return (await res.json().catch(() => ({}))) as Record<string, any>;
}

async function widgetCall(
  creds: Readonly<Msg91Credentials>,
  path: string,
  payload: Record<string, unknown>
): Promise<Msg91Answer> {
  const res = await outboundFetch('MSG91', `${WIDGET_BASE_URL}/${path}`, {
    method: 'POST',
    headers: { authkey: creds.auth_key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await readBody(res);
  const ok = body.type === 'success';
  return {
    ok,
    message: ok ? String(body.message ?? '') : reasonOf(body, res.status),
    code: ok ? '' : String(body.code ?? res.status),
  };
}

/** Send a code to `identifier` (country code + number, digits only). */
export const msg91SendOtp = (creds: Readonly<Msg91Credentials>, identifier: string) =>
  widgetCall(creds, 'sendOtp', { widgetId: creds.widget_id, identifier });

/** Re-send the code of a live request, optionally over another channel. */
export const msg91RetryOtp = (
  creds: Readonly<Msg91Credentials>,
  reqId: string,
  retryChannel?: number | null
) =>
  widgetCall(creds, 'retryOtp', {
    widgetId: creds.widget_id,
    reqId,
    ...(retryChannel ? { retryChannel } : {}),
  });

/** Ask MSG91 whether `otp` is the code it sent for `reqId`. */
export const msg91VerifyOtp = (creds: Readonly<Msg91Credentials>, reqId: string, otp: string) =>
  widgetCall(creds, 'verifyOtp', { widgetId: creds.widget_id, reqId, otp });

/** Ask MSG91 whether an access token from `verifyOtp` is one it issued. */
export const msg91VerifyAccessToken = (creds: Readonly<Msg91Credentials>, token: string) =>
  widgetCall(creds, 'verifyAccessToken', { 'access-token': token });

/** One row of the widget's request log, as MSG91 reports it. */
export interface Msg91LogRow {
  requestId: string;
  identifier: string;
  requestTime: string;
  verified: boolean;
  tokenVerified: boolean;
  verifyRetryCount: number;
  retryCount: number;
  userIp: string;
  sms: number;
  whatsapp: number;
  email: number;
  voice: number;
}

/** One day (or the window's total) of widget traffic. */
export interface Msg91AnalyticsRow {
  date: string;
  total: number;
  verified: number;
  tokenVerified: number;
  retry: number;
  sms: number;
  email: number;
  voice: number;
  whatsapp: number;
}

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

async function reportCall(
  creds: Readonly<Msg91Credentials>,
  path: string,
  range: Readonly<{ startDate: string; endDate: string }>
): Promise<Record<string, any>> {
  const query = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate });
  const res = await outboundFetch('MSG91', `${REPORT_BASE_URL}/${path}?${query.toString()}`, {
    headers: { Authkey: creds.auth_key, accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await readBody(res);
  // A refusal is the operator's to read ("Duration exceeds…", "Unauthorized"),
  // so it is surfaced as the reason rather than an empty table.
  if (!res.ok || body.error || body.status === 'fail') {
    throw badInput(`MSG91 refused the report: ${reasonOf(body, res.status)}`);
  }
  return body;
}

/** Every widget request between two dates (`yyyy-MM-dd`, at most 3 days apart). */
export async function msg91WidgetLogs(
  creds: Readonly<Msg91Credentials>,
  range: Readonly<{ startDate: string; endDate: string }>
): Promise<{ rows: Msg91LogRow[]; total: number }> {
  const body = await reportCall(creds, 'logs/p/widget', range);
  const rows = (Array.isArray(body.data) ? body.data : []) as Msg91LogRow[];
  return { rows, total: Number(body.metadata?.total ?? rows.length) };
}

/** Per-day widget traffic between two dates (`yyyy-MM-dd`, at most 31 days apart). */
export async function msg91WidgetAnalytics(
  creds: Readonly<Msg91Credentials>,
  range: Readonly<{ startDate: string; endDate: string }>
): Promise<{ days: Msg91AnalyticsRow[]; total: Msg91AnalyticsRow | null }> {
  const body = await reportCall(creds, 'analytics/p/widget', range);
  const days = (Array.isArray(body.data) ? body.data : []) as Msg91AnalyticsRow[];
  const total = body.total ? ({ ...body.total, date: '' } as Msg91AnalyticsRow) : null;
  return { days, total };
}

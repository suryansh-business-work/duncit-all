import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';
import { postJson } from './aisensy.transport';

/**
 * AiSensy — the WhatsApp provider, and the only file in the server that knows
 * AiSensy's field names.
 *
 * The split mirrors `@duncit/communication`: `aisensy.transport.ts` owns the
 * wire (retries, timeouts, redaction), this file owns one vendor's payload and
 * its idea of success, and `aisensy.service.ts` owns what a valid message is.
 * A second provider would be a sibling of this file and nothing else would
 * move. See that package's docs for why the server mirrors rather than imports.
 *
 * Two AiSensy quirks decide the shape here:
 *  - the API key travels in the BODY, so it is redacted by the transport rather
 *    than by a header allow-list;
 *  - success is reported as `success: "true"` — the STRING — alongside HTTP
 *    200, so a `res.ok` check on its own reports rejections as sends.
 *
 * The key is owned by the Tech portal (AISENSY env category), never `.env`, and
 * is read fresh per call via {@link getRuntimeEnvValue} so a rotated key applies
 * without a restart.
 */
const DEFAULT_BASE_URL = 'https://backend.aisensy.com';
const CAMPAIGN_PATH = '/campaign/t1/api/v2';

async function apiKey(): Promise<string> {
  const key = await getRuntimeEnvValue('AISENSY_API_KEY');
  if (!key) {
    throw new GraphQLError('AiSensy is not configured. Add the API key in the Tech portal.', {
      extensions: { code: 'BAD_REQUEST' },
    });
  }
  return key;
}

export async function isAisensyConfigured(): Promise<boolean> {
  return !!(await getRuntimeEnvValue('AISENSY_API_KEY'));
}

/** Campaign name sends fall back to when the caller doesn't name one. */
export async function defaultCampaign(): Promise<string> {
  return getRuntimeEnvValue('AISENSY_CAMPAIGN_NAME');
}

/**
 * A header image or document for a media template.
 *
 * AiSensy fetches the URL itself at send time, so it must be reachable from the
 * public internet — a signed or intranet URL is rejected, not retried. There is
 * no upload endpoint: the asset is supplied per send, never at template
 * creation.
 */
export interface CampaignMedia {
  url: string;
  filename: string;
}

export interface CampaignMessage {
  campaign_name: string;
  /** Country code + number, digits only — the shape AiSensy expects. */
  destination: string;
  user_name: string;
  template_params: string[];
  /** Only for a template whose header is IMAGE, VIDEO or DOCUMENT. */
  media?: CampaignMedia;
}

/** Human-readable reason out of an AiSensy error body. */
export function campaignErrorReason(body: any, status: number): string {
  return String(body?.message ?? body?.errorMessage ?? body?.error ?? `HTTP ${status}`);
}

/**
 * Did AiSensy take the message? Its own answer is the STRING `"true"` alongside
 * HTTP 200, so an `res.ok` check on its own reports rejections as sends.
 */
export function campaignSucceeded(body: any): boolean {
  return body?.success === true || body?.success === 'true';
}

/**
 * The failure message. A rejected key is reported with the NAME of the entry it
 * came from: a category can hold several entries and only the active default is
 * used, so "the key I just pasted is wrong" and "I pasted it into an entry that
 * isn't the default one" look identical from AiSensy's side.
 */
async function failureMessage(body: any, status: number): Promise<string> {
  const reason = campaignErrorReason(body, status);
  if (status !== 401 && status !== 403) return `AiSensy error: ${reason} (HTTP ${status})`;
  const entry = await envEntryService.resolveRuntime('AISENSY');
  const source = entry ? `entry "${entry.name}"` : 'no active default entry';
  return `AiSensy rejected the API key from ${source} (HTTP ${status}: ${reason})`;
}

/** Trailing slashes off the configured host, without a backtracking regex (S8786). */
function withoutTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}

/** The message in AiSensy's own field names. */
export function campaignPayload(message: CampaignMessage, key: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    apiKey: key,
    campaignName: message.campaign_name,
    destination: message.destination,
    userName: message.user_name,
    templateParams: message.template_params,
  };
  // Omitted rather than sent empty: a `media` key with a blank url fails the
  // whole send, while a text-header template with no key is simply fine.
  if (message.media?.url) {
    payload.media = { url: message.media.url, filename: message.media.filename };
  }
  return payload;
}

/**
 * The campaign endpoint on a given host — blank falls back to AiSensy's own.
 *
 * Exported because a Tech-portal connection test has to send through ONE
 * NAMED entry's base URL rather than the active runtime default: a category can
 * hold several entries, and routing the test through {@link sendCampaign} would
 * report a different key as good.
 */
export function campaignEndpoint(baseUrl: string): string {
  return `${withoutTrailingSlash(baseUrl || DEFAULT_BASE_URL)}${CAMPAIGN_PATH}`;
}

/** Send one campaign message; resolves to AiSensy's submitted_message_id. */
export async function sendCampaign(message: CampaignMessage): Promise<string> {
  const key = await apiKey();
  const url = campaignEndpoint(await getRuntimeEnvValue('AISENSY_BASE_URL'));

  const res = await postJson(url, campaignPayload(message, key));

  if (!res.ok || !campaignSucceeded(res.data)) {
    throw new GraphQLError(await failureMessage(res.data, res.status), {
      extensions: { code: 'BAD_GATEWAY' },
    });
  }
  return String(res.data.submitted_message_id ?? '');
}

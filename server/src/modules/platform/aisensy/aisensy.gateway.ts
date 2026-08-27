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

/**
 * The value that fills a CTA button's dynamic link.
 *
 * It travels in its OWN top-level field and never in `templateParams`: AiSensy's
 * published v2 examples put the body's variables in `templateParams` and a URL
 * button's value only under `buttons`, and a `templateParams` of the wrong
 * length is a documented hard rejection ("Template param count mismatch!").
 * The wire shape is theirs verbatim —
 * `{type:"button", sub_type:"url", index:"0", parameters:[{type:"text", text}]}`
 * — including `index` as a STRING.
 */
export interface CampaignButton {
  /** Where the button sits on the template, counting from zero. */
  index: number;
  /** What replaces the {{n}} in that button's link. */
  value: string;
}

export interface CampaignMessage {
  campaign_name: string;
  /** Country code + number, digits only — the shape AiSensy expects. */
  destination: string;
  user_name: string;
  template_params: string[];
  /** Only for a template whose header is IMAGE, VIDEO or DOCUMENT. */
  media?: CampaignMedia;
  /** Only for a template whose CTA link carries a {{n}}. */
  buttons?: CampaignButton[];
}

/** Human-readable reason out of an AiSensy error body. */
export function campaignErrorReason(body: any, status: number): string {
  return String(body?.message ?? body?.errorMessage ?? body?.error ?? `HTTP ${status}`);
}

/**
 * Is this AiSensy's "your campaign's template has a media header and your
 * message carried none" rejection?
 *
 * It is the ONE rejection the server can answer by itself, and — more useful —
 * the only authority on whether a campaign needs a header asset that costs no
 * second credential. The Project API can say so too, but it is a SEPARATE key:
 * unset, unreachable, or pointed at a campaign whose template it cannot
 * resolve, every media scenario would otherwise fail forever with a vendor
 * string nobody can act on. See `resolveMedia` in whatsapp.service.
 *
 * Matched on words rather than a pattern: the vendor writes `Media URL
 * Missing`, and a neighbouring rejection reads `Media URL is not accessible` —
 * which is a real problem with a real asset and must NOT look like this one.
 */
export function isMediaMissing(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : JSON.stringify(error ?? '')).toLowerCase();
  return message.includes('media') && (message.includes('missing') || message.includes('required'));
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
    // The filename key is omitted rather than sent blank: AiSensy's published
    // example always carries one, and an empty string is not a name.
    payload.media = message.media.filename
      ? { url: message.media.url, filename: message.media.filename }
      : { url: message.media.url };
  }
  // Same rule, for the same reason: AiSensy does not document what it does with
  // a `buttons` array for a template that has no dynamic link, so one is sent
  // only when a value was actually given.
  const buttons = (message.buttons ?? []).filter((button) => button.value);
  if (buttons.length > 0) {
    payload.buttons = buttons.map((button) => ({
      type: 'button',
      sub_type: 'url',
      index: String(button.index),
      parameters: [{ type: 'text', text: button.value }],
    }));
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

import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { envEntryService } from '@modules/platform/envEntry/envEntry.service';

/**
 * AiSensy gateway — thin wrapper over the WhatsApp campaign API. The API key is
 * owned by the Tech portal (AISENSY env category), never `.env`, and is read
 * fresh per call via {@link getRuntimeEnvValue} so a rotated key applies without
 * a restart. AiSensy answers 200 with `success: "true"` (a STRING) and echoes
 * the queued message id; failures carry a `message`/`errorMessage` reason.
 */
const DEFAULT_BASE_URL = 'https://backend.aisensy.com';

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

export interface CampaignMessage {
  campaign_name: string;
  destination: string;
  user_name: string;
  template_params: string[];
}

/** Human-readable reason out of an AiSensy error body. */
function errorReason(body: any, status: number): string {
  return String(body?.message ?? body?.errorMessage ?? body?.error ?? `HTTP ${status}`);
}

/**
 * The failure message. A rejected key is reported with the NAME of the entry it
 * came from: a category can hold several entries and only the active default is
 * used, so "the key I just pasted is wrong" and "I pasted it into an entry that
 * isn't the default one" look identical from AiSensy's side.
 */
async function failureMessage(body: any, status: number): Promise<string> {
  const reason = errorReason(body, status);
  if (status !== 401 && status !== 403) return `AiSensy error: ${reason} (HTTP ${status})`;
  const entry = await envEntryService.resolveRuntime('AISENSY');
  const source = entry ? `entry "${entry.name}"` : 'no active default entry';
  return `AiSensy rejected the API key from ${source} (HTTP ${status}: ${reason})`;
}

/** Send one campaign message; resolves to AiSensy's submitted_message_id. */
export async function sendCampaign(message: CampaignMessage): Promise<string> {
  const key = await apiKey();
  const base = ((await getRuntimeEnvValue('AISENSY_BASE_URL')) || DEFAULT_BASE_URL).replace(/\/$/, '');
  const res = await fetch(`${base}/campaign/t1/api/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: key,
      campaignName: message.campaign_name,
      destination: message.destination,
      userName: message.user_name,
      templateParams: message.template_params,
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || String(data.success) !== 'true') {
    throw new GraphQLError(await failureMessage(data, res.status), {
      extensions: { code: 'BAD_GATEWAY' },
    });
  }
  return String(data.submitted_message_id ?? '');
}

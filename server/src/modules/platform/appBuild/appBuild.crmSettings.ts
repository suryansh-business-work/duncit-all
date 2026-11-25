import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { slackService } from '@modules/platform/slack/slack.service';
import { appBuildService } from './appBuild.service';
import { CRM_CHANNEL_ENV_KEYS } from './appBuild.apps';

/**
 * The CRM portal's half of App Builds: which Slack channel each environment's
 * Duncit CRM APK is announced in. CRM staff choose it themselves (Download CRM
 * App → Settings) — the same two env fields the Tech portal's App Builds →
 * Settings edits, so the two screens can never disagree.
 *
 * Deliberately narrow: CRM staff read the channel list (names only) and set
 * these two fields — not Slack history, not any other channel setting.
 */

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });
const trimmed = (v: string | null | undefined) => String(v ?? '').trim();

export interface CrmSlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

async function listChannels(): Promise<{ channels: CrmSlackChannel[]; error: string | null }> {
  try {
    const all = await slackService.channels();
    return {
      channels: all.map((c) => ({ id: c.id, name: c.name, is_private: c.is_private, is_member: c.is_member })),
      error: null,
    };
  } catch (err) {
    return { channels: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function crmAppBuildSettings() {
  const configured = await slackService.configured();
  const [production, staging] = await Promise.all([
    getRuntimeEnvValue(CRM_CHANNEL_ENV_KEYS.PRODUCTION),
    getRuntimeEnvValue(CRM_CHANNEL_ENV_KEYS.STAGING),
  ]);
  const { channels, error } = configured ? await listChannels() : { channels: [], error: null };
  return {
    slack_configured: configured,
    production_channel: trimmed(production) || null,
    staging_channel: trimmed(staging) || null,
    channels,
    channels_error: error,
  };
}

/**
 * Save both channels. Each must be one the Duncit bot can see (or blank, which
 * falls back: staging → production → the Android builds channels), so a typo
 * can never silently swallow every announcement.
 */
export async function updateCrmAppBuildSettings(
  input: { production_channel?: string | null; staging_channel?: string | null },
  user: AuthUser
) {
  const production = input.production_channel === undefined ? undefined : trimmed(input.production_channel);
  const staging = input.staging_channel === undefined ? undefined : trimmed(input.staging_channel);
  const chosen = [production, staging].filter((c): c is string => Boolean(c));
  if (chosen.length > 0) {
    const { channels, error } = await listChannels();
    if (error) throw badInput(`Slack channels could not be read: ${error}`);
    const known = new Set(channels.map((c) => c.id));
    if (chosen.some((id) => !known.has(id))) throw badInput('Pick a channel the Duncit Slack bot can see.');
  }
  await appBuildService.updateSettings({ crm_channel: production, crm_staging_channel: staging });
  logs.server.info('appBuild', 'crmChannels', { by: user.id, production_channel: production, staging_channel: staging });
  return crmAppBuildSettings();
}

import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { defaultCampaign, isAisensyConfigured, sendCampaign } from './aisensy.gateway';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

/** Country code + number, digits only — the shape AiSensy expects (919582998897). */
const DESTINATION_RE = /^\d{6,15}$/;

const trimmed = (v: unknown): string => String(v ?? '').trim();

export const aisensyService = {
  /** Whether a key is configured + the campaign name sends default to. */
  async status() {
    const [configured, default_campaign] = await Promise.all([isAisensyConfigured(), defaultCampaign()]);
    return { configured, default_campaign };
  },

  /**
   * Send a WhatsApp template campaign message — the single entry point used by
   * the Tech portal test and by server-side callers. Every template parameter
   * must be filled: AiSensy silently renders a blank variable in the message.
   */
  async send(input: any) {
    const campaign_name = trimmed(input.campaign_name) || (await defaultCampaign());
    if (!campaign_name) throw badInput('Campaign name is required');
    const destination = trimmed(input.destination).replace(/^\+/, '');
    if (!DESTINATION_RE.test(destination)) {
      throw badInput('Destination must be the country code + number, digits only (e.g. 919582998897)');
    }
    const user_name = trimmed(input.user_name);
    if (!user_name) throw badInput('User name is required');
    const template_params = (input.template_params ?? []).map(trimmed);
    if (template_params.some((param: string) => !param)) {
      throw badInput('Fill every template parameter before sending');
    }
    const submitted_message_id = await sendCampaign({
      campaign_name,
      destination,
      user_name,
      template_params,
    });
    logs.server.info('aisensy', 'send', { campaign_name, submitted_message_id });
    return { ok: true, submitted_message_id, message: `Campaign "${campaign_name}" submitted` };
  },
};

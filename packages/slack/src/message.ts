import type { SendSlackMessageInput, SlackMessageOptions } from './types';

/** Serialize an array to JSON only when it has entries, else drop it. */
const jsonOrUndefined = (value: unknown[] | undefined): string | undefined => {
  if (value && value.length > 0) {
    return JSON.stringify(value);
  }
  return undefined;
};

/** Strip keys whose value is `undefined` so the mutation input carries only
 * the fields the caller actually set. */
const dropUndefined = <T extends object>(obj: T): T => {
  const out = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
};

/**
 * Collapse ergonomic {@link SlackMessageOptions} into the flat
 * {@link SendSlackMessageInput} the server mutation accepts: `blocks` and
 * `attachments` become JSON strings, and unset fields are removed.
 */
export const buildSlackMessageInput = (opts: SlackMessageOptions): SendSlackMessageInput =>
  dropUndefined({
    channel: opts.channel,
    text: opts.text,
    blocks_json: jsonOrUndefined(opts.blocks),
    attachments_json: jsonOrUndefined(opts.attachments),
    thread_ts: opts.thread_ts,
    reply_broadcast: opts.reply_broadcast,
    mrkdwn: opts.mrkdwn,
    unfurl_links: opts.unfurl_links,
    unfurl_media: opts.unfurl_media,
    link_names: opts.link_names,
    icon_emoji: opts.icon_emoji,
    username: opts.username,
  });

/** GraphQL operation source. Consumers wrap with their own `gql` tag so the
 * package needs no Apollo/GraphQL runtime dependency (works on the server too):
 * `const SEND_SLACK_MESSAGE = gql(SEND_SLACK_MESSAGE_SDL)`. */
export const SEND_SLACK_MESSAGE_SDL = `
  mutation SendSlackMessage($input: SendSlackMessageInput!) {
    sendSlackMessage(input: $input) {
      ok
      channel
      ts
    }
  }
`;

export const SLACK_CHANNELS_SDL = `
  query SlackChannels {
    slackChannels {
      id
      name
      is_private
      is_member
      num_members
      topic
      link
    }
  }
`;

export const SLACK_CONFIGURED_SDL = `
  query SlackConfigured {
    slackConfigured
  }
`;

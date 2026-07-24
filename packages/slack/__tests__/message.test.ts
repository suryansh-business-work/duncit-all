import { describe, expect, it } from 'vitest';
import {
  buildSlackMessageInput,
  SEND_SLACK_MESSAGE_SDL,
  SLACK_CHANNELS_SDL,
  SLACK_CONFIGURED_SDL,
} from '../src/message';
import { section } from '../src/blocks';

describe('buildSlackMessageInput', () => {
  it('keeps only the fields that were set and drops the rest', () => {
    expect(buildSlackMessageInput({ channel: 'C1', text: 'hi' })).toEqual({
      channel: 'C1',
      text: 'hi',
    });
  });

  it('serialises non-empty blocks and attachments to JSON', () => {
    const block = section('*hi*');
    const input = buildSlackMessageInput({
      text: 'hi',
      blocks: [block],
      attachments: [{ color: '#f00', text: 'a' }],
    });
    expect(input.blocks_json).toBe(JSON.stringify([block]));
    expect(input.attachments_json).toBe(JSON.stringify([{ color: '#f00', text: 'a' }]));
  });

  it('omits empty block and attachment arrays', () => {
    const input = buildSlackMessageInput({ text: 'hi', blocks: [], attachments: [] });
    expect(input).toEqual({ text: 'hi' });
    expect('blocks_json' in input).toBe(false);
  });

  it('passes through the full option surface', () => {
    expect(
      buildSlackMessageInput({
        channel: 'C9',
        text: 'ping',
        thread_ts: '123.4',
        reply_broadcast: false,
        mrkdwn: true,
        unfurl_links: false,
        unfurl_media: true,
        link_names: true,
        icon_emoji: ':wave:',
        username: 'bot',
      }),
    ).toEqual({
      channel: 'C9',
      text: 'ping',
      thread_ts: '123.4',
      reply_broadcast: false,
      mrkdwn: true,
      unfurl_links: false,
      unfurl_media: true,
      link_names: true,
      icon_emoji: ':wave:',
      username: 'bot',
    });
  });

  it('returns an empty input when nothing is provided', () => {
    expect(buildSlackMessageInput({})).toEqual({});
  });
});

describe('operation SDL', () => {
  it('exposes the send, channels and configured operations', () => {
    expect(SEND_SLACK_MESSAGE_SDL).toContain('mutation SendSlackMessage');
    expect(SLACK_CHANNELS_SDL).toContain('query SlackChannels');
    expect(SLACK_CONFIGURED_SDL).toContain('slackConfigured');
  });
});

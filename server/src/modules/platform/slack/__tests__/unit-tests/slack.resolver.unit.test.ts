import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';

jest.mock('../../slack.service', () => ({
  slackService: {
    configured: jest.fn().mockResolvedValue(true),
    channels: jest.fn().mockResolvedValue([{ id: 'C1' }]),
    send: jest.fn().mockResolvedValue({ ok: true, channel: 'C1', ts: '1' }),
  },
}));

import { slackResolvers } from '../../slack.resolver';
import { slackService } from '../../slack.service';

const ctx = (roles: string[] | null): GraphQLContext =>
  ({ user: roles ? { id: 'u1', roles } : null }) as unknown as GraphQLContext;

beforeEach(() => jest.clearAllMocks());

describe('slackResolvers', () => {
  it('returns configured + channels for a tech manager', async () => {
    expect(await slackResolvers.Query.slackConfigured({}, {}, ctx(['TECH_MANAGER']))).toBe(true);
    await slackResolvers.Query.slackChannels({}, {}, ctx(['TECH_MANAGER']));
    expect(slackService.channels).toHaveBeenCalledTimes(1);
  });

  it('sends a message, forwarding the input', async () => {
    await slackResolvers.Mutation.sendSlackMessage({}, { input: { channel: 'C1', text: 'hi' } }, ctx(['SUPER_ADMIN']));
    expect(slackService.send).toHaveBeenCalledWith({ channel: 'C1', text: 'hi' });
  });

  it('denies callers without a tech role', () => {
    expect(() => slackResolvers.Query.slackConfigured({}, {}, ctx(['USER']))).toThrow(GraphQLError);
    expect(() => slackResolvers.Query.slackChannels({}, {}, ctx(null))).toThrow(GraphQLError);
    expect(() => slackResolvers.Mutation.sendSlackMessage({}, { input: {} }, ctx(['USER']))).toThrow(GraphQLError);
    expect(slackService.send).not.toHaveBeenCalled();
  });
});

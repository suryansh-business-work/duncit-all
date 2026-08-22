import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';

jest.mock('../../slack.service', () => ({
  slackService: {
    configured: jest.fn().mockResolvedValue(true),
    channels: jest.fn().mockResolvedValue([{ id: 'C1' }]),
    send: jest.fn().mockResolvedValue({ ok: true, channel: 'C1', ts: '1' }),
    sendFeedback: jest.fn().mockResolvedValue({ ok: true, channel: 'C_FB', ts: '2' }),
  },
}));

// Feedback is FILED as a support report first and announced to Slack second, so
// the resolver delegates here rather than calling slackService.sendFeedback.
// The module is imported dynamically inside the resolver to keep slack free of
// a load-time dependency on support, which the mock has to stand in for.
jest.mock('@modules/support/feedback/feedback.service', () => ({
  feedbackService: {
    submit: jest.fn().mockResolvedValue({ report_no: 'FB-1', slack_ts: '9' }),
  },
}));

import { slackResolvers } from '../../slack.resolver';
import { slackService } from '../../slack.service';
import { feedbackService } from '@modules/support/feedback/feedback.service';

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

  it('files feedback for any signed-in user, stamping the token identity', async () => {
    const input = { category: 'Bug', message: 'broken' };
    const result = await slackResolvers.Mutation.submitAppFeedback({}, { input }, ctx(['USER']));
    // The identity comes off the token, never off the input.
    expect(feedbackService.submit).toHaveBeenCalledWith({ id: 'u1', roles: ['USER'] }, input);
    // `ok` means FILED, and the reporter is handed the report number back.
    expect(result).toEqual({ ok: true, channel: 'FB-1', ts: '9' });
  });

  it('still reports a filed report when Slack never answered with a timestamp', async () => {
    (feedbackService.submit as jest.Mock).mockResolvedValueOnce({ report_no: 'FB-2' });
    const result = await slackResolvers.Mutation.submitAppFeedback(
      {},
      { input: { message: 'x' } },
      ctx(['USER']),
    );
    expect(result).toEqual({ ok: true, channel: 'FB-2', ts: '' });
  });

  it('rejects feedback from an unauthenticated caller', () => {
    expect(() => slackResolvers.Mutation.submitAppFeedback({}, { input: {} }, ctx(null))).toThrow(
      GraphQLError,
    );
    expect(feedbackService.submit).not.toHaveBeenCalled();
  });
});

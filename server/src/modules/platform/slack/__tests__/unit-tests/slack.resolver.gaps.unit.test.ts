import { slackResolvers } from '../../slack.resolver';
import { slackService } from '../../slack.service';
import { feedbackService } from '@modules/support/feedback/feedback.service';
import { makeContext } from '@test/harness';

jest.mock('../../slack.service', () => ({
  slackService: { history: jest.fn(), permissions: jest.fn(), join: jest.fn() },
}));
jest.mock('@modules/support/feedback/feedback.service', () => ({ feedbackService: { submit: jest.fn() } }));

const svc = slackService as unknown as Record<string, jest.Mock>;
const Q = slackResolvers.Query as Record<string, (...a: any[]) => any>;
const M = slackResolvers.Mutation as Record<string, (...a: any[]) => any>;
const comms = makeContext({ id: 'c', roles: ['COMMUNICATIONS_MANAGER'] });
const tech = makeContext({ id: 't', roles: ['TECH_MANAGER'] });
const member = makeContext({ id: 'u', email: 'asha@example.com', roles: ['USER'] });

beforeEach(() => jest.clearAllMocks());

describe('the Slack page', () => {
  it('reads a channel and the bot’s permissions for Communications only', () => {
    Q.slackChannelHistory({}, { channel: 'C1', limit: 20 }, comms);
    Q.slackPermissions({}, {}, comms);
    expect(svc.history).toHaveBeenCalledWith('C1', 20);
    expect(svc.permissions).toHaveBeenCalledTimes(1);
    expect(() => Q.slackChannelHistory({}, { channel: 'C1' }, tech)).toThrow();
    expect(() => Q.slackPermissions({}, {}, tech)).toThrow();
  });

  it('joins a channel for Communications only', () => {
    M.joinSlackChannel({}, { channel: 'C1' }, comms);
    expect(svc.join).toHaveBeenCalledWith('C1');
    expect(() => M.joinSlackChannel({}, { channel: 'C1' }, member)).toThrow();
  });
});

describe('submitAppFeedback', () => {
  it('files the report as the signed-in user and answers with its number and the Slack timestamp', async () => {
    (feedbackService.submit as jest.Mock).mockResolvedValue({ report_no: 'DUN-RPT-000007', slack_ts: '9.9' });
    await expect(M.submitAppFeedback({}, { input: { message: 'x' } }, member)).resolves.toEqual({ ok: true, channel: 'DUN-RPT-000007', ts: '9.9' });
    expect(feedbackService.submit).toHaveBeenCalledWith(expect.objectContaining({ id: 'u', email: 'asha@example.com' }), { message: 'x' });
  });

  it('answers an empty timestamp when the report was filed but not announced', async () => {
    (feedbackService.submit as jest.Mock).mockResolvedValue({ report_no: 'DUN-RPT-000008', slack_ts: null });
    await expect(M.submitAppFeedback({}, { input: {} }, member)).resolves.toMatchObject({ ts: '' });
  });

  it('needs a signed-in account', () => {
    expect(() => M.submitAppFeedback({}, { input: {} }, makeContext(null))).toThrow();
    expect(feedbackService.submit).not.toHaveBeenCalled();
  });
});

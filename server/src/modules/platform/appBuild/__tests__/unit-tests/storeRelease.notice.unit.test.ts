import { hoursOpen, humanState, notifyIssue } from '../../storeRelease.notice';
import { sendEmail } from '@services/email/email.service';
import { recipientLocale } from '@services/email/email-i18n';
import { postMessage } from '@modules/platform/slack/slack.gateway';
import { reportCopy } from '@modules/platform/analytics/mail/analyticsMail.copy';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';

jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn() }));
jest.mock('@services/email/email-i18n', () => ({ recipientLocale: jest.fn() }));
jest.mock('@modules/platform/slack/slack.gateway', () => ({ postMessage: jest.fn() }));
jest.mock('@modules/platform/analytics/mail/analyticsMail.copy', () => ({ reportCopy: jest.fn() }));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn() }));
jest.mock('@utils/app-time', () => ({ appDate: () => '2026-01-02', appTime: () => '10:00' }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

/** A copy catalogue that echoes its key and variables, so every lookup is visible in the output. */
const copy = {
  t: (key: string, vars?: Record<string, string>) => (vars ? `${key}|${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(',')}` : key),
};

const NOW = new Date('2026-01-02T12:00:00Z');
const issueOf = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  store: 'APP_STORE',
  kind: 'REJECTION',
  version: '1.2.0',
  build_number: '45',
  state: 'METADATA_REJECTED',
  reviewer_message: 'Guideline 2.1',
  detected_at: new Date('2026-01-02T10:30:00Z'),
  advice: { summary: 'Fix the <metadata>', causes: ['c1'], steps: ['s1', 's2'], next_time: [], error: '' },
  updateOne: jest.fn().mockResolvedValue(undefined),
  ...over,
});
const settings = (over: Record<string, unknown> = {}) => ({ mail_to: ['ops@duncit.com'], slack_channel: 'C1', ...over });

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(NOW);
  (getUrlConfigs as jest.Mock).mockResolvedValue({ techUrl: 'https://tech.duncit.com' });
  (recipientLocale as jest.Mock).mockResolvedValue('hi');
  (reportCopy as jest.Mock).mockResolvedValue(copy);
  (sendEmail as jest.Mock).mockResolvedValue(undefined);
  (postMessage as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());

describe('humanState', () => {
  it('turns the store’s CONSTANT into a readable phrase', () => {
    expect(humanState('METADATA_REJECTED')).toBe('Metadata rejected');
    expect(humanState('REJECTED')).toBe('Rejected');
  });

  it('keeps a state that is not in CONSTANT_CASE exactly as written', () => {
    expect(humanState('production/completed')).toBe('production/completed');
    expect(humanState('inProgress')).toBe('inProgress');
    expect(humanState('')).toBe('');
  });
});

describe('hoursOpen', () => {
  it('counts whole hours since detection and never goes negative', () => {
    expect(hoursOpen(issueOf() as never)).toBe(1);
    expect(hoursOpen(issueOf({ detected_at: new Date('2026-01-01T12:00:00Z') }) as never)).toBe(24);
    expect(hoursOpen(issueOf({ detected_at: new Date('2026-01-03T12:00:00Z') }) as never)).toBe(0);
  });
});

describe('notifyIssue: mail', () => {
  it('mails each recipient in their own language with the variables the template needs', async () => {
    const issue = issueOf();
    await notifyIssue(issue as never, settings({ mail_to: ['a@x.com', 'b@x.com'], slack_channel: '' }) as never, 'NEW');
    expect(recipientLocale).toHaveBeenCalledWith('a@x.com');
    expect(reportCopy).toHaveBeenCalledWith('hi');
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const mail = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(mail).toMatchObject({
      to: 'a@x.com', template: 'store-release-rejected', category: 'internal', locale: 'hi',
      subject: 'email.storeRelease.subjectRejected|store=email.storeRelease.storeAppStore,version=1.2.0',
    });
    expect(mail.vars).toMatchObject({
      store_label: 'email.storeRelease.storeAppStore', version: '1.2.0', build_number: '45', state_label: 'Metadata rejected',
      meaning: 'email.storeRelease.meaningMetadataRejected|state=Metadata rejected', reviewer_message: 'Guideline 2.1',
      detected_label: '2026-01-02 10:00', hours_open: '1', advice_summary: 'Fix the <metadata>',
      releases_url: 'https://tech.duncit.com/app-builds/releases', recipient_name: 'a@x.com',
    });
    expect(mail.vars.advice_html).toBe(
      '<p>Fix the &lt;metadata&gt;</p>' +
        '<p><strong>email.storeRelease.causesLabel</strong></p><ul><li>c1</li></ul>' +
        '<p><strong>email.storeRelease.stepsLabel</strong></p><ul><li>s1</li><li>s2</li></ul>'
    );
  });

  it.each([
    ['NEW', 'REJECTION', 'store-release-rejected', 'subjectRejected'],
    ['NEW', 'AWAITING_RELEASE', 'store-release-approved', 'subjectApproved'],
    ['REMINDER', 'REJECTION', 'store-release-reminder', 'subjectReminder'],
    ['REMINDER', 'AWAITING_RELEASE', 'store-release-reminder', 'subjectReminder'],
  ])('uses the %s/%s template and subject', async (mode, kind, template, subject) => {
    await notifyIssue(issueOf({ kind }) as never, settings({ slack_channel: '' }) as never, mode as never);
    const mail = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(mail.template).toBe(template);
    expect(mail.subject).toContain(`email.storeRelease.${subject}`);
  });

  it('describes a Play release, an unknown state and an issue with no version, build or reviewer message', async () => {
    const issue = issueOf({ store: 'GOOGLE_PLAY', state: 'something-odd', version: '', build_number: '', reviewer_message: '' });
    await notifyIssue(issue as never, settings({ slack_channel: '' }) as never, 'NEW');
    const { vars } = (sendEmail as jest.Mock).mock.calls[0][0];
    expect(vars).toMatchObject({
      store_label: 'email.storeRelease.storeGooglePlay', version: '—', build_number: '—', state_label: 'something-odd',
      reviewer_message: 'email.storeRelease.noReviewerMessage', meaning: 'email.storeRelease.meaningOther|state=something-odd',
    });
  });

  it.each([
    ['REJECTED', 'meaningRejected'],
    ['INVALID_BINARY', 'meaningInvalidBinary'],
    ['DEVELOPER_REJECTED', 'meaningDeveloperRejected'],
    ['PENDING_DEVELOPER_RELEASE', 'meaningPendingDeveloperRelease'],
    ['MANUAL', 'meaningManual'],
  ])('explains %s with %s', async (state, key) => {
    await notifyIssue(issueOf({ state }) as never, settings({ slack_channel: '' }) as never, 'NEW');
    expect((sendEmail as jest.Mock).mock.calls[0][0].vars.meaning).toContain(`email.storeRelease.${key}`);
  });

  it('shows the advice error, or the no-advice line, when there is no summary, and all four advice sections when present', async () => {
    await notifyIssue(issueOf({ advice: { summary: '', causes: [], steps: [], next_time: [], error: 'OpenAI down' } }) as never, settings({ slack_channel: '' }) as never, 'NEW');
    let vars = (sendEmail as jest.Mock).mock.calls[0][0].vars;
    expect(vars.advice_html).toBe('<p>OpenAI down</p>');
    expect(vars.advice_summary).toBe('email.storeRelease.noAdvice');

    (sendEmail as jest.Mock).mockClear();
    await notifyIssue(issueOf({ advice: { summary: '', causes: [], steps: [], next_time: [], error: '' } }) as never, settings({ slack_channel: '' }) as never, 'NEW');
    vars = (sendEmail as jest.Mock).mock.calls[0][0].vars;
    expect(vars.advice_html).toBe('<p>email.storeRelease.noAdvice</p>');

    (sendEmail as jest.Mock).mockClear();
    await notifyIssue(issueOf({ advice: { summary: 'S', causes: ['c'], steps: ['s'], next_time: ['n'], error: '' } }) as never, settings({ slack_channel: '' }) as never, 'NEW');
    expect((sendEmail as jest.Mock).mock.calls[0][0].vars.advice_html).toContain('email.storeRelease.nextTimeLabel');
  });
});

describe('notifyIssue: Slack', () => {
  it('posts one short escaped line to the channel, with the suggestion clipped to 600 characters', async () => {
    const issue = issueOf({ advice: { summary: `${'x'.repeat(700)} & <b>`, causes: [], steps: [], next_time: [], error: '' } });
    await notifyIssue(issue as never, settings({ mail_to: [] }) as never, 'REMINDER');
    expect(reportCopy).toHaveBeenCalledWith(null);
    const post = (postMessage as jest.Mock).mock.calls[0][0];
    expect(post).toMatchObject({ channel: 'C1', unfurl_links: false });
    expect(post.text).toContain('email.storeRelease.slackReminder|store=email.storeRelease.storeAppStore,version=1.2.0,build=45,state=Metadata rejected,hours=1');
    expect(post.text).toContain('url=https://tech.duncit.com/app-builds/releases');
    const suggestion = /suggestion=(.*),url=/.exec(post.text)?.[1] ?? '';
    expect(suggestion.length).toBeLessThanOrEqual(700);
    expect(suggestion).toContain('x'.repeat(100));
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('uses the new-issue Slack copy for a rejection and for an approval', async () => {
    await notifyIssue(issueOf() as never, settings({ mail_to: [] }) as never, 'NEW');
    expect((postMessage as jest.Mock).mock.calls[0][0].text).toContain('email.storeRelease.slackRejected');
    await notifyIssue(issueOf({ kind: 'AWAITING_RELEASE' }) as never, settings({ mail_to: [] }) as never, 'NEW');
    expect((postMessage as jest.Mock).mock.calls[1][0].text).toContain('email.storeRelease.slackApproved');
  });

  it('does not post when no channel is chosen', async () => {
    await notifyIssue(issueOf() as never, settings({ slack_channel: '' }) as never, 'NEW');
    expect(postMessage).not.toHaveBeenCalled();
  });
});

describe('notifyIssue: recording the outcome', () => {
  it('stamps a new notice as sent with no error', async () => {
    const issue = issueOf();
    await notifyIssue(issue as never, settings() as never, 'NEW');
    expect(issue.updateOne).toHaveBeenCalledWith({ $set: { notified_at: NOW, notify_error: '' } });
  });

  it('stamps a reminder and counts it', async () => {
    const issue = issueOf();
    await notifyIssue(issue as never, settings() as never, 'REMINDER');
    expect(issue.updateOne).toHaveBeenCalledWith({ $set: { last_reminded_at: NOW, notify_error: '' }, $inc: { reminder_count: 1 } });
  });

  it('logs every failed send, keeps the others going and records the reasons on the issue', async () => {
    (sendEmail as jest.Mock).mockRejectedValueOnce(new Error('smtp refused')).mockResolvedValueOnce(undefined);
    (postMessage as jest.Mock).mockRejectedValue('not_in_channel');
    const issue = issueOf();
    await notifyIssue(issue as never, settings({ mail_to: ['a@x.com', 'b@x.com'] }) as never, 'NEW');
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(logs.server.error).toHaveBeenCalledTimes(2);
    expect(logs.server.error).toHaveBeenCalledWith('appBuild', 'releaseNotice', { error: expect.any(Error), issue: 'i1', mode: 'NEW' });
    expect(issue.updateOne).toHaveBeenCalledWith({ $set: { notified_at: NOW, notify_error: 'smtp refused · not_in_channel' } });
  });
});

/**
 * The email log's contract: EVERY attempt leaves a row, and sendEmail never
 * throws — those two are the same promise, because a throw is an attempt with
 * no row.
 *
 * These cover the cases the log was missing:
 *  - the template lookup itself failing (Mongo down, or two sends racing a
 *    brand-new slug and colliding on its unique index),
 *  - a mail server accepting the message but refusing the recipient.
 *
 * Same mocking approach as email.service.unit.test.ts — no DB, no network —
 * plus emailLogService, so the rows can be read back.
 */
const renderMock = jest.fn();
const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'm1' });
const bySlugMock = jest.fn().mockResolvedValue({ is_active: true });
const recordMock = jest.fn().mockResolvedValue(undefined);

jest.mock('@modules/content/emailTemplate/emailTemplate.service', () => ({
  emailTemplateService: {
    render: (slug: string, vars: Record<string, string>) => renderMock(slug, vars),
    bySlug: (slug: string) => bySlugMock(slug),
  },
}));

jest.mock('@modules/content/emailLog/emailLog.service', () => ({
  emailLogService: { record: (entry: unknown) => recordMock(entry) },
}));

jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getBranding: jest.fn().mockResolvedValue({ logo_url: '' }) },
}));

jest.mock('@modules/platform/localization/localization.service', () => ({
  localizationService: {
    defaultLocaleCode: jest.fn().mockResolvedValue('en-IN'),
    publicTranslations: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@modules/access/user/user.model', () => ({
  UserModel: { findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }) },
}));

jest.mock('../../../../config/url-configs', () => ({
  getMailConfigs: jest.fn().mockResolvedValue({ from: 'noreply@test', host: '', port: 587 }),
  getUrlConfigs: jest
    .fn()
    .mockResolvedValue({ supportEmail: 'support@test', websiteUrl: 'https://test' }),
}));

jest.mock('nodemailer', () => ({ createTransport: () => ({ sendMail: sendMailMock }) }));

jest.mock('@modules/platform/envEntry/envEntry.service', () => ({
  envEntryService: { resolveRuntime: jest.fn().mockResolvedValue(null) },
}));

type EmailModule = typeof import('../../email.service');

function loadService(): EmailModule {
  let mod!: EmailModule;
  jest.isolateModules(() => {
    mod = require('../../email.service');
  });
  return mod;
}

/** The single row this attempt recorded. */
const row = () => recordMock.mock.calls[0][0];

describe('email log contract', () => {
  beforeEach(() => {
    renderMock.mockReset().mockResolvedValue({ html: '<p>ok</p>' });
    sendMailMock.mockReset().mockResolvedValue({ messageId: 'm1', accepted: ['a@b.com'], rejected: [] });
    bySlugMock.mockReset().mockResolvedValue({ is_active: true });
    recordMock.mockClear();
  });

  it('records a FAILED row instead of throwing when the template lookup fails', async () => {
    // Mongo unreachable, or `create` colliding on the slug's unique index the
    // first time two sends use a brand-new template at once.
    bySlugMock.mockRejectedValue(new Error('E11000 duplicate key error'));

    const result = await loadService().sendEmail({
      to: 'a@b.com',
      subject: 'Reset your password',
      template: 'password-reset',
    });

    expect(result.skipped).toBe(true);
    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(row()).toMatchObject({
      to: 'a@b.com',
      template: 'password-reset',
      status: 'FAILED',
      reason: expect.stringContaining('E11000'),
    });
    // And nothing was handed to a mail server.
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it('records a SENT row with the refusal when only some recipients are refused', async () => {
    sendMailMock.mockResolvedValue({
      messageId: 'm1',
      accepted: ['ok@b.com'],
      rejected: ['bounce@b.com'],
    });

    const result = await loadService().sendHtmlEmail({
      to: ['ok@b.com', 'bounce@b.com'],
      subject: 'Campaign',
      html: '<p>hi</p>',
    });

    expect(result.skipped).toBe(false);
    expect(row()).toMatchObject({
      status: 'SENT',
      reason: expect.stringContaining('bounce@b.com'),
    });
  });

  it('records FAILED when the mail server refused everyone', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'm1', accepted: [], rejected: ['bounce@b.com'] });

    const result = await loadService().sendEmail({
      to: 'bounce@b.com',
      subject: 'Welcome',
      template: 'welcome',
    });

    // A message nobody accepted is not a send, whatever the transport returned.
    expect(result.skipped).toBe(true);
    expect(row()).toMatchObject({ status: 'FAILED', reason: expect.stringContaining('bounce@b.com') });
  });

  it('records the missing address a caller used to guard away', async () => {
    // Call sites no longer check for an address themselves — this row is the
    // whole reason they stopped.
    const result = await loadService().sendEmail({
      to: '',
      subject: 'Your host account is now active',
      template: 'host-activated',
    });

    expect(result.skipped).toBe(true);
    expect(row()).toMatchObject({
      template: 'host-activated',
      status: 'FAILED',
      reason: 'No recipient address',
    });
  });

  it('records a disabled template as SKIPPED, not FAILED', async () => {
    bySlugMock.mockResolvedValue({ is_active: false });

    await loadService().sendEmail({ to: 'a@b.com', subject: 'Hi', template: 'welcome' });

    expect(row()).toMatchObject({ status: 'SKIPPED', reason: expect.stringContaining('not active') });
  });
});

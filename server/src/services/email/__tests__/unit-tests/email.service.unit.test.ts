/**
 * Unit tests for the dynamic transactional-email logo:
 *  - sendEmail injects `brand_logo_url` (from branding settings) into the vars.
 *  - the post-render swap replaces any leftover legacy hardcoded logo URL.
 *
 * Heavy collaborators (template render, SMTP transport, branding, mail config)
 * are mocked so this stays a pure unit test with no DB or network. Each test
 * re-imports the service via jest.isolateModules so the module-level brand-logo
 * TTL cache starts empty.
 */
const renderMock = jest.fn();
const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'm1' });
const getBrandingMock = jest.fn();
// An active template by default; the disabled path is exercised separately.
const bySlugMock = jest.fn().mockResolvedValue({ is_active: true });

jest.mock('@modules/content/emailTemplate/emailTemplate.service', () => ({
  emailTemplateService: {
    render: (slug: string, vars: Record<string, string>) => renderMock(slug, vars),
    // Every send now reads the template first, to refuse a disabled one.
    bySlug: (slug: string) => bySlugMock(slug),
  },
}));

jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getBranding: () => getBrandingMock() },
}));

// sendEmail also resolves the recipient's language and its localized `t:` vars;
// both are mocked for the same reason as branding — no DB in a unit test.
jest.mock('@modules/platform/localization/localization.service', () => ({
  localizationService: {
    defaultLocaleCode: jest.fn().mockResolvedValue('en-IN'),
    publicTranslations: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@modules/access/user/user.model', () => ({
  UserModel: {
    findOne: () => ({ select: () => ({ lean: () => Promise.resolve(null) }) }),
  },
}));

jest.mock('../../../../config/url-configs', () => ({
  getMailConfigs: jest.fn().mockResolvedValue({ from: 'noreply@test', host: '', port: 587 }),
  // Every send now also reads the values a header/footer fragment needs.
  getUrlConfigs: jest
    .fn()
    .mockResolvedValue({ supportEmail: 'support@test', websiteUrl: 'https://test' }),
}));

jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: sendMailMock }),
}));

// The provider layer asks the Tech portal which mailbox to use. No entry means
// the json transport, which is exactly the no-network path this test wants.
jest.mock('@modules/platform/envEntry/envEntry.service', () => ({
  envEntryService: { resolveRuntime: jest.fn().mockResolvedValue(null) },
}));

const LEGACY = 'https://duncit.com/duncit-logo.svg';

type EmailModule = typeof import('../../email.service');

/** Fresh module instance so the brand-logo TTL cache starts empty per test. */
function loadService(): EmailModule {
  let mod!: EmailModule;
  jest.isolateModules(() => {
    mod = require('../../email.service');
  });
  return mod;
}

describe('email.service dynamic logo', () => {
  beforeEach(() => {
    renderMock.mockReset();
    sendMailMock.mockClear();
    getBrandingMock.mockReset();
    bySlugMock.mockResolvedValue({ is_active: true });
  });

  it('injects brand_logo_url from branding into the rendered vars', async () => {
    getBrandingMock.mockResolvedValue({ logo_url: 'https://cdn.test/brand.png' });
    renderMock.mockResolvedValue({ html: '<p>ok</p>' });

    await loadService().sendEmail({ to: 'a@b.com', subject: 'Hi', template: 'welcome', vars: { name: 'Bob' } });

    expect(renderMock).toHaveBeenCalledWith(
      'welcome',
      expect.objectContaining({ name: 'Bob', brand_logo_url: 'https://cdn.test/brand.png' })
    );
  });

  it('does not override a caller-provided brand_logo_url', async () => {
    getBrandingMock.mockResolvedValue({ logo_url: 'https://cdn.test/brand.png' });
    renderMock.mockResolvedValue({ html: '<p>ok</p>' });

    await loadService().sendEmail({
      to: 'a@b.com',
      subject: 'Hi',
      template: 'welcome',
      vars: { brand_logo_url: 'https://custom/logo.png' },
    });

    expect(renderMock).toHaveBeenCalledWith(
      'welcome',
      expect.objectContaining({ brand_logo_url: 'https://custom/logo.png' })
    );
  });

  it('post-render swap replaces a leftover legacy logo URL in the html', async () => {
    getBrandingMock.mockResolvedValue({ logo_url: 'https://cdn.test/brand.png' });
    renderMock.mockResolvedValue({ html: `<img src="${LEGACY}"/>` });

    await loadService().sendEmail({ to: 'a@b.com', subject: 'Hi', template: 'welcome' });

    const sent = sendMailMock.mock.calls[0][0];
    expect(sent.html).toBe('<img src="https://cdn.test/brand.png"/>');
    expect(sent.html).not.toContain(LEGACY);
  });

  it('falls back to the legacy logo when branding has no logo_url', async () => {
    getBrandingMock.mockResolvedValue({ logo_url: '' });
    renderMock.mockResolvedValue({ html: `<img src="${LEGACY}"/>` });

    await loadService().sendEmail({ to: 'a@b.com', subject: 'Hi', template: 'welcome' });

    expect(renderMock).toHaveBeenCalledWith('welcome', expect.objectContaining({ brand_logo_url: LEGACY }));
    // No swap needed: html keeps the legacy URL.
    expect(sendMailMock.mock.calls[0][0].html).toContain(LEGACY);
  });

  it('falls back to the legacy logo when getBranding throws', async () => {
    getBrandingMock.mockRejectedValue(new Error('db down'));
    renderMock.mockResolvedValue({ html: '<p>ok</p>' });

    await loadService().sendEmail({ to: 'a@b.com', subject: 'Hi', template: 'welcome' });

    expect(renderMock).toHaveBeenCalledWith('welcome', expect.objectContaining({ brand_logo_url: LEGACY }));
  });

  it('caches the branding lookup within the TTL window', async () => {
    getBrandingMock.mockResolvedValue({ logo_url: 'https://cdn.test/brand.png' });
    renderMock.mockResolvedValue({ html: '<p>ok</p>' });

    const svc = loadService();
    await svc.sendEmail({ to: 'a@b.com', subject: 'Hi', template: 'welcome' });
    await svc.sendEmail({ to: 'a@b.com', subject: 'Hi', template: 'welcome' });

    expect(getBrandingMock).toHaveBeenCalledTimes(1);
  });

  it('sendHtmlEmail also swaps the legacy logo URL', async () => {
    getBrandingMock.mockResolvedValue({ logo_url: 'https://cdn.test/brand.png' });

    await loadService().sendHtmlEmail({ to: 'a@b.com', subject: 'Hi', html: `<img src="${LEGACY}"/>` });

    expect(sendMailMock.mock.calls[0][0].html).toBe('<img src="https://cdn.test/brand.png"/>');
  });

  it('sendBackoutSpotFilledEmail renders the pod-backout-spot-filled template', async () => {
    getBrandingMock.mockResolvedValue({ logo_url: 'https://cdn.test/brand.png' });
    renderMock.mockResolvedValue({ html: '<p>ok</p>' });

    await loadService().sendBackoutSpotFilledEmail({
      to: 'a@b.com',
      name: 'Asha',
      pod_title: 'Yoga',
      refund_line: 'Your refund of ₹450 will be processed by our team shortly.',
    });

    expect(renderMock).toHaveBeenCalledWith(
      'pod-backout-spot-filled',
      expect.objectContaining({ name: 'Asha', pod_title: 'Yoga', refund_line: expect.stringContaining('₹450') })
    );
    expect(sendMailMock.mock.calls[0][0].subject).toBe('Your spot was filled — Yoga');
  });
});

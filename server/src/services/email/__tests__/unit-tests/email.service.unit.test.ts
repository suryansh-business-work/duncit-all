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

jest.mock('@modules/content/emailTemplate/emailTemplate.service', () => ({
  emailTemplateService: { render: (slug: string, vars: Record<string, string>) => renderMock(slug, vars) },
}));

jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getBranding: () => getBrandingMock() },
}));

jest.mock('../../../../config/url-configs', () => ({
  getMailConfigs: jest.fn().mockResolvedValue({ from: 'noreply@test', host: '', port: 587 }),
}));

jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: sendMailMock }),
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
});

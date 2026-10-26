/**
 * The release email: who it goes to, when the build is attached or only linked,
 * what is said when the template renders badly, and what the result reports.
 * The template renderer, the mail transport, the branding read and the
 * download are faked; the recipient rules and the wiring of values are real.
 */
import { logs } from '@observability/log';
import { settingsService } from '@modules/platform/settings/settings.service';
import { emailTemplateService } from '@modules/content/emailTemplate/emailTemplate.service';
import { emailPreviewVars, sendHtmlEmail } from '@services/email/email.service';
import { buildChangelog } from '../../appRelease.changelog';
import { RELEASE_NOTIFY_RECIPIENTS } from '../../appRelease.recipients';
import { sendAppReleaseEmail, type SendAppReleaseEmailInput } from '../../appRelease.service';
import { appReleaseResolvers } from '../../appRelease.resolver';
import { makeContext } from '@test/harness';

jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));
jest.mock('@modules/platform/settings/settings.service', () => ({ settingsService: { getBranding: jest.fn() } }));
jest.mock('@modules/content/emailTemplate/emailTemplate.service', () => ({ emailTemplateService: { render: jest.fn() } }));
jest.mock('@services/email/email.service', () => ({ emailPreviewVars: jest.fn(), sendHtmlEmail: jest.fn() }));
jest.mock('../../appRelease.changelog', () => ({ ...jest.requireActual('../../appRelease.changelog'), buildChangelog: jest.fn() }));

const fetchMock = jest.fn();
const realFetch = global.fetch;
const send = sendHtmlEmail as jest.Mock;
const render = emailTemplateService.render as jest.Mock;

const input = (over: Partial<SendAppReleaseEmailInput> = {}): SendAppReleaseEmailInput => ({
  version: '1.4.19', build_name: 'duncit-build V1.4.19', apk_url: 'https://cdn.example.com/duncit.apk', apk_size_mb: 12,
  commits: [{ hash: 'a1', subject: 'feat: x' }], ...over,
});

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  (settingsService.getBranding as jest.Mock).mockResolvedValue({ app_name: 'Duncit Pods' });
  (emailPreviewVars as jest.Mock).mockResolvedValue({ logo_url: 'https://logo' });
  (buildChangelog as jest.Mock).mockResolvedValue({ headline: 'h', intro: 'i', sections: [] });
  render.mockResolvedValue({ subject: 'Build ready', html: '<p>hi</p>', errors: [] });
  send.mockResolvedValue({ messageId: '<mid-1@mail>' });
  fetchMock.mockResolvedValue({ ok: true, arrayBuffer: async () => new TextEncoder().encode('APKBYTES').buffer });
});
afterAll(() => {
  global.fetch = realFetch;
});

describe('recipients', () => {
  it('uses the team list when none is given, an empty list included', async () => {
    await sendAppReleaseEmail(input());
    expect(send.mock.calls[0][0].to).toEqual(RELEASE_NOTIFY_RECIPIENTS);
    await sendAppReleaseEmail(input({ recipients: [] }));
    expect(send.mock.calls[1][0].to).toEqual(RELEASE_NOTIFY_RECIPIENTS);
    await sendAppReleaseEmail(input({ recipients: null }));
    expect(send.mock.calls[2][0].to).toEqual(RELEASE_NOTIFY_RECIPIENTS);
  });

  it('trims, drops what is not an address and removes duplicates', async () => {
    const out = await sendAppReleaseEmail(input({ recipients: [' a@x.com ', 'not-an-email', 'a@x.com', 'b@y.org'] }));
    expect(out.recipients).toEqual(['a@x.com', 'b@y.org']);
    expect(out.message).toBe('Release email sent to 2 recipient(s)');
  });

  it('refuses when no address is valid, and sends nothing', async () => {
    await expect(sendAppReleaseEmail(input({ recipients: ['nope', ' '] }))).rejects.toMatchObject({
      message: 'No valid recipients for the release email', extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a blank download link', async () => {
    await expect(sendAppReleaseEmail(input({ apk_url: '   ' }))).rejects.toMatchObject({ message: 'apk_url is required', extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('the app name and subject', () => {
  it('uses the branded app name, falling back to Duncit when branding is unavailable or unnamed', async () => {
    await sendAppReleaseEmail(input());
    expect((buildChangelog as jest.Mock).mock.calls[0][1]).toMatchObject({ appName: 'Duncit Pods', version: '1.4.19' });
    (settingsService.getBranding as jest.Mock).mockRejectedValueOnce(new Error('db down'));
    await sendAppReleaseEmail(input());
    expect((buildChangelog as jest.Mock).mock.calls[1][1].appName).toBe('Duncit');
    (settingsService.getBranding as jest.Mock).mockResolvedValueOnce({ app_name: '' });
    await sendAppReleaseEmail(input());
    expect((buildChangelog as jest.Mock).mock.calls[2][1].appName).toBe('Duncit');
  });

  it('uses the template’s subject, or names the app and version when it has none', async () => {
    await sendAppReleaseEmail(input());
    expect(send.mock.calls[0][0].subject).toBe('Build ready');
    render.mockResolvedValue({ subject: '', html: '<p>hi</p>', errors: [] });
    await sendAppReleaseEmail(input());
    expect(send.mock.calls[1][0].subject).toBe('Duncit Pods v1.4.19');
  });

  it('fills the template with the preview variables, the app name and the build’s own values', async () => {
    await sendAppReleaseEmail(input({ files_changed: 3, insertions: 10, deletions: 2, range_label: 'since v1' }));
    const [name, vars] = render.mock.calls[0];
    expect(name).toBe('app-release-build');
    expect(vars).toMatchObject({ logo_url: 'https://logo', app_name: 'Duncit Pods', version: '1.4.19', files_changed: '3', insertions: '+10', deletions: '-2' });
  });
});

describe('rendering', () => {
  it('warns about template problems but still sends when there is a body', async () => {
    render.mockResolvedValue({ subject: 's', html: '<p>hi</p>', errors: ['unknown tag'] });
    await expect(sendAppReleaseEmail(input())).resolves.toMatchObject({ ok: true });
    expect(logs.server.warn).toHaveBeenCalledWith('appRelease', 'sendAppReleaseEmail', expect.objectContaining({ errors: ['unknown tag'] }));
  });

  it('does not warn when the template rendered cleanly or reported no error list', async () => {
    render.mockResolvedValue({ subject: 's', html: '<p>hi</p>' });
    await sendAppReleaseEmail(input());
    expect(logs.server.warn).not.toHaveBeenCalled();
  });

  it('refuses an empty body, naming the template’s errors when it gave any', async () => {
    render.mockResolvedValue({ subject: 's', html: '', errors: ['bad mjml', 'worse mjml'] });
    await expect(sendAppReleaseEmail(input())).rejects.toThrow('bad mjml; worse mjml');
    render.mockResolvedValue({ subject: 's', html: '' });
    await expect(sendAppReleaseEmail(input())).rejects.toThrow('The release email rendered an empty body');
    render.mockResolvedValue({ subject: 's', html: '', errors: [] });
    await expect(sendAppReleaseEmail(input())).rejects.toThrow('The release email rendered an empty body');
    expect(send).not.toHaveBeenCalled();
  });
});

describe('attaching the build', () => {
  it('attaches a small build as an .apk named after the build, adding the extension when it is missing', async () => {
    await sendAppReleaseEmail(input({ build_name: 'duncit-build' }));
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/duncit.apk');
    expect(send.mock.calls[0][0].attachments).toEqual([
      { filename: 'duncit-build.apk', content: expect.any(Buffer), contentType: 'application/vnd.android.package-archive' },
    ]);
    await sendAppReleaseEmail(input({ build_name: 'already.apk' }));
    expect(send.mock.calls[1][0].attachments[0].filename).toBe('already.apk');
  });

  it.each([[0], [-1], [20.5], [63.4]])('sends only the link for a build of %s MB', async (size) => {
    await sendAppReleaseEmail(input({ apk_size_mb: size }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(send.mock.calls[0][0].attachments).toEqual([]);
  });

  it('attaches a build of exactly the limit', async () => {
    await sendAppReleaseEmail(input({ apk_size_mb: 20 }));
    expect(send.mock.calls[0][0].attachments).toHaveLength(1);
  });

  it('sends the link alone when the download is refused or fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) });
    await sendAppReleaseEmail(input());
    expect(send.mock.calls[0][0].attachments).toEqual([]);
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await sendAppReleaseEmail(input());
    expect(send.mock.calls[1][0].attachments).toEqual([]);
  });
});

describe('the result', () => {
  it('reports the message id and the rendered html', async () => {
    await expect(sendAppReleaseEmail(input())).resolves.toMatchObject({ ok: true, message_id: '<mid-1@mail>', changelog_html: '<p>hi</p>' });
    expect(send.mock.calls[0][0]).toMatchObject({ category: 'internal', template: 'app-release-build' });
  });

  it('reports no message id when the transport gave none', async () => {
    send.mockResolvedValue({});
    await expect(sendAppReleaseEmail(input())).resolves.toMatchObject({ message_id: null });
  });
});

describe('the resolver', () => {
  it('sends for Tech and refuses everyone else', async () => {
    const tech = makeContext({ id: 't', roles: ['TECH_MANAGER'] });
    await expect(appReleaseResolvers.Mutation.sendAppReleaseEmail({}, { input: input() }, tech)).resolves.toMatchObject({ ok: true });
    await expect(appReleaseResolvers.Mutation.sendAppReleaseEmail({}, { input: input() }, makeContext({ id: 'u', roles: ['USER'] }))).rejects.toThrow(/access denied/i);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

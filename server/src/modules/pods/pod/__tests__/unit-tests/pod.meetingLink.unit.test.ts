/**
 * generateMeetingLink: a provider generates a link only when its OAuth
 * credentials are configured on the server; otherwise the admin is told to
 * paste one. The stand-in links are drawn from a CSPRNG, so only their shape is
 * asserted.
 */
import { podWriteMethods } from '../../pod.write';

const PROVIDER_ENV = {
  ZOOM: ['ZOOM_OAUTH_ACCOUNT_ID', 'ZOOM_OAUTH_CLIENT_ID', 'ZOOM_OAUTH_CLIENT_SECRET'],
  GOOGLE_MEET: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REFRESH_TOKEN'],
  TEAMS: ['MS_GRAPH_CLIENT_ID', 'MS_GRAPH_CLIENT_SECRET', 'MS_GRAPH_TENANT_ID'],
} as const;
const ALL_KEYS = Object.values(PROVIDER_ENV).flat();

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ALL_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ALL_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ALL_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const configure = (keys: readonly string[]) => {
  for (const key of keys) process.env[key] = `test-${key.toLowerCase()}`;
};

const link = (platform: string, title = 'Book club') =>
  podWriteMethods.generateMeetingLink({ platform, title, start: '2026-10-20T10:00:00.000Z' });

describe('generateMeetingLink', () => {
  it.each(['ZOOM', 'GOOGLE_MEET', 'TEAMS'] as const)(
    'asks for a pasted link when %s has no credentials configured',
    async (platform) => {
      await expect(link(platform)).resolves.toEqual({
        ok: false,
        url: null,
        message: `${platform} is not configured on the server. Paste a link manually for now.`,
        requires_oauth: true,
      });
    }
  );

  it('treats a provider with only some of its credentials as not configured', async () => {
    configure(PROVIDER_ENV.GOOGLE_MEET.slice(0, 2));
    await expect(link('GOOGLE_MEET')).resolves.toMatchObject({ ok: false, requires_oauth: true });
  });

  it('generates a ten-digit Zoom meeting link once Zoom is configured', async () => {
    configure(PROVIDER_ENV.ZOOM);
    const result = await link('ZOOM');
    expect(result).toMatchObject({ ok: true, message: 'Generated (Zoom)', requires_oauth: false });
    expect(result.url).toMatch(/^https:\/\/zoom\.us\/j\/\d{10}$/);
  });

  it('generates a Google Meet code of three four-letter groups, whatever the platform casing', async () => {
    configure(PROVIDER_ENV.GOOGLE_MEET);
    const result = await link('google_meet');
    expect(result).toMatchObject({ ok: true, message: 'Generated (Google Meet)', requires_oauth: false });
    expect(result.url).toMatch(/^https:\/\/meet\.google\.com\/[a-z]{4}-[a-z]{4}-[a-z]{4}$/);
  });

  it('generates a Teams link carrying the encoded pod title', async () => {
    configure(PROVIDER_ENV.TEAMS);
    await expect(link('TEAMS', 'Chess & chai')).resolves.toEqual({
      ok: true,
      url: 'https://teams.microsoft.com/l/meetup-join/Chess%20%26%20chai',
      message: 'Generated (Teams)',
      requires_oauth: false,
    });
  });

  it('refuses a platform it does not know, without asking for OAuth', async () => {
    configure(ALL_KEYS);
    await expect(link('webex')).resolves.toEqual({
      ok: false,
      url: null,
      message: "Unsupported platform 'WEBEX'. Paste a link manually.",
      requires_oauth: false,
    });
    await expect(link('')).resolves.toMatchObject({ message: "Unsupported platform ''. Paste a link manually." });
  });
});

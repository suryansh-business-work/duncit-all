/**
 * The AiSensy Project API reader/writer, with the network faked at `fetch`.
 *
 * What matters here is what the console and the send path are told: whether
 * the credentials are usable, the exact request AiSensy receives (path, verb,
 * auth header, body), how a refusal is worded, and how AiSensy's two payload
 * dialects (its own Project API rows and Meta-shaped component rows) are read
 * into one template shape — including the paging walk that must neither
 * truncate a project past 100 rows nor spin on an endpoint that ignores `skip`.
 */
const mockEnv: Record<string, string> = {};
jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async (key: string) => mockEnv[key] ?? ''),
}));

import {
  bracketedSample,
  createCampaign,
  createTemplate,
  deleteTemplate,
  isProjectApiConfigured,
  listCampaigns,
  listTemplates,
  needsMedia,
  projectConfig,
} from '../../aisensy.project';

const PROJECT_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6';
const BASE = `https://apis.aisensy.com/project-apis/v1/project/${PROJECT_ID}`;

const fetchMock = jest.fn();
const realFetch = global.fetch;

/** A fetch Response with only the two members the reader uses. */
const reply = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

const configure = () => {
  mockEnv.AISENSY_PROJECT_ID = PROJECT_ID;
  mockEnv.AISENSY_PROJECT_API_KEY = 'project-key';
};

const lastCall = () => fetchMock.mock.calls.at(-1) as [string, RequestInit];

beforeEach(() => {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('projectConfig', () => {
  it('is null until both the project id and the key are set', async () => {
    await expect(projectConfig()).resolves.toBeNull();
    mockEnv.AISENSY_PROJECT_ID = PROJECT_ID;
    await expect(projectConfig()).resolves.toBeNull();
    mockEnv.AISENSY_PROJECT_API_KEY = '   ';
    await expect(projectConfig()).resolves.toBeNull();
    await expect(isProjectApiConfigured()).resolves.toBe(false);
  });

  it('trims the values and falls back to AiSensy’s own host', async () => {
    mockEnv.AISENSY_PROJECT_ID = ` ${PROJECT_ID} `;
    mockEnv.AISENSY_PROJECT_API_KEY = ' project-key ';

    await expect(projectConfig()).resolves.toEqual({
      projectId: PROJECT_ID,
      key: 'project-key',
      baseUrl: 'https://apis.aisensy.com',
    });
    await expect(isProjectApiConfigured()).resolves.toBe(true);
  });

  it('takes a configured host without its trailing slash', async () => {
    configure();
    mockEnv.AISENSY_PROJECT_API_BASE_URL = 'https://aisensy.example.test/';

    expect((await projectConfig())?.baseUrl).toBe('https://aisensy.example.test');
  });
});

describe('every request', () => {
  it('refuses to call out without credentials', async () => {
    await expect(createCampaign('tpl', 'camp')).rejects.toMatchObject({
      message: 'Add the AiSensy Project ID and Project API Key in the Tech portal',
      extensions: { code: 'BAD_REQUEST' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a project NAME where the 24-hex id belongs', async () => {
    mockEnv.AISENSY_PROJECT_ID = 'Duncit Production';
    mockEnv.AISENSY_PROJECT_API_KEY = 'project-key';

    await expect(listCampaigns()).rejects.toThrow(/must be the 24-character id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('names the verb, the URL and AiSensy’s answer when it refuses', async () => {
    configure();
    fetchMock.mockResolvedValue(reply('Not Found', 404));

    await expect(createCampaign('tpl', 'camp')).rejects.toMatchObject({
      message: `AiSensy Project API: POST ${BASE}/campaign/api → HTTP 404 Not Found`,
      extensions: { code: 'BAD_GATEWAY' },
    });
  });

  it('reads a refused GET as a GET', async () => {
    configure();
    fetchMock.mockResolvedValue(reply('nope', 500));

    await expect(listTemplates()).rejects.toThrow(
      `AiSensy Project API: GET ${BASE}/wa_template/?limit=100&skip=0 → HTTP 500 nope`
    );
  });

  it('refuses a body that is not JSON', async () => {
    configure();
    fetchMock.mockResolvedValue(reply('<html>gateway</html>'));

    await expect(createCampaign('tpl', 'camp')).rejects.toThrow(
      'AiSensy Project API returned a non-JSON body for campaign/api'
    );
  });
});

describe('createCampaign', () => {
  it('POSTs the binding with the project password header and reads AiSensy’s row', async () => {
    configure();
    fetchMock.mockResolvedValue(reply({ campaignName: 'welcome', status: 'ACTIVE', templateName: 'welcome_v2' }));

    const created = await createCampaign('welcome_v2', 'welcome');

    expect(created).toEqual({ name: 'welcome', status: 'ACTIVE', template_name: 'welcome_v2' });
    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/campaign/api`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Accept: 'application/json',
      'X-AiSensy-Project-API-Pwd': 'project-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(init.body))).toEqual({ template_name: 'welcome_v2', campaign_name: 'welcome' });
  });

  it('falls back to what was asked for when AiSensy answers with an empty row', async () => {
    configure();
    fetchMock.mockResolvedValue(reply({}));

    await expect(createCampaign('tpl', 'camp')).resolves.toEqual({
      name: 'camp',
      status: 'LIVE',
      template_name: 'tpl',
    });
  });
});

describe('deleteTemplate', () => {
  it('sends a bodyless DELETE to the encoded template id', async () => {
    configure();
    fetchMock.mockResolvedValue(reply({ success: true }));

    await expect(deleteTemplate('id/with space')).resolves.toBe(true);
    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/wa_template/id%2Fwith%20space`);
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty('Content-Type');
  });
});

describe('bracketedSample', () => {
  const body = 'Hi {{1}}, your pod {{2}} starts at {{3}}.';

  it('wraps each example the finished sentence carries', () => {
    expect(bracketedSample(body, 'Hi Meera, your pod Jazz Night starts at 7 PM.')).toBe(
      'Hi [Meera], your pod [Jazz Night] starts at [7 PM].'
    );
  });

  it('keeps an example that is already bracketed', () => {
    expect(bracketedSample('Hi {{1}}!', 'Hi [Meera]!')).toBe('Hi [Meera]!');
  });

  it('refuses a sample that does not follow the body', () => {
    expect(bracketedSample(body, 'Hello Meera, your pod Jazz starts at 7.')).toBeNull();
    expect(bracketedSample(body, 'Hi Meera, the pod Jazz starts at 7.')).toBeNull();
    expect(bracketedSample(body, 'Hi Meera, your pod Jazz starts at 7!')).toBeNull();
  });

  it('refuses an example left blank', () => {
    expect(bracketedSample('Hi {{1}}, welcome', 'Hi  , welcome')).toBeNull();
  });

  it('answers a body without placeholders with the body itself', () => {
    expect(bracketedSample('Thanks for joining', 'Thanks for joining')).toBe('Thanks for joining');
  });
});

describe('createTemplate', () => {
  const input = {
    name: 'pod_reminder_v3',
    category: 'UTILITY',
    language: 'en',
    type: 'TEXT',
    body: 'Hi {{1}}',
    sample: 'Hi Meera',
  };

  it('refuses a sample AiSensy would reject before calling it', async () => {
    configure();

    await expect(createTemplate({ ...input, sample: 'Hello Meera' })).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits a text template with its header and footer, and reads the verdict', async () => {
    configure();
    fetchMock.mockResolvedValue(
      reply({ name: 'pod_reminder_v3', status: 'REJECTED', rejected_reason: 'INVALID_FORMAT' })
    );

    const result = await createTemplate({ ...input, headerText: 'Reminder', footerText: 'Team Duncit' });

    expect(result).toEqual({ name: 'pod_reminder_v3', status: 'REJECTED', reason: 'INVALID_FORMAT' });
    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/wa_template/`);
    expect(JSON.parse(String(init.body))).toEqual({
      label: 'pod_reminder_v3',
      name: 'pod_reminder_v3',
      category: 'UTILITY',
      language: 'en',
      type: 'TEXT',
      text: 'Hi {{1}}',
      sample_text: 'Hi [Meera]',
      header_text: 'Reminder',
      header_type: 'TEXT',
      footer_text: 'Team Duncit',
    });
  });

  it('declares a media header through its type, and reads a pending answer', async () => {
    configure();
    fetchMock.mockResolvedValue(reply({}));

    const result = await createTemplate({ ...input, type: 'IMAGE' });

    expect(result).toEqual({ name: 'pod_reminder_v3', status: 'PENDING', reason: '' });
    const payload = JSON.parse(String(lastCall()[1].body));
    expect(payload.header_type).toBe('IMAGE');
    expect(payload).not.toHaveProperty('header_text');
    expect(payload).not.toHaveProperty('footer_text');
  });

  it('sends no header type for a plain text template', async () => {
    configure();
    fetchMock.mockResolvedValue(reply({ templateName: 'pod_reminder_v3' }));

    await createTemplate(input);

    expect(JSON.parse(String(lastCall()[1].body))).not.toHaveProperty('header_type');
  });
});

describe('listCampaigns', () => {
  const page = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({ _id: `c${from + i}`, name: `campaign_${from + i}` }));

  it('walks every page until a short one, asking for the next skip each time', async () => {
    configure();
    fetchMock
      .mockResolvedValueOnce(reply({ data: { campaigns: page(0, 100) } }))
      .mockResolvedValueOnce(reply({ data: { campaigns: page(100, 3) } }));

    const rows = await listCampaigns();

    expect(rows).toHaveLength(103);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toEqual({
      skip: 100,
      limit: 100,
      campaignType: 'ALL',
    });
  });

  it('stops when an endpoint that ignores skip answers page one again', async () => {
    configure();
    fetchMock.mockResolvedValue(reply(page(0, 100)));

    const rows = await listCampaigns();

    expect(rows).toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reads the template and media off the campaign’s message payload, or its flat fields', async () => {
    configure();
    fetchMock.mockResolvedValue(
      reply({
        campaigns: [
          {
            _id: 'c1',
            name: 'welcome',
            status: 'LIVE',
            type: 'API',
            message_payload: {
              template: { name: 'welcome_v2' },
              media: { url: ' https://cdn.example.com/w.jpg ', filename: 'w.jpg' },
            },
          },
          { id: 'c2', campaignName: 'promo', state: 'STOPPED', templateName: 'promo_tpl', campaignType: 'BROADCAST' },
        ],
      })
    );

    await expect(listCampaigns()).resolves.toEqual([
      {
        name: 'welcome',
        status: 'LIVE',
        template_name: 'welcome_v2',
        type: 'API',
        media_url: 'https://cdn.example.com/w.jpg',
        media_filename: 'w.jpg',
      },
      { name: 'promo', status: 'STOPPED', template_name: 'promo_tpl', type: 'BROADCAST', media_url: '', media_filename: '' },
    ]);
  });

  it('reads a payload with no array near the top as no campaigns', async () => {
    configure();
    fetchMock.mockResolvedValue(reply({ a: { b: { c: [{ name: 'too deep' }] } } }));

    await expect(listCampaigns()).resolves.toEqual([]);
  });
});

describe('listTemplates', () => {
  it('GETs the template list with the documented trailing slash and page size', async () => {
    configure();
    fetchMock.mockResolvedValue(reply([]));

    await listTemplates();

    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/wa_template/?limit=100&skip=0`);
    expect(init.method).toBeUndefined();
    expect(init.headers).toEqual({ Accept: 'application/json', 'X-AiSensy-Project-API-Pwd': 'project-key' });
  });

  it('reads a Project API row: header kind from `type`, buttons cut off the body', async () => {
    configure();
    fetchMock.mockResolvedValue(
      reply([
        {
          _id: 't1',
          name: 'welcome',
          status: 'APPROVED',
          category: 'UTILITY',
          language: 'en',
          text: 'Hi {{1}} | [Visit,https://duncit.example/{{2}}] | [Call,+919000000000]',
          type: 'IMAGE',
          total_parameters: 2,
          call_to_action: [
            { type: 'URL', button_title: 'Visit', button_value: 'https://duncit.example/{{2}}' },
            { type: 'Phone Number', button_title: 'Call', button_value: '+919000000000' },
          ],
          quick_replies: ['Stop', ''],
          footerText: 'Team Duncit',
        },
      ])
    );

    const [row] = await listTemplates();

    expect(row).toEqual({
      id: 't1',
      name: 'welcome',
      status: 'APPROVED',
      category: 'UTILITY',
      language: 'en',
      body: 'Hi {{1}}',
      // The body's own {{n}} wins: the declared 2 counts the link's {{2}}.
      param_count: 1,
      header: '',
      header_format: 'IMAGE',
      needs_media: true,
      footer: 'Team Duncit',
      buttons: ['Visit', 'Call', 'Stop'],
      cta_buttons: [
        { type: 'URL', text: 'Visit', url: 'https://duncit.example/{{2}}', url_param: 2 },
        { type: 'PHONE_NUMBER', text: 'Call', url: '', url_param: 0 },
      ],
    });
  });

  it('reads a Meta-shaped row off its components', async () => {
    configure();
    fetchMock.mockResolvedValue(
      reply({
        templates: [
          {
            id: 't2',
            elementName: 'promo',
            status: 'PENDING',
            languageCode: 'hi',
            components: [
              { type: 'HEADER', format: 'text', text: 'Big news' },
              { type: 'BODY', text: 'Deal {{1}} for {{2}}' },
              { type: 'FOOTER', text: 'Reply STOP' },
              {
                type: 'BUTTONS',
                buttons: [
                  { type: 'url', text: 'Shop', url: 'https://shop.example/{{1}}' },
                  { type: 'QUICK_REPLY', text: '' },
                ],
              },
            ],
          },
        ],
      })
    );

    const [row] = await listTemplates();

    expect(row).toMatchObject({
      id: 't2',
      name: 'promo',
      language: 'hi',
      body: 'Deal {{1}} for {{2}}',
      param_count: 2,
      header: 'Big news',
      header_format: 'TEXT',
      needs_media: false,
      footer: 'Reply STOP',
      buttons: ['Shop'],
      cta_buttons: [{ type: 'URL', text: 'Shop', url: 'https://shop.example/{{1}}', url_param: 1 }],
    });
  });

  it('falls back to the declared count, and reads a text header and an absent one', async () => {
    configure();
    fetchMock.mockResolvedValue(
      reply([
        { name: 'declared', language: 'en', total_parameters: 3, header_text: 'Hello' },
        { name: 'nothing', language: 'en', total_parameters: 'many' },
        { name: 'bracketed', language: 'en', body: 'Pick [one]' },
      ])
    );

    const [declared, nothing, bracketed] = await listTemplates();

    expect(declared).toMatchObject({ param_count: 3, header: 'Hello', header_format: 'TEXT' });
    expect(nothing).toMatchObject({ param_count: 0, header: '', header_format: '', needs_media: false });
    // A bracket that is not a `| [title,value]` button stays in the body.
    expect(bracketed.body).toBe('Pick [one]');
  });

  it('keeps one template per language when rows carry no id', async () => {
    configure();
    fetchMock.mockResolvedValue(
      reply([
        { name: 'welcome', language: 'en' },
        { name: 'welcome', language: 'hi' },
      ])
    );

    const rows = await listTemplates();

    expect(rows.map((row) => row.language)).toEqual(['en', 'hi']);
  });
});

describe('needsMedia', () => {
  it.each([
    ['IMAGE', true],
    ['video', true],
    ['FILE', true],
    ['document', true],
    ['TEXT', false],
    ['', false],
  ])('%s → %s', (format, expected) => {
    expect(needsMedia(format)).toBe(expected);
  });
});

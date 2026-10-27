/**
 * The odd rows the AiSensy Project API can return: components with holes in
 * them, a header with no declared format, a body whose button tail is
 * malformed, and campaigns that carry a name but no id.
 */
const mockEnv: Record<string, string> = {};
jest.mock('@config/runtimeEnv', () => ({
  getRuntimeEnvValue: jest.fn(async (key: string) => mockEnv[key] ?? ''),
}));

import { listCampaigns, listTemplates } from '../../aisensy.project';

const fetchMock = jest.fn();
const realFetch = global.fetch;
const reply = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });

beforeEach(() => {
  mockEnv.AISENSY_PROJECT_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6';
  mockEnv.AISENSY_PROJECT_API_KEY = 'project-key';
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = realFetch;
});

describe('listTemplates with imperfect rows', () => {
  it('skips components that are null or have no type, and falls back when no header component exists', async () => {
    fetchMock.mockResolvedValue(
      reply([{ id: 't1', name: 'n', components: [null, {}, { type: 'BODY', text: 'Hello' }] }]),
    );
    const [row] = await listTemplates();
    expect(row).toMatchObject({ body: 'Hello', header: '', header_format: '' });
  });

  it('calls a header component with no format TEXT', async () => {
    fetchMock.mockResolvedValue(
      reply([{ id: 't1', name: 'n', components: [{ type: 'HEADER', text: 'Big news' }, { type: 'BODY', text: 'Hi' }] }]),
    );
    const [row] = await listTemplates();
    expect(row).toMatchObject({ header: 'Big news', header_format: 'TEXT', needs_media: false });
  });

  it.each([
    ['a tail with no opening bracket', 'Hi there]', 'Hi there]'],
    ['a bracket at the very start', '[only]', '[only]'],
    ['a bracket that is not preceded by a pipe', 'Hi [x]', 'Hi [x]'],
  ])('leaves the body alone for %s', async (_label, text, expected) => {
    fetchMock.mockResolvedValue(reply([{ id: 't1', name: 'n', text }]));
    const [row] = await listTemplates();
    expect(row.body).toBe(expected);
  });
});

describe('listCampaigns with imperfect rows', () => {
  it('identifies a row by its name when it carries no id', async () => {
    fetchMock.mockResolvedValue(reply([{ name: 'welcome', status: 'Live' }, { campaignName: 'promo', state: 'Paused' }]));
    const rows = await listCampaigns();
    expect(rows.map((r) => r.name)).toEqual(['welcome', 'promo']);
    expect(rows.map((r) => r.status)).toEqual(['Live', 'Paused']);
  });
});

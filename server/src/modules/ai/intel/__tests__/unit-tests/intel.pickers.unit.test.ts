/**
 * The connector form pickers: GitHub repositories the token can read (paged),
 * and the OpenAI chat models the configured key can use.
 */
import { resolveConfig } from '@services/openai/openai.client';
import { listRepos } from '../../connectors/github/github.connector';
import { ProviderError } from '../../connectors/intel.http';
import { openAiChatModels } from '../../index/intel.models';
import { intelOpenAiCredentials } from '../../index/intel.openai';
import { intelSettingsService } from '../../settings/intelSettings.service';

jest.mock('@services/openai/openai.client', () => ({ resolveConfig: jest.fn() }));
jest.mock('../../index/intel.openai', () => ({ intelOpenAiCredentials: jest.fn() }));
jest.mock('../../settings/intelSettings.service', () => ({ intelSettingsService: { get: jest.fn(async () => ({ openai: { env_entry_id: '' } })) } }));

const realFetch = globalThis.fetch;
const entry = { id: 'e1', name: 'GitHub PAT', config: { token: 'ghp_x' } };
const json = (body: unknown, status = 200) => ({ ok: status < 400, status, headers: new Headers(), text: async () => JSON.stringify(body) });
const repoRows = (owner: string, n: number, offset = 0) => Array.from({ length: n }, (_, i) => ({ name: `repo-${offset + i}`, owner: { login: owner }, default_branch: i % 2 ? 'main' : 'staging' }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('listRepos', () => {
  it('reads every page until a short one, with owner, name and default branch', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(json(repoRows('duncit', 100))).mockResolvedValueOnce(json(repoRows('acme', 2, 100)));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const repos = await listRepos(entry);
    expect(repos).toHaveLength(102);
    expect(repos[0]).toEqual({ owner: 'duncit', name: 'repo-0', default_branch: 'staging' });
    expect(repos[101]).toEqual({ owner: 'acme', name: 'repo-101', default_branch: 'main' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('page=2');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer ghp_x');
  });

  it('stops after five pages so a huge account cannot stall the form', async () => {
    const fetchMock = jest.fn(async () => json(repoRows('big', 100)));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(listRepos(entry)).resolves.toHaveLength(500);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('reports GitHub’s refusal (bad token) as a provider error', async () => {
    globalThis.fetch = jest.fn(async () => json({ message: 'Bad credentials' }, 401)) as unknown as typeof fetch;
    await expect(listRepos(entry)).rejects.toEqual(new ProviderError('Bad credentials', 401));
  });

  it('refuses an entry without a token before calling GitHub', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(listRepos({ id: 'e2', name: 'Empty', config: {} })).rejects.toThrow('has no access token');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('openAiChatModels', () => {
  const models = { data: [{ id: 'gpt-4o-mini' }, { id: 'text-embedding-3-small' }, { id: 'gpt-4o' }, { id: 'whisper-1' }, { id: 'gpt-4o' }, { id: 'o3-mini' }] };

  it('lists the chat models of Intel’s own key, sorted and without duplicates', async () => {
    (intelOpenAiCredentials as jest.Mock).mockResolvedValue({ apiKey: 'sk-intel', base: 'https://api.openai.com/v1' });
    const fetchMock = jest.fn(async () => json(models));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(openAiChatModels()).resolves.toEqual(['gpt-4o', 'gpt-4o-mini', 'o3-mini']);
    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/models', expect.objectContaining({ headers: { Authorization: 'Bearer sk-intel' } }));
    expect(resolveConfig).not.toHaveBeenCalled();
  });

  it('falls back to the Tech portal default key and base URL', async () => {
    (intelOpenAiCredentials as jest.Mock).mockResolvedValue(null);
    (resolveConfig as jest.Mock).mockResolvedValue({ provider: 'OpenAI', apiKey: 'sk-default', base: 'https://proxy.example.test/v1', model: 'gpt-4o-mini' });
    const fetchMock = jest.fn(async () => json({ data: [{ id: 'gpt-4.1' }] }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(openAiChatModels()).resolves.toEqual(['gpt-4.1']);
    expect(fetchMock).toHaveBeenCalledWith('https://proxy.example.test/v1/models', expect.objectContaining({ headers: { Authorization: 'Bearer sk-default' } }));
  });

  it('says where to add a key when there is none', async () => {
    (intelOpenAiCredentials as jest.Mock).mockResolvedValue(null);
    (resolveConfig as jest.Mock).mockResolvedValue({ provider: 'OpenAI', apiKey: '', base: 'https://api.openai.com/v1', model: 'x' });
    await expect(openAiChatModels()).rejects.toMatchObject({ extensions: { code: 'FAILED_PRECONDITION' } });
  });

  it('passes OpenAI’s refusal on (an invalid key)', async () => {
    (intelOpenAiCredentials as jest.Mock).mockResolvedValue({ apiKey: 'sk-bad', base: 'https://api.openai.com/v1' });
    globalThis.fetch = jest.fn(async () => json({ error: { message: 'Incorrect API key provided' } }, 401)) as unknown as typeof fetch;
    await expect(openAiChatModels()).rejects.toThrow('Incorrect API key provided');
    expect(intelSettingsService.get).toHaveBeenCalled();
  });
});

/**
 * Connector input: where the credentials come from is settled on the server,
 * whatever the client sent — built-in sources take this server's environment,
 * a Google-connected mailbox is BOTH, an entry must exist, and a new database
 * connection is saved as a Tech portal entry only after everything passed.
 */
import { IntelGmailAccountModel } from '../../connectors/gmail/gmailAccount.model';
import { entryOptions, resolveEntry } from '../../connectors/intel.credentials';
import { credentialNames, parseConnectorInput, settleConnectorEntry } from '../../connectors/intelConnector.input';
import { createMongoEntry } from '../../connectors/mongo/mongo.newConnection';

jest.mock('../../connectors/gmail/gmailAccount.model', () => ({ IntelGmailAccountModel: { exists: jest.fn(), find: jest.fn() } }));
jest.mock('../../connectors/intel.credentials', () => ({ resolveEntry: jest.fn(), entryOptions: jest.fn() }));
jest.mock('../../connectors/mongo/mongo.newConnection', () => ({ createMongoEntry: jest.fn() }));

const ACCOUNT = '64b7f0c2a1b2c3d4e5f60718';
const ENTRY = '64b7f0c2a1b2c3d4e5f60719';
const exists = IntelGmailAccountModel.exists as unknown as jest.Mock;
const findAccounts = IntelGmailAccountModel.find as unknown as jest.Mock;
const resolve = resolveEntry as jest.Mock;
const options = entryOptions as jest.Mock;
const create = createMongoEntry as jest.Mock;

const mongo = { database: 'duncit', collections: ['pods'], access_mode: 'READ_ONLY' };
const gmail = { query: 'in:inbox', max_threads: 100, include_attachments: false, history_days: 30 };

/** The field messages a refusal carries. */
async function refusal(promise: Promise<unknown>): Promise<string[]> {
  try {
    await promise;
  } catch (error) {
    return ((error as { extensions?: { errors?: string[] } }).extensions?.errors ?? []).map(String);
  }
  throw new Error('expected a refusal');
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NODE_ENV = 'test';
  delete process.env.APP_ENV;
});

describe('parseConnectorInput', () => {
  it('fixes a built-in source to this server’s environment, whatever was sent, without looking up an entry', async () => {
    const parsed = await parseConnectorInput({ kind: 'MONGODB', name: 'Duncit DB', environment: 'PRODUCTION', env_entry_id: 'server', config: mongo });
    expect(parsed.data).toMatchObject({ env_entry_id: 'server', environment: 'STAGING' });
    expect(parsed.newConnection).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();
  });

  it('points a Gmail connector at its connected account, environment BOTH', async () => {
    exists.mockResolvedValue({ _id: ACCOUNT });
    const parsed = await parseConnectorInput({ kind: 'GMAIL', name: 'team@duncit.test', environment: 'STAGING', env_entry_id: '', config: { ...gmail, account_id: ACCOUNT } });
    expect(parsed.data).toMatchObject({ env_entry_id: 'oauth', environment: 'BOTH', config: { account_id: ACCOUNT } });
    expect(exists).toHaveBeenCalledWith({ _id: ACCOUNT });
  });

  it('refuses a Gmail account that is no longer connected', async () => {
    exists.mockResolvedValue(null);
    const errors = await refusal(parseConnectorInput({ kind: 'GMAIL', name: 'gone', environment: 'BOTH', env_entry_id: 'oauth', config: { ...gmail, account_id: ACCOUNT } }));
    expect(errors[0]).toMatch(/^config\.account_id: /);
  });

  it('accepts an active Tech portal entry of the right kind', async () => {
    resolve.mockResolvedValue({ id: ENTRY, name: 'Analytics', config: {} });
    const parsed = await parseConnectorInput({ kind: 'MONGODB', name: 'Analytics', environment: 'PRODUCTION', env_entry_id: ENTRY, config: mongo });
    expect(parsed.data).toMatchObject({ env_entry_id: ENTRY, environment: 'PRODUCTION' });
    expect(resolve).toHaveBeenCalledWith('MONGODB', ENTRY);
  });

  it('refuses a missing or inactive entry with a field message', async () => {
    resolve.mockResolvedValue(null);
    const errors = await refusal(parseConnectorInput({ kind: 'SLACK', name: 'Team', environment: 'BOTH', env_entry_id: ENTRY, config: { channels: [] } }));
    expect(errors[0]).toMatch(/^env_entry_id: /);
  });

  it('refuses "both environments" for a database', async () => {
    await expect(parseConnectorInput({ kind: 'MONGODB', name: 'X', environment: 'BOTH', env_entry_id: 'server', config: mongo })).rejects.toThrow();
  });

  it('keeps a new database connection aside, out of the saved config', async () => {
    const conn = { type: 'ATLAS', uri: 'mongodb+srv://u:p@cluster0.x.mongodb.net/' };
    const parsed = await parseConnectorInput({ kind: 'MONGODB', name: 'Atlas', environment: 'STAGING', env_entry_id: '', config: { ...mongo, new_connection: conn } });
    expect(parsed.newConnection).toEqual(conn);
    expect(parsed.data.config).not.toHaveProperty('new_connection');
    expect(resolve).not.toHaveBeenCalled();
  });
});

describe('settleConnectorEntry', () => {
  it('saves the new connection as an entry and uses its id', async () => {
    create.mockResolvedValue(ENTRY);
    const conn = { type: 'ATLAS', uri: 'mongodb+srv://u:p@cluster0.x.mongodb.net/' };
    const data = await settleConnectorEntry(await parseConnectorInput({ kind: 'MONGODB', name: 'Atlas', environment: 'STAGING', env_entry_id: '', config: { ...mongo, new_connection: conn } }));
    expect(create).toHaveBeenCalledWith(conn, 'Atlas', 'duncit');
    expect(data.env_entry_id).toBe(ENTRY);
  });

  it('creates nothing when the connector already has its credentials', async () => {
    const data = await settleConnectorEntry(await parseConnectorInput({ kind: 'MCP', name: 'Duncit', environment: 'BOTH', env_entry_id: 'duncit', config: {} }));
    expect(create).not.toHaveBeenCalled();
    expect(data.env_entry_id).toBe('duncit');
  });

  it('does not save the entry when the connection fails', async () => {
    create.mockRejectedValue(new Error('Could not connect'));
    const parsed = await parseConnectorInput({ kind: 'MONGODB', name: 'Self', environment: 'STAGING', env_entry_id: '', config: { ...mongo, new_connection: { type: 'SELF_HOSTED' } } });
    await expect(settleConnectorEntry(parsed)).rejects.toThrow('Could not connect');
  });
});

describe('credentialNames', () => {
  it('names entries, built-in sources and connected mailboxes', async () => {
    process.env.MONGO_URI = 'mongodb://duncit-mongo:27017/test';
    options.mockResolvedValue([{ id: ENTRY, name: 'Analytics' }]);
    findAccounts.mockReturnValue({ lean: () => Promise.resolve([{ _id: ACCOUNT, email: 'team@duncit.test' }]) });
    const nameOf = await credentialNames([
      { kind: 'MONGODB', env_entry_id: ENTRY, config: {} },
      { kind: 'MONGODB', env_entry_id: 'server', config: {} },
      { kind: 'GMAIL', env_entry_id: 'oauth', config: { account_id: ACCOUNT } },
    ]);
    expect(nameOf({ kind: 'MONGODB', env_entry_id: ENTRY, config: {} })).toBe('Analytics');
    expect(nameOf({ kind: 'MONGODB', env_entry_id: 'server', config: {} })).toBe('Duncit database');
    expect(nameOf({ kind: 'GMAIL', env_entry_id: 'oauth', config: { account_id: ACCOUNT } })).toBe('team@duncit.test');
    expect(nameOf({ kind: 'SLACK', env_entry_id: 'unknown', config: {} })).toBe('');
  });
});

/**
 * Where connector credentials come from: this server's own database and MCP
 * (built-in sources), a new Atlas / self-deployed database typed in Intel,
 * the reserved ids the connector input accepts, the OAuth state that routes
 * Google's callback to Intel, and which OpenAI models count as chat models.
 */
import jwt from 'jsonwebtoken';
import { validate } from '@utils/validate';
import { INTEL_GMAIL_PURPOSE, MAIL_AUTOMATION_PURPOSE, oauthStatePurpose, signOAuthState, verifyOAuthState } from '@modules/platform/mailAutomation/gmail.oauth';
import { builtinEntryId, builtinEntryOption, isBuiltinEntry, serverDatabaseEntry, serverEnvironment } from '../../connectors/intel.builtin';
import { CONFIG_SCHEMAS, connectorInputSchema } from '../../connectors/intelConnector.schema';
import { mongoUriOf, newMongoConnectionSchema } from '../../connectors/mongo/mongo.newConnection';
import { isChatModel } from '../../index/intel.models';

const ENV_KEYS = ['NODE_ENV', 'APP_ENV', 'MONGO_URI', 'JWT_SECRET'] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('serverEnvironment', () => {
  it('is PRODUCTION only on a production build of the production stack', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.APP_ENV;
    expect(serverEnvironment()).toBe('PRODUCTION');
  });
  it('is STAGING on the staging stack and on a local server', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'staging';
    expect(serverEnvironment()).toBe('STAGING');
    process.env.NODE_ENV = 'development';
    delete process.env.APP_ENV;
    expect(serverEnvironment()).toBe('STAGING');
  });
});

describe('built-in sources', () => {
  it('offers this server’s database first, as the default, in the server’s environment', () => {
    process.env.MONGO_URI = 'mongodb://duncit-mongo:27017/duncit';
    process.env.NODE_ENV = 'production';
    process.env.APP_ENV = 'staging';
    expect(builtinEntryOption('MONGODB')).toMatchObject({ id: 'server', is_default: true, builtin: true, environment: 'STAGING' });
  });
  it('has no database option when this server has no MONGO_URI, and no entry to resolve', () => {
    delete process.env.MONGO_URI;
    expect(builtinEntryOption('MONGODB')).toBeNull();
    expect(serverDatabaseEntry()).toBeNull();
  });
  it('resolves this server’s database to its own connection string', () => {
    process.env.MONGO_URI = ' mongodb://duncit-mongo:27017/test ';
    expect(serverDatabaseEntry()).toMatchObject({ id: 'server', config: { uri: 'mongodb://duncit-mongo:27017/test' } });
  });
  it('offers Duncit MCP for MCP, and nothing built in for Slack, GitHub or Gmail', () => {
    expect(builtinEntryOption('MCP')).toMatchObject({ id: 'duncit', builtin: true });
    for (const kind of ['SLACK', 'GITHUB', 'GMAIL'] as const) {
      expect(builtinEntryOption(kind)).toBeNull();
      expect(builtinEntryId(kind)).toBeNull();
    }
  });
  it('recognises a reserved id only for its own kind', () => {
    expect(isBuiltinEntry('MONGODB', 'server')).toBe(true);
    expect(isBuiltinEntry('MCP', 'duncit')).toBe(true);
    expect(isBuiltinEntry('MCP', 'server')).toBe(false);
    expect(isBuiltinEntry('MONGODB', 'duncit')).toBe(false);
  });
});

describe('connector input: credential ids', () => {
  const input = (env_entry_id: string) => ({ kind: 'MONGODB', name: 'Pods', environment: 'STAGING', env_entry_id, config: {} });
  it('accepts an entry id, the reserved ids, and empty (a new database connection)', async () => {
    for (const id of ['64b7f0c2a1b2c3d4e5f60718', 'server', 'duncit', 'oauth', '']) {
      await expect(validate(connectorInputSchema, input(id))).resolves.toMatchObject({ env_entry_id: id });
    }
  });
  it('refuses anything else', async () => {
    for (const id of ['admin', '64b7f0c2', '../server', 'server;drop']) await expect(validate(connectorInputSchema, input(id))).rejects.toThrow();
  });
  it('lets a Gmail connector name its connected account, and only by id', async () => {
    const base = { query: 'in:inbox', max_threads: 100, include_attachments: false, history_days: 30 };
    await expect(validate(CONFIG_SCHEMAS.GMAIL, { ...base, account_id: '64b7f0c2a1b2c3d4e5f60718' })).resolves.toMatchObject({ account_id: '64b7f0c2a1b2c3d4e5f60718' });
    await expect(validate(CONFIG_SCHEMAS.GMAIL, { ...base, account_id: 'someone@example.com' })).rejects.toThrow();
  });
  it('allows up to 1000 Slack channels (the All option) and refuses more', async () => {
    const channels = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `C${String(i).padStart(8, '0')}`, name: `c${i}` }));
    await expect(validate(CONFIG_SCHEMAS.SLACK, { channels: channels(1000) })).resolves.toBeTruthy();
    await expect(validate(CONFIG_SCHEMAS.SLACK, { channels: channels(1001) })).rejects.toThrow();
  });
});

describe('new database connections', () => {
  it('keeps an Atlas connection string as it is', async () => {
    const conn = await validate(newMongoConnectionSchema, { type: 'ATLAS', uri: ' mongodb+srv://intel:pw@cluster0.ab1cd.mongodb.net/ ' });
    expect(mongoUriOf(conn)).toBe('mongodb+srv://intel:pw@cluster0.ab1cd.mongodb.net/');
  });
  it('refuses an Atlas value that is not a MongoDB connection string', async () => {
    for (const uri of ['https://cloud.mongodb.com', 'cluster0.mongodb.net', 'mongodb://', 'mongodb://user:pass @host']) {
      await expect(validate(newMongoConnectionSchema, { type: 'ATLAS', uri })).rejects.toThrow();
    }
  });
  it('builds a self-deployed connection string with the user and password URL-encoded', async () => {
    const conn = await validate(newMongoConnectionSchema, { type: 'SELF_HOSTED', host: 'db.example.com', port: 27018, username: 'intel@ro', password: 'p:ss/w@rd', auth_source: 'admin', tls: true });
    expect(mongoUriOf(conn)).toBe('mongodb://intel%40ro:p%3Ass%2Fw%40rd@db.example.com:27018/?authSource=admin&tls=true');
  });
  it('defaults the auth database to admin and leaves TLS off', async () => {
    const conn = await validate(newMongoConnectionSchema, { type: 'SELF_HOSTED', host: 'duncit-mongo', port: 27017, username: 'u', password: 'p' });
    expect(mongoUriOf(conn)).toBe('mongodb://u:p@duncit-mongo:27017/?authSource=admin');
  });
  it('refuses a host with a port or scheme, a port out of range, and a missing user or password', async () => {
    const ok = { type: 'SELF_HOSTED', host: 'db.example.com', port: 27017, username: 'u', password: 'p' };
    for (const bad of [{ host: 'db.example.com:27017' }, { host: 'mongodb://db' }, { port: 0 }, { port: 65536 }, { username: '' }, { password: '' }, { auth_source: 'my db' }]) {
      await expect(validate(newMongoConnectionSchema, { ...ok, ...bad })).rejects.toThrow();
    }
  });
});

describe('Google OAuth state purposes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-secret';
  });
  it('a state verifies only for the flow it was signed for', () => {
    const intel = signOAuthState('user-1', INTEL_GMAIL_PURPOSE);
    expect(verifyOAuthState(intel, INTEL_GMAIL_PURPOSE)).toBe('user-1');
    expect(verifyOAuthState(intel)).toBeNull();
    const mail = signOAuthState('user-2');
    expect(verifyOAuthState(mail)).toBe('user-2');
    expect(verifyOAuthState(mail, INTEL_GMAIL_PURPOSE)).toBeNull();
  });
  it('tells the callback which flow a state belongs to, and nothing for a forged or expired one', () => {
    expect(oauthStatePurpose(signOAuthState('u', INTEL_GMAIL_PURPOSE))).toBe(INTEL_GMAIL_PURPOSE);
    expect(oauthStatePurpose(signOAuthState('u'))).toBe(MAIL_AUTOMATION_PURPOSE);
    expect(oauthStatePurpose(jwt.sign({ uid: 'u', purpose: INTEL_GMAIL_PURPOSE }, 'another-secret'))).toBeNull();
    expect(oauthStatePurpose(jwt.sign({ uid: 'u', purpose: INTEL_GMAIL_PURPOSE }, 'unit-test-secret', { expiresIn: -10 }))).toBeNull();
    expect(oauthStatePurpose('not-a-token')).toBeNull();
  });
});

describe('isChatModel (the AI Models picker)', () => {
  it('keeps chat models', () => {
    for (const id of ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3-mini', 'o4-mini', 'chatgpt-4o-latest']) expect(isChatModel(id)).toBe(true);
  });
  it('drops audio, realtime, speech, image, embedding, moderation and other non-chat models', () => {
    for (const id of ['gpt-4o-audio-preview', 'gpt-4o-realtime-preview', 'gpt-4o-mini-tts', 'gpt-4o-transcribe', 'gpt-image-1', 'text-embedding-3-small', 'omni-moderation-latest', 'dall-e-3', 'whisper-1', 'gpt-4o-search-preview', 'gpt-3.5-turbo-instruct', 'babbage-002']) {
      expect(isChatModel(id)).toBe(false);
    }
  });
});

import { buildSchema, parse, Kind, type OperationDefinitionNode } from 'graphql';
import { currentSchema, graphqlMonitorPlugin } from '../../graphqlMonitor.plugin';
import { record } from '../../graphqlMonitor.collector';
import { flushGraphqlMonitor } from '../../graphqlMonitor.flusher';
import { runtime } from '../../graphqlMonitor.settings';
import { INVALID_OPERATION, describeOperation } from '../../graphqlMonitor.signature';
import { isStressTraffic } from '../../../stressTest/stressTest.traffic';
import { randomInt } from 'node:crypto';

jest.mock('node:crypto', () => ({ ...jest.requireActual('node:crypto'), randomInt: jest.fn() }));
jest.mock('../../graphqlMonitor.collector', () => ({ record: jest.fn() }));
jest.mock('../../graphqlMonitor.flusher', () => ({ flushGraphqlMonitor: jest.fn() }));
jest.mock('../../graphqlMonitor.settings', () => ({ runtime: { enabled: true, field_sample_pct: 0, retention_days: 14, slow_threshold_ms: 1000 } }));
jest.mock('../../graphqlMonitor.signature', () => ({ INVALID_OPERATION: { op_key: 'invalid' }, describeOperation: jest.fn() }));
jest.mock('../../../stressTest/stressTest.traffic', () => ({ isStressTraffic: jest.fn() }));

const schema = buildSchema('type Query { me: String }');
const SHAPE = { op_key: 'op1', name: 'Q', type: 'QUERY', signature: 'q', root_fields: ['me'], fields: [] };

const contextValue = (headers: Record<string, string | string[]> = {}) => ({ req: { headers } });

async function begin(headers: Record<string, string | string[]> = {}) {
  const hooks = await graphqlMonitorPlugin.requestDidStart?.({ contextValue: contextValue(headers) } as never);
  return hooks as Record<string, (...a: any[]) => any>;
}

const send = (hooks: Record<string, (...a: any[]) => any>, body: unknown, errors?: unknown[], headers = {}) =>
  hooks.willSendResponse({ contextValue: contextValue(headers), response: { body }, errors });
const recorded = () => (record as jest.Mock).mock.calls.at(-1)?.[0];

beforeEach(() => {
  runtime.enabled = true;
  runtime.field_sample_pct = 0;
  (isStressTraffic as jest.Mock).mockReturnValue(false);
  (randomInt as jest.Mock).mockReturnValue(99);
});

describe('serverWillStart', () => {
  it('captures the schema for the Fields page and flushes the last minute on shutdown', async () => {
    expect(currentSchema()).toBeNull();
    const result = await graphqlMonitorPlugin.serverWillStart?.({ schema } as never);
    expect(currentSchema()).toBe(schema);
    expect((result as { drainServer: unknown }).drainServer).toBe(flushGraphqlMonitor);
  });
});

describe('requestDidStart', () => {
  it('skips monitoring when it is switched off', async () => {
    runtime.enabled = false;
    await expect(begin()).resolves.toBeUndefined();
  });

  it('leaves stress-run traffic out', async () => {
    (isStressTraffic as jest.Mock).mockReturnValue(true);
    await expect(begin()).resolves.toBeUndefined();
  });

  it('records one request: phases, shape, client and errors, once it is answered', async () => {
    const hooks = await begin({ 'x-duncit-surface': 'mweb', 'x-duncit-app': 'duncit' });
    const parsed = await hooks.parsingDidStart();
    await parsed();
    const validated = await hooks.validationDidStart();
    await validated();
    const document = parse('query Q { me }');
    const operation = document.definitions.find((d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION);
    (describeOperation as jest.Mock).mockReturnValue(SHAPE);
    await hooks.didResolveOperation({ operation, document, queryHash: 'h1', schema });
    expect(describeOperation).toHaveBeenCalledWith('h1', document, operation, schema);
    const execution = await hooks.executionDidStart();
    expect(execution.willResolveField).toBeUndefined();
    await execution.executionDidEnd();
    await send(hooks, { kind: 'single', singleResult: { errors: [{ message: 'boom', path: ['me', 0, 'name'], extensions: { code: 'FORBIDDEN' } }] } });

    expect(record).toHaveBeenCalledTimes(1);
    const sample = recorded();
    expect(sample.shape).toBe(SHAPE);
    expect(sample.errors).toEqual([{ code: 'FORBIDDEN', message: 'boom', path: 'me.0.name' }]);
    expect(sample.cached).toBe(false);
    expect(sample.execute_ms).toEqual(expect.any(Number));
    expect(sample.resolvers).toBeNull();
    expect(sample.resolver_count).toBe(0);
    expect(sample.client).toMatch(/:/);
  });

  it('files a request that never became an operation under the invalid bucket, with no execute time and not cached', async () => {
    const hooks = await begin();
    await hooks.didResolveOperation({ operation: undefined });
    await send(hooks, { kind: 'single', singleResult: {} }, [{ message: 'syntax', extensions: {} }]);
    const sample = recorded();
    expect(sample.shape).toBe(INVALID_OPERATION);
    expect(sample.execute_ms).toBeNull();
    expect(sample.cached).toBe(false);
    expect(sample.errors).toEqual([{ code: 'GRAPHQL_ERROR', message: 'syntax', path: '' }]);
  });

  it('calls a resolved operation that never executed and did not fail a cache hit', async () => {
    const hooks = await begin();
    (describeOperation as jest.Mock).mockReturnValue(SHAPE);
    await hooks.didResolveOperation({ operation: {}, document: {}, queryHash: 'h', schema });
    await send(hooks, { kind: 'single', singleResult: { data: {} } });
    expect(recorded()).toMatchObject({ cached: true, errors: [], execute_ms: null });
  });

  it('reads errors from the request context for a non-single response, and has none for a clean one', async () => {
    let hooks = await begin();
    await send(hooks, { kind: 'incremental' }, [{ message: 'late', extensions: { code: 42 } }]);
    expect(recorded().errors).toEqual([{ code: 'GRAPHQL_ERROR', message: 'late', path: '' }]);
    hooks = await begin();
    await send(hooks, { kind: 'incremental' });
    expect(recorded().errors).toEqual([]);
  });

  it('names the client SURFACE:app from the headers it was answered with, an API key winning over both', async () => {
    const hooks = await begin();
    await send(hooks, { kind: 'single', singleResult: {} }, undefined, { 'x-duncit-surface': 'mweb', 'x-duncit-app': 'Duncit' });
    expect(recorded().client).toBe('MWEB:duncit');
    await send(hooks, { kind: 'single', singleResult: {} }, undefined, { 'x-duncit-surface': ['portal', 'x'], 'x-duncit-app': 'bad app!' });
    expect(recorded().client).toBe('PORTAL:-');
    await send(hooks, { kind: 'single', singleResult: {} }, undefined, { 'x-api-key': 'k', 'x-duncit-surface': 'portal' });
    expect(recorded().client).toBe('API:public-api');
    await send(hooks, { kind: 'single', singleResult: {} }, undefined, {});
    expect(recorded().client).toBe('UNKNOWN:-');
  });
});

describe('resolver sampling', () => {
  const resolverInfo = (name: string) => ({
    info: {
      path: { key: name, prev: { key: 'me', prev: undefined, typename: 'Query' }, typename: 'User' },
      parentType: { name: 'User' },
      fieldName: name,
      returnType: 'String!',
    },
  });

  async function sampledRun() {
    runtime.field_sample_pct = 100;
    (randomInt as jest.Mock).mockReturnValue(0);
    const hooks = await begin();
    const execution = await hooks.executionDidStart();
    return { hooks, execution };
  }

  it('does not sample at 0 percent, and not when the dice land above the share', async () => {
    runtime.field_sample_pct = 0;
    let hooks = await begin();
    expect((await hooks.executionDidStart()).willResolveField).toBeUndefined();
    expect(randomInt).not.toHaveBeenCalled();
    runtime.field_sample_pct = 10;
    (randomInt as jest.Mock).mockReturnValue(10);
    hooks = await begin();
    expect((await hooks.executionDidStart()).willResolveField).toBeUndefined();
    expect(randomInt).toHaveBeenCalledWith(100);
  });

  it('times each resolver of a sampled request, with its path, types and any error', async () => {
    const { hooks, execution } = await sampledRun();
    const done = execution.willResolveField(resolverInfo('name'));
    done(null);
    const failing = execution.willResolveField(resolverInfo('email'));
    failing(new Error('denied'));
    await execution.executionDidEnd();
    await send(hooks, { kind: 'single', singleResult: {} });
    const sample = recorded();
    expect(sample.resolver_count).toBe(2);
    expect(sample.resolvers).toHaveLength(2);
    expect(sample.resolvers[0]).toMatchObject({ path: 'me.name', parent_type: 'User', field_name: 'name', return_type: 'String!', error: null });
    expect(sample.resolvers[1]).toMatchObject({ field_name: 'email', error: 'denied' });
    expect(sample.resolvers[0].duration_ms).toEqual(expect.any(Number));
  });

  it('stops keeping resolver detail at 2,000 but keeps counting', async () => {
    const { hooks, execution } = await sampledRun();
    for (let i = 0; i < 2005; i += 1) execution.willResolveField(resolverInfo(`f${i}`))(null);
    await send(hooks, { kind: 'single', singleResult: {} });
    expect(recorded().resolver_count).toBe(2005);
    expect(recorded().resolvers).toHaveLength(2000);
  });
});

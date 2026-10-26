import type { Request, Response } from 'express';
import type { ApolloServer } from '@apollo/server';
import { parse } from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { requestIdentity, type RequestIdentity } from '@observability/requestIdentity';
import { NO_CONSENT } from '@utils/consent';
import { executeAsUser, type UserCaller } from '@utils/execute-as-user';

/**
 * executeAsUser runs one operation through Apollo as an account that did not
 * sign in with a session JWT (an MCP connection, a table API token). Apollo is
 * a stand-in here; what is under test is the context it is handed and the
 * request identity it runs inside.
 */

const DOCUMENT = parse('query Mcp_pod($id: ID!) { pod(id: $id) { id } }');
const ASHA: AuthUser = { id: '64b7f0c2a1e4c9d3f0a1b2c3', email: 'asha@duncit.com', roles: ['MCP_USER', 'ALL_PODS_ACCESS'] };

const single = (singleResult: Record<string, unknown>) => ({ body: { kind: 'single', singleResult } });

function callerFor(user: AuthUser, executeOperation: jest.Mock): UserCaller {
  return {
    apollo: { executeOperation } as unknown as ApolloServer<GraphQLContext>,
    user,
    req: { path: '/pods/mcp' } as Request,
    res: {} as Response,
    isClientGone: () => false,
  };
}

describe('executeAsUser', () => {
  it('hands Apollo the operation exactly as given', async () => {
    const executeOperation = jest.fn().mockResolvedValue(single({ data: { pod: { id: 'p1' } } }));
    await executeAsUser(callerFor(ASHA, executeOperation), { document: DOCUMENT, operationName: 'Mcp_pod', variables: { id: 'p1' } });
    expect(executeOperation.mock.calls[0][0]).toEqual({ query: DOCUMENT, operationName: 'Mcp_pod', variables: { id: 'p1' } });
  });

  it('builds the context a console request would have, as the person, without consent or the Redis cache', async () => {
    const executeOperation = jest.fn().mockResolvedValue(single({ data: {} }));
    const caller = callerFor(ASHA, executeOperation);
    await executeAsUser(caller, { document: DOCUMENT });
    const { contextValue } = executeOperation.mock.calls[0][1] as { contextValue: GraphQLContext };
    expect(contextValue).toEqual({
      req: caller.req,
      res: caller.res,
      user: ASHA,
      device_id: null,
      consent: NO_CONSENT,
      noRedis: true,
      isClientGone: caller.isClientGone,
    });
    expect(contextValue.user).toBe(ASHA);
    expect(contextValue.isClientGone).toBe(caller.isClientGone);
  });

  it('runs inside a request identity that names the person, so change logs say who did it', async () => {
    let seen: RequestIdentity | undefined;
    const executeOperation = jest.fn().mockImplementation(async () => {
      seen = requestIdentity.current();
      return single({ data: {} });
    });
    await executeAsUser(callerFor(ASHA, executeOperation), { document: DOCUMENT });
    expect(seen).toEqual({ user: { id: ASHA.id, email: 'asha@duncit.com', roles: ['MCP_USER', 'ALL_PODS_ACCESS'] } });
  });

  it('keeps the outer request’s address and device while replacing its (anonymous) user', async () => {
    let seen: RequestIdentity | undefined;
    const executeOperation = jest.fn().mockImplementation(async () => {
      seen = requestIdentity.current();
      return single({ data: {} });
    });
    const outer: RequestIdentity = { ip: '203.0.113.7', user_agent: 'Claude-User/1.0', duid: 'd-1', surface: 'MWEB' };
    await requestIdentity.run(outer, () => executeAsUser(callerFor(ASHA, executeOperation), { document: DOCUMENT }));
    expect(seen).toEqual({ ...outer, user: { id: ASHA.id, email: 'asha@duncit.com', roles: ASHA.roles } });
  });

  it('leaves the outer identity as it was once the operation is done', async () => {
    const executeOperation = jest.fn().mockResolvedValue(single({ data: {} }));
    const outer: RequestIdentity = { ip: '203.0.113.7' };
    const after = await requestIdentity.run(outer, async () => {
      await executeAsUser(callerFor(ASHA, executeOperation), { document: DOCUMENT });
      return requestIdentity.current();
    });
    expect(after).toBe(outer);
    expect(outer).toEqual({ ip: '203.0.113.7' });
  });

  it('names no email when the account has none', async () => {
    let seen: RequestIdentity | undefined;
    const executeOperation = jest.fn().mockImplementation(async () => {
      seen = requestIdentity.current();
      return single({ data: {} });
    });
    await executeAsUser(callerFor({ ...ASHA, email: null }, executeOperation), { document: DOCUMENT });
    expect(seen?.user).toEqual({ id: ASHA.id, email: undefined, roles: ASHA.roles });
  });

  it('keeps two operations for two people apart when they run at the same time', async () => {
    const seen: Record<string, string | undefined> = {};
    const run = (who: AuthUser, delay: number) =>
      executeAsUser(
        callerFor(
          who,
          jest.fn().mockImplementation(async () => {
            await new Promise((resolve) => setImmediate(resolve));
            if (delay) await new Promise((resolve) => setImmediate(resolve));
            seen[who.id] = requestIdentity.current()?.user?.id;
            return single({ data: {} });
          })
        ),
        { document: DOCUMENT }
      );
    const ravi: AuthUser = { id: '64b7f0c2a1e4c9d3f0a1b2c4', roles: ['MCP_USER'] };
    await Promise.all([run(ASHA, 1), run(ravi, 0)]);
    expect(seen).toEqual({ [ASHA.id]: ASHA.id, [ravi.id]: ravi.id });
  });

  it('returns the data and the errors of the result', async () => {
    const errors = [{ message: 'Host could not be loaded', path: ['pod', 'host'] }];
    const executeOperation = jest.fn().mockResolvedValue(single({ data: { pod: { id: 'p1', host: null } }, errors }));
    await expect(executeAsUser(callerFor(ASHA, executeOperation), { document: DOCUMENT })).resolves.toEqual({
      data: { pod: { id: 'p1', host: null } },
      errors,
    });
  });

  it('returns no errors key value when the operation succeeded cleanly', async () => {
    const executeOperation = jest.fn().mockResolvedValue(single({ data: { pod: null } }));
    const result = await executeAsUser(callerFor(ASHA, executeOperation), { document: DOCUMENT });
    expect(result.data).toEqual({ pod: null });
    expect(result.errors).toBeUndefined();
  });

  it('refuses an incremental (deferred or streamed) response it cannot hand back whole', async () => {
    const executeOperation = jest.fn().mockResolvedValue({ body: { kind: 'incremental' } });
    await expect(executeAsUser(callerFor(ASHA, executeOperation), { document: DOCUMENT })).rejects.toThrow('Unexpected incremental response');
  });

  it('passes on a failure of Apollo itself', async () => {
    const executeOperation = jest.fn().mockRejectedValue(new Error('plugin crashed'));
    await expect(executeAsUser(callerFor(ASHA, executeOperation), { document: DOCUMENT })).rejects.toThrow('plugin crashed');
  });
});

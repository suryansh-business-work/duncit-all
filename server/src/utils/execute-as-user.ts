import type { Request, Response } from 'express';
import type { ApolloServer } from '@apollo/server';
import type { DocumentNode, GraphQLFormattedError } from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { requestIdentity } from '@observability/requestIdentity';
import { NO_CONSENT } from '@utils/consent';

/**
 * Run one GraphQL operation as an account that authenticated with something
 * other than a session JWT — a table API token, an MCP connection.
 *
 * It goes through Apollo exactly like a portal request: the rate limiter, the
 * GraphQL monitor and every resolver's own role check apply, so the caller gets
 * precisely what that person could already do in a console — and the writes
 * have the same side effects (pod history, audit rows, notifications).
 *
 * The request identity is re-entered with the account, because the identity
 * middleware only recognises a JWT: without this, every change-log row a write
 * stamps would name nobody instead of the person who made it.
 */

export interface UserCaller {
  apollo: ApolloServer<GraphQLContext>;
  user: AuthUser;
  req: Request;
  res: Response;
  /** Wired once per HTTP request (watchClientPresence) — not once per operation. */
  isClientGone: () => boolean;
}

export interface UserOperation {
  document: DocumentNode;
  operationName?: string;
  variables?: Record<string, unknown>;
}

export interface OperationResult {
  data?: Record<string, unknown> | null;
  errors?: ReadonlyArray<GraphQLFormattedError>;
}

export async function executeAsUser(caller: UserCaller, operation: UserOperation): Promise<OperationResult> {
  const { apollo, user, req, res, isClientGone } = caller;
  const contextValue: GraphQLContext = {
    req,
    res,
    user,
    device_id: null,
    consent: NO_CONSENT,
    noRedis: true,
    isClientGone,
  };
  const identity = {
    ...requestIdentity.current(),
    user: { id: user.id, email: user.email ?? undefined, roles: user.roles },
  };
  const response = await requestIdentity.run(identity, () =>
    apollo.executeOperation(
      { query: operation.document, operationName: operation.operationName, variables: operation.variables },
      { contextValue }
    )
  );
  if (response.body.kind !== 'single') throw new Error('Unexpected incremental response');
  const { data, errors } = response.body.singleResult;
  return { data: data as OperationResult['data'], errors };
}

import { afterAll } from 'vitest';
import { ApolloServer } from '@apollo/server';
import express from 'express';
import type { LiteContext } from '../../context';
import { resolvers } from '../../graphql/resolvers';
import { typeDefs } from '../../graphql/typeDefs';
import type { LiteUserDoc } from '../../models/user.model';

/** The context Apollo would build for a request signed in as `user`, or an anonymous one. */
export const contextFor = (user: LiteUserDoc | null): LiteContext => ({
  req: Object.create(express.request),
  res: Object.create(express.response),
  user: user ? { id: String(user._id), email: user.email ?? '', is_admin: user.is_admin } : null,
});

/** The GraphQL error code of a result's first error. */
export const codeOf = (result: { errors?: readonly { extensions?: Record<string, unknown> }[] }) => result.errors?.[0]?.extensions?.code;

/**
 * Lite's real schema and resolvers in an Apollo server for this test file,
 * and a function that runs one operation as a person (or anonymously).
 */
export function liteGraphql() {
  const server = new ApolloServer<LiteContext>({ typeDefs, resolvers });

  afterAll(async () => {
    await server.stop();
  });

  return async function run<TData = Record<string, unknown>>(query: string, variables: Record<string, unknown> = {}, user: LiteUserDoc | null = null) {
    const response = await server.executeOperation<TData>({ query, variables }, { contextValue: contextFor(user) });
    if (response.body.kind !== 'single') throw new Error('expected a single result');
    return response.body.singleResult;
  };
}

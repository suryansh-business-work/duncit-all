import { GraphQLError } from 'graphql';

/** The error codes the web app and the console branch on. */
export const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
export const unauthenticated = (message = 'Please sign in to continue') =>
  new GraphQLError(message, { extensions: { code: 'UNAUTHENTICATED' } });
export const forbidden = (message = 'You do not have access to this') =>
  new GraphQLError(message, { extensions: { code: 'FORBIDDEN' } });
export const notFound = (what = 'This') => new GraphQLError(`${what} could not be found`, { extensions: { code: 'NOT_FOUND' } });
export const configError = (message: string) => new GraphQLError(message, { extensions: { code: 'CONFIG_ERROR' } });
export const upstreamError = (message: string) => new GraphQLError(message, { extensions: { code: 'UPSTREAM_ERROR' } });

import { randomInt } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { responsePathAsArray, type GraphQLResolveInfo, type GraphQLSchema } from 'graphql';
import type { ApolloServerPlugin, GraphQLRequestContextWillSendResponse } from '@apollo/server';
import type { GraphQLContext } from '@context';
import { isStressTraffic } from '../stressTest/stressTest.traffic';
import { APP_HEADER } from '../rateLimit/rateLimit.guard';
import { normaliseApp, normaliseSurface } from '../rateLimit/rateLimit.match';
import { record, type RequestError, type ResolverTiming } from './graphqlMonitor.collector';
import { round1 } from './graphqlMonitor.histogram';
import { flushGraphqlMonitor } from './graphqlMonitor.flusher';
import { runtime } from './graphqlMonitor.settings';
import { INVALID_OPERATION, describeOperation, type OperationShape } from './graphqlMonitor.signature';

/**
 * Measures every GraphQL request the way Apollo GraphOS does, without sending
 * anything off the box: total duration and its parse / validate / execute
 * phases, the operation's signature, the client, the errors — and, for a
 * sampled share of requests, how long each resolver took.
 *
 * Nothing here awaits I/O. `willSendResponse` hands one record to the in-memory
 * collector; the flusher writes rollups once a minute. Stress-run traffic is
 * left out, because bots hammering three queries would bury what real people do
 * (Stress Testing reports its own per-endpoint numbers).
 */

/** Resolver timings kept on one trace. Past this the request still counts. */
const MAX_RESOLVERS = 2_000;

/** The schema the Fields page lists, captured once the server starts. */
let monitoredSchema: GraphQLSchema | null = null;

export const currentSchema = (): GraphQLSchema | null => monitoredSchema;

interface RequestState {
  started: number;
  parse_ms: number;
  validate_ms: number;
  execute_ms: number | null;
  shape: OperationShape | null;
  resolvers: ResolverTiming[] | null;
  resolver_count: number;
}

function header(ctx: GraphQLContext, name: string): string | undefined {
  const raw = ctx.req?.headers?.[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** `SURFACE:app`, the same identity the rate limiter's Systems page shows. */
function clientOf(ctx: GraphQLContext): string {
  if (header(ctx, 'x-api-key')) return 'API:public-api';
  return `${normaliseSurface(header(ctx, 'x-duncit-surface'))}:${normaliseApp(header(ctx, APP_HEADER))}`;
}

/** The errors as the client received them — after formatError, with their codes. */
function errorsOf(rc: GraphQLRequestContextWillSendResponse<GraphQLContext>): RequestError[] {
  const body = rc.response.body;
  const sent = body.kind === 'single' ? body.singleResult.errors : undefined;
  const errors = sent ?? rc.errors ?? [];
  return errors.map((error) => ({
    code: typeof error.extensions?.code === 'string' ? error.extensions.code : 'GRAPHQL_ERROR',
    message: error.message,
    path: error.path?.join('.') ?? '',
  }));
}

function finish(rc: GraphQLRequestContextWillSendResponse<GraphQLContext>, state: RequestState): void {
  const errors = errorsOf(rc);
  record({
    shape: state.shape ?? INVALID_OPERATION,
    client: clientOf(rc.contextValue),
    at: Date.now(),
    duration_ms: round1(performance.now() - state.started),
    parse_ms: round1(state.parse_ms),
    validate_ms: round1(state.validate_ms),
    execute_ms: state.execute_ms === null ? null : round1(state.execute_ms),
    // A resolved operation that never executed and did not fail was answered
    // by the response cache.
    cached: state.shape !== null && state.execute_ms === null && errors.length === 0,
    errors,
    resolvers: state.resolvers,
    resolver_count: state.resolver_count,
  });
}

function timeResolvers(state: RequestState) {
  return ({ info }: { info: GraphQLResolveInfo }) => {
    state.resolver_count += 1;
    const begin = performance.now();
    return (error: Error | null) => {
      if (!state.resolvers || state.resolvers.length >= MAX_RESOLVERS) return;
      state.resolvers.push({
        path: responsePathAsArray(info.path).join('.'),
        parent_type: info.parentType.name,
        field_name: info.fieldName,
        return_type: String(info.returnType),
        start_ms: round1(begin - state.started),
        duration_ms: round1(performance.now() - begin),
        error: error ? error.message : null,
      });
    };
  };
}

export const graphqlMonitorPlugin: ApolloServerPlugin<GraphQLContext> = {
  async serverWillStart({ schema }) {
    monitoredSchema = schema;
    return {
      // A deploy stops the container; the last minute is written, not dropped.
      drainServer: flushGraphqlMonitor,
    };
  },

  async requestDidStart(rc) {
    if (!runtime.enabled || isStressTraffic(rc.contextValue.req)) return;
    const state: RequestState = {
      started: performance.now(),
      parse_ms: 0,
      validate_ms: 0,
      execute_ms: null,
      shape: null,
      resolvers: null,
      resolver_count: 0,
    };
    const sampled = runtime.field_sample_pct > 0 && randomInt(100) < runtime.field_sample_pct;

    return {
      async parsingDidStart() {
        const begin = performance.now();
        return async () => {
          state.parse_ms = performance.now() - begin;
        };
      },
      async validationDidStart() {
        const begin = performance.now();
        return async () => {
          state.validate_ms = performance.now() - begin;
        };
      },
      async didResolveOperation(ctx) {
        if (!ctx.operation) return;
        state.shape = describeOperation(ctx.queryHash, ctx.document, ctx.operation, ctx.schema);
      },
      async executionDidStart() {
        const begin = performance.now();
        const executionDidEnd = async () => {
          state.execute_ms = performance.now() - begin;
        };
        if (!sampled) return { executionDidEnd };
        state.resolvers = [];
        return { executionDidEnd, willResolveField: timeResolvers(state) };
      },
      async willSendResponse(ctx) {
        finish(ctx, state);
      },
    };
  },
};

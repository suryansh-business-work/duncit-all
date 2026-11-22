import type { Request, Response } from 'express';
import { ApolloServer } from '@apollo/server';
import {
  getNullableType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNonNullType,
  type GraphQLFormattedError,
  type GraphQLInputType,
} from 'graphql';
import type { AuthUser, GraphQLContext } from '@context';
import { resolvers, typeDefs, typeDefsByModule } from '@modules';
import { NO_CONSENT } from '@utils/consent';
import { buildGraphQLTools } from '../../catalog/build';
import { reachableCategories } from '../../catalog/visibility';
import type { GraphQLTool } from '../../tools/tool.types';

/**
 * Every mutation an MCP tool can run, run for real against the assembled
 * schema — once with nobody signed in, once as a plain member — to prove the
 * resolver itself refuses what the caller may not do. The MCP layer hides
 * console tools from people without the console (visibility.ts), but that is
 * a listing rule: the resolver's own check is what holds against a raw
 * GraphQL request, a mis-filed category or a future connector.
 *
 *   • Nobody signed in: every mutation must answer UNAUTHENTICATED or
 *     FORBIDDEN, except the public ones listed below with why.
 *   • A plain member (USER + MCP_USER): every mutation in a category none of
 *     a member's connectors serve must answer FORBIDDEN, except the few listed.
 *
 * Variables are the smallest values the schema accepts, so a resolver that
 * checks permissions first is refused before it ever reads them. A mutation
 * that answers anything else (NOT_FOUND, BAD_USER_INPUT, data…) got past the
 * door; the failure message names each one with what it answered.
 */

jest.setTimeout(15 * 60_000);

/** Public by design: a person who is not signed in uses these. */
const PUBLIC_MUTATIONS: Readonly<Record<string, string>> = {};

/** Member-facing mutations filed under a console category. */
const MEMBER_MUTATIONS: Readonly<Record<string, string>> = {};

const SAMPLE_ID = '64b7f0c2a1e4c9d3f0a1b2c3';
const CALL_TIMEOUT_MS = 5_000;
const REFUSED = new Set(['UNAUTHENTICATED', 'FORBIDDEN']);
const MEMBER: AuthUser = { id: '64b7f0c2a1e4c9d3f0a1b2c9', email: 'member@duncit.test', roles: ['USER', 'MCP_USER'] };

/** The smallest value GraphQL accepts for a type: required fields only, empty lists. */
function sample(type: GraphQLInputType): unknown {
  const inner = getNullableType(type);
  if (isListType(inner)) return [];
  if (isEnumType(inner)) return inner.getValues()[0]?.value ?? null;
  if (isInputObjectType(inner)) {
    const fields = Object.values(inner.getFields()).filter((field) => isNonNullType(field.type) && field.defaultValue === undefined);
    return Object.fromEntries(fields.map((field) => [field.name, sample(field.type)]));
  }
  switch (inner.name) {
    case 'Int':
    case 'Float':
      return 1;
    case 'Boolean':
      return false;
    default:
      return SAMPLE_ID;
  }
}

interface Outcome {
  tool: GraphQLTool;
  answer: string;
}

const fakeRequest = { headers: {}, ip: '203.0.113.9', path: '/graphql', method: 'POST', get: () => undefined } as unknown as Request;
const fakeResponse = { setHeader: () => undefined, cookie: () => undefined, clearCookie: () => undefined } as unknown as Response;

function contextFor(user: AuthUser | null): GraphQLContext {
  return { req: fakeRequest, res: fakeResponse, user, device_id: null, consent: NO_CONSENT, noRedis: true, isClientGone: () => false };
}

const describeErrors = (errors: ReadonlyArray<GraphQLFormattedError>) =>
  `${String(errors[0].extensions?.code ?? 'ERROR')}: ${errors[0].message.slice(0, 120)}`;

async function attempt(apollo: ApolloServer<GraphQLContext>, tool: GraphQLTool, user: AuthUser | null): Promise<string> {
  const field = builtSchema.getMutationType()?.getFields()[tool.field];
  const variables = Object.fromEntries(
    (field?.args ?? []).filter((arg) => isNonNullType(arg.type) && arg.defaultValue === undefined).map((arg) => [arg.name, sample(arg.type)])
  );
  const run = apollo.executeOperation({ query: tool.document, operationName: tool.operationName, variables }, { contextValue: contextFor(user) });
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'TIMEOUT'>((resolve) => {
    timer = setTimeout(() => resolve('TIMEOUT'), CALL_TIMEOUT_MS);
  });
  try {
    const response = await Promise.race([run, timeout]);
    if (response === 'TIMEOUT') return 'TIMEOUT';
    if (response.body.kind !== 'single') return 'INCREMENTAL';
    const { errors } = response.body.singleResult;
    if (!errors?.length) return 'OK';
    return errors.some((error) => REFUSED.has(String(error.extensions?.code))) ? 'REFUSED' : describeErrors(errors);
  } catch (error) {
    return `THREW: ${String(error).slice(0, 120)}`;
  } finally {
    clearTimeout(timer);
  }
}

const report = (outcomes: Outcome[]) => outcomes.map(({ tool, answer }) => `${tool.field} (${tool.category}) → ${answer}`).sort();

const { schema: builtSchema, tools } = buildGraphQLTools({ typeDefsByModule, resolvers });
const mutations = tools.filter((tool) => tool.kind === 'MUTATION');
const memberCategories = reachableCategories(MEMBER);
const consoleMutations = mutations.filter((tool) => !memberCategories.has(tool.category));

let apollo: ApolloServer<GraphQLContext>;
let anonymous: Outcome[];
let member: Outcome[];

beforeAll(async () => {
  apollo = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });
  await apollo.start();
  anonymous = [];
  for (const tool of mutations) anonymous.push({ tool, answer: await attempt(apollo, tool, null) });
  member = [];
  for (const tool of consoleMutations) member.push({ tool, answer: await attempt(apollo, tool, MEMBER) });
});

afterAll(async () => {
  await apollo.stop();
});

describe('authorization sweep — every MCP mutation, run for real', () => {
  it('covers the whole catalogue', () => {
    expect(mutations.length).toBeGreaterThan(300);
    expect(consoleMutations.length).toBeGreaterThan(100);
    expect(memberCategories.has('pods')).toBe(true);
    expect(memberCategories.has('finance')).toBe(false);
  });

  it('refuses every mutation to a caller who is not signed in, except the public ones', () => {
    const open = anonymous.filter(({ tool, answer }) => answer !== 'REFUSED' && !(tool.field in PUBLIC_MUTATIONS));
    expect(report(open)).toEqual([]);
  });

  it('refuses every console mutation to a plain member, except the member-facing ones', () => {
    const open = member.filter(({ tool, answer }) => answer !== 'REFUSED' && !(tool.field in MEMBER_MUTATIONS));
    expect(report(open)).toEqual([]);
  });

  it('keeps both exception lists honest — every entry is a real mutation that really is open', () => {
    const answered = (outcomes: Outcome[]) => new Map(outcomes.map(({ tool, answer }) => [tool.field, answer]));
    const anon = answered(anonymous);
    const asMember = answered(member);
    expect(Object.keys(PUBLIC_MUTATIONS).filter((field) => anon.get(field) === undefined || anon.get(field) === 'REFUSED')).toEqual([]);
    expect(Object.keys(MEMBER_MUTATIONS).filter((field) => asMember.get(field) === undefined || asMember.get(field) === 'REFUSED')).toEqual([]);
  });
});

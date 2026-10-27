/**
 * Shared fixtures for the MCP unit suites: a small but realistic API (pods,
 * clubs, venues, finance, chat, plus modules that must stay hidden), the
 * catalog the real builder makes from it, and a hand-built ToolContext.
 *
 * Not a test file (no `.test.ts`), so jest only loads it through the suites.
 */
import type { Request, Response } from 'express';
import type { ApolloServer } from '@apollo/server';
import type { AuthUser, GraphQLContext } from '@context';
import type { UserCaller } from '@utils/execute-as-user';
import { buildGraphQLTools, type CatalogSource } from '../../catalog/build';
import { SCOPE_READ, SCOPE_WRITE } from '../../mcp.constants';
import type { McpSettingsValue } from '../../settings/settings.types';
import { CURATED_TOOLS } from '../../tools/curated';
import type { McpCatalog, McpTool, ToolContext } from '../../tools/tool.types';

export const PUBLIC_URL = 'https://mcp.duncit.test';

export const FIXTURE_TYPE_DEFS: CatalogSource['typeDefsByModule'] = {
  rootTypeDefs: /* GraphQL */ `
    type Query {
      _empty: String
    }
    type Mutation {
      _empty: String
    }
  `,
  tableQueryTypeDefs: /* GraphQL */ `
    input TableFilterInput {
      field: String!
      op: String!
      value: String
      values: [String!]
    }
    input TableQueryInput {
      page: Int
      page_size: Int
      search: String
      filters: [TableFilterInput!]
    }
  `,
  podTypeDefs: /* GraphQL */ `
    "Where a pod stands."
    enum PodStatus {
      LIVE
      DRAFT
      CANCELLED
    }
    type PodHost {
      name: String
      phone_hash: String
    }
    type Pod {
      id: ID!
      pod_title: String!
      pod_date_time: String
      pod_end_date_time: String
      venue_id: ID
      pod_hosts_id: [ID!]
      status: PodStatus
      host_otp: String
      host: PodHost
      venue: Venue
    }
    type PodPage {
      rows: [Pod!]!
      total: Int!
    }
    input PodInput {
      pod_title: String!
      pod_description: String
      no_of_spots: Int
      status: PodStatus = DRAFT
    }
    extend type Query {
      "Pods in the console's table, paged and filtered."
      podsTable(query: TableQueryInput, include_deleted: Boolean = false): PodPage!
      pod(id: ID!): Pod
      podCount: Int!
    }
    extend type Mutation {
      createPod(input: PodInput!): Pod
      deletePod(id: ID!, reason: String): Boolean!
      joinFreePod(pod_id: ID!): Boolean!
      sendPodReminder(pod_id: ID!): Boolean!
    }
  `,
  clubTypeDefs: /* GraphQL */ `
    type Club {
      id: ID!
      name: String!
    }
    type ClubPage {
      rows: [Club!]!
      total: Int!
    }
    extend type Query {
      clubsTable(query: TableQueryInput): ClubPage!
    }
  `,
  venueTypeDefs: /* GraphQL */ `
    type Venue {
      id: ID!
      name: String
    }
    extend type Query {
      venue(id: ID!): Venue
    }
  `,
  financeTypeDefs: /* GraphQL */ `
    extend type Query {
      payoutSummary: Int
    }
    extend type Mutation {
      approvePaymentRelease(id: ID!): Boolean!
      refundPayment(id: ID!, amount: Float!): Boolean!
    }
  `,
  chatTypeDefs: /* GraphQL */ `
    extend type Query {
      staffCallIceServers: [String!]!
      podChatMessages(pod_id: ID!): [String!]!
    }
  `,
  authTypeDefs: /* GraphQL */ `
    extend type Mutation {
      login(email: String!, password: String!): String
      verifyOtp(code: String!): Boolean
    }
  `,
  userTypeDefs: /* GraphQL */ `
    extend type Mutation {
      resetUserPassword(id: ID!): Boolean
    }
  `,
};

/** `Pod.venue` has its own resolver — the catalog must never follow it. */
export const FIXTURE_RESOLVERS: CatalogSource['resolvers'] = [{ Pod: { venue: () => null } }];

export function buildFixtureCatalog(extra: readonly McpTool[] = []): McpCatalog {
  const built = buildGraphQLTools({ typeDefsByModule: FIXTURE_TYPE_DEFS, resolvers: FIXTURE_RESOLVERS });
  const tools: McpTool[] = [...CURATED_TOOLS, ...built.tools, ...extra];
  return { schema: built.schema, tools, byName: new Map(tools.map((tool) => [tool.name, tool])), skipped: built.skipped };
}

export const user = (roles: string[], over: Partial<AuthUser> = {}): AuthUser => ({
  id: '64b7f0c2a1e4c9d3f0a1b2c3',
  email: 'asha@duncit.com',
  roles,
  ...over,
});

/** An MCP user with no console: the member app, the partners app and the MCP console. */
export const MEMBER = user(['MCP_USER']);
export const PODS_STAFF = user(['MCP_USER', 'ALL_PODS_ACCESS']);
export const FINANCE_STAFF = user(['MCP_USER', 'FINANCE_MANAGER']);
export const SUPER_ADMIN = user(['SUPER_ADMIN']);

export const READ_WRITE = [SCOPE_READ, SCOPE_WRITE] as const;
export const READ_ONLY = [SCOPE_READ] as const;

export function settings(over: Partial<McpSettingsValue> = {}): McpSettingsValue {
  return {
    write_tools_enabled: true,
    default_injection_guard: 'block',
    disabled_tools: [],
    disabled_categories: [],
    token_price_input_per_million: 3,
    token_price_output_per_million: 15,
    currency: 'USD',
    trusted_redirect_hosts: ['claude.ai'],
    allow_untrusted_clients: false,
    updated_at: null,
    updated_by: null,
    ...over,
  };
}

export function caller(account: AuthUser): UserCaller {
  return {
    apollo: {} as ApolloServer<GraphQLContext>,
    user: account,
    req: {} as Request,
    res: {} as Response,
    isClientGone: () => false,
  };
}

export interface ContextOptions {
  user?: AuthUser;
  endpoint?: string;
  scopes?: readonly string[];
  settings?: McpSettingsValue;
  catalog?: McpCatalog;
  publicUrl?: string;
}

export type FakeContext = ToolContext & { execute: jest.Mock; callTool: jest.Mock };

export function toolContext(options: ContextOptions = {}): FakeContext {
  const account = options.user ?? PODS_STAFF;
  return {
    user: account,
    endpoint: options.endpoint ?? 'pods',
    scopes: options.scopes ?? READ_WRITE,
    settings: options.settings ?? settings(),
    catalog: options.catalog ?? buildFixtureCatalog(),
    caller: caller(account),
    connection: { id: '64b7f0c2a1e4c9d3f0a1b2d4', clientName: 'Claude' },
    publicUrl: options.publicUrl ?? PUBLIC_URL,
    execute: jest.fn(),
    callTool: jest.fn(),
  };
}

export function toolNamed(catalog: McpCatalog, name: string): McpTool {
  const tool = catalog.byName.get(name);
  if (!tool) throw new Error(`fixture has no tool ${name}`);
  return tool;
}

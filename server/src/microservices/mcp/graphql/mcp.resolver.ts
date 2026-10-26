import type { GraphQLContext } from '@context';
import { getUrlConfigs } from '@config/url-configs';
import { requireAuth } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { mcpConnectionService } from '../auth/connections.service';
import { mcpConsentService } from '../auth/consent.service';
import { getCatalog } from '../catalog/catalog';
import { catalogFor, connectorLabel, connectorsFor, type CatalogFilter } from '../catalog/console.service';
import { requireMcpManager, requireMcpUser } from '../mcp.access';
import { mcpSettingsService } from '../settings/settings.service';
import type { McpSettingsInput } from '../settings/settings.types';
import { mcpUsageService } from '../usage/usage.service';

/**
 * The MCP console's API. Every read is scoped in the services (own data, or
 * everyone's for an MCP manager); settings are managers only. The consent
 * mutations need only a signed-in account — approving additionally needs an
 * MCP role, which the consent service checks. None of the four mutations is
 * ever offered as an MCP tool (catalog/denylist.ts).
 */

/** The OAuth issuer exactly as the metadata document names it: the MCP URL, normalised by URL. */
const issuerUrl = async (): Promise<string> => new URL((await getUrlConfigs()).mcpUrl).href;

interface IdArgs {
  id: string;
}

interface TableArgs {
  query?: TableQueryInput | null;
}

interface UsageArgs {
  from?: string | null;
  to?: string | null;
  user_id?: string | null;
}

export const mcpResolvers = {
  Query: {
    mcpConnectors: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireMcpUser(ctx);
      const [{ mcpUrl }, settings] = await Promise.all([getUrlConfigs(), mcpSettingsService.get()]);
      return connectorsFor(getCatalog(), user, settings, mcpUrl);
    },
    mcpCatalog: async (_p: unknown, args: CatalogFilter, ctx: GraphQLContext) =>
      catalogFor(getCatalog(), requireMcpUser(ctx), await mcpSettingsService.get(), args),
    mcpUsageSummary: (_p: unknown, args: UsageArgs, ctx: GraphQLContext) =>
      mcpUsageService.summary(requireMcpUser(ctx), args),
    mcpToolCallsTable: (_p: unknown, args: TableArgs, ctx: GraphQLContext) =>
      mcpUsageService.table(requireMcpUser(ctx), args.query),
    mcpToolCall: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => mcpUsageService.one(requireMcpUser(ctx), args.id),
    myMcpConnections: (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      mcpConnectionService.listForUser(requireMcpUser(ctx).id),
    mcpConnectionsTable: (_p: unknown, args: TableArgs, ctx: GraphQLContext) =>
      mcpConnectionService.table(requireMcpUser(ctx), args.query),
    mcpSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireMcpManager(ctx);
      return mcpSettingsService.get();
    },
    mcpAuthorizationRequest: async (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const { mcpUrl } = await getUrlConfigs();
      return mcpConsentService.describe(args.id, user, (resource) => connectorLabel(resource, mcpUrl));
    },
  },
  Mutation: {
    approveMcpAuthorization: async (_p: unknown, args: IdArgs & { allow_write: boolean }, ctx: GraphQLContext) =>
      mcpConsentService.approve(args.id, requireAuth(ctx), args.allow_write, await issuerUrl()),
    denyMcpAuthorization: async (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      mcpConsentService.deny(args.id, requireAuth(ctx), await issuerUrl()),
    revokeMcpConnection: (_p: unknown, args: IdArgs, ctx: GraphQLContext) =>
      mcpConnectionService.revoke(args.id, requireMcpUser(ctx)),
    updateMcpSettings: (_p: unknown, args: { input: McpSettingsInput }, ctx: GraphQLContext) =>
      mcpSettingsService.update(args.input, requireMcpManager(ctx).id),
  },
};

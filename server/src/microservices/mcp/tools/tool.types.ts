import type { DocumentNode, GraphQLSchema } from 'graphql';
import type { AuthUser } from '@context';
import type { OperationResult, UserCaller } from '@utils/execute-as-user';
import type { McpCategoryKey, ModuleName } from '../catalog/categories';
import type { ToolInputSchema } from '../catalog/json-schema';
import type { OperationKind, ToolRisk } from '../catalog/risk';
import type { McpSettingsValue } from '../settings/settings.types';

/**
 * One MCP tool, whichever way it was made.
 *
 *  - GRAPHQL tools are derived from the API: one per Query/Mutation field, run
 *    through Apollo as the signed-in person (see catalog/build.ts).
 *  - CURATED tools are written by hand where one call is not enough — the
 *    catalog's own meta tools, the pod-timing audit, the self-test.
 */

export type ToolKind = OperationKind | 'CURATED';

interface ToolBase {
  name: string;
  title: string;
  description: string;
  category: McpCategoryKey;
  kind: ToolKind;
  risk: ToolRisk;
  /** Refuses to run until `mcp_confirm: true` says the person agreed. */
  confirm: boolean;
  /** Reaches people or systems outside Duncit (MCP openWorldHint). */
  outward: boolean;
  /** The arguments, including the meta parameters every tool takes. */
  inputSchema: ToolInputSchema;
}

export interface GraphQLTool extends ToolBase {
  source: 'graphql';
  kind: OperationKind;
  field: string;
  module: ModuleName;
  document: DocumentNode;
  operationName: string;
  /** The GraphQL argument names — the only keys forwarded as variables. */
  argNames: readonly string[];
}

export interface ToolAnnotationOverrides {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface CuratedTool extends ToolBase {
  source: 'curated';
  kind: 'CURATED';
  /** Where the tool is listed: `gateway`, an endpoint key, or `*` for all. */
  listedOn: readonly string[];
  /** When the derived MCP annotations would mislead (a tool that calls other tools). */
  annotations?: ToolAnnotationOverrides;
  /** Validates its own arguments (meta parameters already removed), then does the work. */
  run(context: ToolContext, args: Record<string, unknown>): Promise<unknown>;
}

export type McpTool = GraphQLTool | CuratedTool;

export interface ToolCallOutcome {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

/** Everything a curated tool may use while it runs. */
export interface ToolContext {
  user: AuthUser;
  endpoint: string;
  scopes: readonly string[];
  settings: McpSettingsValue;
  catalog: McpCatalog;
  caller: UserCaller;
  connection: { id: string; clientName: string };
  /** https://mcp.duncit.com — connector URLs are built from it. */
  publicUrl: string;
  /** One GraphQL operation as the signed-in person. */
  execute(document: DocumentNode, variables?: Record<string, unknown>): Promise<OperationResult>;
  /** Another tool, through the full pipeline (the gateway's mcp_call_tool). */
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallOutcome>;
}

export interface SkippedField {
  field: string;
  kind: OperationKind;
  module: string;
  reason: string;
}

export interface McpCatalog {
  schema: GraphQLSchema;
  tools: readonly McpTool[];
  byName: ReadonlyMap<string, McpTool>;
  /** Fields deliberately not exposed, with the reason — reported by mcp_audit_tools. */
  skipped: readonly SkippedField[];
}

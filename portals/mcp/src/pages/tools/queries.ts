import { gql } from '@apollo/client';
import type { McpCategoryCount, McpToolInfo } from '@duncit/gql-types';

/**
 * The catalog as the Tools table lists it — one connector's tools, without the
 * long description and input schema (about 2,000 tools; those two fields are
 * most of the weight). The drawer reads them for the one tool it opens.
 */
export const MCP_TOOLS_CATALOG = gql`
  query McpToolsCatalog($endpoint: String) {
    mcpCatalog(endpoint: $endpoint) {
      total
      categories {
        category
        label
        tools
      }
      tools {
        name
        title
        category
        category_label
        risk
        needs_confirmation
        available
        unavailable_reason
      }
    }
  }
`;

/** One tool's long half. The catalog has no by-name lookup, so the name is searched and matched exactly. */
export const MCP_TOOL_DETAIL = gql`
  query McpToolDetail($search: String) {
    mcpCatalog(search: $search) {
      tools {
        name
        description
        kind
        endpoints
        reaches_outside
        input_schema
      }
    }
  }
`;

export type ToolRow = Pick<
  McpToolInfo,
  'name' | 'title' | 'category' | 'category_label' | 'risk' | 'needs_confirmation' | 'available' | 'unavailable_reason'
>;
export type CategoryCount = Pick<McpCategoryCount, 'category' | 'label' | 'tools'>;
export type ToolDetail = Pick<McpToolInfo, 'name' | 'description' | 'kind' | 'endpoints' | 'reaches_outside' | 'input_schema'>;

export interface ToolsCatalogData {
  mcpCatalog: { total: number; categories: CategoryCount[]; tools: ToolRow[] };
}

export interface ToolDetailData {
  mcpCatalog: { tools: ToolDetail[] };
}

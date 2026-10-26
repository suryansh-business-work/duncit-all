import { gql } from '@apollo/client';
import type { McpSettings, PublicProfile } from '@duncit/gql-types';

/** Every settings field, read and written back by the same selection. */
const SETTINGS_FIELDS = `
  write_tools_enabled
  default_injection_guard
  disabled_tools
  disabled_categories
  token_price_input_per_million
  token_price_output_per_million
  currency
  trusted_redirect_hosts
  allow_untrusted_clients
  updated_at
  updated_by
`;

/** The MCP settings — managers only (the server refuses everyone else). */
export const MCP_SETTINGS = gql`
  query McpSettings {
    mcpSettings {
      ${SETTINGS_FIELDS}
    }
  }
`;

export const UPDATE_MCP_SETTINGS = gql`
  mutation UpdateMcpSettings($input: McpSettingsInput!) {
    updateMcpSettings(input: $input) {
      ${SETTINGS_FIELDS}
    }
  }
`;

/** What the switch-off pickers offer: every category and every tool name in the catalog. */
export const MCP_SETTINGS_OPTIONS = gql`
  query McpSettingsOptions {
    mcpCatalog {
      categories {
        category
        label
      }
      tools {
        name
      }
    }
  }
`;

/** Who saved the settings last, by name rather than by id. */
export const MCP_SETTINGS_EDITOR = gql`
  query McpSettingsEditor($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      username
    }
  }
`;

export type SettingsData = Omit<McpSettings, '__typename'>;

export interface McpSettingsData {
  mcpSettings: SettingsData;
}

export interface UpdateMcpSettingsData {
  updateMcpSettings: SettingsData;
}

export interface SettingsOptionsData {
  mcpCatalog: { categories: Array<{ category: string; label: string }>; tools: Array<{ name: string }> };
}

export interface SettingsEditorData {
  publicUsersByIds: Array<Pick<PublicProfile, 'user_id' | 'full_name' | 'username'>>;
}

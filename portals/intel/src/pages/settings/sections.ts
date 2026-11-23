/**
 * The 17 Settings sections, in menu order. `key` is the URL segment
 * (/setting/<key>); `label` is a literal catalogue key for the translation gate.
 */
export const SETTINGS_SECTIONS = [
  { key: 'general', label: 'intel.settings.sections.general' },
  { key: 'models', label: 'intel.settings.sections.models' },
  { key: 'openai', label: 'intel.settings.sections.openai' },
  { key: 'database', label: 'intel.settings.sections.database' },
  { key: 'mcp', label: 'intel.settings.sections.mcp' },
  { key: 'slack', label: 'intel.settings.sections.slack' },
  { key: 'gmail', label: 'intel.settings.sections.gmail' },
  { key: 'github', label: 'intel.settings.sections.github' },
  { key: 'qdrant', label: 'intel.settings.sections.qdrant' },
  { key: 'embeddings', label: 'intel.settings.sections.embeddings' },
  { key: 'media', label: 'intel.settings.sections.media' },
  { key: 'sync', label: 'intel.settings.sections.sync' },
  { key: 'access', label: 'intel.settings.sections.access' },
  { key: 'security', label: 'intel.settings.sections.security' },
  { key: 'usage', label: 'intel.settings.sections.usage' },
  { key: 'audit', label: 'intel.settings.sections.audit' },
  { key: 'health', label: 'intel.settings.sections.health' },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['key'];

export const isSettingsSection = (value: string | undefined): value is SettingsSection => SETTINGS_SECTIONS.some((s) => s.key === value);

/** Which connector kind each connector section manages. */
export const CONNECTOR_SECTION_KIND: Partial<Record<SettingsSection, string>> = {
  database: 'MONGODB',
  mcp: 'MCP',
  slack: 'SLACK',
  gmail: 'GMAIL',
  github: 'GITHUB',
};

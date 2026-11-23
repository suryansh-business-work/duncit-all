import type { ReactElement } from 'react';
import type { ChipProps } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GitHubIcon from '@mui/icons-material/GitHub';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import HubIcon from '@mui/icons-material/Hub';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import StorageIcon from '@mui/icons-material/Storage';
import TagIcon from '@mui/icons-material/Tag';

/**
 * How each knowledge source and source state looks, in one place for the
 * start screen, the composer's source picker and the settings pages.
 * Icons come from @mui/icons-material (no brand marks are bundled).
 */

export const SOURCE_KEYS = ['MONGODB', 'MCP', 'GITHUB', 'SLACK', 'GMAIL', 'MEDIA'] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

const ICONS: Record<string, () => ReactElement> = {
  MONGODB: () => <StorageIcon fontSize="small" />,
  MCP: () => <HubIcon fontSize="small" />,
  GITHUB: () => <GitHubIcon fontSize="small" />,
  SLACK: () => <TagIcon fontSize="small" />,
  GMAIL: () => <EmailOutlinedIcon fontSize="small" />,
  MEDIA: () => <PermMediaIcon fontSize="small" />,
  QDRANT: () => <HexagonOutlinedIcon fontSize="small" />,
  OPENAI: () => <AutoAwesomeIcon fontSize="small" />,
};

export const sourceIcon = (source: string): ReactElement => (ICONS[source] ?? ICONS.MEDIA)();

/** Literal keys so the translation gate can see every one. */
export const SOURCE_LABEL_KEYS: Record<string, string> = {
  MONGODB: 'intel.sources.MONGODB',
  MCP: 'intel.sources.MCP',
  GITHUB: 'intel.sources.GITHUB',
  SLACK: 'intel.sources.SLACK',
  GMAIL: 'intel.sources.GMAIL',
  MEDIA: 'intel.sources.MEDIA',
  QDRANT: 'intel.sources.QDRANT',
  OPENAI: 'intel.sources.OPENAI',
};

export const STATE_LABEL_KEYS: Record<string, string> = {
  CONNECTED: 'intel.states.CONNECTED',
  DISCONNECTED: 'intel.states.DISCONNECTED',
  SYNCING: 'intel.states.SYNCING',
  ERROR: 'intel.states.ERROR',
  RESTRICTED: 'intel.states.RESTRICTED',
};

export const STATE_COLOR: Record<string, ChipProps['color']> = {
  CONNECTED: 'success',
  SYNCING: 'info',
  ERROR: 'error',
  RESTRICTED: 'warning',
  DISCONNECTED: 'default',
};

export const ENV_LABEL_KEYS: Record<string, string> = {
  STAGING: 'intel.env.STAGING',
  PRODUCTION: 'intel.env.PRODUCTION',
  BOTH: 'intel.env.BOTH',
  SHARED: 'intel.env.SHARED',
};

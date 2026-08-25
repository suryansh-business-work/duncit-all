import type { ReactNode } from 'react';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LaunchIcon from '@mui/icons-material/Launch';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * One entry in the apps drawer.
 *
 * A tool is something that opens over whatever page you are on rather than
 * navigating away from it — that is what makes the drawer different from the
 * sidebar, which is this portal's own pages.
 */
export interface ShellTool {
  key: string;
  name: string;
  /** One line, and it is also what the drawer's search matches on. */
  description: string;
  icon: ReactNode;
  /** Words a person might type looking for it, beyond its name. */
  keywords?: string[];
}

/**
 * The platform's own tools — everything about them except the words.
 *
 * The name and the blurb are localized copy (rule 38) and so live in the shell
 * bundle, keyed by `key`; the keywords stay here because nobody reads them, they
 * only widen what the search box matches.
 */
const PLATFORM_TOOLS: ReadonlyArray<Omit<ShellTool, 'name' | 'description'>> = [
  {
    key: 'file-manager',
    icon: <FolderOpenIcon />,
    keywords: ['files', 'media', 'images', 'upload', 'imagekit', 'assets', 'gallery', 'photos'],
  },
  {
    key: 'staff-chat',
    icon: <ChatBubbleOutlineIcon />,
    keywords: ['chat', 'message', 'dm', 'colleague', 'coworker', 'team', 'talk', 'staff'],
  },
  {
    key: 'jump-to-portal',
    icon: <LaunchIcon />,
    keywords: ['portal', 'console', 'switch', 'jump', 'access', 'request', 'admin', 'apps'],
  },
  {
    key: 'ask-bot',
    icon: <SmartToyOutlinedIcon />,
    keywords: ['bot', 'ai', 'ask', 'help', 'where', 'find', 'navigate', 'assistant', 'chat', 'guide'],
  },
];

/**
 * The tools every portal gets, in the reader's language.
 *
 * Every key is written out as a literal: the localization gate greps for
 * `t('…')`, so a key built from `tool.key` would be invisible to it and would
 * ship untranslated.
 */
export function useShellTools(): ShellTool[] {
  const { t } = useTranslation();
  const copy: Record<string, { name: string; description: string }> = {
    'file-manager': {
      name: t('shell.appsDrawer.fileManager.name'),
      description: t('shell.appsDrawer.fileManager.description'),
    },
    'staff-chat': {
      name: t('shell.appsDrawer.staffChat.name'),
      description: t('shell.appsDrawer.staffChat.description'),
    },
    'jump-to-portal': {
      name: t('shell.appsDrawer.jumpToPortal.name'),
      description: t('shell.appsDrawer.jumpToPortal.description'),
    },
    'ask-bot': {
      name: t('shell.appsDrawer.askBot.name'),
      description: t('shell.appsDrawer.askBot.description'),
    },
  };
  return PLATFORM_TOOLS.map((tool) => ({ ...tool, ...copy[tool.key] }));
}

/** Name, description and keywords, so a search finds what a person means. */
export function matchesTool(tool: ShellTool, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const haystack = [tool.name, tool.description, ...(tool.keywords ?? [])].join(' ').toLowerCase();
  return haystack.includes(q);
}

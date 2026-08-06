import type { ReactNode } from 'react';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

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
 * The tools every portal gets, because they are about the platform rather than
 * about any one console.
 */
export const SHELL_TOOLS: ShellTool[] = [
  {
    key: 'file-manager',
    name: 'File Manager',
    description: 'Everything uploaded to ImageKit — upload, search, crop, copy a link.',
    icon: <FolderOpenIcon />,
    keywords: ['files', 'media', 'images', 'upload', 'imagekit', 'assets', 'gallery', 'photos'],
  },
];

/** Name, description and keywords, so a search finds what a person means. */
export function matchesTool(tool: ShellTool, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const haystack = [tool.name, tool.description, ...(tool.keywords ?? [])].join(' ').toLowerCase();
  return haystack.includes(q);
}

import type { RowMenuItem } from '@duncit/table';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import PublicIcon from '@mui/icons-material/Public';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import type { DetailCopy } from '../../detailCopy';
import type { AiPrompt, LibraryTab } from '../../types';

/** What a row's menu can do; the library view owns every one of these. */
export interface PromptRowActions {
  onOpen: (prompt: AiPrompt) => void;
  onEdit: (prompt: AiPrompt) => void;
  onQuickView: (prompt: AiPrompt) => void;
  onShare: (prompt: AiPrompt) => void;
  onPublicShare: (prompt: AiPrompt) => void;
  onArchive: (prompt: AiPrompt) => void;
  onUnarchive: (prompt: AiPrompt) => void;
  onReset: (prompt: AiPrompt) => void;
  onDelete: (prompt: AiPrompt) => void;
}

const item = (key: string, label: string, icon: RowMenuItem['icon'], onClick: () => void, destructive = false): RowMenuItem => ({
  key,
  label,
  icon,
  onClick,
  destructive,
});

/**
 * One row's menu, by tab. A code prompt is read by a call site on every
 * request, so it can be reset but never archived or deleted; an archived prompt
 * is read-only until it is brought back.
 */
export function promptRowMenu(prompt: AiPrompt, tab: LibraryTab, copy: DetailCopy, actions: PromptRowActions): RowMenuItem[] {
  const { actions: label } = copy;
  const items: RowMenuItem[] = [item('open', label.open, <OpenInFullIcon fontSize="small" />, () => actions.onOpen(prompt))];
  if (tab !== 'ARCHIVED') items.push(item('edit', label.edit, <EditIcon fontSize="small" />, () => actions.onEdit(prompt)));
  items.push(
    item('quick-view', label.quickView, <VisibilityIcon fontSize="small" />, () => actions.onQuickView(prompt)),
    item('share', label.share, <LinkIcon fontSize="small" />, () => actions.onShare(prompt)),
  );
  if (tab !== 'ARCHIVED') {
    items.push(item('public-share', label.publicShare, <PublicIcon fontSize="small" />, () => actions.onPublicShare(prompt)));
  }
  if (tab === 'CODE') items.push(item('reset', label.reset, <RestartAltIcon fontSize="small" />, () => actions.onReset(prompt)));
  if (tab === 'AI') items.push(item('archive', label.archive, <ArchiveIcon fontSize="small" />, () => actions.onArchive(prompt)));
  if (tab === 'ARCHIVED') {
    items.push(item('unarchive', label.unarchive, <UnarchiveIcon fontSize="small" />, () => actions.onUnarchive(prompt)));
  }
  if (tab !== 'CODE') items.push(item('delete', label.delete, <DeleteIcon fontSize="small" />, () => actions.onDelete(prompt), true));
  return items;
}

import { ListItem, ListItemButton, ListItemText, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { formatBytes } from '@duncit/utils';
import { formatReelDuration } from '../../format';
import type { ReelDriveEntry } from '../../types';
import MediaThumb from '../MediaThumb';

interface Props {
  entry: ReelDriveEntry;
  /** True when the reel already holds this file. */
  added: boolean;
  onEnter: (entry: ReelDriveEntry) => void;
  onAdd: (entry: ReelDriveEntry) => Promise<void>;
}

/** What is worth knowing about a file before adding it: how long, how big. */
function entryMeta(entry: ReelDriveEntry): string {
  const parts: string[] = [];
  if (entry.duration_ms > 0) parts.push(formatReelDuration(entry.duration_ms));
  if (entry.width > 0 && entry.height > 0) parts.push(`${entry.width}×${entry.height}`);
  if (entry.size_bytes > 0) parts.push(formatBytes(entry.size_bytes));
  return parts.join(' · ');
}

const TEXT_SLOTS = { primary: { noWrap: true, variant: 'body2' }, secondary: { noWrap: true, variant: 'caption' } } as const;

/** One line of the Drive browser: a folder to step into, or a file to add to the reel. */
export default function DriveEntryRow({ entry, added, onEnter, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();

  if (entry.kind === 'FOLDER') {
    return (
      <ListItem disablePadding data-testid={`reel-drive-folder-${entry.id}`}>
        <ListItemButton onClick={() => onEnter(entry)} sx={{ gap: 1.5, py: 0.75 }}>
          <MediaThumb kind="FOLDER" src="" />
          <ListItemText primary={entry.name} slotProps={TEXT_SLOTS} />
          <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        </ListItemButton>
      </ListItem>
    );
  }

  const addLabel = t('ai.reels.sources.addFile', { vars: { name: entry.name } });
  const action = added ? (
    <Tooltip title={t('ai.reels.sources.alreadyAdded')}>
      <CheckIcon fontSize="small" role="img" aria-label={t('ai.reels.sources.alreadyAdded')} sx={{ color: 'text.secondary', mx: 1 }} />
    </Tooltip>
  ) : (
    <Tooltip title={t('ai.reels.sources.add')}>
      <span>
        <DuncitIconButton size="small" color="primary" aria-label={addLabel} onClick={() => onAdd(entry)} data-testid={`reel-drive-add-${entry.id}`}>
          <AddIcon fontSize="small" />
        </DuncitIconButton>
      </span>
    </Tooltip>
  );

  return (
    <ListItem secondaryAction={action} sx={{ gap: 1.5, py: 0.75, pr: 7 }} data-testid={`reel-drive-file-${entry.id}`}>
      <MediaThumb kind={entry.kind} src={entry.thumbnail_url} />
      <ListItemText primary={entry.name} secondary={entryMeta(entry)} slotProps={TEXT_SLOTS} />
    </ListItem>
  );
}

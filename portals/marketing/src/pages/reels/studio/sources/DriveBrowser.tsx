import { useMemo } from 'react';
import { Alert, Box, Breadcrumbs, Link, List, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { ReelDriveEntry } from '../../types';
import DriveEntryRow from './DriveEntryRow';
import { useDriveFolder } from './useDriveFolder';

interface Props {
  rootFolderId: string;
  /** Drive file ids this reel already holds, as the server reports them. */
  heldFileIds: ReadonlySet<string>;
  onAdd: (fileIds: string[]) => Promise<void>;
}

/**
 * The reel's Drive folder, browsable.
 *
 * Folders step in, files add to the reel. A file the reel already holds shows a
 * tick instead of the button — adding it twice would only give the editor two
 * names for one clip.
 */
export default function DriveBrowser({ rootFolderId, heldFileIds, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const { folder, loading, error, trail, enter, goTo, reload } = useDriveFolder(rootFolderId);
  const entries = folder?.entries ?? [];
  const rootName = trail.length === 0 ? folder?.name : undefined;
  const addOne = useMemo(() => (entry: ReelDriveEntry) => onAdd([entry.id]), [onAdd]);

  return (
    <Stack sx={{ minHeight: 0, flex: 1 }} data-testid="reel-drive-browser">
      <Stack direction="row" sx={{ alignItems: 'center', px: 1.5, py: 0.5, gap: 1 }}>
        <Breadcrumbs aria-label={t('ai.reels.sources.driveTrail')} sx={{ flex: 1, minWidth: 0, fontSize: 13 }}>
          {trail.length === 0 ? (
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {rootName ?? t('ai.reels.sources.driveRoot')}
            </Typography>
          ) : (
            <Link component="button" type="button" variant="body2" underline="hover" onClick={() => goTo(-1)}>
              {t('ai.reels.sources.driveRoot')}
            </Link>
          )}
          {trail.map((crumb, index) =>
            index === trail.length - 1 ? (
              <Typography key={crumb.id} variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {crumb.name}
              </Typography>
            ) : (
              <Link key={crumb.id} component="button" type="button" variant="body2" underline="hover" onClick={() => goTo(index)}>
                {crumb.name}
              </Link>
            )
          )}
        </Breadcrumbs>
        <Tooltip title={t('ai.reels.sources.refresh')}>
          <span>
            <DuncitIconButton size="small" aria-label={t('ai.reels.sources.refresh')} onClick={reload} data-testid="reel-drive-refresh">
              <RefreshIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ m: 1.5 }} data-testid="reel-drive-error">
            {parseApiError(error, t('ai.reels.sources.driveFailed'))}
          </Alert>
        )}
        {loading && !folder && <Loader variant="block" />}
        {folder?.truncated && (
          <Alert severity="info" sx={{ m: 1.5 }}>
            {t('ai.reels.sources.truncated')}
          </Alert>
        )}
        {folder && entries.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', p: 2 }}>
            {t('ai.reels.sources.folderEmpty')}
          </Typography>
        )}
        {entries.length > 0 && (
          <List dense disablePadding aria-label={t('ai.reels.sources.driveFiles')}>
            {entries.map((entry) => (
              <DriveEntryRow key={entry.id} entry={entry} added={heldFileIds.has(entry.id)} onEnter={enter} onAdd={addOne} />
            ))}
          </List>
        )}
      </Box>
    </Stack>
  );
}

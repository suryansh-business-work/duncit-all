import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Link, Stack, Typography } from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { REEL_DRIVE_STATUS } from '../../queries';
import type { ReelDriveStatus, ReelProject } from '../../types';
import type { ReelActions } from '../useReelActions';
import DriveBrowser from './DriveBrowser';

interface Props {
  project: ReelProject;
  actions: ReelActions;
  /** Opens the reel's details, where its Drive folder link is set. */
  onEditDetails: () => void;
}

/** What stands between the operator and their folder, when something does. */
function DriveNotice({ status, hasFolder, onEditDetails }: Readonly<{ status: ReelDriveStatus | null; hasFolder: boolean; onEditDetails: () => void }>) {
  const { t } = useTranslation();
  // Nothing until the status is known, so a reel never flashes the wrong advice.
  if (!status) return null;
  if (!status.configured) {
    return (
      <Alert severity="warning" sx={{ m: 1.5 }} data-testid="reel-drive-not-configured">
        {t('ai.reels.sources.driveNotConfigured')}
      </Alert>
    );
  }
  if (hasFolder) return null;
  return (
    <Stack spacing={1} sx={{ p: 2, alignItems: 'flex-start' }} data-testid="reel-drive-no-folder">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ai.reels.sources.noFolder')}
      </Typography>
      <DuncitButton size="small" variant="outlined" startIcon={<AddLinkIcon />} onClick={onEditDetails} data-testid="reel-drive-add-link">
        {t('ai.reels.sources.addFolderLink')}
      </DuncitButton>
    </Stack>
  );
}

/**
 * The reel's Google Drive folder: the shelf everything could be used from. A
 * 400-file shoot costs nothing until a clip is actually picked off it.
 */
export default function DriveTab({ project, actions, onEditDetails }: Readonly<Props>) {
  const { t } = useTranslation();
  const statusQuery = useQuery<{ reelDriveStatus: ReelDriveStatus }>(REEL_DRIVE_STATUS, { fetchPolicy: 'cache-first' });
  const status = statusQuery.data?.reelDriveStatus ?? null;
  const hasFolder = project.drive_folder_id !== '';
  const canBrowse = hasFolder && status?.configured === true;
  const heldFileIds = useMemo(
    () => new Set(project.assets.flatMap((asset) => (asset.drive_file_id ? [asset.drive_file_id] : []))),
    [project.assets]
  );

  return (
    <Stack sx={{ minHeight: 0, flex: 1 }} data-testid="reel-drive-tab">
      <Typography variant="caption" sx={{ color: 'text.secondary', px: 2, pt: 1, pb: 0.5 }}>
        {t('ai.reels.sources.driveHint')}
      </Typography>
      {status?.configured && (
        <Typography variant="caption" sx={{ color: 'text.secondary', px: 2, pb: 1, overflowWrap: 'anywhere' }} data-testid="reel-drive-share-hint">
          {t('ai.reels.sources.shareWith', { vars: { email: status.service_account_email } })}{' '}
          {hasFolder && (
            <Link component="button" type="button" variant="caption" onClick={onEditDetails}>
              {t('ai.reels.sources.changeFolder')}
            </Link>
          )}
        </Typography>
      )}
      <DriveNotice status={status} hasFolder={hasFolder} onEditDetails={onEditDetails} />
      {canBrowse && <DriveBrowser rootFolderId={project.drive_folder_id} heldFileIds={heldFileIds} onAdd={actions.addDriveFiles} />}
    </Stack>
  );
}

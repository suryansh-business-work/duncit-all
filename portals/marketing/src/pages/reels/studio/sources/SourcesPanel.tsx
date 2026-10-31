import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Divider, Link, Stack, Typography } from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { REEL_DRIVE_STATUS } from '../../queries';
import type { ReelDriveStatus, ReelProject } from '../../types';
import type { ReelActions } from '../useReelActions';
import AssetList from './AssetList';
import DriveBrowser from './DriveBrowser';

interface Props {
  project: ReelProject;
  actions: ReelActions;
  /** Opens the reel's details, where its Drive folder link is set. */
  onEditDetails: () => void;
}

/** A pane heading: the name of the section, and one line saying what it is for. */
function PaneHeading({ id, title, hint }: Readonly<{ id: string; title: string; hint: string }>) {
  return (
    <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
      <Typography id={id} variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {hint}
      </Typography>
    </Box>
  );
}

/** What stands between the operator and their folder, when something does. */
function DriveNotice({ status, hasFolder, onEditDetails }: Readonly<{ status: ReelDriveStatus | null; hasFolder: boolean; onEditDetails: () => void }>) {
  const { t } = useTranslation();
  if (status && !status.configured) {
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
 * The left pane: where the footage comes from, and what the reel holds.
 *
 * Two lists on purpose. Drive is the shelf — everything that could be used —
 * and "In this reel" is what was taken off it. The editor only ever sees the
 * second, so a 400-file shoot costs nothing until a clip is actually picked.
 */
export default function SourcesPanel({ project, actions, onEditDetails }: Readonly<Props>) {
  const { t } = useTranslation();
  const statusQuery = useQuery<{ reelDriveStatus: ReelDriveStatus }>(REEL_DRIVE_STATUS, { fetchPolicy: 'cache-first' });
  const status = statusQuery.data?.reelDriveStatus ?? null;
  const hasFolder = project.drive_folder_id !== '';
  const canBrowse = hasFolder && status?.configured === true;

  const heldFileIds = useMemo(
    () => new Set(project.assets.flatMap((asset) => (asset.drive_file_id ? [asset.drive_file_id] : []))),
    [project.assets]
  );
  const usedAssetIds = useMemo(() => {
    const used = new Set<string>();
    for (const scene of project.spec.scenes) {
      if (scene.asset_id) used.add(scene.asset_id);
      for (const overlay of scene.overlays) used.add(overlay.asset_id);
    }
    if (project.spec.music) used.add(project.spec.music.asset_id);
    return used;
  }, [project.spec]);

  return (
    <Stack component="section" aria-labelledby="reel-sources-assets-title" sx={{ height: '100%', minHeight: 0 }} data-testid="reel-sources-panel">
      <PaneHeading
        id="reel-sources-assets-title"
        title={t('ai.reels.sources.assetsTitle', { vars: { count: project.assets.length } })}
        hint={t('ai.reels.sources.assetsHint')}
      />
      <Box sx={{ maxHeight: '38%', overflowY: 'auto', flexShrink: 0 }}>
        <AssetList assets={project.assets} usedAssetIds={usedAssetIds} onRemove={actions.removeAsset} />
      </Box>
      <Divider />
      <PaneHeading id="reel-sources-drive-title" title={t('ai.reels.sources.driveTitle')} hint={t('ai.reels.sources.driveHint')} />
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

import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '@duncit/app-settings';
import type { AppBuildPlayRelease, AppBuildRow, PlayReleaseStatus, PlayStoreTrack } from './queries';

const STATUS_KEY: Record<PlayReleaseStatus, string> = {
  PUSHING: 'tech.appBuilds.playStatusPushing',
  RELEASED: 'tech.appBuilds.playStatusReleased',
  FAILED: 'tech.appBuilds.playStatusFailed',
};

const STATUS_COLOR: Record<PlayReleaseStatus, 'info' | 'success' | 'error'> = {
  PUSHING: 'info',
  RELEASED: 'success',
  FAILED: 'error',
};

const TRACK_KEY: Record<PlayStoreTrack, string> = {
  INTERNAL: 'tech.appBuilds.playTrackInternal',
  PRODUCTION: 'tech.appBuilds.playTrackProduction',
};

/** One push: which track, how it ended, who, when — and why, when it failed. */
const ReleaseRow = ({ release }: Readonly<{ release: AppBuildPlayRelease }>) => {
  const { t } = useTranslation();
  const when = formatDateTime(release.finished_at ?? release.started_at);
  return (
    <Stack spacing={0.25}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {t(TRACK_KEY[release.track])}
        </Typography>
        <Chip size="small" color={STATUS_COLOR[release.status]} label={t(STATUS_KEY[release.status])} />
        {release.version_code && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.appBuilds.playVersionCode', { vars: { code: release.version_code } })}
          </Typography>
        )}
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.appBuilds.playReleaseBy', { vars: { by: release.by, when } })}
      </Typography>
      {release.error && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {release.error}
        </Typography>
      )}
    </Stack>
  );
};

/** Every push of this build to Google Play, oldest first. */
export default function PlayReleases({ build }: Readonly<{ build: AppBuildRow }>) {
  const { t } = useTranslation();
  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('tech.appBuilds.playReleasesTitle')}
      </Typography>
      {build.play_releases.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.appBuilds.playNoReleases')}
        </Typography>
      )}
      <Stack spacing={1}>
        {build.play_releases.map((r) => (
          <ReleaseRow key={`${r.track}-${r.started_at}`} release={r} />
        ))}
      </Stack>
    </>
  );
}

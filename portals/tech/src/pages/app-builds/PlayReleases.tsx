import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import StoreReleases, { ReleaseStatusChip, releaseWhen } from './StoreReleases';
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
  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {t(TRACK_KEY[release.track])}
        </Typography>
        <ReleaseStatusChip color={STATUS_COLOR[release.status]} label={t(STATUS_KEY[release.status])} />
        {release.version_code && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.appBuilds.playVersionCode', { vars: { code: release.version_code } })}
          </Typography>
        )}
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.appBuilds.playReleaseBy', { vars: { by: release.by, when: releaseWhen(release) } })}
      </Typography>
      {release.error && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {release.error}
        </Typography>
      )}
    </>
  );
};

/** Every push of this build to Google Play, oldest first. */
export default function PlayReleases({ build }: Readonly<{ build: AppBuildRow }>) {
  const { t } = useTranslation();
  return (
    <StoreReleases
      title={t('tech.appBuilds.playReleasesTitle')}
      empty={t('tech.appBuilds.playNoReleases')}
      releases={build.play_releases}
      keyOf={(r) => `${r.track}-${r.started_at}`}
      renderRow={(r) => <ReleaseRow release={r} />}
      testId="app-builds-play-releases"
    />
  );
}

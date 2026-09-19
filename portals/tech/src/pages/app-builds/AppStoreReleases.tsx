import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import StoreReleases, { ReleaseStatusChip, releaseWhen } from './StoreReleases';
import type { AppBuildAppStoreRelease, AppBuildRow, AppStoreTrack } from './queries';

const TRACK_KEY: Record<AppStoreTrack, string> = {
  TESTFLIGHT: 'tech.appBuilds.appStoreTrackTestflight',
  APP_STORE: 'tech.appBuilds.appStoreTrackReview',
};

/** What "done" means differs per track: processed for testers, or handed to App Review. */
const DONE_KEY: Record<AppStoreTrack, string> = {
  TESTFLIGHT: 'tech.appBuilds.appStoreDoneTestflight',
  APP_STORE: 'tech.appBuilds.appStoreDoneReview',
};

/** The status chip: pushing, the track's own word for done, or failed. */
const StatusChip = ({ release }: Readonly<{ release: AppBuildAppStoreRelease }>) => {
  const { t } = useTranslation();
  if (release.status === 'PUSHING') {
    return <ReleaseStatusChip color="info" label={t('tech.appBuilds.appStoreStatusPushing')} />;
  }
  if (release.status === 'RELEASED') {
    return <ReleaseStatusChip color="success" label={t(DONE_KEY[release.track])} />;
  }
  return <ReleaseStatusChip color="error" label={t('tech.appBuilds.appStoreStatusFailed')} />;
};

/** One push: which track, how far it is or how it ended, who, when — and why, when it failed. */
const ReleaseRow = ({ release }: Readonly<{ release: AppBuildAppStoreRelease }>) => {
  const { t } = useTranslation();
  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2">{t(TRACK_KEY[release.track])}</Typography>
        <StatusChip release={release} />
        {release.asc_build_id && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.appBuilds.appStoreBuildId', { vars: { id: release.asc_build_id } })}
          </Typography>
        )}
      </Stack>
      {release.stage && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {release.stage}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.appBuilds.appStoreReleaseBy', { vars: { by: release.by, when: releaseWhen(release) } })}
      </Typography>
      {release.error && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          {release.error}
        </Typography>
      )}
    </>
  );
};

/** Every push of this build to TestFlight or App Review, oldest first. */
export default function AppStoreReleases({ build }: Readonly<{ build: AppBuildRow }>) {
  const { t } = useTranslation();
  return (
    <StoreReleases
      title={t('tech.appBuilds.appStoreReleasesTitle')}
      empty={t('tech.appBuilds.appStoreNoReleases')}
      releases={build.app_store_releases}
      keyOf={(r) => `${r.track}-${r.started_at}`}
      renderRow={(r) => <ReleaseRow release={r} />}
      testId="app-builds-app-store-releases"
    />
  );
}

import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { useConfirm, notifySuccess, notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { PUSH_APP_BUILD_TO_PLAY_STORE, type AppBuildRow, type PlayStoreTrack } from './queries';

const TRACK_KEY: Record<PlayStoreTrack, string> = {
  INTERNAL: 'tech.appBuilds.playTrackInternal',
  PRODUCTION: 'tech.appBuilds.playTrackProduction',
};

const CONFIRM_KEY: Record<PlayStoreTrack, string> = {
  INTERNAL: 'tech.appBuilds.playConfirmInternal',
  PRODUCTION: 'tech.appBuilds.playConfirmProduction',
};

export type PushToPlay = (row: AppBuildRow, track: PlayStoreTrack) => Promise<void>;

/**
 * Confirm, then push one build's AAB to a Play track.
 *
 * A production push goes to every user and cannot be taken back, so the
 * confirm names the build, the version and the track before anything is sent.
 * The mutation answers as soon as the push is recorded — the row shows it
 * PUSHING and the table polls until Google has answered.
 */
export function usePlayStorePush(onPushed: () => void): PushToPlay {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [push] = useMutation<any>(PUSH_APP_BUILD_TO_PLAY_STORE);

  return useCallback(
    async (row: AppBuildRow, track: PlayStoreTrack) => {
      const trackLabel = t(TRACK_KEY[track]);
      const build = row.build_name || row.build_no;
      const ok = await confirm({
        title: t('tech.appBuilds.playConfirmTitle', { vars: { build, track: trackLabel } }),
        message: t(CONFIRM_KEY[track], { vars: { version: row.version } }),
        confirmLabel: t('tech.appBuilds.playConfirmAction'),
        destructive: track === 'PRODUCTION',
      });
      if (!ok) return;
      try {
        await push({ variables: { id: row.id, track } });
        notifySuccess(t('tech.appBuilds.playStarted', { vars: { build, track: trackLabel } }));
        onPushed();
      } catch (err) {
        notifyError(parseApiError(err));
      }
    },
    [confirm, push, t, onPushed]
  );
}

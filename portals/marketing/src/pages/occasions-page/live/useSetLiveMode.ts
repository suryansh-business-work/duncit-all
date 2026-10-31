import { useMutation } from '@apollo/client/react';
import type { MutationSetOccasionLiveArgs, OccasionLiveMode, OccasionSettings, OccasionTheme } from '@duncit/gql-types';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { OCCASION_REFRESH, SET_OCCASION_LIVE } from '../queries';

const CONFIRM_MESSAGE: Record<OccasionLiveMode, string> = {
  NORMAL: 'marketing.occasions.live.confirmNormal',
  MANUAL: 'marketing.occasions.live.confirmManual',
  SCHEDULE: 'marketing.occasions.live.confirmSchedule',
};

type LiveLook = Pick<OccasionTheme, 'key' | 'name'> | null | undefined;
type LiveStep = (mode: OccasionLiveMode, look?: LiveLook) => Promise<boolean>;

export interface LiveSwitch {
  /** Ask, then switch. Resolves true once the server has it. */
  setLiveMode: LiveStep;
  /** Only the question — for a caller with work to do between asking and switching (save, then apply). */
  confirmLive: LiveStep;
  /** Only the switch, once already confirmed. */
  applyLive: LiveStep;
}

/**
 * Switch what every Duncit app wears — the house look, one pinned look, or the
 * schedule. It changes every member's app on their next load, so it is always
 * confirmed first.
 */
export function useSetLiveMode(): LiveSwitch {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [setLive] = useMutation<{ setOccasionLive: OccasionSettings }, MutationSetOccasionLiveArgs>(SET_OCCASION_LIVE, {
    refetchQueries: OCCASION_REFRESH,
    awaitRefetchQueries: true,
  });

  const confirmLive: LiveStep = (mode, look) =>
    confirm({
      title: t('marketing.occasions.live.confirmTitle'),
      message: t(CONFIRM_MESSAGE[mode], { vars: { name: look?.name ?? '' } }),
      confirmLabel: t('marketing.occasions.live.confirmApply'),
    });

  const applyLive: LiveStep = async (mode, look) => {
    try {
      await setLive({ variables: { input: { mode, manual_key: mode === 'MANUAL' ? look?.key : null } } });
      notify(t('marketing.occasions.live.saved'), 'success');
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  const setLiveMode: LiveStep = async (mode, look) => (await confirmLive(mode, look)) && applyLive(mode, look);

  return { setLiveMode, confirmLive, applyLive };
}

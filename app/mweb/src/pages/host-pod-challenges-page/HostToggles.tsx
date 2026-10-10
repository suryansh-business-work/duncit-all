import { FormControlLabel, FormGroup, FormHelperText, Switch } from '@mui/material';
import type { PodChallengeSettingsInput } from '@duncit/gql-types';
import { fireAndForget, logs } from '@duncit/logs';
import { CHALLENGE_TOGGLES, type ChallengeToggle } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'status' | ChallengeToggle>;
  actions: HostChallengeActions;
}

/**
 * The three independent switches (operate / show on Pod Details / audience
 * interaction) plus the notification switches. Hiding a challenge never stops
 * it or deletes scores; a live challenge must be paused or ended before it can
 * be switched off (the server enforces the same).
 */
export default function HostToggles({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const lockedOn = challenge.status === 'LIVE' && challenge.enabled;
  const set = (key: ChallengeToggle, value: boolean) => {
    const input: PodChallengeSettingsInput = { [key]: value };
    fireAndForget(actions.settings(input), logs.mWeb, 'host-pod-challenges', 'settings');
  };

  return (
    <FormGroup>
      {CHALLENGE_TOGGLES.map(({ key, label }) => (
        <FormControlLabel
          key={key}
          disabled={actions.busy || (key === 'enabled' && lockedOn)}
          control={<Switch checked={challenge[key]} onChange={(_e, checked) => set(key, checked)} />}
          label={t(label)}
        />
      ))}
      {lockedOn && <FormHelperText>{t('mweb.challenge.pauseBeforeOff')}</FormHelperText>}
    </FormGroup>
  );
}

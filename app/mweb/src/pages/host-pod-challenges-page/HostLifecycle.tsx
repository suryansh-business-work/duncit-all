import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { CHALLENGE_ACTION_KEYS, CHALLENGE_CONFIRM_KEYS } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import type { HostChallengeActions } from './useHostChallengeActions';

const DESTRUCTIVE = new Set(['CANCEL']);

interface Props {
  challenge: Pick<PodChallengeView, 'name' | 'viewer'>;
  actions: HostChallengeActions;
}

/** Start / Pause / Resume / Complete / Cancel — only the moves the server allows right now. */
export default function HostLifecycle({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const label = (action: string) => t(CHALLENGE_ACTION_KEYS[action] ?? action);

  const run = async (action: string) => {
    // Actions that end or freeze play ask first: they cannot be undone.
    const ask = CHALLENGE_CONFIRM_KEYS[action];
    if (ask) {
      const ok = await confirm({
        title: t(ask.title),
        message: t(ask.body, { vars: { name: challenge.name } }),
        confirmLabel: label(action),
        cancelLabel: t('mweb.challenge.cancel'),
        destructive: DESTRUCTIVE.has(action),
      });
      if (!ok) return;
    }
    await actions.transition(action);
  };

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      {challenge.viewer.allowed_actions.map((action) => (
        <DuncitButton
          key={action}
          size="small"
          variant={action === 'START' || action === 'RESUME' ? 'contained' : 'outlined'}
          color={DESTRUCTIVE.has(action) ? 'error' : 'primary'}
          disabled={actions.busy}
          onClick={() => fireAndForget(run(action), logs.mWeb, 'host-pod-challenges', 'transition')}
        >
          {label(action)}
        </DuncitButton>
      ))}
    </Stack>
  );
}

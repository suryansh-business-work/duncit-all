import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { buzzOrder, pickedCompetitors, toolsFedBy } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  challenge: Pick<PodChallengeView, 'status' | 'tools' | 'competitors'>;
  actions: HostChallengeActions;
}

/**
 * The buzzer and the random picker. Arming starts a fresh buzz round (whoever
 * presses first in it scores); a pick is drawn by the server, never here.
 */
export default function HostRunControls({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const live = challenge.status === 'LIVE';
  const names = new Map(challenge.competitors.map((c) => [c.competitor_id, c.name]));
  const go = (job: Promise<boolean>, what: string) => fireAndForget(job, logs.mWeb, 'host-pod-challenges', what);

  return (
    <>
      {toolsFedBy(challenge.tools, 'BUZZ').map((tool) => {
        const first = buzzOrder(tool)[0];
        return (
          <Stack key={tool.instance_id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <Typography variant="body2" sx={{ flex: 1 }} aria-live="polite">
              {tool.label} ·{' '}
              {first ? t('mweb.challenge.tools.buzzFirst', { vars: { name: names.get(first) ?? '' } }) : t('mweb.challenge.tools.buzzNobody')}
            </Typography>
            <Stack direction="row" spacing={1}>
              <DuncitButton size="small" variant="contained" disabled={!live || actions.busy} onClick={() => go(actions.buzzer(tool.instance_id, true), 'buzzer')}>
                {t(tool.voting_open ? 'mweb.challenge.tools.buzzerNext' : 'mweb.challenge.tools.buzzerArm')}
              </DuncitButton>
              <DuncitButton size="small" variant="outlined" disabled={!tool.voting_open || actions.busy} onClick={() => go(actions.buzzer(tool.instance_id, false), 'buzzer')}>
                {t('mweb.challenge.tools.buzzerDisarm')}
              </DuncitButton>
            </Stack>
          </Stack>
        );
      })}
      {toolsFedBy(challenge.tools, 'PICK').map((tool) => {
        const picked = pickedCompetitors(tool);
        const latest = picked.at(-1);
        return (
          <Stack key={tool.instance_id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <Typography variant="body2" sx={{ flex: 1 }} aria-live="polite">
              {tool.label} ·{' '}
              {latest ? t('mweb.challenge.tools.pickLatest', { vars: { name: names.get(latest) ?? '' } }) : t('mweb.challenge.tools.pickNone')}
            </Typography>
            <Stack direction="row" spacing={1}>
              <DuncitButton size="small" variant="contained" disabled={actions.busy} onClick={() => go(actions.pick(tool.instance_id, false), 'pick')}>
                {t('mweb.challenge.tools.pick')}
              </DuncitButton>
              <DuncitButton size="small" disabled={!picked.length || actions.busy} onClick={() => go(actions.pick(tool.instance_id, true), 'pick')}>
                {t('mweb.challenge.tools.pickReset')}
              </DuncitButton>
            </Stack>
          </Stack>
        );
      })}
    </>
  );
}

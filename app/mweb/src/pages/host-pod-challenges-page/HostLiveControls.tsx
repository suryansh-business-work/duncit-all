import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { parseJsonObject } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import ChallengeClock from '../../components/pod-challenge/ChallengeClock';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import { ballotToolsOf, roundToolOf, timersOf } from '../../components/pod-challenge/challengeView';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  challenge: Pick<PodChallengeView, 'status' | 'tools' | 'current_round'>;
  receivedAt: number;
  actions: HostChallengeActions;
}

/** Clocks, vote windows and rounds for a running challenge. */
export default function HostLiveControls({ challenge, receivedAt, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const live = challenge.status === 'LIVE';
  const go = (job: Promise<boolean>, what: string) => fireAndForget(job, logs.mWeb, 'host-pod-challenges', what);
  const rounds = roundToolOf(challenge.tools);
  const totalRounds = rounds ? Number(parseJsonObject(rounds.config_json).rounds ?? 1) : 0;

  return (
    <Stack spacing={2}>
      {timersOf(challenge.tools).map((tool) => (
          <Stack key={tool.instance_id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <ChallengeClock tool={tool} receivedAt={receivedAt} />
            <Stack direction="row" spacing={1}>
              <DuncitButton size="small" variant="contained" disabled={!live || tool.clock_running || actions.busy} onClick={() => go(actions.clock(tool.instance_id, 'START'), 'clock')}>
                {t('mweb.challenge.clockStart')}
              </DuncitButton>
              <DuncitButton size="small" variant="outlined" disabled={!tool.clock_running || actions.busy} onClick={() => go(actions.clock(tool.instance_id, 'STOP'), 'clock')}>
                {t('mweb.challenge.clockStop')}
              </DuncitButton>
              <DuncitButton size="small" disabled={tool.clock_running || actions.busy} onClick={() => go(actions.clock(tool.instance_id, 'RESET'), 'clock')}>
                {t('mweb.challenge.clockReset')}
              </DuncitButton>
            </Stack>
          </Stack>
        ))}
      {ballotToolsOf(challenge.tools).map((tool) => (
          <Stack key={tool.instance_id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {tool.label} · {t(tool.voting_open ? 'mweb.challenge.votingOpen' : 'mweb.challenge.votingClosedShort')}
            </Typography>
            <DuncitButton
              size="small"
              variant={tool.voting_open ? 'outlined' : 'contained'}
              disabled={actions.busy || (!tool.voting_open && !live)}
              onClick={() => go(actions.voting(tool.instance_id, !tool.voting_open), 'voting')}
            >
              {t(tool.voting_open ? 'mweb.challenge.closeVoting' : 'mweb.challenge.openVoting')}
            </DuncitButton>
          </Stack>
        ))}
      {totalRounds > 0 && (
        <TextField
          select
          size="small"
          label={t('mweb.challenge.round')}
          value={challenge.current_round}
          onChange={(e) => go(actions.round(Number(e.target.value)), 'round')}
          disabled={actions.busy}
          sx={{ maxWidth: 200 }}
        >
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((n) => (
            <MenuItem key={n} value={n}>
              {t('mweb.challenge.roundOf', { vars: { round: n, total: totalRounds } })}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}

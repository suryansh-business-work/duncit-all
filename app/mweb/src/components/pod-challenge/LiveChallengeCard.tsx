import { useNavigate } from 'react-router';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { DuncitButton } from '@duncit/buttons';
import { CHALLENGE_STATUS_KEYS, isChallengeFinished, podChallengeLivePath } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import ChallengeClock from './ChallengeClock';
import ChallengeResultCard from './ChallengeResultCard';
import ChallengeStandings from './ChallengeStandings';
import { timersOf } from './challengeView';
import { usePodChallengeLive } from './usePodChallengeLive';

const PREVIEW_ROWS = 3;

/**
 * One challenge on Pod Details, kept live: during play a LIVE preview (status,
 * clock, top of the leaderboard, last update) with the full-screen link; once
 * the result is published the Final Result card replaces it.
 */
export default function LiveChallengeCard({ challengeId }: Readonly<{ challengeId: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const { challenge, receivedAt } = usePodChallengeLive(challengeId);
  if (!challenge) return null;
  if (isChallengeFinished(challenge.status)) {
    return challenge.result ? <ChallengeResultCard challenge={challenge} /> : null;
  }
  const isLive = challenge.status === 'LIVE';
  const timer = timersOf(challenge.tools)[0];

  return (
    <Card variant="outlined" component="section" aria-labelledby={`live-challenge-${challenge.id}`}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <SportsScoreIcon color="primary" />
            <Typography variant="overline" component="p" sx={{ fontWeight: 800 }}>
              {t('mweb.challenge.liveChallenge')}
            </Typography>
            <Chip
              size="small"
              color={isLive ? 'error' : 'default'}
              label={t(CHALLENGE_STATUS_KEYS[challenge.status] ?? challenge.status)}
            />
          </Stack>
          <Typography id={`live-challenge-${challenge.id}`} variant="h6" component="h3" sx={{ fontWeight: 800 }}>
            {challenge.name}
          </Typography>
          {timer && <ChallengeClock tool={timer} receivedAt={receivedAt} />}
          <ChallengeStandings standings={challenge.standings} limit={PREVIEW_ROWS} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.challenge.lastUpdated', { vars: { time: formatDateTime(challenge.updated_at) } })}
          </Typography>
          <DuncitButton
            variant="contained"
            startIcon={<OpenInFullIcon />}
            onClick={() => navigate(podChallengeLivePath(challenge.pod_id, challenge.id))}
          >
            {t('mweb.challenge.viewLive')}
          </DuncitButton>
        </Stack>
      </CardContent>
    </Card>
  );
}

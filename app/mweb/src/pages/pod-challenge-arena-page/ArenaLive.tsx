import { Box, Chip, Stack, Typography } from '@mui/material';
import { CHALLENGE_STATUS_KEYS } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import ChallengeClock from '../../components/pod-challenge/ChallengeClock';
import ChallengeStandings from '../../components/pod-challenge/ChallengeStandings';
import ChallengeBallotPanel from '../../components/pod-challenge/ChallengeBallotPanel';
import ChallengeJudgePanel from '../../components/pod-challenge/ChallengeJudgePanel';
import ChallengeToolPanels from '../../components/pod-challenge/ChallengeToolPanels';
import { ballotToolsOf, judgeToolsOf, leadersOf, parseConfig, roundToolOf, timersOf } from '../../components/pod-challenge/challengeView';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import LeaderAnnouncer from './LeaderAnnouncer';

interface Props {
  challenge: PodChallengeView;
  receivedAt: number;
  /** TV / projector mode: bigger type, no interaction panels. */
  tv: boolean;
}

/**
 * The arena during play. Its layout follows the challenge's own tools: clocks
 * for Timer tools, the leaderboard for anything that scores, ballots for an
 * attendee while voting is open, the score sheet for an assigned judge, and a
 * panel for every tool that is run rather than scored (poll, quiz, buzzer…).
 */
export default function ArenaLive({ challenge, receivedAt, tv }: Readonly<Props>) {
  const { t } = useTranslation();
  const rounds = roundToolOf(challenge.tools);
  const totalRounds = rounds ? Number(parseConfig(rounds.config_json).rounds ?? 1) : 0;
  const ballots = challenge.viewer.can_interact && !tv ? ballotToolsOf(challenge.tools) : [];
  const judging = challenge.viewer.can_judge && !tv ? judgeToolsOf(challenge.tools) : [];

  return (
    <Stack spacing={tv ? 4 : 2.5}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
        <Chip color={challenge.status === 'LIVE' ? 'error' : 'default'} label={t(CHALLENGE_STATUS_KEYS[challenge.status] ?? challenge.status)} />
        {totalRounds > 0 && (
          <Chip variant="outlined" label={t('mweb.challenge.roundOf', { vars: { round: challenge.current_round, total: totalRounds } })} />
        )}
      </Stack>
      {timersOf(challenge.tools).map((timer) => (
        <ChallengeClock key={timer.instance_id} tool={timer} receivedAt={receivedAt} large={tv} />
      ))}
      <LeaderAnnouncer leaders={leadersOf(challenge.standings)} large={tv} />
      <Box component="section" aria-labelledby="arena-leaderboard">
        <Typography id="arena-leaderboard" variant={tv ? 'h4' : 'h6'} component="h2" sx={{ fontWeight: 800, mb: 1 }}>
          {t('mweb.challenge.leaderboard')}
        </Typography>
        <ChallengeStandings standings={challenge.standings} large={tv} />
      </Box>
      <ChallengeToolPanels challenge={challenge} interactive={!tv} />
      {ballots.map((tool) => (
        <ChallengeBallotPanel key={tool.instance_id} challenge={challenge} tool={tool} />
      ))}
      {judging.map((tool) => (
        <ChallengeJudgePanel key={tool.instance_id} challenge={challenge} tool={tool} />
      ))}
    </Stack>
  );
}

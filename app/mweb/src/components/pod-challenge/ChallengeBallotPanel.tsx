import { useMutation } from '@apollo/client/react';
import { Card, CardContent, Rating, Stack, Typography } from '@mui/material';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '../../i18n/useTranslation';
import { notifyError, notifySuccess } from '../notify';
import { parseConfig } from './challengeView';
import { CAST_POD_CHALLENGE_VOTE, RATE_POD_CHALLENGE_COMPETITOR, type PodChallengeView } from './queries';

type Tool = PodChallengeView['tools'][number];

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'competitors' | 'viewer'>;
  tool: Tool;
}

/**
 * Audience participation for one Voting or Rating tool. Shown only when the
 * server says this viewer may take part; the server re-checks every ballot
 * (attendee, live, voting open) and keeps one per person — a second tap
 * changes the ballot instead of adding one.
 */
export default function ChallengeBallotPanel({ challenge, tool }: Readonly<Props>) {
  const { t } = useTranslation();
  const [vote, voteState] = useMutation(CAST_POD_CHALLENGE_VOTE);
  const [rate, rateState] = useMutation(RATE_POD_CHALLENGE_COMPETITOR);
  const busy = voteState.loading || rateState.loading;
  const mine = challenge.viewer.my_votes.filter((v) => v.tool_instance_id === tool.instance_id);
  const scaleMax = Number(parseConfig(tool.config_json).scale_max ?? 5);

  const run = (job: Promise<unknown>) =>
    fireAndForget(
      job.then(() => notifySuccess(t('mweb.challenge.ballotSaved'))).catch((error: Error) => notifyError(error.message)),
      logs.mWeb,
      'pod-challenge',
      'ballot'
    );
  const variables = (candidateId: string) => ({ id: challenge.id, toolInstanceId: tool.instance_id, candidateId });

  if (!tool.voting_open) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.challenge.votingClosed', { vars: { label: tool.label } })}
      </Typography>
    );
  }
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <HowToVoteIcon color="primary" />
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
              {tool.label}
            </Typography>
          </Stack>
          {challenge.competitors.map((c) => {
            const chosen = mine.find((v) => v.candidate_id === c.competitor_id);
            return tool.input_kind === 'VOTE' ? (
              <DuncitButton
                key={c.competitor_id}
                variant={chosen ? 'contained' : 'outlined'}
                aria-pressed={!!chosen}
                disabled={busy}
                onClick={() => run(vote({ variables: variables(c.competitor_id) }))}
              >
                {chosen ? t('mweb.challenge.votedFor', { vars: { name: c.name } }) : t('mweb.challenge.voteFor', { vars: { name: c.name } })}
              </DuncitButton>
            ) : (
              <Stack key={c.competitor_id} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" id={`rate-${tool.instance_id}-${c.competitor_id}`}>
                  {c.name}
                </Typography>
                <Rating
                  max={scaleMax}
                  value={chosen?.value ?? null}
                  disabled={busy}
                  aria-labelledby={`rate-${tool.instance_id}-${c.competitor_id}`}
                  onChange={(_e, value) => value && run(rate({ variables: { ...variables(c.competitor_id), value } }))}
                />
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

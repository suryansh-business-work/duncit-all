import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, Chip, Collapse, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { DuncitButton } from '@duncit/buttons';
import { podChallengeLivePath } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import ChallengeStandings from './ChallengeStandings';
import ShareChallengeButton from './ShareChallengeButton';
import type { PodChallengeView } from './queries';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'pod_id' | 'name' | 'result'>;
  /** On the arena itself the "view full results" link would point at this page. */
  showViewLink?: boolean;
}

/**
 * The Final Result card: the published, locked result — never live standings.
 * Shown on Pod Details after completion, in Pod History and in the arena.
 */
export default function ChallengeResultCard({ challenge, showViewLink = true }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const [expanded, setExpanded] = useState(false);
  const result = challenge.result;
  if (!result) return null;
  const winners = result.standings.filter((s) => result.winner_ids.includes(s.competitor_id));
  const podium = result.standings.filter((s) => s.rank > 1 && s.rank <= 3);

  return (
    <Card variant="outlined" component="section" aria-labelledby={`challenge-result-${challenge.id}`}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <EmojiEventsIcon color="warning" />
            <Typography id={`challenge-result-${challenge.id}`} variant="subtitle1" component="h3" sx={{ fontWeight: 800, flex: 1 }}>
              {challenge.name}
            </Typography>
            <Chip size="small" color="success" label={t('mweb.challenge.completed')} />
          </Stack>
          <Typography variant="h6" component="p" sx={{ fontWeight: 800 }}>
            {t(winners.length > 1 ? 'mweb.challenge.winnersTie' : 'mweb.challenge.winner', {
              vars: { names: winners.map((w) => w.name).join(', '), score: winners[0]?.total ?? '' },
            })}
          </Typography>
          {podium.length > 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {podium.map((p) => t('mweb.challenge.placed', { vars: { rank: p.rank, name: p.name } })).join(' · ')}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.challenge.publishedOn', { vars: { date: formatDateTime(result.published_at) } })}
            {result.version > 1 ? ` · ${t('mweb.challenge.corrected')}` : ''}
          </Typography>
          <Collapse in={expanded}>
            <ChallengeStandings standings={result.standings} />
          </Collapse>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <DuncitButton size="small" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {t(expanded ? 'mweb.challenge.hideLeaderboard' : 'mweb.challenge.showLeaderboard')}
            </DuncitButton>
            {showViewLink && (
              <DuncitButton size="small" variant="outlined" onClick={() => navigate(podChallengeLivePath(challenge.pod_id, challenge.id))}>
                {t('mweb.challenge.viewResults')}
              </DuncitButton>
            )}
            <ShareChallengeButton podId={challenge.pod_id} challengeId={challenge.id} name={challenge.name} />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Alert, Box, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import TvIcon from '@mui/icons-material/Tv';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { fireAndForget, logs } from '@duncit/logs';
import { isChallengeFinished } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import PageBackHeader from '../pod-pending-page/PageBackHeader';
import ChallengeResultCard from '../../components/pod-challenge/ChallengeResultCard';
import { usePodChallengeLive } from '../../components/pod-challenge/usePodChallengeLive';
import ArenaLive from './ArenaLive';
import { useFullscreen } from './useFullscreen';

/**
 * The Live Challenge Arena — /pod/:podId/challenges/:challengeId/live.
 *
 * Public spectators get a read-only view, signed-in attendees can vote while
 * voting is open, judges get their score sheet; every permission is decided
 * by the server. `?tv=1` (or the TV button) is the projector layout.
 */
export default function PodChallengeArenaPage() {
  const { t } = useTranslation();
  const { challengeId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tv = params.get('tv') === '1';
  const arenaRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(arenaRef);
  const { challenge, loading, error, receivedAt } = usePodChallengeLive(challengeId);

  const toggleTv = () => {
    const next = new URLSearchParams(params);
    if (tv) next.delete('tv');
    else next.set('tv', '1');
    setParams(next, { replace: true });
  };

  if (loading) return <CircularProgress sx={{ m: 4 }} aria-label={t('mweb.challenge.loading')} />;
  if (error || !challenge) {
    return (
      <Stack spacing={2} sx={{ p: 2 }}>
        <PageBackHeader title={t('mweb.challenge.arenaTitle')} backLabel={t('mweb.challenge.back')} />
        <Alert severity={error ? 'error' : 'info'}>{t(error ? 'mweb.challenge.loadError' : 'mweb.challenge.notAvailable')}</Alert>
      </Stack>
    );
  }
  const finished = isChallengeFinished(challenge.status);

  return (
    <Box ref={arenaRef} sx={{ p: tv ? { xs: 2, md: 6 } : 2, pb: 4, bgcolor: 'background.default', minHeight: fullscreen.active ? '100vh' : undefined }}>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <PageBackHeader title={challenge.name} backLabel={t('mweb.challenge.back')} />
          </Box>
          <Tooltip title={t(tv ? 'mweb.challenge.exitTv' : 'mweb.challenge.tvMode')}>
            <IconButton aria-label={t(tv ? 'mweb.challenge.exitTv' : 'mweb.challenge.tvMode')} aria-pressed={tv} onClick={toggleTv}>
              <TvIcon />
            </IconButton>
          </Tooltip>
          {fullscreen.supported && (
            <Tooltip title={t(fullscreen.active ? 'mweb.challenge.exitFullscreen' : 'mweb.challenge.fullscreen')}>
              <IconButton aria-label={t(fullscreen.active ? 'mweb.challenge.exitFullscreen' : 'mweb.challenge.fullscreen')} onClick={() => fireAndForget(fullscreen.toggle(), logs.mWeb, 'pod-challenge-arena', 'fullscreen')}>
                {fullscreen.active ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {challenge.pod_title}
        </Typography>
        {finished && challenge.result && (
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }} role="status" aria-live="polite">
            <EmojiEventsIcon color="warning" sx={{ fontSize: tv ? 120 : 64 }} />
            <Typography variant={tv ? 'h2' : 'h4'} component="h2" sx={{ fontWeight: 900 }}>
              {t('mweb.challenge.winnerAnnouncement', {
                vars: {
                  names: challenge.result.standings
                    .filter((s) => challenge.result?.winner_ids.includes(s.competitor_id))
                    .map((s) => s.name)
                    .join(', '),
                },
              })}
            </Typography>
          </Stack>
        )}
        {finished && challenge.result && <ChallengeResultCard challenge={challenge} showViewLink={false} />}
        {finished && !challenge.result && <Alert severity="info">{t('mweb.challenge.resultsPending')}</Alert>}
        {!finished && <ArenaLive challenge={challenge} receivedAt={receivedAt} tv={tv} />}
      </Stack>
    </Box>
  );
}

import { useState, type ReactNode } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import { DuncitButton } from '@duncit/buttons';
import { CHALLENGE_STATUS_KEYS, isChallengeFinished, isChallengeInPlay } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import ShareChallengeButton from '../../components/pod-challenge/ShareChallengeButton';
import { usePodChallengeLive } from '../../components/pod-challenge/usePodChallengeLive';
import HostLifecycle from './HostLifecycle';
import HostLiveControls from './HostLiveControls';
import HostResultPanel from './HostResultPanel';
import HostRosterDialog from './HostRosterDialog';
import HostScoreLog from './HostScoreLog';
import HostScorePad from './HostScorePad';
import HostToggles from './HostToggles';
import { useHostChallengeActions } from './useHostChallengeActions';

function Section({ title, children, defaultExpanded = false }: Readonly<{ title: string; children: ReactNode; defaultExpanded?: boolean }>) {
  return (
    <Accordion disableGutters variant="outlined" defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" component="h3">
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

/** One challenge in Host Studio: switches, lifecycle, roster, live scoring, undo log and the result. */
export default function HostChallengePanel({ challengeId }: Readonly<{ challengeId: string }>) {
  const { t } = useTranslation();
  const { challenge, receivedAt } = usePodChallengeLive(challengeId);
  const actions = useHostChallengeActions(challengeId);
  const [rosterOpen, setRosterOpen] = useState(false);
  if (!challenge) return null;
  const inPlay = isChallengeInPlay(challenge.status);
  const finished = isChallengeFinished(challenge.status);
  const editable = !finished && challenge.status !== 'CANCELLED';

  return (
    <Stack spacing={1.5} component="section" aria-labelledby={`host-challenge-${challenge.id}`} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography id={`host-challenge-${challenge.id}`} variant="h6" component="h2" sx={{ fontWeight: 800, flex: 1 }}>
          {challenge.name}
        </Typography>
        <Chip size="small" color={challenge.status === 'LIVE' ? 'error' : 'default'} label={t(CHALLENGE_STATUS_KEYS[challenge.status] ?? challenge.status)} />
      </Stack>
      {challenge.eligibility_warning && <Alert severity="warning">{t('mweb.challenge.eligibilityWarning')}</Alert>}
      <HostLifecycle challenge={challenge} actions={actions} />
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <DuncitButton size="small" startIcon={<GroupsIcon />} onClick={() => setRosterOpen(true)} disabled={!editable}>
          {t('mweb.challenge.rosterButton', { vars: { count: challenge.competitors.length } })}
        </DuncitButton>
        <ShareChallengeButton podId={challenge.pod_id} challengeId={challenge.id} name={challenge.name} />
      </Stack>
      <Section title={t('mweb.challenge.settings')}>
        <HostToggles challenge={challenge} actions={actions} />
      </Section>
      {inPlay && (
        <Section title={t('mweb.challenge.liveControls')} defaultExpanded>
          <Stack spacing={2}>
            <HostLiveControls challenge={challenge} receivedAt={receivedAt} actions={actions} />
            {challenge.status === 'LIVE' && <HostScorePad challenge={challenge} actions={actions} />}
          </Stack>
        </Section>
      )}
      {(inPlay || finished) && (
        <Section title={t('mweb.challenge.scoreLog')}>
          <HostScoreLog challenge={challenge} actions={actions} />
        </Section>
      )}
      {finished && <HostResultPanel challenge={challenge} actions={actions} />}
      <HostRosterDialog open={rosterOpen} podId={challenge.pod_id} challenge={challenge} actions={actions} onClose={() => setRosterOpen(false)} />
    </Stack>
  );
}

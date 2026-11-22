import { useId } from 'react';
import { Box, Divider, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import BlockIcon from '@mui/icons-material/Block';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { PageErrorBoundary, useTranslation } from '@duncit/shell';
import type { LeadCandidate } from '../../api/leadResearch.gql';
import QualityScoreRing from '../../components/lead-quality/QualityScoreRing';
import { LEAD_KIND_LABEL_KEY } from '../../lib/leadKinds';
import { OutcomeLine } from './ApprovalOutcomes';
import { CandidateBreakdown, CandidateGaps } from './CandidateBreakdown';
import CandidateEvidence from './CandidateEvidence';
import { CandidateDecision, CandidateFacts } from './CandidateFacts';
import { CandidateDuplicates, CandidateSources } from './CandidateLinks';
import { CandidateStatusChip, QualificationChip } from './candidateCells';
import type { ApprovalResults } from './useCandidateActions';

interface Props {
  /** The candidate on show, or null when the drawer is closed. */
  candidate: LeadCandidate | null;
  results: ApprovalResults;
  busy: boolean;
  onClose: () => void;
  onApprove: (candidate: LeadCandidate) => void;
  onReject: (candidate: LeadCandidate) => void;
}

function CandidateBody({ candidate, results, busy, onApprove, onReject }: Readonly<Omit<Props, 'candidate' | 'onClose'> & { candidate: LeadCandidate }>) {
  const { t } = useTranslation();
  const outcome = results.outcomes.find((entry) => entry.candidate_id === candidate.id);
  const open = candidate.status === 'NEW';
  return (
    <>
      <Stack spacing={2.5} sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <QualityScoreRing score={candidate.score} tone={candidate.tone} label={candidate.classification_label} size="large" />
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {candidate.classification_label || t('crm.leadQuality.notScored')}
            </Typography>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
              <QualificationChip value={candidate.qualification} />
              <CandidateStatusChip value={candidate.status} />
            </Stack>
          </Stack>
        </Stack>
        {outcome ? <OutcomeLine outcome={outcome} results={results} /> : null}
        <CandidateDuplicates candidate={candidate} />
        <CandidateFacts candidate={candidate} />
        <CandidateSources candidate={candidate} />
        <CandidateBreakdown candidate={candidate} />
        <CandidateEvidence candidate={candidate} />
        <CandidateGaps candidate={candidate} />
        <CandidateDecision candidate={candidate} />
      </Stack>
      <Divider />
      <Stack direction="row" spacing={1} sx={{ p: 2, justifyContent: 'flex-end' }}>
        <DuncitButton
          color="error"
          startIcon={<BlockIcon />}
          disabled={!open || busy}
          onClick={() => onReject(candidate)}
          data-testid="candidate-reject"
        >
          {t('crm.leadResearch.reject')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          startIcon={<PlaylistAddCheckIcon />}
          disabled={!open || busy}
          onClick={() => onApprove(candidate)}
          data-testid="candidate-approve"
        >
          {t('crm.leadResearch.addToCrm')}
        </DuncitButton>
      </Stack>
    </>
  );
}

/**
 * One researched candidate: its Quality Score, why (criteria, evidence and the
 * pages it was found on), the CRM leads it duplicates, and Add to CRM / Reject
 * while it is still waiting for review. A crash inside stays inside the drawer.
 */
export default function CandidateDrawer({ candidate, onClose, ...rest }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <Drawer
      anchor="right"
      open={candidate !== null}
      onClose={onClose}
      slotProps={{
        paper: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': titleId, sx: { width: '100%', maxWidth: 'sm' } },
      }}
    >
      {candidate ? (
        <Stack sx={{ height: '100%' }} data-testid="candidate-drawer">
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography id={titleId} component="h2" variant="h6" sx={{ fontWeight: 800 }} noWrap>
                {candidate.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t(LEAD_KIND_LABEL_KEY[candidate.lead_type])}
              </Typography>
            </Box>
            <DuncitIconButton onClick={onClose} aria-label={t('shell.common.close')}>
              <CloseIcon />
            </DuncitIconButton>
          </Stack>
          <PageErrorBoundary>
            <CandidateBody candidate={candidate} {...rest} />
          </PageErrorBoundary>
        </Stack>
      ) : null}
    </Drawer>
  );
}

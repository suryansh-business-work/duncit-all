import { Link as RouterLink } from 'react-router';
import { Alert, AlertTitle, Box, Chip, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { LeadCandidateApproval } from '../../api/leadResearch.gql';
import { leadDetailPath } from '../../lib/leadKinds';
import { OUTCOME_COLOR, OUTCOME_KEY, labelOf } from '../../lib/leadResearchLabels';
import type { ApprovalResults } from './useCandidateActions';

/** One candidate's outcome: what happened, the server's reason, and the new lead when one was made. */
export function OutcomeLine({ outcome, results }: Readonly<{ outcome: LeadCandidateApproval; results: ApprovalResults }>) {
  const { t } = useTranslation();
  const leadType = results.leadTypes[outcome.candidate_id];
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
      <Chip size="small" color={OUTCOME_COLOR[outcome.outcome] ?? 'default'} label={labelOf(t, OUTCOME_KEY, outcome.outcome)} />
      <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
        {outcome.name}
      </Typography>
      <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
        {outcome.message}
      </Typography>
      {outcome.crm_lead_id && leadType ? (
        <Link component={RouterLink} to={leadDetailPath(leadType, outcome.crm_lead_id)} variant="body2">
          {t('crm.leadResearch.openLead')}
        </Link>
      ) : null}
    </Stack>
  );
}

interface Props {
  results: ApprovalResults;
  onDismiss: () => void;
}

/**
 * Every outcome of the last Add to CRM, one line per candidate — added,
 * duplicate, not qualified, skipped or failed — so nothing is silently left out.
 */
export default function ApprovalOutcomes({ results, onDismiss }: Readonly<Props>) {
  const { t } = useTranslation();
  const { outcomes } = results;
  if (outcomes.length === 0) return null;
  const added = outcomes.filter((outcome) => outcome.outcome === 'ADDED').length;
  return (
    <Alert severity={added === outcomes.length ? 'success' : 'warning'} onClose={onDismiss} closeText={t('shell.common.close')} data-testid="approval-outcomes">
      <AlertTitle>{t('crm.leadResearch.outcomesTitle', { vars: { added, total: outcomes.length } })}</AlertTitle>
      <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}>
        {outcomes.map((outcome) => (
          <li key={outcome.candidate_id}>
            <OutcomeLine outcome={outcome} results={results} />
          </li>
        ))}
      </Box>
    </Alert>
  );
}

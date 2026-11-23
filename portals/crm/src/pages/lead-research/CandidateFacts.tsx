import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Link, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { LeadCandidate } from '../../api/leadResearch.gql';
import ExternalLink from '../../components/ExternalLink';
import { leadDetailPath } from '../../lib/leadKinds';
import CandidateSection from './CandidateSection';

/** A label and its value; rows with nothing to show are left out. */
function Fact({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <>
      <Typography component="dt" variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </>
  );
}

/** Where the candidate is, how to reach them and what they do — as found on their public pages. */
export function CandidateFacts({ candidate }: Readonly<{ candidate: LeadCandidate }>) {
  const { t } = useTranslation();
  const place = [candidate.address, candidate.area, candidate.city].filter(Boolean).join(', ');
  const instagram = candidate.instagram_url || candidate.instagram_handle;
  return (
    <CandidateSection title={t('crm.leadResearch.details')}>
      <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', columnGap: 2, rowGap: 0.75 }}>
        {place ? <Fact label={t('crm.common.location')} value={place} /> : null}
        {candidate.category ? <Fact label={t('crm.common.category')} value={candidate.category} /> : null}
        {candidate.phones.length > 0 ? <Fact label={t('shell.common.phone')} value={candidate.phones.join(', ')} /> : null}
        {candidate.emails.length > 0 ? <Fact label={t('shell.common.email')} value={candidate.emails.join(', ')} /> : null}
        {candidate.website ? <Fact label={t('crm.common.website')} value={<ExternalLink href={candidate.website} />} /> : null}
        {instagram ? <Fact label={t('crm.common.instagram')} value={<ExternalLink href={instagram} />} /> : null}
      </Box>
      {candidate.description ? (
        <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-line' }}>
          {candidate.description}
        </Typography>
      ) : null}
    </CandidateSection>
  );
}

/** Who added or rejected the candidate, when, why, and the CRM lead it became. */
export function CandidateDecision({ candidate }: Readonly<{ candidate: LeadCandidate }>) {
  const { t } = useTranslation();
  if (!candidate.decided_at && !candidate.crm_lead_id) return null;
  return (
    <CandidateSection title={t('crm.leadResearch.decision')}>
      <Stack spacing={0.5}>
        {candidate.decided_at ? (
          <Typography variant="body2">
            {t('crm.leadResearch.decidedBy', {
              vars: { name: candidate.decided_by?.name ?? '', date: formatDateTime(candidate.decided_at) },
            })}
          </Typography>
        ) : null}
        {candidate.decision_note ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
            {candidate.decision_note}
          </Typography>
        ) : null}
        {candidate.crm_lead_id ? (
          <Link component={RouterLink} to={leadDetailPath(candidate.lead_type, candidate.crm_lead_id)} variant="body2">
            {t('crm.leadResearch.openLead')}
          </Link>
        ) : null}
      </Stack>
    </CandidateSection>
  );
}

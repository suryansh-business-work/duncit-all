import { Link as RouterLink } from 'react-router';
import { Alert, Box, Chip, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { LeadCandidate } from '../../api/leadResearch.gql';
import ExternalLink from '../../components/ExternalLink';
import { LEAD_KIND_LABEL_KEY, leadDetailPath } from '../../lib/leadKinds';
import { SOURCE_KIND_KEY, labelOf } from '../../lib/leadResearchLabels';
import CandidateSection from './CandidateSection';

const LIST = { m: 0, pl: 0, listStyle: 'none', display: 'grid', gap: 1 } as const;

/** The CRM leads this candidate matches — it can never be added while it does. */
export function CandidateDuplicates({ candidate }: Readonly<{ candidate: LeadCandidate }>) {
  const { t } = useTranslation();
  if (candidate.duplicates.length === 0) return null;
  return (
    <Alert severity="warning" data-testid="candidate-duplicates">
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {t('crm.leadResearch.duplicatesTitle', { count: candidate.duplicates.length })}
      </Typography>
      <Box component="ul" sx={{ ...LIST, gap: 0.5 }}>
        {candidate.duplicates.map((duplicate) => (
          <li key={`${duplicate.entity_type}-${duplicate.lead_id}`}>
            <Link component={RouterLink} to={leadDetailPath(duplicate.entity_type, duplicate.lead_id)} variant="body2">
              {duplicate.lead_name}
            </Link>
            <Typography variant="caption" component="span" sx={{ ml: 1 }}>
              {t('crm.leadResearch.duplicateMatch', { vars: { kind: t(LEAD_KIND_LABEL_KEY[duplicate.entity_type]), match: duplicate.match } })}
            </Typography>
          </li>
        ))}
      </Box>
    </Alert>
  );
}

/** The public pages the candidate was found on, with what was read there. */
export function CandidateSources({ candidate }: Readonly<{ candidate: LeadCandidate }>) {
  const { t } = useTranslation();
  return (
    <CandidateSection title={t('crm.leadResearch.sourcesFound')} testId="candidate-sources">
      {candidate.sources.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadResearch.noSources')}
        </Typography>
      ) : (
        <Box component="ul" sx={LIST}>
          {candidate.sources.map((source) => (
            <li key={source.url}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Chip size="small" variant="outlined" label={labelOf(t, SOURCE_KIND_KEY, source.kind)} />
                <ExternalLink href={source.url} variant="body2">
                  {source.title || source.url}
                </ExternalLink>
              </Stack>
              {source.text ? (
                <Typography
                  variant="caption"
                  component="p"
                  sx={{ color: 'text.secondary', m: 0, mt: 0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {source.text}
                </Typography>
              ) : null}
            </li>
          ))}
        </Box>
      )}
    </CandidateSection>
  );
}

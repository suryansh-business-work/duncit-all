import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { LeadCandidate } from '../../api/leadResearch.gql';
import { GATE_COLOR, GATE_KEY, STATUS_COLOR, STATUS_KEY } from '../../components/lead-quality/qualityLabels';
import { labelOf } from '../../lib/leadResearchLabels';
import CandidateSection, { formatPoints } from './CandidateSection';

type Result = NonNullable<LeadCandidate['result']>;

const LIST = { m: 0, pl: 0, listStyle: 'none', display: 'grid', gap: 1 } as const;

function Gates({ gates }: Readonly<{ gates: Result['gates'] }>) {
  const { t } = useTranslation();
  if (gates.length === 0) return null;
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
      {gates.map((gate) => (
        <Chip
          key={gate.key}
          size="small"
          variant="outlined"
          color={GATE_COLOR[gate.state] ?? 'default'}
          label={t('crm.leadResearch.gateState', { vars: { name: gate.name, state: labelOf(t, GATE_KEY, gate.state) } })}
        />
      ))}
    </Stack>
  );
}

/** The score criterion by criterion: points earned of the maximum, and each item's status. */
export function CandidateBreakdown({ candidate }: Readonly<{ candidate: LeadCandidate }>) {
  const { t } = useTranslation();
  const result = candidate.result;
  return (
    <CandidateSection title={t('crm.leadResearch.breakdown')} testId="candidate-breakdown">
      {result ? (
        <>
          <Gates gates={result.gates} />
          <Box component="ul" sx={LIST}>
            {result.criteria.map((criterion) => (
              <li key={criterion.key}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {criterion.name}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <Typography variant="body2">
                      {t('crm.leadResearch.points', { vars: { earned: formatPoints(criterion.earned), max: formatPoints(criterion.max) } })}
                    </Typography>
                    <Chip size="small" color={STATUS_COLOR[criterion.status] ?? 'default'} label={labelOf(t, STATUS_KEY, criterion.status)} />
                  </Stack>
                </Stack>
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2 }}>
                  {criterion.items.map((item) => (
                    <Typography key={item.key} component="li" variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('crm.leadResearch.itemLine', {
                        vars: {
                          name: item.name,
                          earned: formatPoints(item.earned),
                          max: formatPoints(item.points),
                          status: labelOf(t, STATUS_KEY, item.status),
                        },
                      })}
                    </Typography>
                  ))}
                </Box>
              </li>
            ))}
          </Box>
        </>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadQuality.notScored')}
        </Typography>
      )}
    </CandidateSection>
  );
}

/** What is still unverified, and the automatic checks that could not run. */
export function CandidateGaps({ candidate }: Readonly<{ candidate: LeadCandidate }>) {
  const { t } = useTranslation();
  return (
    <>
      <CandidateSection title={t('crm.leadResearch.missingEvidence')} testId="candidate-missing">
        {candidate.missing_evidence.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('crm.leadResearch.nothingMissing')}
          </Typography>
        ) : (
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            {candidate.missing_evidence.map((name) => (
              <Chip key={name} size="small" variant="outlined" label={name} />
            ))}
          </Stack>
        )}
      </CandidateSection>
      {candidate.skipped_checks.length > 0 ? (
        <CandidateSection title={t('crm.leadResearch.skippedChecks')} testId="candidate-skipped">
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {candidate.skipped_checks.map((check) => (
              <Typography key={check} component="li" variant="body2">
                {check}
              </Typography>
            ))}
          </Box>
        </CandidateSection>
      ) : null}
    </>
  );
}

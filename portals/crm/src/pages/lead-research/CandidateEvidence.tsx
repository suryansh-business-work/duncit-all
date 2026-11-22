import { useMemo } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { LeadCandidate } from '../../api/leadResearch.gql';
import ExternalLink from '../../components/ExternalLink';
import { STATUS_COLOR, STATUS_KEY, VIA_KEY } from '../../components/lead-quality/qualityLabels';
import { labelOf } from '../../lib/leadResearchLabels';
import CandidateSection from './CandidateSection';

/**
 * Every recorded piece of evidence: the item it proves, what was found, the
 * public page it was found on, and who recorded it (a person, an automatic
 * check, the discovery AI quoting a source, or an AI assistant).
 */
export default function CandidateEvidence({ candidate }: Readonly<{ candidate: LeadCandidate }>) {
  const { t } = useTranslation();
  const itemNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const criterion of candidate.result?.criteria ?? []) {
      names.set(criterion.key, criterion.name);
      for (const item of criterion.items) names.set(item.key, item.name);
    }
    return names;
  }, [candidate.result]);

  return (
    <CandidateSection title={t('crm.leadResearch.evidence')} testId="candidate-evidence">
      {candidate.evidence.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadResearch.noEvidence')}
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}>
          {candidate.evidence.map((entry) => (
            <Box component="li" key={entry.item_key} sx={{ borderLeft: 2, borderColor: 'divider', pl: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {itemNames.get(entry.item_key) ?? entry.item_key}
                </Typography>
                <Chip size="small" color={STATUS_COLOR[entry.status] ?? 'default'} label={labelOf(t, STATUS_KEY, entry.status)} />
                <Chip size="small" variant="outlined" label={labelOf(t, VIA_KEY, entry.via)} />
              </Stack>
              {entry.evidence ? (
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>
                  {entry.evidence}
                </Typography>
              ) : null}
              {entry.source_url ? <ExternalLink href={entry.source_url} variant="caption" /> : null}
              {entry.notes ? (
                <Typography variant="caption" component="p" sx={{ color: 'text.secondary', m: 0 }}>
                  {entry.notes}
                </Typography>
              ) : null}
              <Typography variant="caption" component="p" sx={{ color: 'text.secondary', m: 0 }}>
                {t('crm.leadResearch.recordedBy', { vars: { name: entry.actor.name, date: formatDateTime(entry.decided_at) } })}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </CandidateSection>
  );
}

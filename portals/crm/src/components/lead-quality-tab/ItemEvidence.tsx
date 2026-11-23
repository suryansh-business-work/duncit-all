import { Box, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { LeadDetailRow } from '../LeadDetailCard';
import ExternalLink from '../ExternalLink';
import { VIA_KEY, keyOr } from '../lead-quality/qualityLabels';
import type { QualityEvidence } from './qualityTypes';

/** The recorded decision behind one item: what proves it, the source, notes, and who decided it how and when. */
export default function ItemEvidence({ evidence }: Readonly<{ evidence: QualityEvidence | undefined }>) {
  const { t } = useTranslation();
  if (!evidence) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('crm.leadQualityTab.noEvidence')}
      </Typography>
    );
  }
  return (
    <Box sx={{ pl: 1.5, borderLeft: 2, borderColor: 'divider' }}>
      <LeadDetailRow label={t('crm.leadQualityTab.evidence')} value={evidence.evidence} />
      <LeadDetailRow
        label={t('crm.leadQualityTab.source')}
        value={evidence.source_url ? <ExternalLink href={evidence.source_url} /> : ''}
      />
      {evidence.notes && <LeadDetailRow label={t('crm.leadQualityTab.notes')} value={evidence.notes} />}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('crm.leadQualityTab.decidedBy', {
          vars: {
            via: t(keyOr(VIA_KEY, evidence.via, 'crm.leadQuality.viaManual')),
            name: evidence.actor.name,
            date: formatDateTime(evidence.decided_at),
          },
        })}
      </Typography>
    </Box>
  );
}

import { Box, Chip, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { LeadQualityEvent } from '../../api/leadQuality.gql';
import ExternalLink from '../ExternalLink';
import { STATUS_KEY, VIA_KEY, keyOr } from '../lead-quality/qualityLabels';
import { formatPoints } from './qualityFormat';

/** What started a rescore, as the history names it. */
const TRIGGER_KEY: Record<string, string> = {
  CREATE: 'crm.leadQualityTab.triggerCreate',
  UPDATE: 'crm.leadQualityTab.triggerUpdate',
  EVIDENCE: 'crm.leadQualityTab.triggerEvidence',
  RECALCULATE: 'crm.leadQualityTab.triggerRecalculate',
  CONFIG_PUBLISH: 'crm.leadQualityTab.triggerConfigPublish',
  RESEARCH: 'crm.leadQualityTab.triggerResearch',
  BACKFILL: 'crm.leadQualityTab.triggerBackfill',
};

interface Props {
  event: LeadQualityEvent;
  itemNames: ReadonlyMap<string, string>;
}

/** One history entry: a score change (with what caused it) or an evidence decision (with who made it and the source). */
export default function QualityHistoryEvent({ event, itemNames }: Readonly<Props>) {
  const { t } = useTranslation();
  const evidence = event.kind === 'EVIDENCE';
  const status = (value: string) => t(keyOr(STATUS_KEY, value, 'crm.leadQuality.statusPending'));
  const headline = evidence
    ? t('crm.leadQualityTab.historyEvidence', {
        vars: { item: itemNames.get(event.item_key) ?? event.item_key, before: status(event.status_before), after: status(event.status_after) },
      })
    : t('crm.leadQualityTab.historyScore', { vars: { before: formatPoints(event.score_before), after: formatPoints(event.score_after) } });
  const what = evidence
    ? t(keyOr(VIA_KEY, event.via, 'crm.leadQuality.viaManual'))
    : t(keyOr(TRIGGER_KEY, event.trigger, 'crm.leadQualityTab.triggerOther'));

  return (
    <Box
      component="li"
      sx={{ py: 1.25, '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' } }}
      data-testid={`lead-quality-event-${event.id}`}
    >
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {headline}
        </Typography>
        {!evidence && event.classification && <Chip size="small" variant="outlined" label={event.classification} />}
      </Stack>
      {evidence && event.evidence && <Typography variant="body2">{event.evidence}</Typography>}
      {evidence && event.source_url && <ExternalLink href={event.source_url} variant="body2" />}
      <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
        {t('crm.leadQualityTab.historyMeta', { vars: { what, name: event.actor.name, date: formatDateTime(event.created_at) } })}
      </Typography>
    </Box>
  );
}

import { Chip, Stack, Typography } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { AUTO_CHECK_KEY, STATUS_COLOR, STATUS_KEY, keyOr } from '../lead-quality/qualityLabels';
import { formatPoints } from './qualityFormat';
import ItemEvidence from './ItemEvidence';
import type { QualityEvidence, QualityItemResult } from './qualityTypes';

interface Props {
  item: QualityItemResult;
  evidence: QualityEvidence | undefined;
  onRecord: (item: QualityItemResult) => void;
}

const SUBTLE = { color: 'text.secondary' } as const;

/** One item of an expanded criterion: points, status, how it is checked, its evidence and the Record evidence action. */
export default function QualityItem({ item, evidence, onRecord }: Readonly<Props>) {
  const { t } = useTranslation();
  const check = t(keyOr(AUTO_CHECK_KEY, item.auto_check, 'crm.leadQuality.autoNone'));
  return (
    <Stack spacing={0.75} data-testid={`lead-quality-item-${item.key}`}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
          {item.name}
        </Typography>
        {item.mandatory && <Chip size="small" variant="outlined" label={t('crm.leadQualityTab.gate')} />}
        <Typography variant="body2" sx={SUBTLE}>
          {t('crm.leadQualityTab.itemPoints', { vars: { earned: formatPoints(item.earned), points: formatPoints(item.points) } })}
        </Typography>
        <Chip
          size="small"
          color={STATUS_COLOR[item.status] ?? 'default'}
          label={t(keyOr(STATUS_KEY, item.status, 'crm.leadQuality.statusPending'))}
        />
        <DuncitButton
          size="small"
          startIcon={<EditNoteIcon />}
          onClick={() => onRecord(item)}
          aria-label={t('crm.leadQualityTab.recordEvidenceFor', { vars: { name: item.name } })}
          data-testid={`lead-quality-record-${item.key}`}
        >
          {t('crm.leadQualityTab.recordEvidence')}
        </DuncitButton>
      </Stack>
      <Typography variant="caption" sx={SUBTLE}>
        {item.threshold == null ? check : `${check} · ${t('crm.leadQualityTab.threshold', { vars: { value: item.threshold } })}`}
      </Typography>
      {item.guidance && (
        <Typography variant="caption" sx={SUBTLE}>
          {t('crm.leadQualityTab.guidance', { vars: { text: item.guidance } })}
        </Typography>
      )}
      <ItemEvidence evidence={evidence} />
    </Stack>
  );
}

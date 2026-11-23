import { useNavigate } from 'react-router';
import { Chip, Stack, Typography } from '@mui/material';
import { TAB_PARAM } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import type { CrmLeadEntityType } from '../../../api/crm.types';
import type { LeadQualitySummary } from '../../../api/leadQuality.gql';
import { leadDetailPath } from '../../../lib/leadKinds';
import QualityScoreRing from '../../lead-quality/QualityScoreRing';
import { QUALIFICATION_COLOR, QUALIFICATION_KEY, keyOr } from '../../lead-quality/qualityLabels';
import { QUALITY_TAB } from '../../lead-quality-tab/useLeadQuality';
import QualityQuickView from './QualityQuickView';

interface Props {
  entity: CrmLeadEntityType;
  leadId: string;
  leadName: string;
  quality: LeadQualitySummary | null | undefined;
}

/**
 * A listing row's Quality Score: the compact ring (opens the lead on its
 * Quality Score tab), the classification, the qualification and a quick view.
 * Every control is a button, so the table's row click leaves them alone.
 */
export default function QualityScoreCell({ entity, leadId, leadName, quality }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openBreakdown = () => navigate(`${leadDetailPath(entity, leadId)}?${TAB_PARAM}=${QUALITY_TAB}`);

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }} data-testid={`lead-quality-cell-${leadId}`}>
      <QualityScoreRing score={quality?.score ?? null} tone={quality?.tone} label={quality?.classification_label} onClick={openBreakdown} />
      <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, maxWidth: '100%' }}>
          {quality ? quality.classification_label : t('crm.leadQuality.notScored')}
        </Typography>
        {quality && (
          <Chip
            size="small"
            variant="outlined"
            color={QUALIFICATION_COLOR[quality.qualification] ?? 'default'}
            label={t(keyOr(QUALIFICATION_KEY, quality.qualification, 'crm.leadQuality.pendingVerification'))}
          />
        )}
      </Stack>
      <QualityQuickView entity={entity} leadId={leadId} leadName={leadName} onOpenFull={openBreakdown} />
    </Stack>
  );
}

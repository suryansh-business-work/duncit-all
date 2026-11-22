import { useId, useState } from 'react';
import { Alert, Box, Chip, Popover, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { CrmLeadEntityType } from '../../../api/crm.types';
import { useLeadQualityDetails } from '../../lead-quality-tab/useLeadQuality';
import { formatPoints } from '../../lead-quality-tab/qualityFormat';
import { STATUS_COLOR, STATUS_KEY, keyOr } from '../../lead-quality/qualityLabels';

interface Props {
  entity: CrmLeadEntityType;
  leadId: string;
  leadName: string;
  onOpenFull: () => void;
}

const ROW_SX = { alignItems: 'center', py: 0.5 } as const;

/** The breakdown itself — mounted only while the popover is open, so the score is fetched on demand. */
function QuickViewBody({ entity, leadId }: Readonly<Pick<Props, 'entity' | 'leadId'>>) {
  const { t } = useTranslation();
  const { details, loading, error } = useLeadQualityDetails(entity, leadId);
  if (loading && !details) return <Loader variant="inline" showLabel label={t('crm.leadQualityTab.loading')} />;
  if (!details) {
    return (
      <Alert severity="error">
        {t('crm.leadQualityTab.quickViewFailed')} {error ? parseApiError(error) : ''}
      </Alert>
    );
  }
  const { result } = details;
  if (!result) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('crm.leadQuality.notScored')}
      </Typography>
    );
  }
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }} data-testid="lead-quality-quickview-list">
      {result.criteria.map((criterion) => (
        <Stack component="li" key={criterion.key} direction="row" spacing={1} sx={ROW_SX}>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
            {criterion.name}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t('crm.leadQualityTab.earnedOfMax', { vars: { earned: formatPoints(criterion.earned), max: formatPoints(criterion.max) } })}
          </Typography>
          <Chip
            size="small"
            color={STATUS_COLOR[criterion.status] ?? 'default'}
            label={t(keyOr(STATUS_KEY, criterion.status, 'crm.leadQuality.statusPending'))}
          />
        </Stack>
      ))}
      <Stack component="li" direction="row" spacing={1} sx={{ ...ROW_SX, borderTop: 1, borderColor: 'divider', mt: 0.5 }}>
        <Typography variant="body2" sx={{ flex: 1, fontWeight: 700 }}>
          {t('crm.leadQualityTab.total')}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t('crm.leadQualityTab.earnedOfMax', { vars: { earned: formatPoints(result.score), max: formatPoints(result.max_score) } })}
        </Typography>
      </Stack>
    </Box>
  );
}

/**
 * The listing's quick look at a lead's score: an info button opening a
 * popover with the criterion breakdown (name, earned/max, status), and a link
 * to the full breakdown on the lead's page. Keyboard: Enter/Space opens it,
 * Escape closes it and focus returns to the button.
 */
export default function QualityQuickView({ entity, leadId, leadName, onOpenFull }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const titleId = useId();
  const close = () => setAnchor(null);

  return (
    <>
      <DuncitIconButton
        size="small"
        aria-label={t('crm.leadQualityTab.quickView', { vars: { name: leadName } })}
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid={`lead-quality-quickview-${leadId}`}
      >
        <InfoOutlinedIcon fontSize="small" />
      </DuncitIconButton>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { role: 'dialog', 'aria-labelledby': titleId } }}
      >
        <Box sx={{ p: 2, width: (theme) => theme.spacing(44), maxWidth: '100%' }}>
          <Typography id={titleId} component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {t('crm.leadQualityTab.quickViewTitle')}
          </Typography>
          <QuickViewBody entity={entity} leadId={leadId} />
          <DuncitButton
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => {
              close();
              onOpenFull();
            }}
            sx={{ mt: 1.5 }}
          >
            {t('crm.leadQualityTab.openFullBreakdown')}
          </DuncitButton>
        </Box>
      </Popover>
    </>
  );
}

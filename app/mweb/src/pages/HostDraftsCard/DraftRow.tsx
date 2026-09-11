import { Link as RouterLink } from 'react-router';
import { Box, Chip, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { draftHoursLeft } from '@duncit/utils';
import { formatDateTime } from '../../utils/dateFormat';
import { STEP_TITLES } from '../create-pod-page/create-pod';
import { useTranslation } from '../../i18n/useTranslation';
import type { DraftRowData } from './drafts';

interface DraftRowProps {
  draft: DraftRowData;
  /** Inside the 24h deletion window: given a countdown and a warning CTA. */
  expiring: boolean;
  onDelete: (id: string) => void;
}

/** One resumable draft row. The expiring variant is the same row wearing the
 * warning colour, so the two groups stay visually one list. */
export default function DraftRow({ draft, expiring, onDelete }: Readonly<DraftRowProps>) {
  const { t } = useTranslation();
  const step = Math.min(draft.step ?? 0, STEP_TITLES.length - 1);
  const when = formatDateTime(draft.updated_at);
  const hours = draftHoursLeft(draft);
  const countdown =
    hours > 0
      ? t('mweb.hostManage.draftExpiresInHours', { vars: { hours } })
      : t('mweb.hostManage.draftExpiresWithinHour');

  return (
    <Stack
      direction="row"
      spacing={1}
      data-testid={expiring ? `draft-expiring-${draft.id}` : `draft-row-${draft.id}`}
      sx={{ alignItems: 'center', px: 2, py: 1.75 }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
          {draft.pod_title || t('mweb.hostManage.untitledPod')}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{ color: 'text.secondary', display: 'block' }}
        >
          Step {step + 1}/{STEP_TITLES.length} · {STEP_TITLES[step]}
          {when ? ` · ${when}` : ''}
        </Typography>
        {expiring ? (
          <Chip
            color="warning"
            variant="outlined"
            icon={<ScheduleIcon />}
            label={countdown}
            sx={{ mt: 0.75, height: 24 }}
          />
        ) : null}
      </Box>
      <DuncitButton
        component={RouterLink}
        to={`/create-pod/${draft.id}`}
        size="small"
        variant={expiring ? 'contained' : 'outlined'}
        color={expiring ? 'warning' : 'primary'}
      >
        {t('mweb.common.continue')}
      </DuncitButton>
      <DuncitIconButton
        aria-label={t('mweb.common.deleteDraft2')}
        onClick={() => onDelete(draft.id)}
        size="small"
        color="error"
      >
        <DeleteOutlineIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}

import { Link as RouterLink } from 'react-router-dom';
import { Box, Chip, Stack, Typography, alpha } from '@mui/material';
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
  /** Inside the 24h deletion window: tinted, outlined and given a countdown. */
  expiring: boolean;
  onDelete: (id: string) => void;
}

/** One resumable draft. The expiring variant is the same row wearing the
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
      sx={{
        alignItems: 'center',
        p: 1.25,
        borderRadius: '16px',
        border: 1,
        borderColor: expiring ? 'warning.main' : 'divider',
        bgcolor: (theme) =>
          expiring ? alpha(theme.palette.warning.main, 0.12) : 'transparent',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
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
            size="small"
            color="warning"
            variant="outlined"
            icon={<ScheduleIcon />}
            label={countdown}
            sx={{ mt: 0.75, fontWeight: 700 }}
          />
        ) : null}
      </Box>
      <DuncitButton
        component={RouterLink}
        to={`/create-pod/${draft.id}`}
        size="small"
        variant={expiring ? 'contained' : 'outlined'}
        color={expiring ? 'warning' : 'primary'}
        sx={{ borderRadius: 999, fontWeight: 700 }}
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

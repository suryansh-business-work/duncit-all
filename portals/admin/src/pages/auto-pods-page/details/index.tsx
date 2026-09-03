import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Chip, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoModeIcon from '@mui/icons-material/AutoMode';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { shellAutoPodLabels, type AutoPodRole } from '@duncit/utils';
import { AUTO_PODS_PATH } from '../../../config/app-config';
import { AutoPodStageChip } from '../AutoPodStageChip';
import AutoPodEnrolledDialog from '../enrolled/AutoPodEnrolledDialog';
import AutoPodEnrolmentRow from './AutoPodEnrolmentRow';
import AutoPodSummary from './AutoPodSummary';
import { useAutoPodDetails } from './useAutoPodDetails';

/**
 * Admin > Auto Pods > one offer. The row on the table says how far along an
 * offer is; this page says what it IS — its stage, whether it is physical or
 * virtual, the template every partner reads before enrolling, and the three
 * enrolment places with who took each one and how many partners could still
 * fill the rest.
 */
export default function AutoPodDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const labels = useMemo(() => shellAutoPodLabels(t), [t]);
  const { row, loading, error, counts } = useAutoPodDetails(id);
  const [openRole, setOpenRole] = useState<AutoPodRole | null>(null);

  return (
    <>
      <Stack spacing={2}>
        <DuncitButton
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(AUTO_PODS_PATH)}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('admin.autoPods.backToList')}
        </DuncitButton>

        <QueryGuard
          loading={loading}
          error={error}
          errorText={t('admin.autoPods.detailsLoadFailed')}
          notFound={!loading && !error && !row}
          notFoundSeverity="warning"
          notFoundText={t('admin.autoPods.detailsNotFound')}
        >
          {() =>
            row ? (
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <AutoModeIcon color="primary" />
                  <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {row.pod_title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {row.auto_pod_no}
                    </Typography>
                  </Box>
                  <AutoPodStageChip row={row} t={t} />
                  <Chip
                    size="small"
                    color={row.is_active ? 'success' : 'default'}
                    variant="outlined"
                    label={row.is_active ? t('admin.autoPods.active') : t('admin.autoPods.paused')}
                  />
                  {row.pod_id ? (
                    <DuncitButton size="small" onClick={() => navigate(`/pods/${row.pod_id}`)}>
                      {t('admin.autoPods.viewPod')}
                    </DuncitButton>
                  ) : null}
                </Stack>

                <AutoPodEnrolmentRow
                  row={row}
                  counts={counts}
                  t={t}
                  labels={labels}
                  formatDateTime={formatDateTime}
                  onOpen={setOpenRole}
                />

                <AutoPodSummary row={row} t={t} labels={labels} formatDateTime={formatDateTime} />
              </Stack>
            ) : null
          }
        </QueryGuard>
      </Stack>

      {row && openRole ? (
        <AutoPodEnrolledDialog
          row={row}
          role={openRole}
          onClose={() => setOpenRole(null)}
          t={t}
          labels={labels}
          formatDateTime={formatDateTime}
        />
      ) : null}
    </>
  );
}

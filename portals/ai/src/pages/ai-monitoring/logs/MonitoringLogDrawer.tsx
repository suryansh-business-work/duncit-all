import { Box, Button, Chip, Drawer, Divider, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { InfoRow } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';
import {
  ACTION_COLOR,
  RESULT_COLOR,
  STATUS_COLOR,
  type MonitoringLogRow,
} from '../queries';

interface Props {
  row: MonitoringLogRow | null;
  onClose: () => void;
}

/**
 * One check, in full.
 *
 * The table answers "what happened"; this answers "why should I believe it" —
 * the picture that was judged, the model that judged it, how long it took, and
 * the raw failure text when it did not finish. That trail is the point of the
 * log: an action taken against someone's upload has to be explainable.
 */
export default function MonitoringLogDrawer({ row, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Drawer anchor="right" open={row !== null} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 460 }, p: 2.5 }}>
        {row && (
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={700}>
              {row.file_name || 'Uploaded image'}
            </Typography>

            <Box
              component="img"
              src={row.url}
              alt=""
              sx={{
                width: '100%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 2,
                bgcolor: 'action.hover',
              }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={row.status} color={STATUS_COLOR[row.status]} />
              <Chip
                size="small"
                variant="outlined"
                label={row.risk}
                color={RESULT_COLOR[row.risk]}
              />
              <Chip
                size="small"
                variant="outlined"
                label={row.action}
                color={ACTION_COLOR[row.action]}
              />
            </Stack>

            <Divider />

            <InfoRow label={t('ai.monitoringLogs.detailUser')} value={row.entity ?? t('ai.monitoringLogs.signedOutUpload')} />
            <InfoRow label={t('ai.monitoringLogs.detailAccountId')} value={row.user_id ?? '—'} />
            <InfoRow label={t('ai.monitoringLogs.detailUploaded')} value={formatDateTime(row.created_at)} />
            <InfoRow
              label={t('ai.monitoringLogs.detailChecked')}
              value={row.checked_at ? formatDateTime(row.checked_at) : t('ai.monitoringLogs.detailNotYet')}
            />
            <InfoRow label={t('ai.monitoringLogs.detailSource')} value={row.surface || '—'} />
            <InfoRow label={t('ai.monitoringLogs.detailFolder')} value={row.folder || '/'} />
            <InfoRow label={t('ai.monitoringLogs.detailModel')} value={row.model || '—'} />
            <InfoRow label={t('ai.monitoringLogs.detailTook')} value={row.duration_ms ? `${row.duration_ms} ms` : '—'} />

            <Divider />

            <Box>
              <Typography variant="caption" color="text.secondary">
                Reason / comment
              </Typography>
              <Typography variant="body2">{row.summary || '—'}</Typography>
            </Box>

            {row.error && (
              <Box>
                <Typography variant="caption" color="error">
                  Failure detail
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {row.error}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={1}>
              <Button href={row.url} target="_blank" rel="noopener" variant="outlined" size="small">
                Open image
              </Button>
              <Button onClick={onClose} size="small">
                Close
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}

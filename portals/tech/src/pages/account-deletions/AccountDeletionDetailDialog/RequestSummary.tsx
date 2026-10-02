import { Chip, Stack, Typography } from '@mui/material';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { STATUS_COLOR } from '../status';
import type { DeletionDetail } from '../queries';

interface Props {
  request: DeletionDetail['request'];
}

/** Status chips plus who asked and why. */
export default function RequestSummary({ request }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <Chip
          size="small"
          color={STATUS_COLOR[request.status] ?? 'default'}
          label={request.status}
        />
        <Chip size="small" variant="outlined" label={request.surface} />
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {formatDateTime(request.requested_at)}
        </Typography>
        {request.days_remaining !== null && (
          <Chip
            size="small"
            color={request.days_remaining > 3 ? 'default' : 'warning'}
            label={t('tech.accountDeletions.dueOn', {
              vars: {
                date: formatDateTime(request.scheduled_delete_at),
                count: request.days_remaining,
              },
            })}
          />
        )}
      </Stack>

      <Stack spacing={0.25}>
        <Typography variant="subtitle1" sx={{
          fontWeight: 700
        }}>
          {request.name || request.email}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {[request.email, request.phone].filter(Boolean).join(' · ')}
        </Typography>
        <Typography
          variant="body2"
          color={request.reason ? 'text.primary' : 'text.secondary'}
          sx={{ mt: 0.5 }}
        >
          {request.reason || t('tech.accountDeletions.noReason')}
        </Typography>
      </Stack>
    </>
  );
}

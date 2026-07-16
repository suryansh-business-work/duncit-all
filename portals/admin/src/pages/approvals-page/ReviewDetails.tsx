import { Alert, Chip, Divider, Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import type { ApprovalRequest } from './helpers';

interface Props {
  request: ApprovalRequest;
  formatDateTime: (s: string) => string;
}

export default function ReviewDetails({ request, formatDateTime }: Readonly<Props>) {
  const isReviewed = request.status !== 'PENDING';
  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <StatusChip status={request.status} />
        {request.kind && <Chip size="small" variant="outlined" color="secondary" label={request.kind} />}
        {request.source_portal && (
          <Chip size="small" variant="outlined" label={request.source_portal} />
        )}
      </Stack>

      {request.summary && (
        <Typography variant="body2" color="text.secondary">
          {request.summary}
        </Typography>
      )}

      <Divider textAlign="left">
        <Typography variant="overline" color="text.secondary">
          Details
        </Typography>
      </Divider>

      <Stack spacing={1.25}>
        {request.details.map((d) => (
          <Stack key={d.label} spacing={0.25}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {d.label}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {d.value || '—'}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {isReviewed && (
        <Alert severity={request.status === 'APPROVED' ? 'success' : 'error'}>
          <Typography variant="body2" fontWeight={700}>
            {request.status} by {request.reviewed_by_name || 'Unknown'}
            {request.reviewed_at ? ` · ${formatDateTime(request.reviewed_at)}` : ''}
          </Typography>
          {request.review_notes && (
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {request.review_notes}
            </Typography>
          )}
        </Alert>
      )}
    </Stack>
  );
}

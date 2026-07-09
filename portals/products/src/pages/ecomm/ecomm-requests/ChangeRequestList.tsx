import { useQuery } from '@apollo/client';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { MY_ECOMM_CHANGE_REQUESTS } from './queries';

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'error',
};

interface ChangeRequest {
  id: string;
  title?: string | null;
  status: string;
  summary?: string | null;
  created_at?: string | null;
  review_notes?: string | null;
  details: { label: string; value?: string | null }[];
}

/** The requests raised from this portal for a kind (BRAND | PRODUCT). */
export default function ChangeRequestList({ kind }: Readonly<{ kind: 'BRAND' | 'PRODUCT' }>) {
  const { data, loading } = useQuery(MY_ECOMM_CHANGE_REQUESTS, {
    variables: { kind },
    fetchPolicy: 'cache-and-network',
  });
  const requests: ChangeRequest[] = data?.myEcommChangeRequests ?? [];

  if (loading && requests.length === 0) {
    return (
      <Stack alignItems="center" sx={{ py: 3 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }
  if (requests.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No change requests yet. Submit one above and it will appear here for review.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {requests.map((request) => (
        <Box key={request.id} sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {request.title}
            </Typography>
            <Chip size="small" label={request.status} color={STATUS_COLOR[request.status] ?? 'default'} />
          </Stack>
          {request.details.map((detail) => (
            <Typography key={detail.label} variant="caption" color="text.secondary" display="block">
              <strong>{detail.label}:</strong> {detail.value}
            </Typography>
          ))}
          {request.review_notes && (
            <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5 }}>
              Reviewer: {request.review_notes}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { parseApiError } from '../../../utils/parseApiError';
import BackoutRefundInfoCards from './BackoutRefundInfoCards';
import { BACKOUT_REFUND_DETAIL, type BackoutRefundDetail } from './queries';

interface DetailData {
  backoutRefundRequest: BackoutRefundDetail | null;
  publicFinanceSettings: { currency_symbol: string };
}

export default function BackoutRefundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<DetailData>(BACKOUT_REFUND_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const request = data?.backoutRefundRequest;
  const sym = data?.publicFinanceSettings?.currency_symbol ?? '';

  if (loading && !request) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{parseApiError(error)}</Alert>;
  if (!request) return <Alert severity="warning">Backout refund request not found.</Alert>;

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <IconButton aria-label="Back to Backout Refunds" onClick={() => navigate('/backout-refunds')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>{request.pod?.pod_title ?? 'Backout refund'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {request.user_name ?? '—'}
            {request.user_email ? ` · ${request.user_email}` : ''}
          </Typography>
        </Box>
      </Stack>

      <BackoutRefundInfoCards request={request} sym={sym} />
    </Box>
  );
}

import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import BackoutRefundInfoCards from './BackoutRefundInfoCards';
import BackoutTimeline from './BackoutTimeline';
import { BACKOUT_REFUND_DETAIL, type BackoutRefundDetail } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface DetailData {
  backoutRefundRequest: BackoutRefundDetail | null;
  publicFinanceSettings: { currency_symbol: string };
}

export default function BackoutRefundDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<DetailData>(BACKOUT_REFUND_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const request = data?.backoutRefundRequest;
  const sym = data?.publicFinanceSettings?.currency_symbol ?? '';

  return (
    <QueryGuard
      loading={loading && !request}
      error={error}
      notFound={!request}
      notFoundText="Backout refund request not found."
      notFoundSeverity="warning"
      spinnerSx={{ p: 6 }}
    >
      {() => {
        if (!request) return null;
        return (
          <Box>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: "center",
                mb: 3
              }}>
              <DuncitIconButton aria-label={t('finance.backoutRefund.backToBackoutRefunds')} onClick={() => navigate('/backout-refunds')}>
                <ArrowBackIcon />
              </DuncitIconButton>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{
                  fontWeight: 700
                }}>{request.pod?.pod_title ?? 'Backout refund'}</Typography>
                <Typography variant="body2" sx={{
                  color: "text.secondary"
                }}>
                  {request.backout_no}
                  {request.user_name ? ` · ${request.user_name}` : ''}
                  {request.user_email ? ` · ${request.user_email}` : ''}
                </Typography>
              </Box>
            </Stack>

            <BackoutRefundInfoCards request={request} sym={sym} />

            {/* Complete Backout lifecycle, below the Refund section (spec). */}
            <Box sx={{ mt: 2 }}>
              <BackoutTimeline
                participation={request.participation}
                podDateTime={request.pod?.pod_date_time}
                backoutNo={request.backout_no}
              />
            </Box>
          </Box>
        );
      }}
    </QueryGuard>
  );
}

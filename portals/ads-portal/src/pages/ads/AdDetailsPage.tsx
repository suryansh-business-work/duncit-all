import { useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, AlertTitle, Grid, Stack, Typography } from '@mui/material';
import { BackHeader, QueryGuard, StatusChip } from '@duncit/ui';
import { formatDateCell } from '@duncit/table';
import AdMediaCard from './ad-details/AdMediaCard';
import AdSummaryCard from './ad-details/AdSummaryCard';
import { AD_STATUS_COLORS } from './ad-options';
import { AD_REQUEST, type AdRequestDetail } from './queries';

function MarketingRemarks({ ad }: Readonly<{ ad: AdRequestDetail }>) {
  if (!ad.marketing_remarks) return null;
  const reviewedOn = ad.reviewed_at
    ? ` · Reviewed ${formatDateCell(ad.reviewed_at, 'd MMM yyyy, HH:mm')}`
    : '';
  return (
    <Alert severity="info">
      <AlertTitle>Marketing Remarks{reviewedOn}</AlertTitle>
      {ad.marketing_remarks}
    </Alert>
  );
}

function AdDetailsContent({ ad }: Readonly<{ ad: AdRequestDetail }>) {
  return (
    <Stack spacing={3}>
      <BackHeader
        backTo="/ads"
        backAriaLabel="Back to My Ads"
        eyebrow={`Trace ID · ${ad.trace_id}`}
        title={ad.ad_title}
        actions={<StatusChip status={ad.status} colorMap={AD_STATUS_COLORS} />}
      />
      <Typography variant="body2" color="text.secondary">
        Submitted {formatDateCell(ad.created_at, 'd MMM yyyy, HH:mm')}
      </Typography>
      <MarketingRemarks ad={ad} />
      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} md={5}>
          <AdMediaCard ad={ad} />
        </Grid>
        <Grid item xs={12} md={7}>
          <AdSummaryCard ad={ad} />
        </Grid>
      </Grid>
    </Stack>
  );
}

export default function AdDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useQuery<{ adRequest: AdRequestDetail }>(AD_REQUEST, {
    variables: { id },
    skip: !id,
  });
  const ad = data?.adRequest;

  return (
    <QueryGuard
      loading={loading && !ad}
      error={error}
      notFound={!ad}
      notFoundText="Ad request not found."
    >
      {() => (ad ? <AdDetailsContent ad={ad} /> : null)}
    </QueryGuard>
  );
}

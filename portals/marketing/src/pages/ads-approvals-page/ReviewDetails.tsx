import type { ReactNode } from 'react';
import { Box, Grid, Link, Paper, Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { adPositionLabel, formatAdMoney } from '../../lib/ad-positions';
import { AD_STATUS_CHIP_COLORS, type AdRequestRow } from './helpers';

type FormatDateTime = (s: string) => string;

function MediaPreview({ request }: Readonly<{ request: AdRequestRow }>) {
  if (request.ad_type === 'VIDEO') {
    return (
      <video
        src={request.media_url}
        controls
        preload="metadata"
        style={{ width: '100%', maxHeight: 260, borderRadius: 8, background: '#000' }}
      />
    );
  }
  return (
    <Box
      component="img"
      src={request.media_url}
      alt={request.ad_title}
      sx={{ width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 1, bgcolor: 'action.hover' }}
    />
  );
}

function DetailItem({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value}
      </Typography>
    </Grid>
  );
}

/** Prominent budget card: per-day × duration breakdown, plus the frozen approved cost. */
function BudgetCard({ request }: Readonly<{ request: AdRequestRow }>) {
  const perDay = Math.round((request.estimated_cost / request.duration_days) * 100) / 100;
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
      <Typography variant="caption" color="text.secondary" component="div">
        Estimated budget
      </Typography>
      <Typography variant="h5" fontWeight={700} component="div">
        {formatAdMoney(request.currency_symbol, request.estimated_cost)}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div">
        {formatAdMoney(request.currency_symbol, perDay)} / day × {request.duration_days}{' '}
        {request.duration_days === 1 ? 'day' : 'days'} · {adPositionLabel(request.position)}
      </Typography>
      {request.approved_cost !== null && (
        <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }} component="div">
          Approved cost: {formatAdMoney(request.currency_symbol, request.approved_cost)} (frozen at
          approval)
        </Typography>
      )}
    </Paper>
  );
}

export default function ReviewDetails({
  request,
  formatDateTime,
}: Readonly<{ request: AdRequestRow; formatDateTime: FormatDateTime }>) {
  return (
    <Stack spacing={2}>
      <MediaPreview request={request} />
      <BudgetCard request={request} />
      <Grid container spacing={1.5}>
        <DetailItem label="Trace ID" value={request.trace_id} />
        <DetailItem
          label="Status"
          value={<StatusChip status={request.status} colorMap={AD_STATUS_CHIP_COLORS} />}
        />
        <DetailItem label="Submitted by" value={request.submitted_by_name || '—'} />
        <DetailItem label="Position" value={adPositionLabel(request.position)} />
        <DetailItem label="Media type" value={request.ad_type} />
        <DetailItem
          label="Schedule"
          value={`${formatDateTime(request.start_at)} → ${formatDateTime(request.end_at)}`}
        />
        <DetailItem
          label="Redirect link"
          value={
            request.redirect_url ? (
              <Link href={request.redirect_url} target="_blank" rel="noopener noreferrer">
                {request.redirect_url}
              </Link>
            ) : (
              '—'
            )
          }
        />
        <DetailItem label="Target audience" value={request.target_audience || '—'} />
        <DetailItem label="Requested at" value={formatDateTime(request.created_at)} />
        {request.reviewed_at && (
          <DetailItem label="Reviewed at" value={formatDateTime(request.reviewed_at)} />
        )}
      </Grid>
      <Box>
        <Typography variant="caption" color="text.secondary" component="div">
          Description
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} component="div">
          {request.ad_description}
        </Typography>
      </Box>
      {request.marketing_remarks && (
        <Box>
          <Typography variant="caption" color="text.secondary" component="div">
            Marketing remarks
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} component="div">
            {request.marketing_remarks}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

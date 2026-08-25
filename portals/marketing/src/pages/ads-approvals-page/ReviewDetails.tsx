import type { ReactNode } from 'react';
import { Box, Grid, Link, Paper, Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { adPositionLabel, formatAdMoney } from '../../lib/ad-positions';
import { AD_STATUS_CHIP_COLORS, type AdRequestRow } from './helpers';
import { useTranslation } from '@duncit/app-settings';

type FormatDateTime = (s: string) => string;

function MediaPreview({ request }: Readonly<{ request: AdRequestRow }>) {
  if (request.ad_type === 'VIDEO') {
    return (
      <video
        src={request.media_url}
        controls
        preload="metadata"
        style={{ width: '100%', maxHeight: 260, borderRadius: 8, background: '#000' }}
      >
        <track kind="captions" />
      </video>
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
    <Grid
      size={{
        xs: 12,
        sm: 6
      }}>
      <Typography variant="caption" component="div" sx={{
        color: "text.secondary"
      }}>
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
      <Typography variant="caption" component="div" sx={{
        color: "text.secondary"
      }}>
        Estimated budget
      </Typography>
      <Typography variant="h5" component="div" sx={{
        fontWeight: 700
      }}>
        {formatAdMoney(request.currency_symbol, request.estimated_cost)}
      </Typography>
      <Typography variant="caption" component="div" sx={{
        color: "text.secondary"
      }}>
        {formatAdMoney(request.currency_symbol, perDay)} / day × {request.duration_days}{' '}
        {request.duration_days === 1 ? 'day' : 'days'} · {adPositionLabel(request.position)}
      </Typography>
      {request.approved_cost !== null && (
        <Typography
          variant="body2"
          component="div"
          sx={{
            fontWeight: 600,
            mt: 1
          }}>
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
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <MediaPreview request={request} />
      <BudgetCard request={request} />
      <Grid container spacing={1.5}>
        <DetailItem label={t('marketing.adsApprovals.traceId')} value={request.trace_id} />
        <DetailItem
          label={t('shell.common.status')}
          value={<StatusChip status={request.status} colorMap={AD_STATUS_CHIP_COLORS} />}
        />
        <DetailItem label={t('marketing.adsApprovals.submittedBy2')} value={request.submitted_by_name || '—'} />
        <DetailItem label={t('marketing.common.position')} value={adPositionLabel(request.position)} />
        <DetailItem label={t('marketing.adsApprovals.mediaType')} value={request.ad_type} />
        <DetailItem
          label={t('marketing.common.schedule')}
          value={`${formatDateTime(request.start_at)} → ${formatDateTime(request.end_at)}`}
        />
        <DetailItem
          label={t('marketing.adsApprovals.redirectLink')}
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
        <DetailItem label={t('marketing.common.targetAudience')} value={request.target_audience || '—'} />
        <DetailItem label={t('marketing.adsApprovals.requestedAt')} value={formatDateTime(request.created_at)} />
        {request.reviewed_at && (
          <DetailItem label={t('marketing.adsApprovals.reviewedAt')} value={formatDateTime(request.reviewed_at)} />
        )}
      </Grid>
      <Box>
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
          Description
        </Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} component="div">
          {request.ad_description}
        </Typography>
      </Box>
      {request.marketing_remarks && (
        <Box>
          <Typography variant="caption" component="div" sx={{
            color: "text.secondary"
          }}>
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

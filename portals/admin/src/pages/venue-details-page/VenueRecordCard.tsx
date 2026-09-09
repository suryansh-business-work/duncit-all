import { Divider, Stack, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { InfoRow } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import SectionCard from './SectionCard';
import { EMPTY, orDash } from './venue-values';
import type { AdminVenueDetail } from './queries';

const stamp = (value: string | null | undefined) => (value ? formatDateTime(value) : EMPTY);

/** The audit side of the record: its permanent id, how it moved through review,
 * what the reviewer wrote, and the two percentages settlement reads. */
export default function VenueRecordCard({ venue }: Readonly<{ venue: AdminVenueDetail }>) {
  const { t } = useTranslation();

  return (
    <SectionCard icon={<HistoryIcon color="primary" />} title={t('admin.venueDetails.record')}>
      <Stack spacing={1.5}>
        <InfoRow label={t('admin.venueDetails.venueNo')} value={orDash(venue.venue_no)} />
        <InfoRow label={t('admin.venueDetails.createdAt')} value={stamp(venue.created_at)} />
        <InfoRow label={t('admin.venueDetails.submittedAt')} value={stamp(venue.submitted_at)} />
        <InfoRow label={t('admin.venueDetails.approvedAt')} value={stamp(venue.approved_at)} />
        <InfoRow label={t('admin.venueDetails.rejectedAt')} value={stamp(venue.rejected_at)} />
        <InfoRow label={t('admin.venueDetails.updatedAt')} value={stamp(venue.updated_at)} />
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>
        {t('admin.venueDetails.commercials')}
      </Typography>
      <Stack spacing={1}>
        <InfoRow variant="split" label={t('admin.venueDetails.statShare')} value={`${venue.venue_share_pct}%`} />
        <InfoRow
          variant="split"
          label={t('admin.venueDetails.statCommission')}
          value={`${venue.venue_commission_pct}%`}
        />
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>
        {t('admin.venueDetails.reviewerNotes')}
      </Typography>
      <Typography
        variant="body2"
        sx={{ whiteSpace: 'pre-wrap', color: venue.reviewer_notes ? 'text.primary' : 'text.secondary' }}
      >
        {venue.reviewer_notes || t('admin.venueDetails.noNotes')}
      </Typography>
    </SectionCard>
  );
}

import { Box, Divider, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { InfoRow } from '@duncit/ui';
import SectionCard from './SectionCard';
import { fmtDateTime } from './format';
import { useTranslation } from './i18n/useTranslation';

function Row({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return <InfoRow variant="split" label={label} value={value} sx={{ py: 0.75 }} />;
}

interface Props {
  pod: any;
  showProducts: boolean;
}

/** The pod's core facts — schedule, capacity, reach and description. */
export default function PodOverviewCard({ pod, showProducts }: Readonly<Props>) {
  const { t } = useTranslation();
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  // Seats, not buyers: one booking can cover several people, so the identity
  // list showed an admin free capacity the pod does not have.
  const attendees = pod.seats_taken ?? pod.pod_attendees?.length ?? 0;

  return (
    <SectionCard icon={<GroupsIcon fontSize="small" />} title={t('podDetailsPanel.podOverviewCard.overview')}>
      <Row label={t('podDetailsPanel.podOverviewCard.podId')} value={pod.pod_id} />
      <Row label={t('podDetailsPanel.podOverviewCard.when')} value={fmtDateTime(pod.pod_date_time)} />
      <Row label={t('podDetailsPanel.podOverviewCard.ends')} value={fmtDateTime(pod.pod_end_date_time)} />
      {isVirtual ? (
        <Row label={t('podDetailsPanel.podOverviewCard.meeting')} value={pod.meeting_platform || 'Online'} />
      ) : (
        <Row label={t('podDetailsPanel.podOverviewCard.zone')} value={pod.zone_name || '—'} />
      )}
      <Row label={t('podDetailsPanel.podOverviewCard.peopleIn')} value={attendees} />
      <Row label={t('podDetailsPanel.podOverviewCard.spotsLeft')} value={Math.max((pod.no_of_spots ?? 0) - attendees, 0)} />
      <Row label={t('podDetailsPanel.podOverviewCard.views')} value={pod.pod_hits ?? 0} />
      <Row label={t('podDetailsPanel.podOverviewCard.likesComments')} value={`${pod.like_count ?? 0} · ${pod.comment_count ?? 0}`} />
      {showProducts && <Row label={t('podDetailsPanel.podOverviewCard.products')} value={pod.products_enabled ? 'Enabled' : 'Off'} />}
      <Row label={t('podDetailsPanel.common.created')} value={fmtDateTime(pod.created_at)} />
      {pod.pod_description && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Description
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
            {pod.pod_description}
          </Typography>
        </Box>
      )}
    </SectionCard>
  );
}

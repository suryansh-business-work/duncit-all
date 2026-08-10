import { Box, Divider, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import { InfoRow } from '@duncit/ui';
import SectionCard from './SectionCard';
import { fmtDateTime } from './format';

function Row({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return <InfoRow variant="split" label={label} value={value} sx={{ py: 0.75 }} />;
}

interface Props {
  pod: any;
  showProducts: boolean;
}

/** The pod's core facts — schedule, capacity, reach and description. */
export default function PodOverviewCard({ pod, showProducts }: Readonly<Props>) {
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  // Seats, not buyers: one booking can cover several people, so the identity
  // list showed an admin free capacity the pod does not have.
  const attendees = pod.seats_taken ?? pod.pod_attendees?.length ?? 0;

  return (
    <SectionCard icon={<GroupsIcon fontSize="small" />} title="Overview">
      <Row label="Pod ID" value={pod.pod_id} />
      <Row label="When" value={fmtDateTime(pod.pod_date_time)} />
      <Row label="Ends" value={fmtDateTime(pod.pod_end_date_time)} />
      {isVirtual ? (
        <Row label="Meeting" value={pod.meeting_platform || 'Online'} />
      ) : (
        <Row label="Zone" value={pod.zone_name || '—'} />
      )}
      <Row label="People in" value={attendees} />
      <Row label="Spots left" value={Math.max((pod.no_of_spots ?? 0) - attendees, 0)} />
      <Row label="Views" value={pod.pod_hits ?? 0} />
      <Row label="Likes · Comments" value={`${pod.like_count ?? 0} · ${pod.comment_count ?? 0}`} />
      {showProducts && <Row label="Products" value={pod.products_enabled ? 'Enabled' : 'Off'} />}
      <Row label="Created" value={fmtDateTime(pod.created_at)} />
      {pod.pod_description && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" color="text.secondary">
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

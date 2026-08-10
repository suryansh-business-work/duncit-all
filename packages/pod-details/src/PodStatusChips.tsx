import { Chip, Stack } from '@mui/material';

/** The pod's state, read left to right: what it costs, what kind it is, where
 * it is in its life, and whether a venue is still deciding. */
export default function PodStatusChips({ pod }: Readonly<{ pod: any }>) {
  const isFree = (pod.pod_type ?? '').includes('FREE');
  const isVirtual = pod.pod_mode === 'VIRTUAL';

  const lifecycle = () => {
    if (pod.is_deleted) return <Chip size="small" label="Cancelled" color="error" />;
    if (pod.completed_at) return <Chip size="small" label="Completed" color="success" />;
    return (
      <Chip
        size="small"
        label={pod.is_active ? 'Active' : 'Inactive'}
        color={pod.is_active ? 'success' : 'default'}
      />
    );
  };

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Chip size="small" label={isFree ? 'Free' : `₹${pod.pod_amount}`} color="primary" />
      <Chip size="small" label={isVirtual ? 'Virtual' : 'Physical'} variant="outlined" />
      <Chip
        size="small"
        label={(pod.pod_occurrence ?? '').replaceAll('_', ' ') || 'ONE TIME'}
        variant="outlined"
      />
      {lifecycle()}
      {pod.venue_approval_status !== 'NONE' && (
        <Chip size="small" label={`Venue: ${pod.venue_approval_status}`} variant="outlined" />
      )}
    </Stack>
  );
}

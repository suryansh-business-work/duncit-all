import { Alert, CircularProgress, Stack } from '@mui/material';
import SavedItemCard from './SavedItemCard';
import type { SavedPod } from './queries';

interface Props {
  loading: boolean;
  hasData: boolean;
  error?: string;
  pods: SavedPod[];
  onOpen: (pod: SavedPod) => void;
}

/** Loading / error / empty / list body for Saved Items — kept below the toolbar
 * so filters stay reachable in every state. */
export default function SavedItemsBody({ loading, hasData, error, pods, onOpen }: Readonly<Props>) {
  if (loading && !hasData) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!pods.length) {
    return (
      <Alert severity="info">
        No saved pods found. Adjust your search or filters, or tap save in Explore to collect pods here.
      </Alert>
    );
  }
  return (
    <Stack spacing={1.5}>
      {pods.map((pod) => (
        <SavedItemCard key={pod.id} pod={pod} onOpen={onOpen} />
      ))}
    </Stack>
  );
}

import { Alert, CircularProgress, Stack } from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import EmptyState from '../../components/EmptyState';
import { useTranslation } from '../../i18n/useTranslation';
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
  const { t } = useTranslation();
  if (loading && !hasData) {
    return (
      <Stack
        data-testid="saved-items-body-loading"
        sx={{
          alignItems: "center",
          p: 6
        }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) {
    return (
      <Alert data-testid="saved-items-body-error" severity="error">
        {error}
      </Alert>
    );
  }
  if (!pods.length) {
    return <EmptyState icon={<BookmarkBorderIcon />} title={t('mweb.saved.noSavedPodsYetTapThe')} />;
  }
  return (
    <Stack data-testid="saved-items-body-list" spacing={1.5}>
      {pods.map((pod) => (
        <SavedItemCard key={pod.id} pod={pod} onOpen={onOpen} />
      ))}
    </Stack>
  );
}

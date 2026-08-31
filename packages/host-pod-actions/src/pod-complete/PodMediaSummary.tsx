import { Stack, Typography } from '@mui/material';
import PhotoCameraBackIcon from '@mui/icons-material/PhotoCameraBack';
import { DuncitButton } from '@duncit/buttons';
import { useQuery } from '@apollo/client/react';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import PodMediaGrid from '../pod-media/PodMediaGrid';
import { POD_MEDIA_BOARD, type PodMediaBoard } from '../pod-media/queries';

interface Props {
  podId: string;
}

/**
 * The Complete Pod dialog's Pod Media section: what the pod already HAS.
 *
 * It used to be a picker — a second place to upload the same photos, whose
 * answer lived only in the release it created. The media now belongs to the
 * pod, uploaded on its own page by the host and by the guests from the link
 * they were given, so completing shows what is there and offers the way to
 * add more rather than asking for it a second time.
 */
export default function PodMediaSummary({ podId }: Readonly<Props>) {
  const { labels, podMediaLabels, onOpenPodMedia } = useHostPodActionsConfig();
  const { data } = useQuery<{ podMediaBoard: PodMediaBoard }>(POD_MEDIA_BOARD, {
    variables: { pod_doc_id: podId },
    fetchPolicy: 'cache-and-network',
  });
  const board = data?.podMediaBoard ?? null;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          {labels.podMedia}
        </Typography>
        {onOpenPodMedia && (
          <DuncitButton
            size="small"
            startIcon={<PhotoCameraBackIcon fontSize="small" />}
            onClick={() => onOpenPodMedia(podId)}
          >
            {podMediaLabels.pageTitle}
          </DuncitButton>
        )}
      </Stack>
      <PodMediaGrid items={board?.items ?? []} labels={podMediaLabels} />
    </Stack>
  );
}

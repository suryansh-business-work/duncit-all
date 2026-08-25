import { Button, Paper, Stack, Typography } from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { useHostPodMediaLink } from '../usePodLinkActions';

interface Props {
  podId: string;
  podTitle: string;
}

/**
 * The host's half of the page: the link that lets the people who came add
 * their own photos.
 *
 * The SAME link the pod's ⋮ menu hands out — both go through
 * `useHostPodMediaLink`, so a host who copies it here and shares it there
 * sends one address, and the short link behind it is minted once per pod.
 */
export default function PodMediaShareCard({ podId, podTitle }: Readonly<Props>) {
  const { labels, podMediaLabels } = useHostPodActionsConfig();
  const media = useHostPodMediaLink();
  const pod = { id: podId, pod_title: podTitle };

  const fire = (action: () => Promise<unknown>) => () => {
    // A dismissed share sheet rejects on iOS — that is the host closing it.
    action().catch(() => undefined);
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {podMediaLabels.shareHeading}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {podMediaLabels.shareBody}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={<IosShareIcon fontSize="small" />}
            onClick={fire(() => media.share(pod))}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            {labels.shareLink}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentCopyIcon fontSize="small" />}
            onClick={fire(() => media.copy(pod))}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            {labels.copyLink}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

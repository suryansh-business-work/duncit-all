import { useState } from 'react';
import { Alert, Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import { splitMediaLines } from '../media-text';
import PodMediaGrid from './PodMediaGrid';
import PodMediaShareCard from './PodMediaShareCard';
import { usePodMediaBoard } from './usePodMediaBoard';

interface Props {
  podId: string;
}

/**
 * The Upload Pod Media page, shared by mWeb and any console that routes to it.
 *
 * ONE view for the host and for a guest who followed the link: they may do
 * exactly the same thing — add photos and videos from the evening — and the
 * only difference is whose media each of them may take back down, which the
 * server has already decided per row. A viewer the server did not recognise
 * gets the reason instead of a picker, because the link is pasted into group
 * chats and it will reach people who were not there.
 *
 * The picker is the SURFACE's own (`renderMediaField`), so the admin's upload
 * settings, the crop step and the AI image scan behind it are the same ones
 * every other upload on that surface goes through — this page adds no upload
 * path of its own.
 */
export default function PodMediaView({ podId }: Readonly<Props>) {
  const {
    renderMediaField,
    podMediaLabels: labels,
    notifySuccess,
    notifyError,
  } = useHostPodActionsConfig();
  const { board, loading, failed, busy, refetch, add, remove } = usePodMediaBoard({
    podId,
    labels,
    notifySuccess,
    notifyError,
  });
  // The field is a staging area, never the store: whatever is picked is sent
  // to the pod and the field goes back to empty, so the list below is always
  // the one true answer to "what is on this pod".
  const [draft, setDraft] = useState('');

  const stage = (text: string) => {
    const urls = splitMediaLines(text);
    if (urls.length === 0) return;
    setDraft('');
    add(urls).catch(() => undefined);
  };

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (!board || failed) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton size="small" onClick={refetch}>
            {labels.retry}
          </DuncitButton>
        }
      >
        {labels.loadFailed}
      </Alert>
    );
  }

  const isHost = board.viewer === 'HOST';

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {board.pod_title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {isHost ? labels.hostIntro : labels.guestIntro}
        </Typography>
      </Box>

      {board.viewer === 'NONE' && <Alert severity="info">{labels.notInvited}</Alert>}
      {board.is_cancelled && <Alert severity="warning">{labels.cancelled}</Alert>}

      {/* Only the host hands the link out — a guest already has it. */}
      {isHost && <PodMediaShareCard podId={board.pod_id} podTitle={board.pod_title} />}

      {board.can_upload && (
        <>
          {renderMediaField({
            value: draft,
            onChange: stage,
            label: labels.addMedia,
            folder: '/pod-media',
            // A pod's own media is a photograph of something that happened —
            // a stock library is the wrong answer here, so it is not offered.
            deviceOnly: true,
          })}
          {busy && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={16} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {labels.uploading}
              </Typography>
            </Stack>
          )}
        </>
      )}

      <Divider />

      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {labels.itemsHeading(board.count)}
      </Typography>
      <PodMediaGrid
        items={board.items}
        labels={labels}
        onRemove={board.can_upload ? (url) => remove(url).catch(() => undefined) : undefined}
        busy={busy}
      />
    </Stack>
  );
}

import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { AutoPodQueue, HOST_AUTO_PODS, HostClaimDialog } from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import { useAutoPodQueue } from '../../hooks/useAutoPodQueue';

/**
 * Host Studio > Auto Pods.
 *
 * A pod already carrying a venue, a date and a price — the host only has to
 * take it. "Assign Myself" is one tap because there is nothing left to decide,
 * and the first host to tap it is the host.
 */
export default function HostAutoPodsPage() {
  const queue = useAutoPodQueue(HOST_AUTO_PODS, 'hostAutoPods');
  const [target, setTarget] = useState<AutoPodRow | null>(null);

  return (
    <Stack spacing={2} sx={{ p: 2, pb: 4 }}>
      <Typography variant="h6" fontWeight={800}>
        {queue.labels.hostTitle}
      </Typography>

      <AutoPodQueue
        role="host"
        rows={queue.rows}
        labels={queue.labels}
        loading={queue.loading}
        error={queue.error}
        onRetry={queue.reload}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        renderAction={(row) => (
          <Button fullWidth variant="contained" onClick={() => setTarget(row)}>
            {queue.labels.assignMyselfCta}
          </Button>
        )}
      />

      <HostClaimDialog
        row={target}
        labels={queue.labels}
        open={target !== null}
        onClose={() => setTarget(null)}
        onAssigned={queue.reload}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
      />
    </Stack>
  );
}

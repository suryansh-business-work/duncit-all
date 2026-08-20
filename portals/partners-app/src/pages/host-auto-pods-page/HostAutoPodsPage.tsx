import { useState } from 'react';
import { Button, Stack } from '@mui/material';
import { AutoPodQueue, HostClaimDialog, HOST_AUTO_PODS } from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodMineAction from '../../components/auto-pods/AutoPodMineAction';
import AutoPodsPageHeader from '../../components/auto-pods/AutoPodsPageHeader';
import useAutoPodsQueue from '../../components/auto-pods/useAutoPodsQueue';

/**
 * Auto Pods a host may take. Only offers a venue has already accepted appear
 * here — the venue, date and price are fixed by then, so "Assign Myself"
 * confirms rather than collects. First host wins.
 */
export default function HostAutoPodsPage() {
  const [selected, setSelected] = useState<AutoPodRow | null>(null);
  const queue = useAutoPodsQueue(HOST_AUTO_PODS, 'hostAutoPods');

  const renderAction = (row: AutoPodRow) => (
    <Button fullWidth size="small" variant="contained" onClick={() => setSelected(row)}>
      {queue.labels.assignMyselfCta}
    </Button>
  );

  return (
    <Stack spacing={2} sx={{ width: '100%', pb: 4 }}>
      <AutoPodsPageHeader title={queue.labels.hostTitle} />
      <AutoPodQueue
        role="host"
        rows={queue.rows}
        labels={queue.labels}
        loading={queue.loading}
        error={queue.error}
        onRetry={queue.refetch}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        renderAction={renderAction}
        renderMineAction={(row) => <AutoPodMineAction row={row} labels={queue.labels} />}
      />
      <HostClaimDialog
        row={selected}
        labels={queue.labels}
        open={!!selected}
        onClose={() => setSelected(null)}
        onAssigned={queue.refetch}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
      />
    </Stack>
  );
}

import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  AutoPodCategoryFilter,
  AutoPodEarningsButton,
  AutoPodQueue,
  AutoPodWithdrawAction,
  HOST_AUTO_PODS,
  HostClaimDialog,
  HostEarningsDialog,
  useAutoPodEarnings,
} from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodLocationBar from '../../components/auto-pods/AutoPodLocationBar';
import { useAutoPodCityLabel } from '../../hooks/useAutoPodCityLabel';
import { useAutoPodQueue } from '../../hooks/useAutoPodQueue';

interface Props {
  /** The header's selected location — '' shows every city's offers. */
  locationId: string;
}

/**
 * Host Studio > Auto Pods.
 *
 * The host goes second: a physical offer reaches this page only once a venue
 * has fixed its slot, so the host prices the pod and picks its spots against
 * a real date, and a virtual offer reaches it first — the city selected at
 * the top of this page then pins it. An assigned offer sits under "Assigned
 * Auto Pods" with a Cancel until a club admin claims it. The category filter
 * is the host's own approved sub-categories; the server offers nothing
 * outside them anyway.
 */
export default function HostAutoPodsPage({ locationId }: Readonly<Props>) {
  const [subCategoryId, setSubCategoryId] = useState('');
  const queue = useAutoPodQueue(HOST_AUTO_PODS, 'hostAutoPods', {
    location_id: locationId || null,
    sub_category_id: subCategoryId || null,
  });
  const cityLabel = useAutoPodCityLabel(locationId);
  const [target, setTarget] = useState<AutoPodRow | null>(null);
  const earnings = useAutoPodEarnings();

  return (
    <Stack spacing={2} sx={{ p: 2, pb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {queue.labels.hostTitle}
      </Typography>

      <AutoPodLocationBar locationId={locationId} cityLabel={cityLabel} labels={queue.labels} />
      <AutoPodCategoryFilter
        value={subCategoryId}
        onChange={setSubCategoryId}
        labels={queue.labels}
      />

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
          <DuncitButton fullWidth variant="contained" onClick={() => setTarget(row)}>
            {queue.labels.assignMyselfCta}
          </DuncitButton>
        )}
        renderMineAction={(row) => (
          <AutoPodWithdrawAction row={row} role="host" labels={queue.labels} onWithdrawn={queue.reload} />
        )}
        renderEarningsAction={(row) => (
          <AutoPodEarningsButton labels={queue.labels} onClick={() => earnings.open(row)} />
        )}
        earnings={earnings.values}
      />

      <HostEarningsDialog
        row={earnings.row}
        labels={queue.labels}
        open={earnings.row !== null}
        onClose={earnings.close}
        formatMoney={queue.formatMoney}
        onEarnings={earnings.record}
      />

      <HostClaimDialog
        row={target}
        labels={queue.labels}
        open={target !== null}
        onClose={() => setTarget(null)}
        onAssigned={queue.reload}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        locationId={locationId}
        locationLabel={cityLabel}
      />
    </Stack>
  );
}

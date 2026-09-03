import { useState } from 'react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  AutoPodQueue,
  AutoPodWithdrawAction,
  HostClaimDialog,
  HOST_AUTO_PODS,
} from '@duncit/auto-pods';
import { EMPTY_LOCATION, type AdminLocationValue } from '@duncit/location';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodFilters from '../../components/auto-pods/AutoPodFilters';
import AutoPodMineAction from '../../components/auto-pods/AutoPodMineAction';
import AutoPodsPageHeader from '../../components/auto-pods/AutoPodsPageHeader';
import useAutoPodsQueue from '../../components/auto-pods/useAutoPodsQueue';

/**
 * Auto Pods a host may take — second in line: a physical offer arrives once a
 * venue has fixed its slot, a virtual one straight away. The host prices the
 * pod and picks its spots in the claim dialog. A host has no venue or club to
 * bring a city with, so on a virtual offer the city chosen in the filter row
 * is what pins it; the dialog stays off until one is picked. First host wins,
 * and may cancel until a club admin claims the pod.
 */
export default function HostAutoPodsPage() {
  const [selected, setSelected] = useState<AutoPodRow | null>(null);
  const [location, setLocation] = useState<AdminLocationValue>(EMPTY_LOCATION);
  const [category, setCategory] = useState('');
  const queue = useAutoPodsQueue(HOST_AUTO_PODS, 'hostAutoPods', {
    location_id: location.location_id || null,
    sub_category_id: category || null,
  });
  const locationLabel = [location.city, location.state].filter(Boolean).join(', ');

  const renderAction = (row: AutoPodRow) => (
    <DuncitButton fullWidth size="small" variant="contained" onClick={() => setSelected(row)}>
      {queue.labels.assignMyselfCta}
    </DuncitButton>
  );

  return (
    <Stack spacing={2} sx={{ width: '100%', pb: 4 }}>
      <AutoPodsPageHeader title={queue.labels.hostTitle} />
      <AutoPodFilters
        location={location}
        onLocationChange={setLocation}
        labels={queue.labels}
        showCategory
        category={category}
        onCategoryChange={setCategory}
      />
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
        renderMineAction={(row) => (
          <Stack spacing={1}>
            <AutoPodMineAction row={row} labels={queue.labels} />
            <AutoPodWithdrawAction row={row} role="host" labels={queue.labels} onWithdrawn={queue.refetch} />
          </Stack>
        )}
      />
      <HostClaimDialog
        row={selected}
        labels={queue.labels}
        open={!!selected}
        onClose={() => setSelected(null)}
        onAssigned={queue.refetch}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        locationId={location.location_id}
        locationLabel={locationLabel}
      />
    </Stack>
  );
}

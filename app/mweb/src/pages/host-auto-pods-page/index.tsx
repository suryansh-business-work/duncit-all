import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import {
  AutoPodCategoryFilter,
  AutoPodQueue,
  HOST_AUTO_PODS,
  HostClaimDialog,
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
 * Enrolments happen in any order, so a host may be the first in — the city
 * selected at the top of this page then pins the offer — or the last, taking a
 * pod a venue has already dated. The category filter is the host's own
 * approved sub-categories; the server offers nothing outside them anyway.
 */
export default function HostAutoPodsPage({ locationId }: Readonly<Props>) {
  const [subCategoryId, setSubCategoryId] = useState('');
  const queue = useAutoPodQueue(HOST_AUTO_PODS, 'hostAutoPods', {
    location_id: locationId || null,
    sub_category_id: subCategoryId || null,
  });
  const cityLabel = useAutoPodCityLabel(locationId);
  const [target, setTarget] = useState<AutoPodRow | null>(null);

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
        locationId={locationId}
        locationLabel={cityLabel}
      />
    </Stack>
  );
}

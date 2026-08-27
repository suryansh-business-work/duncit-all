import { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { AutoPodQueue, CLUB_ADMIN_AUTO_PODS, ClubClaimDialog } from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodLocationBar from '../../components/auto-pods/AutoPodLocationBar';
import { useAutoPodCityLabel } from '../../hooks/useAutoPodCityLabel';
import { useAutoPodQueue } from '../../hooks/useAutoPodQueue';

interface Props {
  /** The header's selected location — '' shows every city's offers. */
  locationId: string;
}

/**
 * Club Admin > Auto Pods.
 *
 * Enrolments happen in any order, so a club may be the first in — its own
 * city then pins the offer — or the last, giving the pod its club. A claim can
 * lose the race to another admin; the dialog says so rather than pretending it
 * worked, and the row simply leaves the queue.
 *
 * The list selection carries no sub-category, so every club this admin runs is
 * offered and the server is the one that refuses a mismatched category.
 */
export default function ClubAutoPodsPage({ locationId }: Readonly<Props>) {
  const queue = useAutoPodQueue(CLUB_ADMIN_AUTO_PODS, 'clubAdminAutoPods', {
    location_id: locationId || null,
  });
  const cityLabel = useAutoPodCityLabel(locationId);
  const [target, setTarget] = useState<AutoPodRow | null>(null);

  return (
    <Stack spacing={2} sx={{ p: 2, pb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        {queue.labels.clubTitle}
      </Typography>

      <AutoPodLocationBar locationId={locationId} cityLabel={cityLabel} labels={queue.labels} />

      <AutoPodQueue
        role="club"
        rows={queue.rows}
        labels={queue.labels}
        loading={queue.loading}
        error={queue.error}
        onRetry={queue.reload}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        renderAction={(row) => (
          <DuncitButton fullWidth variant="contained" onClick={() => setTarget(row)}>
            {queue.labels.claimForClubCta}
          </DuncitButton>
        )}
      />

      <ClubClaimDialog
        row={target}
        subCategoryId={target?.sub_category_id ?? null}
        labels={queue.labels}
        open={target !== null}
        onClose={() => setTarget(null)}
        onClaimed={queue.reload}
        formatWhen={queue.formatWhen}
      />
    </Stack>
  );
}

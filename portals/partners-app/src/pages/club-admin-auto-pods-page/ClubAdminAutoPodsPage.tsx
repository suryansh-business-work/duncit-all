import { useState } from 'react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { AutoPodQueue, ClubClaimDialog, CLUB_ADMIN_AUTO_PODS } from '@duncit/auto-pods';
import { EMPTY_LOCATION, type AdminLocationValue } from '@duncit/location';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodFilters from '../../components/auto-pods/AutoPodFilters';
import AutoPodMineAction from '../../components/auto-pods/AutoPodMineAction';
import AutoPodsPageHeader from '../../components/auto-pods/AutoPodsPageHeader';
import useAutoPodsQueue from '../../components/auto-pods/useAutoPodsQueue';

/** The club's own pod page, once the three enrolments have materialized one. */
function clubPodHref(row: AutoPodRow): string | null {
  if (!row.pod_id || !row.club_claim) return null;
  return `/club-admin/clubs/${row.club_claim.club_id}/pods/${row.pod_id}`;
}

/**
 * Auto Pods a club admin may claim, in any order with the venue and the host.
 * Claiming attaches the offer to one of their clubs: the club's own city pins
 * an offer nobody has enrolled in yet, and only clubs in a pinned offer's city
 * can take it. First club wins.
 */
export default function ClubAdminAutoPodsPage() {
  const [selected, setSelected] = useState<AutoPodRow | null>(null);
  const [location, setLocation] = useState<AdminLocationValue>(EMPTY_LOCATION);
  const queue = useAutoPodsQueue(CLUB_ADMIN_AUTO_PODS, 'clubAdminAutoPods', {
    location_id: location.location_id || null,
  });

  const renderAction = (row: AutoPodRow) => (
    <DuncitButton fullWidth size="small" variant="contained" onClick={() => setSelected(row)}>
      {queue.labels.claimForClubCta}
    </DuncitButton>
  );

  return (
    <Stack spacing={2} sx={{ width: '100%', pb: 4 }}>
      <AutoPodsPageHeader title={queue.labels.clubTitle} />
      <AutoPodFilters location={location} onLocationChange={setLocation} labels={queue.labels} />
      <AutoPodQueue
        role="club"
        rows={queue.rows}
        labels={queue.labels}
        loading={queue.loading}
        error={queue.error}
        onRetry={queue.refetch}
        formatWhen={queue.formatWhen}
        formatMoney={queue.formatMoney}
        renderAction={renderAction}
        renderMineAction={(row) => (
          <AutoPodMineAction row={row} labels={queue.labels} podHref={clubPodHref(row)} />
        )}
      />
      <ClubClaimDialog
        row={selected}
        subCategoryId={selected?.sub_category_id ?? null}
        labels={queue.labels}
        open={!!selected}
        onClose={() => setSelected(null)}
        onClaimed={queue.refetch}
        formatWhen={queue.formatWhen}
      />
    </Stack>
  );
}

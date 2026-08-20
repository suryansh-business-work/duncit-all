import { useState } from 'react';
import { Button, Stack } from '@mui/material';
import { AutoPodQueue, ClubClaimDialog, CLUB_ADMIN_AUTO_PODS } from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import AutoPodMineAction from '../../components/auto-pods/AutoPodMineAction';
import AutoPodsPageHeader from '../../components/auto-pods/AutoPodsPageHeader';
import useAutoPodsQueue from '../../components/auto-pods/useAutoPodsQueue';

/** The club's own pod page, once the three enrolments have materialized one. */
function clubPodHref(row: AutoPodRow): string | null {
  if (!row.pod_id || !row.club_claim) return null;
  return `/club-admin/clubs/${row.club_claim.club_id}/pods/${row.pod_id}`;
}

/**
 * Auto Pods a club admin may claim. Claiming attaches a venue-accepted offer to
 * one of their clubs, which is what gives the resulting pod its club — and,
 * alongside a host, is the last enrolment before it goes live. First club wins.
 */
export default function ClubAdminAutoPodsPage() {
  const [selected, setSelected] = useState<AutoPodRow | null>(null);
  const queue = useAutoPodsQueue(CLUB_ADMIN_AUTO_PODS, 'clubAdminAutoPods');

  const renderAction = (row: AutoPodRow) => (
    <Button fullWidth size="small" variant="contained" onClick={() => setSelected(row)}>
      {queue.labels.claimForClubCta}
    </Button>
  );

  return (
    <Stack spacing={2} sx={{ width: '100%', pb: 4 }}>
      <AutoPodsPageHeader title={queue.labels.clubTitle} />
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

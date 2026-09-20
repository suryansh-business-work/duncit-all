import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  AutoPodQueue,
  AutoPodWithdrawAction,
  CLUB_ADMIN_AUTO_PODS,
  ClubClaimDialog,
} from '@duncit/auto-pods';
import type { AutoPodLabels, AutoPodRow } from '@duncit/utils';
import AutoPodLocationBar from '../../components/auto-pods/AutoPodLocationBar';
import { useAutoPodCityLabel } from '../../hooks/useAutoPodCityLabel';
import { useAutoPodQueue } from '../../hooks/useAutoPodQueue';

interface Props {
  /** The header's selected location — '' shows every city's offers. */
  locationId: string;
}

/** The club's own pod page, once the three enrolments have materialised one.
 * Null while the offer is still collecting them — there is no pod to open. */
function clubPodHref(row: AutoPodRow): string | null {
  if (!row.pod_id || !row.club_claim) return null;
  return `/clubs/${row.club_claim.club_id}/pods/${row.pod_id}`;
}

interface MineActionsProps {
  row: AutoPodRow;
  labels: AutoPodLabels;
  onWithdrawn: () => void;
}

/** What a club admin sees on an offer they already claimed: the pod it became,
 * once all three enrolments landed, and the way back out of it. */
function ClubMineActions({ row, labels, onWithdrawn }: Readonly<MineActionsProps>) {
  const podHref = clubPodHref(row);

  return (
    <Stack spacing={1}>
      {podHref ? (
        <DuncitButton
          data-testid={`club-auto-pods-view-pod-${row.id}`}
          fullWidth
          component={RouterLink}
          to={podHref}
        >
          {labels.viewPod}
        </DuncitButton>
      ) : null}
      <AutoPodWithdrawAction row={row} role="club" labels={labels} onWithdrawn={onWithdrawn} />
    </Stack>
  );
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
    <Stack data-testid="club-auto-pods-page" spacing={2.5} sx={{ p: 2, pb: 4 }}>
      <Typography data-testid="club-auto-pods-page-title" variant="h5" component="h1" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
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
          <DuncitButton data-testid={`club-auto-pods-claim-${row.id}`} fullWidth variant="contained" onClick={() => setTarget(row)}>
            {queue.labels.claimForClubCta}
          </DuncitButton>
        )}
        renderMineAction={(row) => (
          <ClubMineActions row={row} labels={queue.labels} onWithdrawn={queue.reload} />
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

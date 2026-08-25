import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { AutoPodQueue, CLUB_ADMIN_AUTO_PODS, ClubClaimDialog } from '@duncit/auto-pods';
import type { AutoPodRow } from '@duncit/utils';
import { useAutoPodQueue } from '../../hooks/useAutoPodQueue';

/**
 * Club Admin > Auto Pods.
 *
 * The third enrolment, and the one that gives the pod its club. It runs in
 * parallel with the host's, so a claim can lose the race — the dialog says so
 * rather than pretending it worked, and the row simply leaves the queue.
 *
 * The list selection carries no sub-category, so every club this admin runs is
 * offered and the server is the one that refuses a mismatched category.
 */
export default function ClubAutoPodsPage() {
  const queue = useAutoPodQueue(CLUB_ADMIN_AUTO_PODS, 'clubAdminAutoPods');
  const [target, setTarget] = useState<AutoPodRow | null>(null);

  return (
    <Stack spacing={2} sx={{ p: 2, pb: 4 }}>
      <Typography variant="h6" sx={{
        fontWeight: 800
      }}>
        {queue.labels.clubTitle}
      </Typography>

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
          <Button fullWidth variant="contained" onClick={() => setTarget(row)}>
            {queue.labels.claimForClubCta}
          </Button>
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

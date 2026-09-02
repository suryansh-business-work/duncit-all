import { useState } from 'react';
import { Stack } from '@mui/material';
import AutoPodCategoryField from '../AutoPodCategoryField';
import AutoPodAudienceCounts from './AutoPodAudienceCounts';
import AutoPodAudienceDrawer from './AutoPodAudienceDrawer';
import type { AutoPodAudienceRole } from './audience-queries';
import type { AutoPodAudienceState } from './useAutoPodAudience';

export interface AutoPodCategoryStepProps {
  /** Null on a surface that does not show who could enrol (the Partners console). */
  audience: AutoPodAudienceState | null;
}

/**
 * Step 1: the pod's Super → Category → Sub, all three required, and — under
 * it — how many venues, hosts and club admins that category would offer the
 * pod to, each count opening the list behind it.
 */
export default function AutoPodCategoryStep({ audience }: Readonly<AutoPodCategoryStepProps>) {
  const [open, setOpen] = useState<AutoPodAudienceRole | null>(null);
  return (
    <Stack spacing={3}>
      <AutoPodCategoryField />
      {audience && (
        <>
          <AutoPodAudienceCounts
            audience={audience.audience}
            loading={audience.loading}
            error={audience.error}
            onOpen={setOpen}
          />
          <AutoPodAudienceDrawer role={open} audience={audience.audience} onClose={() => setOpen(null)} />
        </>
      )}
    </Stack>
  );
}

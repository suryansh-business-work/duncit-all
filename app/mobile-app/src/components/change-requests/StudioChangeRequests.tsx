import type { PodChangeRole } from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ChangeRequestBoard } from '@/components/change-requests/ChangeRequestBoard';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * The Change Requests section a partner studio shows — the Tamagui twin of
 * mWeb's `StudioChangeRequests` (rule 27).
 *
 * ONE component for all three studios: the board is shared, and what a studio
 * adds is the heading and the role to scope it to, so a venue owner is never
 * shown a host's queue and three copies of the same six lines never drift.
 */
export function StudioChangeRequests({ role }: Readonly<{ role: PodChangeRole }>) {
  const { t } = useTranslation();

  return (
    <SurfaceCard testID={`studio-change-requests-${role}`} gap={16}>
      <SectionHeader title={t('changeRequest.sectionTitle')} />
      <ChangeRequestBoard role={role} testID={`change-requests-${role}`} />
    </SurfaceCard>
  );
}

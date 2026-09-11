import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { StudioPodsBody, type PodActions } from './StudioPodsBody';
import type { StudioPodsState } from './useStudioPods';

/** Which studio is rendering — the only thing that differs between the two. */
export type StudioPodsVariant = 'VENUE' | 'CLUB';

const VARIANT_COPY = {
  VENUE: {
    title: 'mweb.studioPods.venueTitle',
    empty: 'mweb.studioPods.venueEmpty',
    scope: 'mweb.studioPods.venues',
  },
  CLUB: {
    title: 'mweb.studioPods.clubTitle',
    empty: 'mweb.studioPods.clubEmpty',
    scope: 'mweb.studioPods.clubs',
  },
} as const;

interface StudioPodsSectionProps extends PodActions {
  variant: StudioPodsVariant;
  state: StudioPodsState;
  testID: string;
}

/**
 * The pod section both partner studios render: a figures strip over the pods in
 * scope, then every pod as a row — all in one surface card. Venue Studio and
 * Club Studio differ only in their copy, their query and their actions — the
 * numbers, the row and the states are one component, so mWeb has one section to
 * mirror (rules 27 + 34).
 */
export function StudioPodsSection({
  variant,
  state,
  testID,
  onOpenPod,
  onCancelPod,
  onRequestChange,
  requestChangeLabel,
}: Readonly<StudioPodsSectionProps>) {
  const { t } = useTranslation();
  const copy = VARIANT_COPY[variant];

  return (
    <SurfaceCard testID={testID} gap={12}>
      <SectionHeader title={t(copy.title)} />
      <StudioPodsBody
        state={state}
        emptyKey={copy.empty}
        scopeKey={copy.scope}
        testID={testID}
        onOpenPod={onOpenPod}
        onCancelPod={onCancelPod}
        onRequestChange={onRequestChange}
        requestChangeLabel={requestChangeLabel}
      />
    </SurfaceCard>
  );
}

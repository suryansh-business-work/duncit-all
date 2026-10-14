import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { StudioPodFigures } from './StudioPodFigures';
import { StudioPodsBody } from './StudioPodsBody';
import type { StudioPodsState } from './useStudioPods';

const SCOPE_KEY = 'mweb.studioPods.venues';

/**
 * The venue's pod figures on the Venue Studio dashboard — totals, fill rate and
 * the next pod, computed server-side over every booking. The pod rows and their
 * actions live on Pods at Your Venue. mWeb twin: VenuePodsFigures (rule 27).
 */
export function VenuePodFiguresCard({ state, testID }: Readonly<{ state: StudioPodsState; testID: string }>) {
  const { t } = useTranslation();
  // Withheld while loading: a strip reading "Total 0" under a load states something false.
  if (state.isLoading) return null;

  return (
    <SurfaceCard testID={testID} gap={12}>
      <SectionHeader title={t('mweb.studioPods.venueTitle')} />
      {state.hasError ? (
        // The section's own error line and Retry.
        <StudioPodsBody state={state} emptyKey="mweb.studioPods.venueEmpty" scopeKey={SCOPE_KEY} testID={testID} />
      ) : (
        <StudioPodFigures figures={state.figures} scopeLabelKey={SCOPE_KEY} testID={`${testID}-figures`} />
      )}
    </SurfaceCard>
  );
}

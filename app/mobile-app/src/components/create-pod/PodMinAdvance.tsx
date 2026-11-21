import { createContext, useContext } from 'react';
import { YStack } from 'tamagui';

import { NoticeCard } from '@/components/attendance/NoticeCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodMinAdvance } from '@/hooks/usePodMinAdvance';

/**
 * The host's Minimum Advance Days, handed down the Create Pod stepper to the
 * pickers that need it. The stepper provides it in HOST mode only — a Club
 * Admin shares the stepper, and their pod is not held to the rule — so a
 * picker outside it (or a Club Admin's) reads null and narrows nothing.
 */
export const PodMinAdvanceContext = createContext<PodMinAdvance | null>(null);

export const usePodMinAdvanceRule = () => useContext(PodMinAdvanceContext);

/** Why the earlier days are greyed out. Nothing while the rule is not known.
 * mWeb twin: MinAdvanceNote. */
export function MinAdvanceNote() {
  const { t } = useTranslation();
  const rule = usePodMinAdvanceRule();
  if (!rule) return null;
  return (
    <YStack role="status" aria-live="polite">
      <NoticeCard
        tone="note"
        title={t('mweb.createPod.validation.startTooSoon', { count: rule.days })}
        testID="create-pod-min-advance-note"
      />
    </YStack>
  );
}

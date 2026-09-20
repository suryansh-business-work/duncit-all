import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TourAnchor } from '@/tours/TourAnchor';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  /** Hidden on the first step — there is nowhere to go back to. */
  showBack: boolean;
  backLabel: string;
  onBack: () => void;
  /** The last step publishes; every other step advances. */
  isLast: boolean;
  submitLabel: string;
  nextLabel: string;
  busy: boolean;
  submitDisabled: boolean;
  onSubmit: () => Promise<void>;
  onNext: () => Promise<void>;
  /**
   * The Club Admin's "Save draft" — absent for a host, whose drafts are saved
   * continuously as they type rather than by a button.
   */
  draftLabel?: string;
  onSaveDraft?: () => Promise<void>;
}

/**
 * The stepper's footer row.
 *
 * Its own file because `CreatePodStepper` is already well past the project's
 * 200-line ceiling for a `.tsx`, so the Club Admin's draft button goes beside
 * the actions rather than into it.
 *
 * A draft skips the AI content check on purpose: nothing is published, and the
 * portals do not moderate a draft either — the server still refuses one whose
 * content breaks the rules, which is where that decision belongs.
 */
export function StepperActions({
  showBack,
  backLabel,
  onBack,
  isLast,
  submitLabel,
  nextLabel,
  busy,
  submitDisabled,
  onSubmit,
  onNext,
  draftLabel,
  onSaveDraft,
}: Readonly<Props>) {
  const showDraft = isLast && !!draftLabel && !!onSaveDraft;

  return (
    <YStack gap={10}>
      <XStack gap={10}>
        {showBack ? (
          <YStack flex={1}>
            <DuncitButton
              testID="create-pod-back"
              label={backLabel}
              onPress={onBack}
              variant="soft"
              tone="neutral"
              size="lg"
              fullWidth
            />
          </YStack>
        ) : null}
        {/* flex:2 is restated on the wrapper, not moved onto it: TourAnchor
            renders nothing at all when no tour is on, so the child has to keep
            sizing the row by itself. */}
        <TourAnchor tour="create-pod" anchor="create-pod-publish" style={{ flex: 2 }}>
          <YStack flex={2}>
            <PrimaryButton
              testID="create-pod-submit"
              label={isLast ? submitLabel : nextLabel}
              loading={busy}
              disabled={submitDisabled}
              onPress={() => fireAndForget(isLast ? onSubmit() : onNext())}
            />
          </YStack>
        </TourAnchor>
      </XStack>
      {showDraft ? (
        <DuncitButton
          testID="create-pod-save-draft"
          label={draftLabel}
          onPress={() => fireAndForget(onSaveDraft())}
          variant="outline"
          tone="neutral"
          size="lg"
          fullWidth
          disabled={busy}
        />
      ) : null}
    </YStack>
  );
}

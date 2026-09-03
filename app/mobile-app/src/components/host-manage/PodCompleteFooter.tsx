import { Spinner, Text, XStack } from 'tamagui';
import type { ReactNode } from 'react';

import { PRESS_STYLE } from '@duncit/buttons-native';

interface FooterProps {
  busy: boolean;
  cancelLabel: string;
  submitLabel: string;
  submitAriaLabel: string;
  /** The spinner, or null — resolved by the parent so this holds no branch. */
  spinner: ReactNode;
  cancelOpacity: number;
  submitOpacity: number;
  onCancel: () => void;
  /** `undefined` while busy, which is what makes the row inert. */
  onSubmit?: () => void;
}

export interface FooterLook {
  cancelOpacity: number;
  submitOpacity: number;
  submitLabel: string;
  spinner: ReactNode;
}

/**
 * Everything about the footer that depends on the one in-flight flag.
 *
 * Tamagui spells "disabled" by hand, so a single boolean drives four separate
 * values — two opacities, the label and the spinner. Inline in the dialog they
 * were four of the branches that put it over the cognitive-complexity limit
 * (S3776); worked out together here, the dialog reads one call and the footer
 * itself stays branch-free (rule 26g).
 *
 * The labels arrive already translated because the dialog has the bundle open
 * and this has no business holding copy of its own.
 */
export function footerLook(
  busy: boolean,
  onPrimary: string,
  completeLabel: string,
  completingLabel: string,
): FooterLook {
  return {
    cancelOpacity: busy ? 0.6 : 1,
    submitOpacity: busy ? 0.7 : 1,
    submitLabel: busy ? completingLabel : completeLabel,
    spinner: busy ? <Spinner size="small" color={onPrimary} /> : null,
  };
}

/** The dialog's two-button footer. Module scope: defined inside the dialog it
 * would be a new component type on every render (S6478). */
export function PodCompleteFooter({
  busy,
  cancelLabel,
  submitLabel,
  submitAriaLabel,
  spinner,
  cancelOpacity,
  submitOpacity,
  onCancel,
  onSubmit,
}: Readonly<FooterProps>) {
  return (
    <XStack gap={12}>
      <XStack
        testID="pod-complete-cancel"
        role="button"
        aria-label={cancelLabel}
        aria-disabled={busy}
        onPress={onCancel}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={cancelOpacity}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          {cancelLabel}
        </Text>
      </XStack>
      <XStack
        testID="pod-complete-submit"
        role="button"
        aria-label={submitAriaLabel}
        aria-disabled={busy}
        onPress={onSubmit}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={12}
        backgroundColor="$primary"
        opacity={submitOpacity}
        pressStyle={PRESS_STYLE.control}
      >
        {spinner}
        <Text fontSize={14} fontWeight="700" color="$onPrimary">
          {submitLabel}
        </Text>
      </XStack>
    </XStack>
  );
}

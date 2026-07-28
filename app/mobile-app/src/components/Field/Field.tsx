import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { FieldLabel } from './FieldLabel';

export interface FieldProps {
  /** The field label, rendered above the control (label on top, input below). */
  label: string;
  /** When true, appends a red `*` after the label to mark the field as required. */
  required?: boolean;
  /** The control this field labels — a Tamagui `<Input>`, stepper, chips, etc. */
  children: ReactNode;
  /** Muted helper shown below when there is no error (mirrors MUI helperText). */
  hint?: string;
  /** Validation error shown below; takes precedence over `hint`. */
  error?: string;
  /** Base id for the label/helper test ids (`${testID}-label` / `-error` / `-hint`). */
  testID?: string;
  /** Vertical gap between the label, control and helper. */
  gap?: number;
  /** Trailing control rendered on the label line, right-aligned (e.g. a
   * "Suggested Price" link). Omitted, the label keeps its plain layout. */
  labelAction?: ReactNode;
}

/**
 * The one label-on-top field wrapper every mobile form control uses. Renders the
 * label above the control and a helper/error line below, so labels look and
 * behave identically across the app. Search bars and message composers stay
 * label-less on screen and instead carry an `aria-label` on their input.
 */
export function Field({
  label,
  required,
  children,
  hint,
  error,
  testID,
  gap = 6,
  labelAction,
}: Readonly<FieldProps>) {
  let helper: ReactNode = null;
  if (error) {
    helper = (
      <Reveal>
        <Text fontSize={12} color="$danger" testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      </Reveal>
    );
  } else if (hint) {
    helper = (
      <Text fontSize={12} color="$muted" testID={testID ? `${testID}-hint` : undefined}>
        {hint}
      </Text>
    );
  }

  const fieldLabel = <FieldLabel label={label} required={required} testID={testID} />;

  return (
    <YStack gap={gap}>
      {labelAction ? (
        <XStack alignItems="center" justifyContent="space-between" gap={10}>
          {fieldLabel}
          {labelAction}
        </XStack>
      ) : (
        fieldLabel
      )}
      {children}
      {helper}
    </YStack>
  );
}

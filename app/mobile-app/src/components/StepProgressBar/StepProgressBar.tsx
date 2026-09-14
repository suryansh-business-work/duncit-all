import { XStack, YStack } from 'tamagui';

interface Props {
  /** One stable id per step — the segment keys. */
  steps: readonly string[];
  /** 1-based position: segments up to and including it are filled. */
  current: number;
  /** Read by assistive tech in place of the old "Step X of N" caption. */
  label: string;
}

/**
 * The calm stepper: a slim row of pill segments, green up to the current step
 * and hairline after it. Signup and the onboarding survey draw it instead of a
 * "Step X of N" line — the bar already says where you are.
 * mWeb twin: components/StepProgressBar.
 */
export function StepProgressBar({ steps, current, label }: Readonly<Props>) {
  return (
    <XStack
      testID="step-progress-bar"
      gap={6}
      // The web-standard spellings: React Native maps each to its native
      // accessibility prop, and Tamagui's web build forwards them to the DOM —
      // the `accessibility*` props reached neither a web screen reader.
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={current}
    >
      {steps.map((id, index) => (
        <YStack
          key={id}
          testID={`step-progress-bar-step-${id}`}
          flex={1}
          height={6}
          borderRadius={999}
          backgroundColor={index < current ? '$primary' : '$borderColor'}
        />
      ))}
    </XStack>
  );
}

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
      gap={6}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: steps.length, now: current }}
    >
      {steps.map((id, index) => (
        <YStack
          key={id}
          flex={1}
          height={6}
          borderRadius={999}
          backgroundColor={index < current ? '$primary' : '$borderColor'}
        />
      ))}
    </XStack>
  );
}

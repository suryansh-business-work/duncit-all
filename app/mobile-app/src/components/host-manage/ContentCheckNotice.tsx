import { Text, YStack } from 'tamagui';
import type { PodContentViolation } from '@duncit/utils';

interface Props {
  violations: PodContentViolation[];
  title: string;
}

/**
 * What the AI content check refused, one line per rule broken — the Tamagui
 * twin of `ContentCheckAlert` in @duncit/host-pod-actions. The wording is the
 * server's, so both apps explain the guidelines with the same sentence.
 */
export function ContentCheckNotice({ violations, title }: Readonly<Props>) {
  if (violations.length === 0) return null;
  return (
    <YStack
      testID="pod-content-check"
      gap={4}
      padding={10}
      borderRadius={10}
      borderWidth={1}
      borderColor="$danger"
    >
      <Text fontSize={12.5} fontWeight="700" color="$danger">
        {title}
      </Text>
      {violations.map((violation) => (
        <Text
          key={`${violation.field}-${violation.type}-${violation.message}`}
          fontSize={12}
          color="$color"
        >
          {`• ${violation.message}${violation.evidence ? ` (“${violation.evidence}”)` : ''}`}
        </Text>
      ))}
    </YStack>
  );
}

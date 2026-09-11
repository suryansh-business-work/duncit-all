import { Text, YStack } from 'tamagui';
import type { PodContentViolation } from '@duncit/utils';
import { withAlpha } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Tint of the notice — the same 14% mWeb's standard warning Alert draws. */
const NOTICE_ALPHA = 0.14;

/** One refusal line: the rule broken, plus the quoted evidence when the check returned any. */
const violationLine = (violation: PodContentViolation) => {
  const evidence = violation.evidence ? ` (“${violation.evidence}”)` : '';
  return `• ${violation.message}${evidence}`;
};

interface Props {
  violations: PodContentViolation[];
  title: string;
}

/**
 * What the AI content check refused, one line per rule broken — the Tamagui
 * twin of `ContentCheckAlert` in @duncit/host-pod-actions (a warning Alert).
 * The wording is the server's, so both apps explain the guidelines with the
 * same sentence.
 */
export function ContentCheckNotice({ violations, title }: Readonly<Props>) {
  const { warning } = useThemeColors();
  if (violations.length === 0) return null;
  return (
    <YStack
      testID="pod-content-check"
      gap={4}
      padding={12}
      borderRadius={14}
      backgroundColor={withAlpha(warning, NOTICE_ALPHA)}
    >
      <Text fontSize={13} fontWeight="600" color="$color">
        {title}
      </Text>
      {violations.map((violation) => (
        <Text
          key={`${violation.field}-${violation.type}-${violation.message}`}
          fontSize={12.5}
          color="$color"
        >
          {violationLine(violation)}
        </Text>
      ))}
    </YStack>
  );
}

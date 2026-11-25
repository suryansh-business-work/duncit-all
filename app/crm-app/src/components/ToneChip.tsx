import { Text, XStack } from 'tamagui';
import type { CrmTone } from '@duncit/utils';

import { RADII } from '@/constants/design';

/** The theme colour for each shared tone (@duncit/utils), so chips read the same as the portal's. */
const TONE_COLOR: Record<CrmTone, string> = {
  success: '$success',
  error: '$danger',
  warning: '$warning',
  info: '$info',
  default: '$muted',
};

/** A status as the portal shows it: an outlined chip in its tone's colour. */
export function ToneChip({
  label,
  tone,
  testID,
}: Readonly<{ label: string; tone: CrmTone; testID?: string }>) {
  return (
    <XStack
      borderWidth={1}
      borderColor={TONE_COLOR[tone]}
      borderRadius={RADII.pill}
      paddingHorizontal="$2.5"
      paddingVertical="$1"
      testID={testID}
    >
      <Text color={TONE_COLOR[tone]} fontSize="$2" fontWeight="700">
        {label}
      </Text>
    </XStack>
  );
}

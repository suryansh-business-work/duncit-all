import { Text, XStack } from 'tamagui';
import type { FulfilmentTone } from '@duncit/utils';

/** Each shared tone as theme tokens — the colour and its soft fill, legible in both themes. */
const TONE_TOKENS: Readonly<Record<FulfilmentTone, { color: string; fill: string }>> = {
  neutral: { color: '$muted', fill: '$soft' },
  pending: { color: '$warning', fill: '$soft' },
  moving: { color: '$accent', fill: '$primarySoft' },
  done: { color: '$success', fill: '$successSoft' },
  failed: { color: '$danger', fill: '$dangerSoft' },
};

/** A status chip in the tone @duncit/utils names — the native twin of MUI's
 * `<Chip color={TONE_CHIP_COLOR[tone]}>`, which mWeb uses for the same chips. */
export function ToneChip({
  label,
  tone,
  testID,
}: Readonly<{ label: string; tone: FulfilmentTone; testID?: string }>) {
  const { color, fill } = TONE_TOKENS[tone];
  return (
    <XStack
      testID={testID}
      borderRadius={999}
      paddingHorizontal={10}
      paddingVertical={4}
      backgroundColor={fill}
      alignSelf="flex-start"
    >
      <Text fontSize={11} fontWeight="600" color={color}>
        {label}
      </Text>
    </XStack>
  );
}

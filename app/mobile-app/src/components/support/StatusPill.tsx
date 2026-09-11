import { Text, XStack } from 'tamagui';

type Tone = { bg: string; fg: string };

const NEUTRAL: Tone = { bg: '$soft', fg: '$color' };

/** Status → pill colours, the same filled tones mWeb's status Chips use
 * (tickets: OPEN/PENDING/RESOLVED/CLOSED; callbacks: PENDING/CONTACTED/CLOSED). */
const STATUS_TONE: Record<string, Tone> = {
  OPEN: { bg: '$primary', fg: '$onPrimary' },
  CONTACTED: { bg: '$primary', fg: '$onPrimary' },
  PENDING: { bg: '$warning', fg: '$onPrimary' },
  RESOLVED: { bg: '$success', fg: '$onPrimary' },
  CLOSED: NEUTRAL,
};

interface Props {
  status: string;
  /** Display text — defaults to the raw status. */
  label?: string;
  testID?: string;
}

/** A support status as a small filled pill. mWeb twin: the status `<Chip>`. */
export function StatusPill({ status, label, testID }: Readonly<Props>) {
  const tone = STATUS_TONE[status] ?? NEUTRAL;
  return (
    <XStack
      testID={testID}
      borderRadius={999}
      paddingHorizontal={10}
      paddingVertical={3}
      backgroundColor={tone.bg}
    >
      <Text fontSize={11} fontWeight="600" color={tone.fg}>
        {label ?? status}
      </Text>
    </XStack>
  );
}

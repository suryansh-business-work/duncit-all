import { Text } from 'tamagui';

type Align = 'left' | 'center';

interface Props {
  /** The ink half — what the heading says. */
  lead: string;
  /** The muted half — the softer second beat, same size. */
  trail?: string | null;
  /** Put the muted half on its own line (greetings, heroes); inline otherwise. */
  stacked?: boolean;
  fontSize?: number;
  align?: Align;
  testID?: string;
}

/**
 * The two-tone heading of the calm design: one size, one weight, the second
 * beat in the muted ink. Replaces coloured "accent word" headings so a title
 * reads as a single calm statement. mWeb twin: components/TwoToneHeading.
 */
export function TwoToneHeading({
  lead,
  trail,
  stacked = false,
  fontSize = 24,
  align = 'left',
  testID,
}: Readonly<Props>) {
  const separator = stacked ? '\n' : ' ';
  return (
    <Text
      testID={testID}
      accessibilityRole="header"
      fontSize={fontSize}
      lineHeight={Math.round(fontSize * 1.2)}
      fontWeight="600"
      color="$color"
      textAlign={align}
    >
      {lead}
      {trail ? (
        <Text color="$muted">
          {separator}
          {trail}
        </Text>
      ) : null}
    </Text>
  );
}

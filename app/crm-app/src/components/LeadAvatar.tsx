import { Text, YStack } from 'tamagui';

/** Up to two initials of a name: "Apoorva Srivastava" → "AS", "Smash Arena Gurgaon" → "SA". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

interface Props {
  name: string;
  size?: number;
}

/** A lead's round initials badge on the accent wash — decorative, so screen readers skip it. */
export function LeadAvatar({ name, size = 48 }: Readonly<Props>) {
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor="$primarySoft"
      alignItems="center"
      justifyContent="center"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text color="$onPrimarySoft" fontWeight="800" fontSize={Math.round(size * 0.38)}>
        {initialsOf(name)}
      </Text>
    </YStack>
  );
}

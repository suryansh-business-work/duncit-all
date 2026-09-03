import { Text, YStack } from 'tamagui';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  testID?: string;
}

/** The in-page header every Club Admin screen opens with — the Tamagui twin
 * of the eyebrow + title + subtitle block the MUI pages render (rule 27). */
export function PageHeading({ eyebrow, title, subtitle, testID }: Readonly<Props>) {
  return (
    <YStack gap={2} testID={testID}>
      {eyebrow ? (
        <Text fontSize={11} fontWeight="700" color="$primary" letterSpacing={1}>
          {eyebrow}
        </Text>
      ) : null}
      <Text fontSize={18} fontWeight="700" color="$color">
        {title}
      </Text>
      {subtitle ? (
        <Text fontSize={12} color="$muted">
          {subtitle}
        </Text>
      ) : null}
    </YStack>
  );
}

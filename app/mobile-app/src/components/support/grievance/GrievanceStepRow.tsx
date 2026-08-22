import { Text, XStack, YStack } from 'tamagui';

interface Props {
  /** Zero-based; the badge shows it one-based. */
  index: number;
  title: string;
  body: string;
  /** The connector is drawn BETWEEN steps, so the last one has none. */
  isLast: boolean;
}

/**
 * One numbered step of the escalation timeline — the RN stand-in for a MUI
 * vertical `<Step>`. Hoisted to module scope rather than nested in the notice
 * (S6478), and given the step's own key by its parent so the list never keys
 * on the array index (S6479).
 */
export function GrievanceStepRow({ index, title, body, isLast }: Readonly<Props>) {
  return (
    <XStack gap={10}>
      <YStack alignItems="center" width={24}>
        <YStack
          width={24}
          height={24}
          borderRadius={12}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$primary"
        >
          <Text fontSize={12} fontWeight="700" color="$onPrimary">
            {index + 1}
          </Text>
        </YStack>
        {isLast ? null : <YStack flex={1} width={2} backgroundColor="$borderColor" />}
      </YStack>
      <YStack flex={1} gap={2} paddingBottom={isLast ? 0 : 14}>
        <Text fontSize={13} fontWeight="700" color="$color">
          {title}
        </Text>
        <Text fontSize={12} color="$muted">
          {body}
        </Text>
      </YStack>
    </XStack>
  );
}

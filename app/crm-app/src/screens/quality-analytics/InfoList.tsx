import { Text, XStack, YStack } from 'tamagui';

import { Card } from '@/components/Card';

export interface InfoRow {
  key: string;
  title: string;
  detail?: string;
  /** The row's headline number, at its end. */
  value?: string;
  onPress?: () => void;
}

interface Props {
  title: string;
  hint: string;
  rows: InfoRow[];
  empty: string;
  testID: string;
}

/** One of the portal analytics tables as a phone list: a title and detail per row, its number at the end. */
export function InfoList({ title, hint, rows, empty, testID }: Readonly<Props>) {
  return (
    <Card title={title} testID={testID}>
      <Text color="$muted" fontSize="$2">
        {hint}
      </Text>
      {rows.length === 0 ? (
        <Text color="$muted" paddingVertical="$2">
          {empty}
        </Text>
      ) : null}
      {rows.map((row) => (
        <XStack
          key={row.key}
          alignItems="center"
          gap="$2"
          paddingVertical="$2"
          borderTopWidth={1}
          borderColor="$borderColor"
          role={row.onPress ? 'button' : undefined}
          onPress={row.onPress}
          pressStyle={row.onPress ? { backgroundColor: '$soft' } : undefined}
          testID={`${testID}-${row.key}`}
        >
          <YStack flex={1}>
            <Text fontWeight="600" numberOfLines={1}>
              {row.title}
            </Text>
            {row.detail ? (
              <Text color="$muted" fontSize="$2">
                {row.detail}
              </Text>
            ) : null}
          </YStack>
          {row.value ? (
            <Text fontWeight="800" fontSize="$5">
              {row.value}
            </Text>
          ) : null}
        </XStack>
      ))}
    </Card>
  );
}

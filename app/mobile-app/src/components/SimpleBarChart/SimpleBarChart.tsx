import { Text, XStack, YStack } from 'tamagui';

export interface BarDatum {
  label: string;
  value: number;
}

/** Buckets ISO dates into "MMM" month counts — last `back` + next `ahead` months. */
export function buildMonthlyCounts(
  dates: (string | null | undefined)[],
  back = 2,
  ahead = 3,
): BarDatum[] {
  const now = new Date();
  const buckets: { key: string; label: string; value: number }[] = [];
  for (let offset = -back; offset <= ahead; offset += 1) {
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    buckets.push({
      key: `${month.getFullYear()}-${month.getMonth()}`,
      label: month.toLocaleString('en', { month: 'short' }),
      value: 0,
    });
  }
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  dates.forEach((iso) => {
    if (!iso) return;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += 1;
  });
  return buckets.map(({ label, value }) => ({ label, value }));
}

interface Props {
  data: BarDatum[];
  height?: number;
  testID?: string;
}

/** Dependency-free bar chart for the studio dashboards: a green bar rising
 * inside a soft pill track — RN twin of mWeb's SimpleBarChart. */
export function SimpleBarChart({ data, height = 120, testID = 'bar-chart' }: Readonly<Props>) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <XStack testID={testID} gap={10} alignItems="flex-end" height={height} paddingTop={8}>
      {data.map((d) => (
        <YStack key={d.label} flex={1} height="100%" alignItems="center" gap={4}>
          {/* The track fills this flex slot, so the value/label rows can never
              be pushed out of the card (overlap fix, B4-1). */}
          <Text fontSize={11} fontWeight="700" color="$color">
            {d.value}
          </Text>
          <YStack
            flex={1}
            width="100%"
            maxWidth={28}
            borderRadius={999}
            overflow="hidden"
            justifyContent="flex-end"
            backgroundColor="$soft"
          >
            <YStack
              width="100%"
              height={`${(d.value / max) * 100}%`}
              borderRadius={999}
              backgroundColor="$primary"
            />
          </YStack>
          <Text fontSize={11} fontWeight="600" color="$muted">
            {d.label}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}

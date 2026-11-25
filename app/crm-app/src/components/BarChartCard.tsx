import { Text, XStack, YStack } from 'tamagui';

import { Card } from '@/components/Card';
import { RADII } from '@/constants/design';

/** One coloured part of a bar, e.g. the venue leads in a stage. Colour is a theme token. */
export interface BarSegment {
  /** Which series this part is (venue, host, count). */
  key: string;
  value: number;
  color: string;
}

export interface BarRow {
  key: string;
  label: string;
  segments: BarSegment[];
  /** What a screen reader says for the row, numbers included. */
  description: string;
}

interface Props {
  title: string;
  caption: string;
  rows: BarRow[];
  legend?: { label: string; color: string }[];
  empty: string;
  testID: string;
}

const BAR_HEIGHT = 12;

/**
 * The portal Dashboard's chart cards, drawn as horizontal bars: one row per
 * stage, priority, category or service, each bar scaled to the largest row,
 * its parts in the series' colours with a legend — the same numbers the
 * portal's charts plot.
 */
export function BarChartCard({ title, caption, rows, legend, empty, testID }: Readonly<Props>) {
  const max = Math.max(1, ...rows.map((row) => row.segments.reduce((sum, s) => sum + s.value, 0)));
  const hasData = rows.some((row) => row.segments.some((s) => s.value > 0));
  return (
    <Card title={title} testID={testID}>
      <Text color="$muted" fontSize="$2">
        {caption}
      </Text>
      {legend ? (
        <XStack gap="$3" flexWrap="wrap">
          {legend.map((item) => (
            <XStack key={item.label} alignItems="center" gap="$1.5">
              <YStack
                width={10}
                height={10}
                borderRadius={RADII.sm / 4}
                backgroundColor={item.color}
              />
              <Text color="$muted" fontSize="$2">
                {item.label}
              </Text>
            </XStack>
          ))}
        </XStack>
      ) : null}
      {hasData ? (
        rows.map((row) => {
          const total = row.segments.reduce((sum, s) => sum + s.value, 0);
          return (
            <YStack key={row.key} gap="$1" accessible aria-label={row.description}>
              <XStack justifyContent="space-between" gap="$2">
                <Text flex={1} fontSize="$3" numberOfLines={1}>
                  {row.label}
                </Text>
                <Text fontSize="$3" fontWeight="700">
                  {total}
                </Text>
              </XStack>
              <XStack
                height={BAR_HEIGHT}
                borderRadius={RADII.pill}
                backgroundColor="$soft"
                overflow="hidden"
              >
                {row.segments.map((segment) =>
                  segment.value > 0 ? (
                    <YStack
                      key={segment.key}
                      width={`${(segment.value / max) * 100}%`}
                      backgroundColor={segment.color}
                    />
                  ) : null,
                )}
              </XStack>
            </YStack>
          );
        })
      ) : (
        <Text color="$muted" paddingVertical="$3" textAlign="center">
          {empty}
        </Text>
      )}
    </Card>
  );
}

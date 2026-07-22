import type { ReactNode } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}

/** A single pill in a filter row — RN port of FilterBar's MUI Chip. */
export function FilterChip({ label, selected, onPress, testID }: Readonly<FilterChipProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      height={32}
      paddingHorizontal={14}
      alignItems="center"
      borderRadius={999}
      borderWidth={1.5}
      backgroundColor={selected ? '$primary' : '$surface'}
      borderColor={selected ? '$primary' : '$borderColor'}
      pressStyle={{ opacity: 0.85 }}
    >
      <Text fontSize={13} fontWeight="800" color={selected ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

/** Labelled filter group (uppercase caption + content). */
export function Section({ title, children }: Readonly<SectionProps>) {
  return (
    <YStack gap={8}>
      <Text fontSize={11.5} fontWeight="800" color="$muted" textTransform="uppercase">
        {title}
      </Text>
      {children}
    </YStack>
  );
}

interface OptionChipRowProps<T extends string = string> {
  options: readonly (readonly [T, string])[];
  value: T;
  onSelect: (value: T) => void;
  testIDPrefix: string;
  /** `scroll` for a horizontal rail, `wrap` for flowing rows, `column` stacked. */
  layout?: 'scroll' | 'wrap' | 'column';
}

/** Renders a [value,label] option list as selectable chips in the chosen layout. */
export function OptionChipRow<T extends string = string>({
  options,
  value,
  onSelect,
  testIDPrefix,
  layout = 'wrap',
}: Readonly<OptionChipRowProps<T>>) {
  const chips = options.map(([val, label]) => (
    <FilterChip
      key={val || 'all'}
      testID={`${testIDPrefix}-${val || 'all'}`}
      label={label}
      selected={value === val}
      onPress={() => onSelect(val)}
    />
  ));

  if (layout === 'scroll') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={8}>{chips}</XStack>
      </ScrollView>
    );
  }
  if (layout === 'column') {
    return <YStack gap={8}>{chips}</YStack>;
  }
  return (
    <XStack gap={8} flexWrap="wrap">
      {chips}
    </XStack>
  );
}

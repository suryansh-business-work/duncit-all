import type { ReactNode } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
  /** Sits on the page ground rather than a sheet: a 36px pill whose idle edge
   * is the card border (none in light), as mWeb's page chip rails draw it. */
  onPage?: boolean;
}

/** A single pill in a filter row — RN port of FilterBar's MUI Chip. */
export function FilterChip({
  label,
  selected,
  onPress,
  testID,
  onPage = false,
}: Readonly<FilterChipProps>) {
  const idleBorder = onPage ? '$cardBorder' : '$borderColor';
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      height={onPage ? 36 : 32}
      paddingHorizontal={14}
      alignItems="center"
      borderRadius={999}
      borderWidth={1}
      backgroundColor={selected ? '$primary' : '$surface'}
      borderColor={selected ? '$primary' : idleBorder}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
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
      <Text fontSize={11.5} fontWeight="600" color="$muted" textTransform="uppercase">
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
  /** The chips sit on the page ground (see FilterChip). */
  onPage?: boolean;
}

/** Renders a [value,label] option list as selectable chips in the chosen layout. */
export function OptionChipRow<T extends string = string>({
  options,
  value,
  onSelect,
  testIDPrefix,
  layout = 'wrap',
  onPage = false,
}: Readonly<OptionChipRowProps<T>>) {
  const chips = options.map(([val, label]) => (
    <FilterChip
      key={val || 'all'}
      testID={`${testIDPrefix}-${val || 'all'}`}
      label={label}
      selected={value === val}
      onPress={() => onSelect(val)}
      onPage={onPage}
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

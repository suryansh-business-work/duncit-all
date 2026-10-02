import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface YearPickerProps {
  testID: string;
  muted: string;
  yearQuery: string;
  onYearQuery: (query: string) => void;
  visibleYears: number[];
  selectedYear: number;
  onPick: (year: number) => void;
}

/** Editable year search plus the matching year chips. */
export function YearPicker({
  testID,
  muted,
  yearQuery,
  onYearQuery,
  visibleYears,
  selectedYear,
  onPick,
}: Readonly<YearPickerProps>) {
  const { t } = useTranslation();
  return (
    <>
      <Text fontSize={12} fontWeight="700" color="$muted">
        YEAR
      </Text>
      <XStack
        alignItems="center"
        gap={6}
        height={38}
        paddingHorizontal={10}
        borderRadius={10}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <MaterialIcons name="search" size={16} color={muted} />
        <Input
          testID={`${testID}-year-search`}
          aria-label={t('mweb.accountEdit.typeAYear')}
          flex={1}
          unstyled
          keyboardType="number-pad"
          value={yearQuery}
          onChangeText={onYearQuery}
          placeholder={t('mweb.accountEdit.typeAYear')}
          placeholderTextColor="$muted"
          fontSize={13}
          color="$color"
        />
      </XStack>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={6}>
          {visibleYears.map((y) => {
            const selected = y === selectedYear;
            return (
              <YStack
                pressStyle={PRESS_STYLE.control}
                key={y}
                testID={`${testID}-year-${y}`}
                role="radio"
                aria-label={`Year ${y}`}
                aria-checked={selected}
                tabIndex={0}
                onPress={() => onPick(y)}
                paddingHorizontal={12}
                paddingVertical={7}
                borderRadius={999}
                borderWidth={1}
                borderColor={selected ? '$primary' : '$borderColor'}
                backgroundColor={selected ? '$primary' : 'transparent'}
              >
                <Text fontSize={12.5} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
                  {y}
                </Text>
              </YStack>
            );
          })}
          {visibleYears.length === 0 ? (
            <Text fontSize={13} color="$muted">
              No matching years.
            </Text>
          ) : null}
        </XStack>
      </ScrollView>
    </>
  );
}

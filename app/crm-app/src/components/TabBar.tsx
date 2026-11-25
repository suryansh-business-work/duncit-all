import { ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { tokens } from '@duncit/theme/tokens';

export interface TabItem {
  key: string;
  label: string;
}

interface Props {
  tabs: readonly TabItem[];
  active: string;
  onChange: (key: string) => void;
  /** Prefix for each tab's testID (`${testID}-${key}`). */
  testID: string;
}

/**
 * The portal's tabs on a phone: a row that scrolls sideways when the tabs do
 * not fit, muted labels, the current one in ink with the accent underline
 * (the portal's indicator), a hairline under the whole row.
 */
export function TabBar({ tabs, active, onChange, testID }: Readonly<Props>) {
  return (
    <YStack borderBottomWidth={1} borderColor="$borderColor">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack role="tablist" gap="$1">
          {tabs.map((tab) => {
            const selected = tab.key === active;
            return (
              <YStack
                key={tab.key}
                role="tab"
                aria-selected={selected}
                aria-label={tab.label}
                onPress={() => onChange(tab.key)}
                paddingHorizontal="$3"
                paddingTop="$3"
                minHeight={tokens.size.touchTarget}
                justifyContent="space-between"
                pressStyle={{ backgroundColor: '$hover' }}
                testID={`${testID}-${tab.key}`}
              >
                <Text color={selected ? '$color' : '$muted'} fontWeight={selected ? '600' : '500'}>
                  {tab.label}
                </Text>
                <YStack
                  height={tokens.size.indicator}
                  marginTop="$2"
                  borderRadius={tokens.size.indicator}
                  backgroundColor={selected ? '$accentText' : 'transparent'}
                />
              </YStack>
            );
          })}
        </XStack>
      </ScrollView>
    </YStack>
  );
}

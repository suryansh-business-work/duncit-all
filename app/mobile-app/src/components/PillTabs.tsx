import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useTranslation } from '@/hooks/useTranslation';

export interface PillTab<T extends string> {
  key: T;
  labelKey: string;
}

interface Props<T extends string> {
  tabs: readonly PillTab<T>[];
  value: T;
  onChange: (tab: T) => void;
  /** Already translated — what the strip is, for a screen reader. */
  ariaLabel: string;
  /** Each tab's test id is `${testIDPrefix}-${key}`. */
  testIDPrefix: string;
}

/**
 * A pill strip of two or three tabs over a screen — the native twin of mWeb's
 * DuncitTabs (rule 27). Native has no URL to hold the selection, so the
 * screen keeps it in state and passes it in.
 */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  testIDPrefix,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  return (
    <XStack
      gap={8}
      marginHorizontal={16}
      marginTop={12}
      padding={4}
      borderRadius={999}
      backgroundColor="$soft"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const selected = value === tab.key;
        return (
          <XStack
            key={tab.key}
            testID={`${testIDPrefix}-${tab.key}`}
            role="tab"
            aria-selected={selected}
            tabIndex={0}
            onPress={() => onChange(tab.key)}
            flex={1}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            backgroundColor={selected ? '$primary' : 'transparent'}
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={13.5} fontWeight="600" color={selected ? '$onPrimary' : '$muted'}>
              {t(tab.labelKey)}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

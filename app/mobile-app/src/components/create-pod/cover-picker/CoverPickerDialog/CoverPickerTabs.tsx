import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const TAB_KEYS = ['mweb.createPod.tabFromPhone', 'mweb.createPod.tabPexels'];

interface CoverPickerTabsProps {
  tab: number;
  onTab: (index: number) => void;
  deviceOnly: boolean;
  color: string;
  onPrimary: string;
}

/** Phone / Pexels tab strip — hidden when the picker offers the phone alone. */
export function CoverPickerTabs({
  tab,
  onTab,
  deviceOnly,
  color,
  onPrimary,
}: Readonly<CoverPickerTabsProps>) {
  const { t } = useTranslation();
  return (
    <XStack gap={8} paddingBottom={12} display={deviceOnly ? 'none' : 'flex'} role="tablist">
      {TAB_KEYS.map((key, index) => (
        <XStack
          key={key}
          testID={`cover-tab-${index}`}
          tabIndex={0}
          role="tab"
          aria-label={t(key)}
          aria-selected={tab === index}
          onPress={() => onTab(index)}
          flex={1}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor={tab === index ? '$primary' : '$soft'}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={13.5} fontWeight="600" color={tab === index ? onPrimary : color}>
            {t(key)}
          </Text>
        </XStack>
      ))}
    </XStack>
  );
}

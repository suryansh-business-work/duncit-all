import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from './types';

/** The ☰ in each tab's header: opens the side menu (the portal's sidebar). */
export function MenuButton({ tint }: Readonly<{ tint: string | undefined }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  return (
    <XStack
      role="button"
      aria-label={t('crmApp.menu.open')}
      onPress={() => navigation.navigate('Menu')}
      padding="$2"
      marginLeft="$2"
      hitSlop={8}
      testID="menu-open"
    >
      <MaterialIcons name="menu" size={26} color={tint} />
    </XStack>
  );
}

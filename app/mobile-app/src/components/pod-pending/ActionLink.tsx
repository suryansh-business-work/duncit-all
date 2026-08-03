import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { fireAndForget } from '@/utils/fire-and-forget';

export interface ActionLinkProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  url: string;
  testID: string;
}

/** Pressable "icon + label" contact action (tel:/mailto:/wa.me/maps deep link).
 * The native counterpart of mWeb's anchor actions (rule 27). */
export function ActionLink({ icon, label, url, testID }: Readonly<ActionLinkProps>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={() => fireAndForget(Linking.openURL(url))}
      alignItems="center"
      gap={4}
      pressStyle={{ opacity: 0.7 }}
    >
      <MaterialIcons name={icon} size={16} color={primary} />
      <Text fontSize={13} fontWeight="600" color="$primary">
        {label}
      </Text>
    </XStack>
  );
}

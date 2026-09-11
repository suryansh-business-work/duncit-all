import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fireAndForget } from '@/utils/fire-and-forget';

export interface ActionLinkProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  url: string;
  testID: string;
}

/** An outlined green pill that opens a contact deep link (tel:/mailto:/wa.me/
 * maps). The native counterpart of mWeb's outlined anchor buttons (rule 27). */
export function ActionLink({ icon, label, url, testID }: Readonly<ActionLinkProps>) {
  const { primary } = useThemeColors();
  return (
    <DuncitButton
      testID={testID}
      label={label}
      onPress={() => fireAndForget(Linking.openURL(url))}
      variant="outline"
      size="sm"
      icon={<MaterialIcons name={icon} size={16} color={primary} />}
    />
  );
}

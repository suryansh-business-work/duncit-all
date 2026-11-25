import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import { crmSafeHref } from '@duncit/utils';

interface Props {
  href: string;
  /** The text shown; the address itself when not given. */
  label?: string;
  testID?: string;
}

/**
 * A user-provided address as the portal's ExternalLink: a web link opens in
 * the browser; anything that is not one (javascript:, plain text) stays text.
 */
export function LinkText({ href, label, testID }: Readonly<Props>) {
  const theme = useTheme();
  const target = crmSafeHref(href);
  const shown = label ?? href;
  if (!target) return <Text testID={testID}>{shown}</Text>;
  return (
    <XStack
      role="link"
      aria-label={shown}
      alignItems="center"
      gap="$1"
      paddingVertical="$1"
      hitSlop={8}
      onPress={() =>
        fireAndForget(Linking.openURL(target), logs.mobileApp, 'crm-app/LinkText', 'openURL')
      }
      testID={testID}
    >
      <Text color="$accentText" flexShrink={1}>
        {shown}
      </Text>
      <MaterialIcons
        name="open-in-new"
        size={14}
        color={theme.accentText?.val}
        accessibilityElementsHidden
      />
    </XStack>
  );
}

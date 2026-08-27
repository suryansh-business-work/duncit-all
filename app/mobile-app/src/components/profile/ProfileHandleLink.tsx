import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { logs } from '@duncit/logs';
import { buildUsernameLabels, profileUrl } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { POD_WEB_BASE } from '@/utils/pod-format';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** The server-minted @handle, or null for an account that predates them. */
  username: string | null;
  /** What the line falls back to when there is no handle yet. */
  fallback: string;
}

/**
 * The `@handle` under the name on your own profile — and the tap that copies
 * the link it makes. Tamagui twin of mWeb's ProfileHandleLink (rule 27).
 *
 * The link belongs HERE rather than in Profile Settings. The handle is CHANGED
 * in Edit profile, beside the name it belongs to; what somebody wants from it
 * on the profile is to send it to a friend, and they go looking for that next
 * to the name and the Share button — not three screens into their account.
 */
export function ProfileHandleLink({ username, fallback }: Readonly<Props>) {
  const { t } = useTranslation();
  // Confirmed in GREEN, not the brand red: a red line under a copy button is
  // read as "that failed" long before it is read as the brand colour.
  const { muted, success } = useThemeColors();
  const labels = buildUsernameLabels(t);
  const [copied, setCopied] = useState(false);

  if (!username) {
    return (
      <Text testID="profile-handle" fontSize={13} color="$muted" numberOfLines={1}>
        {fallback}
      </Text>
    );
  }

  const copy = () => {
    Clipboard.setStringAsync(profileUrl(POD_WEB_BASE, username))
      .then(() => setCopied(true))
      .catch((error) => logs.mobileApp.warn('ProfileHandleLink', 'copyLink', { error }));
  };

  return (
    <XStack
      testID="profile-handle"
      role="button"
      aria-label={labels.copyLink}
      onPress={copy}
      alignItems="center"
      gap={5}
      alignSelf="flex-start"
      pressStyle={PRESS_STYLE.row}
    >
      <Text fontSize={13} color="$muted" numberOfLines={1}>
        {labels.handle(username)}
      </Text>
      <MaterialIcons name="content-copy" size={13} color={copied ? success : muted} />
      {copied ? (
        <Text testID="profile-handle-copied" fontSize={11.5} color={success}>
          {labels.linkCopied}
        </Text>
      ) : null}
    </XStack>
  );
}

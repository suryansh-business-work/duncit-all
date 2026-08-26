import { useState } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  /** Asks the server for the link. The call is what marks the booking present
   * (VIRTUAL_JOIN), so the button never opens `pod.meeting_url` directly. */
  onJoinMeeting: () => Promise<string>;
}

/** The "Join meeting" CTA of a virtual pod — RN twin of mWeb's join button:
 * fetch the link through `joinPodMeeting`, then open it. */
export function JoinMeetingButton({ onJoinMeeting }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = () => {
    if (pending) return;
    setPending(true);
    setError(null);
    onJoinMeeting()
      .then((url) => Linking.openURL(url))
      .catch((err: unknown) =>
        setError(toErrorMessage(err, t('mweb.podDetails.joinMeetingFailed'))),
      )
      .finally(() => setPending(false));
  };

  const label = pending ? t('mweb.podDetails.joiningMeeting') : t('mweb.podDetails.joinMeeting');

  return (
    <YStack gap={6} alignSelf="flex-start">
      <XStack
        testID="pod-join-meeting"
        role="button"
        aria-label={t('mweb.podDetails.joinMeeting')}
        aria-busy={pending}
        onPress={join}
        disabled={pending}
        alignItems="center"
        gap={8}
        paddingHorizontal={18}
        height={44}
        borderRadius={999}
        backgroundColor="$primary"
        opacity={pending ? 0.7 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="videocam" size={18} color={onPrimary} />
        <Text fontSize={14} fontWeight="700" color={onPrimary}>
          {label}
        </Text>
      </XStack>
      {error ? (
        <Text testID="pod-join-meeting-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}

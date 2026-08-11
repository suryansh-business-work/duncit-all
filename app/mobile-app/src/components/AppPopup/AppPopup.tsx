import { useEffect, useState } from 'react';
import { Image, Linking, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useTranslation } from '@/hooks/useTranslation';
import { DismissAppPopupDocument } from '@/graphql/app-popup';
import { graphqlRequest } from '@/services/graphql.client';
import { useAppPopupStore } from '@/stores/app-popup.store';
import { useAuthStore } from '@/stores/auth.store';
import { fireAndForget } from '@/utils/fire-and-forget';
import { navigationRef } from '@/navigation/navigationRef';
import { resolveNotificationLink } from '@/utils/notification-link';

/** Send the guest where the CTA points, reusing the notification link rules so
 * a marketer writes one kind of link for pushes and popups alike. */
function openCta(url: string) {
  const target = resolveNotificationLink(url);
  if (target.kind === 'external') {
    fireAndForget(Linking.openURL(target.url));
    return;
  }
  if (!navigationRef.isReady()) return;
  if (target.kind === 'post') {
    navigationRef.navigate('PostDetail', { postId: target.postId });
    return;
  }
  if (target.kind === 'pod') {
    navigationRef.navigate('PodDetails', { clubSlug: target.clubSlug, podSlug: target.podSlug });
    return;
  }
  if (target.kind === 'screen') {
    navigationRef.navigate(target.route);
  }
}

/**
 * The marketing image shown over everything when the app opens.
 *
 * The server hands back at most one popup and only for somebody who has not
 * closed it, so there is no eligibility logic here — if `data` holds a popup,
 * it is meant to be seen. Closing tells the server, which is what stops it
 * coming back on the next launch and on the user's other devices.
 *
 * The overlay is dismissible by design: the ✕ can be turned off per campaign,
 * but tapping the backdrop always closes it, so nobody is trapped behind an ad.
 */
export function AppPopup() {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const popup = useAppPopupStore((s) => s.data)?.activeAppPopup;
  const fetchPopup = useAppPopupStore((s) => s.fetch);
  const [closed, setClosed] = useState(false);
  const { width, height } = useWindowDimensions();

  // Signed-in only: the audience is a property of the person, so there is
  // nothing to ask for until there is somebody to ask about. This component
  // outlives a sign-out, so the local dismissal is cleared alongside the fetch
  // — otherwise the next user to sign in on this phone inherits it.
  useEffect(() => {
    setClosed(false);
    if (token) fireAndForget(fetchPopup());
  }, [token, fetchPopup]);

  if (!popup || closed) return null;

  const close = () => {
    setClosed(true);
    fireAndForget(graphqlRequest(DismissAppPopupDocument, { id: popup.id }));
  };

  const onCta = () => {
    close();
    openCta(popup.cta_url);
  };

  return (
    <YStack
      testID="app-popup"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={9000}
      backgroundColor="rgba(0,0,0,0.72)"
      alignItems="center"
      justifyContent="center"
      padding={24}
      gap={16}
      onPress={close}
    >
      <Image
        testID="app-popup-image"
        source={{ uri: popup.image_url }}
        style={{ width: width * 0.86, height: height * 0.6, borderRadius: 16 }}
        resizeMode="contain"
      />

      {popup.cta_url ? (
        <YStack width="100%" maxWidth={320}>
          <PrimaryButton testID="app-popup-cta" label={popup.cta_label} onPress={onCta} />
        </YStack>
      ) : null}

      {popup.close_button_enabled ? (
        <XStack
          testID="app-popup-close"
          role="button"
          aria-label={t('mweb.appPopup.close')}
          onPress={close}
          position="absolute"
          top={48}
          right={24}
          width={40}
          height={40}
          borderRadius={20}
          backgroundColor="rgba(0,0,0,0.55)"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name="close" size={24} color="#ffffff" />
        </XStack>
      ) : (
        <Text fontSize={13} color="#e5e7eb">
          {t('mweb.appPopup.tapToClose')}
        </Text>
      )}
    </YStack>
  );
}

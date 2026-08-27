import { useEffect, useMemo, useState } from 'react';
import { Linking, useWindowDimensions } from 'react-native';
import { YStack } from 'tamagui';
import {
  APP_POPUP_VIEWPORT_GUTTER,
  appPopupImageSize,
  appPopupLimits,
  isPopupDismissed,
  type AppPopupSize,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { useAppPopupDismissal } from '@/hooks/useAppPopupDismissal';
import { DismissAppPopupDocument } from '@/graphql/app-popup';
import { graphqlRequest } from '@/services/graphql.client';
import { useAppPopupStore } from '@/stores/app-popup.store';
import { useAuthStore } from '@/stores/auth.store';
import { fireAndForget } from '@/utils/fire-and-forget';
import { navigationRef } from '@/navigation/navigationRef';
import { resolveNotificationLink } from '@/utils/notification-link';
import { AppPopupCard } from './AppPopupCard';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
 * The marketing image shown over everything when the app opens — the Tamagui
 * twin of mWeb's dialog (rule 27): same query, same popup-id dismissal, same
 * card, sized by the same shared rules.
 *
 * The server hands back at most one popup and only for somebody who has not
 * closed it, so there is no eligibility logic here. Closing writes the popup id
 * to this device AND tells the server: the local write is what hides it
 * instantly and survives a failed round trip, the server write is what carries
 * the dismissal to the user's other devices. Both are keyed on the popup id, so
 * the next campaign — a new id — shows again.
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
  const [natural, setNatural] = useState<AppPopupSize | null>(null);
  const { width, height } = useWindowDimensions();
  const { ready, dismissed, dismiss } = useAppPopupDismissal();

  // Signed-in only: the audience is a property of the person, so there is
  // nothing to ask for until there is somebody to ask about. This component
  // outlives a sign-out, so the in-session close is cleared alongside the fetch
  // — otherwise the next user to sign in on this phone inherits it.
  useEffect(() => {
    setClosed(false);
    if (token) fireAndForget(fetchPopup());
  }, [token, fetchPopup]);

  const box = useMemo(
    () => appPopupImageSize(natural, appPopupLimits({ width, height })),
    [natural, width, height],
  );

  if (!popup || closed || !ready || isPopupDismissed(dismissed, popup.id)) return null;

  const close = () => {
    setClosed(true);
    dismiss(popup.id);
    fireAndForget(graphqlRequest(DismissAppPopupDocument, { id: popup.id }, { auth: true }));
  };

  const onCta = () => {
    close();
    openCta(popup.cta_url);
  };

  return (
    <YStack
      pressStyle={PRESS_STYLE.surface}
      testID="app-popup"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={9000}
      backgroundColor="rgba(0,0,0,0.78)"
      alignItems="center"
      justifyContent="center"
      padding={APP_POPUP_VIEWPORT_GUTTER}
      onPress={close}
    >
      <AppPopupCard
        imageUrl={popup.image_url}
        box={box}
        ctaLabel={popup.cta_label}
        showCta={Boolean(popup.cta_url)}
        closeLabel={t('mweb.appPopup.close')}
        showClose={popup.close_button_enabled}
        closeHint={t('mweb.appPopup.tapToClose')}
        onClose={close}
        onCta={onCta}
        onImageLoad={setNatural}
      />
    </YStack>
  );
}

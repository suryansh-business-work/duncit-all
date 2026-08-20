import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@mui/material';
import {
  APP_POPUP_HEIGHT_FRACTION,
  APP_POPUP_MAX_WIDTH,
  APP_POPUP_VIEWPORT_GUTTER,
  appPopupAspect,
  detectClientPlatform,
  isPopupDismissed,
  type AppPopupSize,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { ACTIVE_APP_POPUP, DISMISS_APP_POPUP, type ActiveAppPopup } from './queries';
import { useAppPopupDismissal } from './useAppPopupDismissal';
import AppPopupCard from './AppPopupCard';

/**
 * The widest the card may be here: never past the shared cap, never wider than
 * the screen less its gutters, and never so wide that the art — drawn at its
 * own ratio — would grow past its share of the viewport height.
 *
 * This is `appPopupImageSize` expressed in CSS rather than in JS: the native
 * twin measures the window, a browser can simply be told the rule and will
 * re-solve it on every resize and orientation change.
 */
function cardWidth(aspect: number): string {
  const gutters = APP_POPUP_VIEWPORT_GUTTER * 2;
  const heightShare = APP_POPUP_HEIGHT_FRACTION * 100;
  return `min(${APP_POPUP_MAX_WIDTH}px, calc(100vw - ${gutters}px), calc(${heightShare}dvh * ${aspect}))`;
}

/**
 * The marketing image shown over the app when it opens — the twin of the native
 * app's overlay (rule 27): same query, same popup-id dismissal, same card,
 * sized by the same shared rules, in MUI instead of Tamagui.
 *
 * The server hands back at most one popup and only for somebody who has not
 * closed it, so there is no eligibility logic here. Closing writes the popup id
 * to this browser AND tells the server: the local write is what hides it
 * instantly and survives a failed round trip, the server write is what carries
 * the dismissal to the user's phone. Both are keyed on the popup id, so the
 * next campaign — a new id — shows again.
 *
 * Dismissible by design: the ✕ can be turned off per campaign, but clicking the
 * backdrop always closes it, so nobody is trapped behind an ad.
 */
export default function AppPopupDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [closed, setClosed] = useState(false);
  const [natural, setNatural] = useState<AppPopupSize | null>(null);
  const platform = useMemo(() => detectClientPlatform(globalThis.navigator?.userAgent ?? ''), []);
  const { ready, dismissed, dismiss } = useAppPopupDismissal();

  const { data } = useQuery<{ activeAppPopup: ActiveAppPopup | null }>(ACTIVE_APP_POPUP, {
    variables: { platform },
    fetchPolicy: 'cache-and-network',
  });
  const [dismissOnServer] = useMutation(DISMISS_APP_POPUP);

  const popup = data?.activeAppPopup ?? null;
  if (!popup || closed || !ready || isPopupDismissed(dismissed, popup.id)) return null;

  const close = () => {
    setClosed(true);
    dismiss(popup.id);
    // A failed write only costs the popup showing once more on another device —
    // never worth an error toast over a marketing image already dismissed here.
    dismissOnServer({ variables: { id: popup.id } }).catch(() => undefined);
  };

  const onCta = () => {
    close();
    if (popup.cta_url.startsWith('http')) {
      globalThis.open(popup.cta_url, '_blank', 'noopener');
      return;
    }
    navigate(popup.cta_url);
  };

  // One aspect for the paper and the image alike: the card is the picture.
  const aspect = appPopupAspect(natural);

  return (
    <Dialog
      open
      onClose={close}
      maxWidth={false}
      aria-label="App popup"
      PaperProps={{
        sx: {
          width: cardWidth(aspect),
          maxWidth: '100%',
          m: `${APP_POPUP_VIEWPORT_GUTTER}px`,
          overflow: 'hidden',
          backgroundImage: 'none',
        },
      }}
    >
      <AppPopupCard
        imageUrl={popup.image_url}
        aspect={aspect}
        ctaLabel={popup.cta_label}
        showCta={Boolean(popup.cta_url)}
        closeLabel={t('mweb.appPopup.close')}
        showClose={popup.close_button_enabled}
        closeHint={t('mweb.appPopup.tapToClose')}
        onClose={close}
        onCta={onCta}
        onImageLoad={setNatural}
      />
    </Dialog>
  );
}

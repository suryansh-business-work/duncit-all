import type { Translate } from '@/i18n/fallback';
import { PROFILE_GRID, type ProfileTile } from './profileSections';

export interface SidebarTiles {
  leaderboard: ProfileTile[];
  membership: ProfileTile[];
  giftCards: ProfileTile[];
  grid: ProfileTile[];
}

/**
 * The menu rows whose labels are translated, built with the caller's
 * translator rather than in `profileSections` so they are real copy from the
 * bundle (rule 38) — each is a literal `t('…')` the shipped-key check can see.
 * Rows carry no caption in the calm menu: the label says where each goes.
 */
export function buildSidebarTiles(t: Translate): SidebarTiles {
  return {
    leaderboard: [
      {
        key: 'leaderboard',
        label: t('mweb.leaderboard.sidebarLabel'),
        caption: '',
        icon: 'emoji-events',
        route: 'Leaderboard',
      },
    ],
    membership: [
      {
        key: 'membership',
        label: t('mweb.membership.sidebarLabel'),
        caption: '',
        icon: 'card-membership',
        route: 'Membership',
        badge: t('mweb.membership.comingSoon'),
      },
    ],
    // Buying and redeeming are two different errands — someone handed a code
    // never passes through the buy page — so the section offers both doors.
    giftCards: [
      {
        key: 'gift-cards-buy',
        label: t('mweb.giftCards.sidebarBuyLabel'),
        caption: '',
        icon: 'card-giftcard',
        route: 'GiftCards',
      },
      {
        key: 'gift-cards-redeem',
        label: t('mweb.giftCards.sidebarRedeemLabel'),
        caption: '',
        icon: 'redeem',
        route: 'GiftCardRedeem',
      },
    ],
    /*
      Chats and Following open the grid, ahead of the config's own four. They
      came down from the bottom bar — where Venues and the cart now sit — and
      they are used far more often than Pod Ideas, so they take the first row.
    */
    grid: [
      {
        key: 'chats',
        label: t('mweb.nav.chats'),
        caption: '',
        icon: 'chat-bubble-outline',
        route: 'Chats',
      },
      {
        key: 'following',
        label: t('mweb.nav.following'),
        caption: '',
        icon: 'favorite-border',
        route: 'Following',
      },
      ...PROFILE_GRID,
    ],
  };
}

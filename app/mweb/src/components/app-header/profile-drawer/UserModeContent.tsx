import { Box } from '@mui/material';
import { useProductVisibility } from '@duncit/app-settings';
import { studioOptionsEntryFor } from '@duncit/utils';
import ProfileIdentity from './ProfileIdentity';
import IncompleteBanner from './IncompleteBanner';
import QuickActionGrid from './QuickActionGrid';
import ReferralCard from './ReferralCard';
import DuncitCoinCard from './DuncitCoinCard';
import StudioOptionsCard from './StudioOptionsCard';
import ManageAccountList from './ManageAccountList';
import AdSlot from '../../ads/AdSlot';
import {
  buildManageItems,
  PROFILE_GRID,
  SHOP_ITEMS,
  type ProfileTile,
} from './profileSections';
import type { StudioMode } from '../../../studio-mode';
import { profileCompletion } from '../../../pages/account-page/account-edit/completion';
import { useTranslation } from '../../../i18n/useTranslation';

interface UserModeContentProps {
  me: any;
  roles: string[];
  /** Studio mode in effect — decides which studio's Options entry (if any) is shown. */
  mode: StudioMode;
  showPodPlans: boolean;
  /** Server `leaderboard` feature flag — the whole section hides without it. */
  showLeaderboard?: boolean;
  /** Server `membership` feature flag — the whole section hides without it. */
  showMembership?: boolean;
  /** Server `gift_cards` feature flag — the whole section hides without it. */
  showGiftCards?: boolean;
  /** Server `tour_guide` feature flag — hides the Tour Guide row without it. */
  showTourGuide?: boolean;
  onNavigate: (to: string) => void;
}

/** The profile layout every mode shares: identity, incomplete nudge,
 * quick-action grid, referral card and the Manage Account list. In User mode
 * the Duncit Coin card is featured; once switched into a partner studio that
 * slot holds the studio's ONE highlighted entry — "Venue Options", "Host
 * Options", … — which opens the page listing every option. */
export default function UserModeContent({ me, roles, mode, showPodPlans, showLeaderboard = false, showMembership = false, showGiftCards = false, showTourGuide = false, onNavigate }: Readonly<UserModeContentProps>) {
  const { t } = useTranslation();
  // The Shop group is the drawer's whole e-commerce entry point, so it lives
  // and dies with the product system flag rather than being listed as four
  // destinations that redirect straight back home.
  const { visible: productsVisible } = useProductVisibility();
  const percent = profileCompletion(me ?? {});
  // The switched-in studio's entry, from the definition native and the
  // Partner console render too; null in User mode or once the role is gone.
  const studioEntry = studioOptionsEntryFor(mode, roles);
  // Built here rather than in profileSections so the label is translated —
  // the section ships flag-gated and localized from day one (rule 38).
  const leaderboardItems: ProfileTile[] = [
    { key: 'leaderboard', label: t('mweb.leaderboard.sidebarLabel'), caption: '', icon: 'leaderboard', to: '/leaderboard' },
  ];
  const membershipItems: ProfileTile[] = [
    {
      key: 'membership',
      label: t('mweb.membership.sidebarLabel'),
      caption: '',
      icon: 'membership',
      to: '/membership',
      badge: t('mweb.membership.comingSoon'),
    },
  ];
  // Rows carry no caption in the calm menu: the label says where each goes.
  const giftCardItems: ProfileTile[] = [
    {
      key: 'giftcards-buy',
      label: t('mweb.giftCards.sidebarBuyLabel'),
      caption: '',
      icon: 'giftcards',
      to: '/gift-cards',
    },
    {
      key: 'giftcards-redeem',
      label: t('mweb.giftCards.sidebarRedeemLabel'),
      caption: '',
      icon: 'giftcardRedeem',
      to: '/gift-cards/redeem',
    },
  ];
  /*
    Chats and Following open the grid, ahead of the config's own four. They came
    down from the bottom bar — where Venues and the cart now sit — and they are
    used far more often than Pod Ideas, so they take the first row rather than
    the last. Built here because their labels are translated and
    `profileSections` holds no copy (rule 38).
  */
  const gridTiles: ProfileTile[] = [
    {
      key: 'chats',
      label: t('mweb.nav.chats'),
      caption: '',
      icon: 'chats',
      to: '/chats',
    },
    {
      key: 'following',
      label: t('mweb.nav.following'),
      caption: '',
      icon: 'following',
      to: '/follow',
    },
    ...PROFILE_GRID,
  ];
  return (
    <>
      <Box data-tour="profile-details">
        <ProfileIdentity me={me} onClick={() => onNavigate('/profile')} />
      </Box>
      {percent < 100 && <IncompleteBanner percent={percent} onComplete={() => onNavigate('/account')} />}
      <QuickActionGrid tiles={gridTiles} onNavigate={onNavigate} />
      <AdSlot position="SIDEBAR" variant="card" sx={{ width: 'auto', mx: 2, mb: 1.25 }} />
      {mode === 'USER' && <DuncitCoinCard onNavigate={onNavigate} />}
      {studioEntry && <StudioOptionsCard entry={studioEntry} onNavigate={onNavigate} />}
      <ReferralCard onNavigate={onNavigate} />
      {showLeaderboard && (
        <ManageAccountList title={t('mweb.leaderboard.title')} items={leaderboardItems} onNavigate={onNavigate} />
      )}
      {showMembership && (
        <ManageAccountList title={t('mweb.membership.title')} items={membershipItems} onNavigate={onNavigate} />
      )}
      {showGiftCards && (
        <ManageAccountList title={t('mweb.giftCards.title')} items={giftCardItems} onNavigate={onNavigate} />
      )}
      <ManageAccountList title={t('mweb.common.manageAccount')} items={buildManageItems(showPodPlans, showTourGuide, t('mweb.badges.sidebarLabel'), t('mweb.contacts.sidebarLabel'))} onNavigate={onNavigate} />
      {productsVisible && (
        <ManageAccountList title={t('mweb.common.shop')} items={SHOP_ITEMS} onNavigate={onNavigate} />
      )}
    </>
  );
}

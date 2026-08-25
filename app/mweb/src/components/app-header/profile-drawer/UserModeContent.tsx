import { Box } from '@mui/material';
import ProfileIdentity from './ProfileIdentity';
import IncompleteBanner from './IncompleteBanner';
import QuickActionGrid from './QuickActionGrid';
import ReferralCard from './ReferralCard';
import DuncitCoinCard from './DuncitCoinCard';
import VenuesCard from './VenuesCard';
import ManageAccountList from './ManageAccountList';
import AdSlot from '../../ads/AdSlot';
import { buildManageItems, buildPartnerMenus, SHOP_ITEMS, type ProfileTile } from './profileSections';
import { AUTO_POD_PATH, type StudioMode } from '../../../studio-mode';
import { profileCompletion } from '../../../pages/account-page/account-edit/completion';
import { useTranslation } from '../../../i18n/useTranslation';

/** The Auto Pods row reads as that role's own queue, so it borrows the page
 * title. Written out as literals — a composed key is invisible to the shipped-
 * key check (rule 38). Modes with no queue are absent. */
const AUTO_POD_TITLE_KEY: Partial<Record<StudioMode, string>> = {
  VENUE: 'mweb.autoPods.venueTitle',
  HOST: 'mweb.autoPods.hostTitle',
  CLUB: 'mweb.autoPods.clubTitle',
};

interface UserModeContentProps {
  me: any;
  roles: string[];
  /** Studio mode in effect — decides which partner menu (if any) is shown. */
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
  /** Server `auto_pods` feature flag — hides the partner Auto Pods row. */
  showAutoPods?: boolean;
  onNavigate: (to: string) => void;
}

/** The partner menu's Auto Pods row, or null when the flag is off or the mode
 * has no queue (USER, ECOMM). */
function autoPodsTile(
  mode: StudioMode,
  enabled: boolean,
  translate: (key: string) => string
): ProfileTile | null {
  const to = AUTO_POD_PATH[mode];
  const titleKey = AUTO_POD_TITLE_KEY[mode];
  if (!enabled || !to || !titleKey) return null;
  return { key: 'auto-pods', label: translate(titleKey), caption: '', icon: 'autopods', to };
}

/** The profile layout every mode shares: identity, incomplete nudge,
 * quick-action grid, referral card, the Manage Account list and — once switched
 * into a partner mode — that role's own menu, ending in Withdrawal. */
export default function UserModeContent({ me, roles, mode, showPodPlans, showLeaderboard = false, showMembership = false, showGiftCards = false, showTourGuide = false, showAutoPods = false, onNavigate }: Readonly<UserModeContentProps>) {
  const { t } = useTranslation();
  const percent = profileCompletion(me ?? {});
  const partnerMenus = buildPartnerMenus(roles, mode, autoPodsTile(mode, showAutoPods, t));
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
  const giftCardItems: ProfileTile[] = [
    {
      key: 'giftcards-buy',
      label: t('mweb.giftCards.sidebarBuyLabel'),
      caption: t('mweb.giftCards.sidebarBuyCaption'),
      icon: 'giftcards',
      to: '/gift-cards',
    },
    {
      key: 'giftcards-redeem',
      label: t('mweb.giftCards.sidebarRedeemLabel'),
      caption: t('mweb.giftCards.sidebarRedeemCaption'),
      icon: 'giftcardRedeem',
      to: '/gift-cards/redeem',
    },
  ];
  return (
    <>
      <Box data-tour="profile-details">
        <ProfileIdentity me={me} onClick={() => onNavigate('/profile')} />
      </Box>
      {percent < 100 && <IncompleteBanner percent={percent} onComplete={() => onNavigate('/account')} />}
      <QuickActionGrid onNavigate={onNavigate} />
      <VenuesCard onNavigate={onNavigate} />
      <AdSlot position="SIDEBAR" variant="card" sx={{ width: 'auto', mx: 2, mb: 1.25 }} />
      {mode === 'USER' && <DuncitCoinCard onNavigate={onNavigate} />}
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
      <ManageAccountList title={t('mweb.common.manageAccount')} items={buildManageItems(showPodPlans, showTourGuide, t('mweb.badges.sidebarLabel'))} onNavigate={onNavigate} />
      {partnerMenus.map((menu) => (
        <ManageAccountList key={menu.key} title={menu.title} items={menu.items} onNavigate={onNavigate} />
      ))}
      <ManageAccountList title={t('mweb.common.shop')} items={SHOP_ITEMS} onNavigate={onNavigate} />
    </>
  );
}

import { YStack } from 'tamagui';

import { profileCompletion, type ProfileForCompletion } from '@/utils/profile-completion';
import type { MenuRoute } from '@/navigation/types';
import type { StudioMode } from '@/utils/studio-mode';
import { AdSlot } from '@/components/ads/AdSlot';
import { useTranslation } from '@/hooks/useTranslation';
import { TourAnchor } from '@/tours/TourAnchor';
import { SidebarProfileIdentity, type SidebarIdentityUser } from './SidebarProfileIdentity';
import { SidebarIncompleteBanner } from './SidebarIncompleteBanner';
import { SidebarQuickGrid } from './SidebarQuickGrid';
import { SidebarDuncitCoinCard } from './SidebarDuncitCoinCard';
import { SidebarReferralCard } from './SidebarReferralCard';
import { SidebarManageList } from './SidebarManageList';
import { buildClubMenuItems } from './clubMenuItems';
import { buildVenueMenuItems } from './venueMenuItems';
import { buildSidebarTiles } from './sidebarTiles';
import { buildManageItems, buildPartnerMenus, SHOP_ITEMS } from './profileSections';

/** The profile layout every mode shares — RN twin of mWeb's <UserModeContent/>:
 * identity, incomplete nudge, quick-action grid, referral card, the Manage
 * Account list and — once switched into a partner mode — that role's own menu,
 * ending in Withdrawal. Identity comes from `me` (useMe); completion from the
 * fuller `account` record (useAccount). */
export function SidebarUserContent({
  me,
  account,
  accountLoading = false,
  roles,
  mode,
  showPodPlans,
  showLeaderboard = false,
  showMembership = false,
  showGiftCards = false,
  showTourGuide = false,
  showAutoPods = false,
  showProducts = false,
  onNavigate,
}: Readonly<{
  me?: SidebarIdentityUser | null;
  account?: ProfileForCompletion | null;
  /**
   * The completion record is its own query, so it is still in flight after the
   * identity has landed. An unanswered account completes to a low percentage,
   * which would flash the nudge at a profile that is actually finished — mWeb
   * reads completion off the same record as the identity and never sees this.
   */
  accountLoading?: boolean;
  roles: readonly string[];
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
  /** Server `auto_pods` feature flag — hides the partner Auto Pods row without it. */
  showAutoPods?: boolean;
  /** Server `is_product_visible` flag — the whole Shop group hides without it. */
  showProducts?: boolean;
  onNavigate: (route: MenuRoute) => void;
}>) {
  const { t } = useTranslation();
  const percent = profileCompletion(account ?? {});
  const showIncomplete = !accountLoading && percent < 100;
  // Each enrolling role reads its own queue, so the row is named for the mode
  // it appears in. Written as literal `t('…')` calls because the translation
  // gate greps source for the literal key (rule 38).
  const autoPodTitles: Partial<Record<StudioMode, string>> = {
    VENUE: t('mweb.autoPods.venueTitle'),
    HOST: t('mweb.autoPods.hostTitle'),
    CLUB: t('mweb.autoPods.clubTitle'),
  };
  const partnerMenus = buildPartnerMenus(
    roles,
    mode,
    showAutoPods ? autoPodTitles[mode] : undefined,
    // Each builder answers only for its own mode, so at most one contributes.
    [...buildVenueMenuItems(mode, t), ...buildClubMenuItems(mode, t)],
  );
  // The flag-gated sections and the grid's translated tiles (rule 38).
  const tiles = buildSidebarTiles(t);
  return (
    <YStack>
      <TourAnchor tour="profile" anchor="profile-details">
        <SidebarProfileIdentity me={me} onPress={() => onNavigate('Profile')} />
      </TourAnchor>
      {showIncomplete ? (
        <SidebarIncompleteBanner percent={percent} onComplete={() => onNavigate('Account')} />
      ) : null}
      <SidebarQuickGrid tiles={tiles.grid} onNavigate={onNavigate} />
      <AdSlot position="SIDEBAR" variant="card" />
      {mode === 'USER' ? <SidebarDuncitCoinCard onNavigate={onNavigate} /> : null}
      <SidebarReferralCard onNavigate={onNavigate} />
      {showLeaderboard ? (
        <SidebarManageList
          title={t('mweb.leaderboard.title')}
          items={tiles.leaderboard}
          onNavigate={onNavigate}
        />
      ) : null}
      {showMembership ? (
        <SidebarManageList
          title={t('mweb.membership.title')}
          items={tiles.membership}
          onNavigate={onNavigate}
        />
      ) : null}
      {showGiftCards ? (
        <SidebarManageList
          title={t('mweb.giftCards.title')}
          items={tiles.giftCards}
          onNavigate={onNavigate}
        />
      ) : null}
      <SidebarManageList
        title={t('mweb.common.manageAccount')}
        items={buildManageItems(
          showPodPlans,
          showTourGuide,
          t('mweb.badges.sidebarLabel'),
          t('mweb.contacts.sidebarLabel'),
        )}
        onNavigate={onNavigate}
      />
      {partnerMenus.map((menu) => (
        <SidebarManageList
          key={menu.key}
          title={menu.title}
          items={menu.items}
          onNavigate={onNavigate}
        />
      ))}
      {showProducts ? (
        <SidebarManageList
          title={t('mweb.common.shop')}
          items={SHOP_ITEMS}
          onNavigate={onNavigate}
        />
      ) : null}
    </YStack>
  );
}

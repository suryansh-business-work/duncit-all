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
import { SidebarVenuesCard } from './SidebarVenuesCard';
import { SidebarManageList } from './SidebarManageList';
import {
  buildManageItems,
  buildPartnerMenus,
  SHOP_ITEMS,
  type ProfileTile,
} from './profileSections';

/** The profile layout every mode shares — RN twin of mWeb's <UserModeContent/>:
 * identity, incomplete nudge, quick-action grid, referral card, the Manage
 * Account list and — once switched into a partner mode — that role's own menu,
 * ending in Withdrawal. Identity comes from `me` (useMe); completion from the
 * fuller `account` record (useAccount). */
export function SidebarUserContent({
  me,
  account,
  roles,
  mode,
  showPodPlans,
  showLeaderboard = false,
  showMembership = false,
  showTourGuide = false,
  onNavigate,
}: Readonly<{
  me?: SidebarIdentityUser | null;
  account?: ProfileForCompletion | null;
  roles: readonly string[];
  /** Studio mode in effect — decides which partner menu (if any) is shown. */
  mode: StudioMode;
  showPodPlans: boolean;
  /** Server `leaderboard` feature flag — the whole section hides without it. */
  showLeaderboard?: boolean;
  /** Server `membership` feature flag — the whole section hides without it. */
  showMembership?: boolean;
  /** Server `tour_guide` feature flag — hides the Tour Guide row without it. */
  showTourGuide?: boolean;
  onNavigate: (route: MenuRoute) => void;
}>) {
  const { t } = useTranslation();
  const percent = profileCompletion(account ?? {});
  const partnerMenus = buildPartnerMenus(roles, mode);
  // Built here rather than in profileSections so the label is translated —
  // the section ships flag-gated and localized from day one (rule 38).
  const leaderboardItems: ProfileTile[] = [
    {
      key: 'leaderboard',
      label: t('mweb.leaderboard.sidebarLabel'),
      caption: '',
      icon: 'emoji-events',
      route: 'Leaderboard',
    },
  ];
  const membershipItems: ProfileTile[] = [
    {
      key: 'membership',
      label: t('mweb.membership.sidebarLabel'),
      caption: '',
      icon: 'card-membership',
      route: 'Membership',
      badge: t('mweb.membership.comingSoon'),
    },
  ];
  return (
    <YStack>
      <TourAnchor tour="profile" anchor="profile-details">
        <SidebarProfileIdentity me={me} onPress={() => onNavigate('Profile')} />
      </TourAnchor>
      {percent < 100 ? (
        <SidebarIncompleteBanner percent={percent} onComplete={() => onNavigate('Account')} />
      ) : null}
      <SidebarQuickGrid onNavigate={onNavigate} />
      <SidebarVenuesCard onNavigate={onNavigate} />
      <AdSlot position="SIDEBAR" variant="card" />
      {mode === 'USER' ? <SidebarDuncitCoinCard onNavigate={onNavigate} /> : null}
      <SidebarReferralCard onNavigate={onNavigate} />
      {showLeaderboard ? (
        <SidebarManageList
          title={t('mweb.leaderboard.title')}
          items={leaderboardItems}
          onNavigate={onNavigate}
        />
      ) : null}
      {showMembership ? (
        <SidebarManageList
          title={t('mweb.membership.title')}
          items={membershipItems}
          onNavigate={onNavigate}
        />
      ) : null}
      <SidebarManageList
        title="Manage Account"
        items={buildManageItems(showPodPlans, showTourGuide)}
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
      <SidebarManageList title="Shop" items={SHOP_ITEMS} onNavigate={onNavigate} />
    </YStack>
  );
}

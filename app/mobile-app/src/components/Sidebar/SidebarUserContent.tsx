import { YStack } from 'tamagui';

import { profileCompletion, type ProfileForCompletion } from '@/utils/profile-completion';
import type { MenuRoute } from '@/navigation/types';
import type { StudioMode } from '@/utils/studio-mode';
import { AdSlot } from '@/components/ads/AdSlot';
import { TourAnchor } from '@/tours/TourAnchor';
import { SidebarProfileIdentity, type SidebarIdentityUser } from './SidebarProfileIdentity';
import { SidebarIncompleteBanner } from './SidebarIncompleteBanner';
import { SidebarQuickGrid } from './SidebarQuickGrid';
import { SidebarDuncitCoinCard } from './SidebarDuncitCoinCard';
import { SidebarReferralCard } from './SidebarReferralCard';
import { SidebarVenuesCard } from './SidebarVenuesCard';
import { SidebarManageList } from './SidebarManageList';
import { buildManageItems, buildPartnerMenus, SHOP_ITEMS } from './profileSections';

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
  onNavigate,
}: Readonly<{
  me?: SidebarIdentityUser | null;
  account?: ProfileForCompletion | null;
  roles: readonly string[];
  /** Studio mode in effect — decides which partner menu (if any) is shown. */
  mode: StudioMode;
  showPodPlans: boolean;
  onNavigate: (route: MenuRoute) => void;
}>) {
  const percent = profileCompletion(account ?? {});
  const partnerMenus = buildPartnerMenus(roles, mode);
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
      <SidebarManageList
        title="Manage Account"
        items={buildManageItems(showPodPlans)}
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

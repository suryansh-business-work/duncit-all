import { YStack } from 'tamagui';

import { profileCompletion, type ProfileForCompletion } from '@/utils/profile-completion';
import type { MenuRoute } from '@/navigation/types';
import { AdSlot } from '@/components/ads/AdSlot';
import { SidebarProfileIdentity, type SidebarIdentityUser } from './SidebarProfileIdentity';
import { SidebarIncompleteBanner } from './SidebarIncompleteBanner';
import { SidebarQuickGrid } from './SidebarQuickGrid';
import { SidebarReferralCard } from './SidebarReferralCard';
import { SidebarVenuesCard } from './SidebarVenuesCard';
import { SidebarManageList } from './SidebarManageList';
import { buildManageItems } from './profileSections';

/** The consumer (USER mode) profile layout — RN twin of mWeb's <UserModeContent/>:
 * identity, incomplete nudge, quick-action grid, referral card and the Manage
 * Account list. Identity comes from `me` (useMe); completion from the fuller
 * `account` record (useAccount). */
export function SidebarUserContent({
  me,
  account,
  showPodPlans,
  onNavigate,
}: Readonly<{
  me?: SidebarIdentityUser | null;
  account?: ProfileForCompletion | null;
  showPodPlans: boolean;
  onNavigate: (route: MenuRoute) => void;
}>) {
  const percent = profileCompletion(account ?? {});
  return (
    <YStack>
      <SidebarProfileIdentity me={me} onPress={() => onNavigate('Profile')} />
      {percent < 100 ? (
        <SidebarIncompleteBanner percent={percent} onComplete={() => onNavigate('Account')} />
      ) : null}
      <SidebarQuickGrid onNavigate={onNavigate} />
      <SidebarVenuesCard onNavigate={onNavigate} />
      <AdSlot position="SIDEBAR" variant="card" />
      <SidebarReferralCard onNavigate={onNavigate} />
      <SidebarManageList items={buildManageItems(showPodPlans)} onNavigate={onNavigate} />
    </YStack>
  );
}

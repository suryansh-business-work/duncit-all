import { YStack } from 'tamagui';
import { studioEntryFor, type ProfileMenuFlags, type ProfileMenuKey } from '@duncit/utils';

import { profileCompletion, type ProfileForCompletion } from '@/utils/profile-completion';
import type { MenuRoute } from '@/navigation/types';
import type { StudioMode } from '@/utils/studio-mode';
import { AdSlot } from '@/components/ads/AdSlot';
import { TourAnchor } from '@/tours/TourAnchor';
import { SidebarProfileIdentity, type SidebarIdentityUser } from './SidebarProfileIdentity';
import { SidebarProfileCompletion } from './SidebarProfileCompletion';
import { SidebarQuickAccess } from './SidebarQuickAccess';
import { SidebarDuncitCoinCard } from './SidebarDuncitCoinCard';
import { SidebarStudioOptionsCard } from './SidebarStudioOptionsCard';

/** The top of the account menu — RN twin of mWeb's <UserModeContent/>: the
 * profile card (with the completion nudge inside it while the profile is
 * incomplete), Quick Access, ONE "Studio" card for a partner in any mode, the
 * Duncit Coin card in User mode and the sponsored slot. The section cards
 * follow, from <SidebarSections/>. Identity and completion both come from the
 * user info record (useMe). */
export function SidebarUserContent({
  me,
  account,
  accountLoading = false,
  roles,
  mode,
  flags,
  badgeCounts,
  onNavigate,
}: Readonly<{
  me?: SidebarIdentityUser | null;
  account?: ProfileForCompletion | null;
  /**
   * The completion record is still in flight. An unanswered account completes
   * to a low percentage, which would flash the nudge at a profile that is
   * actually finished.
   */
  accountLoading?: boolean;
  roles: readonly string[];
  /** Studio mode in effect — the role the one Studio entry opens on. */
  mode: StudioMode;
  /** The server flags the menu is gated on (`useMenuFlags`). */
  flags: ProfileMenuFlags;
  /** Per-tile counts for Quick Access (the Chats unread count). */
  badgeCounts?: Readonly<Partial<Record<ProfileMenuKey, number>>>;
  onNavigate: (route: MenuRoute) => void;
}>) {
  const percent = profileCompletion(account ?? {});
  const showIncomplete = !accountLoading && percent < 100;
  // The ONE "Studio" entry every partner gets, whichever role is active — it
  // opens the Studio on the role in effect (or the first role held, from User
  // mode). Null for an account with no partner role.
  const studioEntry = studioEntryFor(mode, roles, { products: flags.products === true });
  return (
    <YStack testID="sidebar-user-content">
      <TourAnchor tour="profile" anchor="profile-details">
        <SidebarProfileIdentity me={me} onPress={() => onNavigate('Profile')}>
          {showIncomplete ? (
            <SidebarProfileCompletion percent={percent} onComplete={() => onNavigate('Account')} />
          ) : null}
        </SidebarProfileIdentity>
      </TourAnchor>
      <SidebarQuickAccess flags={flags} badgeCounts={badgeCounts} onNavigate={onNavigate} />
      {studioEntry ? (
        <SidebarStudioOptionsCard entry={studioEntry} onNavigate={onNavigate} />
      ) : null}
      {mode === 'USER' ? <SidebarDuncitCoinCard onNavigate={onNavigate} /> : null}
      <AdSlot position="SIDEBAR" variant="card" />
    </YStack>
  );
}

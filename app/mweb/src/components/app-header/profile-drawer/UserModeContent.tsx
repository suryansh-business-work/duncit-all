import { Box } from '@mui/material';
import { studioEntryFor, type ProfileMenuFlags, type ProfileMenuKey } from '@duncit/utils';
import ProfileIdentity from './ProfileIdentity';
import ProfileCompletion from './ProfileCompletion';
import QuickAccess from './QuickAccess';
import DuncitCoinCard from './DuncitCoinCard';
import StudioOptionsCard from './StudioOptionsCard';
import AdSlot from '../../ads/AdSlot';
import type { StudioMode } from '../../../studio-mode';
import { profileCompletion } from '../../../pages/account-page/account-edit/completion';

interface UserModeContentProps {
  me: any;
  roles: string[];
  /** Studio mode in effect — the role the one Studio entry opens on. */
  mode: StudioMode;
  /** The server flags the menu is gated on (`useMenuFlags`). */
  flags: ProfileMenuFlags;
  /** Per-tile counts for Quick Access (the Chats unread count). */
  badgeCounts?: Readonly<Partial<Record<ProfileMenuKey, number>>>;
  onNavigate: (to: string) => void;
}

/** The top of the account menu: the profile card (with the completion nudge
 * inside it while the profile is incomplete), Quick Access, ONE "Studio" card
 * for a partner in any mode, the Duncit Coin card in User mode and the
 * sponsored slot. The section cards follow, from <MenuSections/>. Native twin:
 * Sidebar/SidebarUserContent. */
export default function UserModeContent({ me, roles, mode, flags, badgeCounts, onNavigate }: Readonly<UserModeContentProps>) {
  const percent = profileCompletion(me ?? {});
  // The ONE "Studio" entry every partner gets, whichever role is active — the
  // rule native reads too. It opens the Studio on the role in effect (or the
  // first role held, from User mode); null for an account with no partner role.
  const studioEntry = studioEntryFor(mode, roles, { products: flags.products === true });
  return (
    <>
      <Box data-tour="profile-details">
        <ProfileIdentity me={me} onClick={() => onNavigate('/profile')}>
          {percent < 100 && <ProfileCompletion percent={percent} onComplete={() => onNavigate('/account')} />}
        </ProfileIdentity>
      </Box>
      <QuickAccess flags={flags} badgeCounts={badgeCounts} onNavigate={onNavigate} />
      {studioEntry && <StudioOptionsCard entry={studioEntry} onNavigate={onNavigate} />}
      {mode === 'USER' && <DuncitCoinCard onNavigate={onNavigate} />}
      <AdSlot position="SIDEBAR" variant="card" sx={{ width: 'auto', mx: 2, mb: 1.5 }} />
    </>
  );
}

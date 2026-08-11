import { Box } from '@mui/material';
import ProfileIdentity from './ProfileIdentity';
import IncompleteBanner from './IncompleteBanner';
import QuickActionGrid from './QuickActionGrid';
import ReferralCard from './ReferralCard';
import DuncitCoinCard from './DuncitCoinCard';
import VenuesCard from './VenuesCard';
import ManageAccountList from './ManageAccountList';
import AdSlot from '../../ads/AdSlot';
import { buildManageItems, buildPartnerMenus, SHOP_ITEMS } from './profileSections';
import type { StudioMode } from '../../../studio-mode';
import { profileCompletion } from '../../../pages/account-page/account-edit/completion';

interface UserModeContentProps {
  me: any;
  roles: string[];
  /** Studio mode in effect — decides which partner menu (if any) is shown. */
  mode: StudioMode;
  showPodPlans: boolean;
  onNavigate: (to: string) => void;
}

/** The profile layout every mode shares: identity, incomplete nudge,
 * quick-action grid, referral card, the Manage Account list and — once switched
 * into a partner mode — that role's own menu, ending in Withdrawal. */
export default function UserModeContent({ me, roles, mode, showPodPlans, onNavigate }: Readonly<UserModeContentProps>) {
  const percent = profileCompletion(me ?? {});
  const partnerMenus = buildPartnerMenus(roles, mode);
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
      <ManageAccountList title="Manage Account" items={buildManageItems(showPodPlans)} onNavigate={onNavigate} />
      {partnerMenus.map((menu) => (
        <ManageAccountList key={menu.key} title={menu.title} items={menu.items} onNavigate={onNavigate} />
      ))}
      <ManageAccountList title="Shop" items={SHOP_ITEMS} onNavigate={onNavigate} />
    </>
  );
}

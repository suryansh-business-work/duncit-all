import ProfileIdentity from './ProfileIdentity';
import IncompleteBanner from './IncompleteBanner';
import QuickActionGrid from './QuickActionGrid';
import ReferralCard from './ReferralCard';
import VenuesCard from './VenuesCard';
import ManageAccountList from './ManageAccountList';
import AdSlot from '../../ads/AdSlot';
import { buildManageItems, SHOP_ITEMS } from './profileSections';
import { profileCompletion } from '../../../pages/account-page/account-edit/completion';

interface UserModeContentProps {
  me: any;
  showPodPlans: boolean;
  onNavigate: (to: string) => void;
}

/** The consumer (USER mode) profile layout: identity, incomplete nudge,
 * quick-action grid, referral card and the Manage Account list. */
export default function UserModeContent({ me, showPodPlans, onNavigate }: Readonly<UserModeContentProps>) {
  const percent = profileCompletion(me ?? {});
  return (
    <>
      <ProfileIdentity me={me} onClick={() => onNavigate('/profile')} />
      {percent < 100 && <IncompleteBanner percent={percent} onComplete={() => onNavigate('/account')} />}
      <QuickActionGrid onNavigate={onNavigate} />
      <VenuesCard onNavigate={onNavigate} />
      <AdSlot position="SIDEBAR" variant="card" sx={{ width: 'auto', mx: 2, mb: 1.25 }} />
      <ReferralCard onNavigate={onNavigate} />
      <ManageAccountList title="Manage Account" items={buildManageItems(showPodPlans)} onNavigate={onNavigate} />
      <ManageAccountList title="Shop" items={SHOP_ITEMS} onNavigate={onNavigate} />
    </>
  );
}

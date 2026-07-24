import ProfileIdentity from './ProfileIdentity';
import IncompleteBanner from './IncompleteBanner';
import QuickActionGrid from './QuickActionGrid';
import ReferralCard from './ReferralCard';
import VenuesCard from './VenuesCard';
import ManageAccountList from './ManageAccountList';
import AdSlot from '../../ads/AdSlot';
import { buildEarningsItems, buildManageItems, SHOP_ITEMS } from './profileSections';
import { profileCompletion } from '../../../pages/account-page/account-edit/completion';

interface UserModeContentProps {
  me: any;
  roles: string[];
  showPodPlans: boolean;
  onNavigate: (to: string) => void;
}

/** The consumer (USER mode) profile layout: identity, incomplete nudge,
 * quick-action grid, referral card, the Manage Account list and — for partner
 * roles — an Earnings (Withdrawal) row. */
export default function UserModeContent({ me, roles, showPodPlans, onNavigate }: Readonly<UserModeContentProps>) {
  const percent = profileCompletion(me ?? {});
  const earningsItems = buildEarningsItems(roles);
  return (
    <>
      <ProfileIdentity me={me} onClick={() => onNavigate('/profile')} />
      {percent < 100 && <IncompleteBanner percent={percent} onComplete={() => onNavigate('/account')} />}
      <QuickActionGrid onNavigate={onNavigate} />
      <VenuesCard onNavigate={onNavigate} />
      <AdSlot position="SIDEBAR" variant="card" sx={{ width: 'auto', mx: 2, mb: 1.25 }} />
      <ReferralCard onNavigate={onNavigate} />
      <ManageAccountList title="Manage Account" items={buildManageItems(showPodPlans)} onNavigate={onNavigate} />
      {earningsItems.length > 0 && (
        <ManageAccountList title="Earnings" items={earningsItems} onNavigate={onNavigate} />
      )}
      <ManageAccountList title="Shop" items={SHOP_ITEMS} onNavigate={onNavigate} />
    </>
  );
}

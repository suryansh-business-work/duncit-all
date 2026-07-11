import ProfileIdentity from './ProfileIdentity';
import IncompleteBanner from './IncompleteBanner';
import QuickActionGrid from './QuickActionGrid';
import ReferralCard from './ReferralCard';
import ManageAccountList from './ManageAccountList';
import { buildManageItems } from './profileSections';
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
      <ReferralCard onNavigate={onNavigate} />
      <ManageAccountList items={buildManageItems(showPodPlans)} onNavigate={onNavigate} />
    </>
  );
}

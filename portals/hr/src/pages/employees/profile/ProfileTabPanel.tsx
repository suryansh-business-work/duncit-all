import type { HrProfile } from '../../../lib/employee-queries';
import OverviewTab from './tabs/OverviewTab';
import JobTab from './tabs/JobTab';
import PayTab from './tabs/PayTab';
import BankTab from './tabs/BankTab';
import TargetsTab from './tabs/TargetsTab';
import HistoryTab from './tabs/HistoryTab';

/** The profile's tabs: the slug is what the URL carries, so it never follows the label. */
export const PROFILE_TABS = [
  { value: 'overview', labelKey: 'hrEmployee.profile.tab.overview' },
  { value: 'job', labelKey: 'hrEmployee.profile.tab.job' },
  { value: 'pay', labelKey: 'hrEmployee.profile.tab.pay' },
  { value: 'bank', labelKey: 'hrEmployee.profile.tab.bank' },
  { value: 'targets', labelKey: 'hrEmployee.profile.tab.targets' },
  { value: 'history', labelKey: 'hrEmployee.profile.tab.history' },
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number]['value'];

interface Props {
  tab: ProfileTab;
  profile: HrProfile;
  onWithdrawPay: (compensationId: string) => Promise<boolean>;
}

/** The content of the selected tab. */
export default function ProfileTabPanel({ tab, profile, onWithdrawPay }: Readonly<Props>) {
  const { employee } = profile;
  switch (tab) {
    case 'job':
      return <JobTab employee={employee} />;
    case 'pay':
      return <PayTab current={profile.current_compensation} revisions={profile.compensation} onWithdraw={onWithdrawPay} />;
    case 'bank':
      return <BankTab employeeId={employee.id} bank={employee.bank} />;
    case 'targets':
      return <TargetsTab employeeId={employee.id} consoleUrl={profile.targets_console_url} />;
    case 'history':
      return <HistoryTab employeeId={employee.id} />;
    default:
      return <OverviewTab profile={profile} />;
  }
}

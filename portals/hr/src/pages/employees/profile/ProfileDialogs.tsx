import { useTranslation } from '@duncit/shell';
import { dayKeyOf, type HrSettingsRecord } from '@duncit/utils';
import type { HrProfile } from '../../../lib/employee-queries';
import FormDialog from './dialogs/FormDialog';
import { PersonalForm } from './dialogs/personal-form';
import { JobChangeForm } from './dialogs/job-change-form';
import { PayForm } from './dialogs/pay-form';
import { BankForm } from './dialogs/bank-form';
import { ExitForm } from './dialogs/exit-form';
import { RehireForm } from './dialogs/rehire-form';
import type { ProfileActions } from './useProfileActions';
import type { ProfileDialog } from './ProfileHeader';

interface Props {
  open: ProfileDialog | null;
  profile: HrProfile;
  settings: HrSettingsRecord | null;
  actions: ProfileActions;
  onClose: () => void;
}

/** Today plus the notice period, as a `YYYY-MM-DD` last working day. */
function lastDayAfterNotice(noticeDays: number): string {
  const day = new Date();
  day.setDate(day.getDate() + noticeDays);
  return dayKeyOf(day);
}

/** The profile's edit forms, one dialog open at a time; each closes itself once its save lands. */
export default function ProfileDialogs({ open, profile, settings, actions, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { employee } = profile;
  const closeOn = async (save: Promise<boolean>) => {
    const saved = await save;
    if (saved) onClose();
    return saved;
  };

  return (
    <>
      <FormDialog open={open === 'personal'} id="hr-personal" title={t('hrEmployee.dialog.personalTitle')} onClose={onClose}>
        <PersonalForm personal={employee.personal} onSubmit={(v) => closeOn(actions.updatePersonal(v))} onCancel={onClose} />
      </FormDialog>
      <FormDialog open={open === 'job'} id="hr-job" title={t('hrEmployee.dialog.jobTitle')} onClose={onClose}>
        <JobChangeForm employeeId={employee.id} job={employee.job} settings={settings} onSubmit={(v) => closeOn(actions.changeJob(v))} onCancel={onClose} />
      </FormDialog>
      <FormDialog open={open === 'pay'} id="hr-pay" title={t('hrEmployee.dialog.payTitle')} onClose={onClose}>
        <PayForm
          current={profile.current_compensation}
          currency={settings?.default_currency ?? 'INR'}
          template={settings?.salary_template ?? []}
          onSubmit={(v) => closeOn(actions.addPay(v))}
          onCancel={onClose}
        />
      </FormDialog>
      <FormDialog open={open === 'bank'} id="hr-bank" title={t('hrEmployee.dialog.bankTitle')} onClose={onClose}>
        <BankForm bank={employee.bank} onSubmit={(v) => closeOn(actions.updateBank(v))} onCancel={onClose} />
      </FormDialog>
      <FormDialog open={open === 'exit'} id="hr-exit" title={t('hrEmployee.dialog.exitTitle')} onClose={onClose}>
        <ExitForm
          dateOfJoining={employee.job.date_of_joining}
          suggestedLastDay={lastDayAfterNotice(employee.job.notice_period_days)}
          onSubmit={(v) => closeOn(actions.scheduleExit(v))}
          onCancel={onClose}
        />
      </FormDialog>
      <FormDialog open={open === 'rehire'} id="hr-rehire" title={t('hrEmployee.dialog.rehireTitle')} onClose={onClose}>
        <RehireForm
          employeeId={employee.id}
          job={employee.job}
          lastWorkingDay={employee.exit?.last_working_day ?? null}
          settings={settings}
          onSubmit={(v) => closeOn(actions.rehire(v))}
          onCancel={onClose}
        />
      </FormDialog>
    </>
  );
}


import { EM_DASH } from '@duncit/table';
import { ChipList, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import EmployeeChip from '../../EmployeeChip';
import Facts from '../../Facts';
import type { LogDetail } from '../queries';

/**
 * Who this is, and whether the HR portal holds them — both as it was when they
 * signed in and as it stands today, because somebody who has since left is the
 * very thing a reviewer reads these records to find.
 */
export default function WhoSection({ detail }: Readonly<{ detail: LogDetail }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('tech.loginVerifications.who.title')}>
      <Facts
        items={[
          { label: t('shell.common.name'), value: detail.user_name },
          { label: t('shell.common.email'), value: detail.user_email },
          {
            label: t('tech.loginVerifications.colRoles'),
            value: <ChipList items={detail.roles} empty={EM_DASH} />,
            wide: true,
          },
          {
            label: t('tech.loginVerifications.who.hrAtSignIn'),
            value: <EmployeeChip isEmployee={detail.is_employee} />,
          },
          {
            label: t('tech.loginVerifications.who.hrToday'),
            value: <EmployeeChip isEmployee={detail.current_is_employee} />,
          },
          { label: t('tech.loginVerifications.who.seat'), value: detail.employee_title },
          { label: t('tech.loginVerifications.who.seatToday'), value: detail.current_employee_title },
          { label: t('tech.loginVerifications.who.department'), value: detail.employee_department },
          { label: t('tech.loginVerifications.who.employmentType'), value: detail.employment_type },
        ]}
      />
    </SectionCard>
  );
}

import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

/**
 * Whether the HR portal's team structure holds this person.
 *
 * The one fact that tells somebody inside from somebody who is not, so it gets a
 * colour of its own: a person who is not an employee is the row a reviewer is
 * most likely looking for.
 */
export default function EmployeeChip({ isEmployee }: Readonly<{ isEmployee: boolean }>) {
  const { t } = useTranslation();
  return (
    <Chip
      size="small"
      variant="outlined"
      color={isEmployee ? 'success' : 'warning'}
      label={isEmployee ? t('tech.loginVerifications.employee') : t('tech.loginVerifications.notEmployee')}
    />
  );
}

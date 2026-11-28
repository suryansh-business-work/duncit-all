import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import EmployeesTable from './EmployeesTable';
import UnrecordedBanner from './UnrecordedBanner';

/** HR > Employees: the directory, and the way in to hire someone. */
export default function EmployeesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('hrEmployee.list.title')}
        subtitle={t('hrEmployee.list.subtitle')}
        actions={
          <DuncitButton variant="contained" startIcon={<PersonAddIcon />} onClick={() => navigate('/employees/new')} data-testid="hr-employees-add">
            {t('hrEmployee.list.add')}
          </DuncitButton>
        }
      />
      <UnrecordedBanner />
      <SectionCard title={t('hrEmployee.list.title')}>
        <EmployeesTable />
      </SectionCard>
    </Stack>
  );
}

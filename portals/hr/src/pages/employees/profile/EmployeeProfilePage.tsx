import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { formatDay } from '@duncit/app-settings';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { QueryGuard } from '@duncit/ui';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { HR_EMPLOYEE_PROFILE, type ProfileData } from '../../../lib/employee-queries';
import { HR_SETTINGS, type SettingsData } from '../../../lib/settings-queries';
import ProfileHeader, { type ProfileDialog } from './ProfileHeader';
import ProfileDialogs from './ProfileDialogs';
import ProfileTabPanel, { PROFILE_TABS, type ProfileTab } from './ProfileTabPanel';
import { useProfileActions } from './useProfileActions';

/** HR > Employees > one person: header and actions, URL-based tabs, and the edit dialogs. */
export default function EmployeeProfilePage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { id = '' } = useParams();
  const { data, loading, error } = useQuery<ProfileData>(HR_EMPLOYEE_PROFILE, { variables: { id }, fetchPolicy: 'cache-and-network' });
  const { data: settingsData } = useQuery<SettingsData>(HR_SETTINGS, { fetchPolicy: 'cache-first' });
  const profile = data?.hrEmployee ?? null;
  const actions = useProfileActions(profile?.employee ?? null);
  const [dialog, setDialog] = useState<ProfileDialog | null>(null);
  const strip = useTabParam<ProfileTab>({ items: PROFILE_TABS.map((tab) => ({ value: tab.value, label: t(tab.labelKey) })), fallback: 'overview' });

  const cancelExit = async () => {
    const exit = profile?.employee.exit;
    if (!profile || !exit) return;
    const message = t('hrEmployee.profile.cancelExitConfirm', { vars: { name: profile.employee.full_name, date: formatDay(exit.last_working_day) } });
    if (await confirm({ title: t('hrEmployee.profile.cancelExit'), message, confirmLabel: t('hrEmployee.profile.cancelExit') })) await actions.cancelExit();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <DuncitButton component={RouterLink} to="/employees" startIcon={<ArrowBackIcon />} data-testid="hr-profile-back">
          {t('hrEmployee.profile.back')}
        </DuncitButton>
      </Box>
      <QueryGuard loading={loading && !profile} error={profile ? undefined : error} errorText={t('hrEmployee.profile.loadFailed')}>
        {profile && (
          <Stack spacing={3}>
            <ProfileHeader employee={profile.employee} onOpen={setDialog} onCancelExit={() => fireAndForget(cancelExit(), logs.portal.hr, 'EmployeeProfilePage', 'cancelExit')} />
            {!profile.has_employee_access && profile.employee.status !== 'EXITED' && (
              <Alert
                severity="warning"
                action={
                  <DuncitButton color="inherit" size="small" onClick={() => fireAndForget(actions.restoreAccess(), logs.portal.hr, 'EmployeeProfilePage', 'restoreAccess')} data-testid="hr-restore-access">
                    {t('hrEmployee.profile.restoreAccess')}
                  </DuncitButton>
                }
              >
                <strong>{t('hrEmployee.profile.noAccessTitle')}</strong> {t('hrEmployee.profile.noAccessBody')}
              </Alert>
            )}
            <Box sx={{ minWidth: 0 }}>
              <DuncitTabs {...strip} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider' }} />
              <Box key={strip.value} sx={{ pt: 2 }}>
                <ProfileTabPanel tab={strip.value} profile={profile} onWithdrawPay={actions.removePay} />
              </Box>
            </Box>
            <ProfileDialogs open={dialog} profile={profile} settings={settingsData?.hrSettings ?? null} actions={actions} onClose={() => setDialog(null)} />
          </Stack>
        )}
      </QueryGuard>
    </Stack>
  );
}

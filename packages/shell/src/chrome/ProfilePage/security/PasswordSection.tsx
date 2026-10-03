import { useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import { ProfileSection } from '../ProfileSection';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface Props {
  hasPassword: boolean;
  changedAt: string | null;
  /** Reload the sign-in facts once a change lands, so "last changed" moves. */
  onChanged: () => void;
}

/** The account password: when it last changed, and the way to change it. */
export function PasswordSection({ hasPassword, changedAt, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  let status = t('shell.profile.security.noPassword');
  if (hasPassword) {
    status = changedAt
      ? t('shell.profile.security.lastChanged', { vars: { when: formatDateTime(changedAt) } })
      : t('shell.profile.security.neverChanged');
  }

  return (
    <ProfileSection
      testId="profile-password"
      title={t('shell.profile.security.passwordTitle')}
      description={t('shell.profile.security.passwordHint')}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="body2" data-testid="profile-password-status">
          {status}
        </Typography>
        {done && (
          <Alert data-testid="profile-password-changed" severity="success" onClose={() => setDone(false)}>
            {t('shell.profile.security.passwordChanged')}
          </Alert>
        )}
        <DuncitButton
          variant="outlined"
          startIcon={<KeyOutlinedIcon />}
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
          data-testid="profile-change-password"
        >
          {hasPassword ? t('shell.profile.security.changePassword') : t('shell.profile.security.createPassword')}
        </DuncitButton>
      </Stack>
      <ChangePasswordDialog
        open={open}
        hasPassword={hasPassword}
        onClose={() => setOpen(false)}
        onChanged={() => {
          setDone(true);
          onChanged();
        }}
      />
    </ProfileSection>
  );
}

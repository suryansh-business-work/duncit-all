import { useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import PhonelinkLockOutlinedIcon from '@mui/icons-material/PhonelinkLockOutlined';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../../i18n/useTranslation';
import { ProfileSection } from '../../ProfileSection';
import type { ConnectedAccounts } from '../../queries';
import { TwoFactorDisableDialog } from './TwoFactorDisableDialog';
import { TwoFactorSetupDialog } from './TwoFactorSetupDialog';

interface Props {
  accounts: Pick<
    ConnectedAccounts,
    'two_factor_enabled' | 'two_factor_enabled_at' | 'two_factor_recovery_codes_left'
  >;
  /** Reload the security facts after it is turned on or off. */
  onChanged: () => void;
}

/**
 * Authenticator app (TOTP): once on, every console sign-in asks for the
 * app's 6-digit code after the password or emailed code. The member apps are
 * not affected — the server only asks when a sign-in names a console.
 */
export function TwoFactorSection({ accounts, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [dialog, setDialog] = useState<'setup' | 'disable' | null>(null);
  const enabled = accounts.two_factor_enabled;

  return (
    <ProfileSection
      testId="profile-two-factor"
      title={t('shell.twoFactor.title')}
      description={t('shell.twoFactor.hint')}
      action={
        <Chip
          size="small"
          data-testid="profile-two-factor-state"
          color={enabled ? 'primary' : 'default'}
          variant={enabled ? 'filled' : 'outlined'}
          label={enabled ? t('shell.twoFactor.on') : t('shell.twoFactor.off')}
        />
      }
    >
      <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        {enabled && (
          <Typography variant="body2" data-testid="profile-two-factor-status">
            {accounts.two_factor_enabled_at
              ? t('shell.twoFactor.enabledSince', { vars: { when: formatDateTime(accounts.two_factor_enabled_at) } })
              : t('shell.twoFactor.on')}{' '}
            {t('shell.twoFactor.recoveryLeft', { vars: { count: String(accounts.two_factor_recovery_codes_left) } })}
          </Typography>
        )}
        <DuncitButton
          variant="outlined"
          color={enabled ? 'error' : 'primary'}
          startIcon={<PhonelinkLockOutlinedIcon />}
          onClick={() => setDialog(enabled ? 'disable' : 'setup')}
          data-testid={enabled ? 'profile-two-factor-disable' : 'profile-two-factor-setup'}
        >
          {enabled ? t('shell.twoFactor.turnOff') : t('shell.twoFactor.setUp')}
        </DuncitButton>
      </Stack>
      <TwoFactorSetupDialog open={dialog === 'setup'} onClose={() => setDialog(null)} onEnabled={onChanged} />
      <TwoFactorDisableDialog open={dialog === 'disable'} onClose={() => setDialog(null)} onDisabled={onChanged} />
    </ProfileSection>
  );
}

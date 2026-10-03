import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { ProfileSection } from '../ProfileSection';
import { SIGN_OUT_EVERYWHERE } from '../queries';

/**
 * End every session this account has open — a browser left signed in on a
 * shared machine is the case it exists for. The server seals every token
 * issued before now, this one included, so the page signs out straight after.
 */
export function SignOutEverywhereSection({ onSignedOut }: Readonly<{ onSignedOut: () => void }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [signOut, { loading }] = useMutation(SIGN_OUT_EVERYWHERE);

  const run = async () => {
    const ok = await confirm({
      title: t('shell.profile.security.signOutAllTitle'),
      message: t('shell.profile.security.signOutAllMessage'),
      confirmLabel: t('shell.profile.security.signOutAll'),
      cancelLabel: t('shell.common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setError(null);
    try {
      await signOut();
      onSignedOut();
    } catch (e) {
      setError(parseApiError(e, t('shell.profile.genericError')));
    }
  };

  return (
    <ProfileSection
      testId="profile-sessions"
      title={t('shell.profile.security.sessionsTitle')}
      description={t('shell.profile.security.sessionsHint')}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <DuncitButton
          variant="outlined"
          color="error"
          startIcon={<DevicesOutlinedIcon />}
          disabled={loading}
          onClick={run}
          data-testid="profile-sign-out-all"
        >
          {t('shell.profile.security.signOutAll')}
        </DuncitButton>
      </Stack>
    </ProfileSection>
  );
}

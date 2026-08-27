import { Typography } from '@mui/material';

import type { Verification } from '../types';
import { useTranslation } from './i18n';
import VerificationCardShell from './VerificationCardShell';

/**
 * Email verification — terminal. It reads "Verified by the App" once the account
 * has signed in, and there is nothing for the user to do here.
 */
export default function EmailCard({ item }: Readonly<{ item: Verification }>) {
  const { t } = useTranslation();
  return (
    <VerificationCardShell item={item}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
        {t('verification.emailNote')}
      </Typography>
    </VerificationCardShell>
  );
}

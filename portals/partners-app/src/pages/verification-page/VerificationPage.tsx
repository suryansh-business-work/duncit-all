import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import {
  MY_VERIFICATIONS,
  useTranslation,
  VerificationCards,
} from '@duncit/verification/mui';
import type { Verification } from '@duncit/verification';

/**
 * Verification — Identity (one document ≤4 MB), Address (manual residential
 * address) and Email (verified by the app). An admin approves/rejects Identity
 * & Address.
 *
 * The cards themselves come from @duncit/verification/mui, so this page, mWeb's
 * and the native screen render one implementation of the same three rows.
 */
export default function VerificationPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(MY_VERIFICATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const [snack, setSnack] = useState<string | null>(null);

  const onChanged = () => {
    setSnack(t('verification.submitted'));
    refetch().catch(() => undefined);
  };

  if (loading && !data) {
    return (
      <Stack sx={{ alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const verifications: Verification[] = data?.myVerifications ?? [];

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', width: '100%', pb: 4 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <VerifiedUserIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {t('verification.title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {t('verification.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <VerificationCards items={verifications} onChanged={onChanged} onError={setSnack} />

      {snack && (
        <Alert severity="info" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      )}
    </Stack>
  );
}

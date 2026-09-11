import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import {
  MY_VERIFICATIONS,
  useTranslation as useVerificationTranslation,
  VerificationCards,
} from '@duncit/verification/mui';
import type { Verification } from '@duncit/verification';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Verification — Identity (one document ≤4 MB), Address (manual residential
 * address) and Email (verified by the app). An admin approves/rejects Identity
 * & Address.
 *
 * The cards come from @duncit/verification/mui — the same implementation the
 * partner console renders, over the same rules the native VerificationScreen
 * reads (rules 27 and 40).
 */
export default function VerificationPage() {
  const { t } = useTranslation();
  const { t: tv } = useVerificationTranslation();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery<any>(MY_VERIFICATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const [snack, setSnack] = useState<string | null>(null);

  const onChanged = () => {
    setSnack(tv('verification.submitted'));
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
    <Stack spacing={2.5} sx={{ maxWidth: 640, mx: 'auto', width: '100%', pb: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DuncitRoundButton
          onClick={() => navigate(-1)}
          aria-label={t('mweb.common.goBack')}
          sx={{ width: 40, height: 40, minWidth: 40, minHeight: 40, bgcolor: 'background.paper', color: 'text.primary' }}
        >
          <ArrowBackRoundedIcon />
        </DuncitRoundButton>
        <Typography component="h1" noWrap sx={{ flex: 1, minWidth: 0, fontSize: '1.0625rem', fontWeight: 600 }}>
          {tv('verification.title')}
        </Typography>
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

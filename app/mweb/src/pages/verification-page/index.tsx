import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { DuncitIconButton } from '@duncit/buttons';
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
  const { data, loading, error, refetch } = useQuery(MY_VERIFICATIONS, {
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
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', width: '100%', pb: 4 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <DuncitIconButton
          onClick={() => navigate(-1)}
          aria-label={t('mweb.common.goBack')}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <ArrowBackIcon />
        </DuncitIconButton>
        <VerifiedUserIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {tv('verification.title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {tv('verification.subtitle')}
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

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useTranslation } from '@duncit/app-settings';
import { MY_VERIFICATIONS, type Verification } from './queries';
import VerificationCardShell from './VerificationCardShell';
import IdentityCard from './IdentityCard';
import AddressCard from './AddressCard';

/**
 * Verification — Identity (one document ≤4 MB), Address (manual residential
 * address) and Email (verified by the app). An admin approves/rejects Identity
 * & Address. Partners twin of mWeb's verification-page and the native
 * VerificationScreen — same server operations, same flow.
 */
export default function VerificationPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery(MY_VERIFICATIONS, {
    fetchPolicy: 'cache-and-network',
  });
  const [snack, setSnack] = useState<string | null>(null);

  const onChanged = () => {
    setSnack(t('partners.verification.submitted'));
    refetch().catch(() => undefined);
  };

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const verifications: Verification[] = data?.myVerifications ?? [];

  return (
    <Stack spacing={2} sx={{ maxWidth: 640, mx: 'auto', width: '100%', pb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <VerifiedUserIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700} lineHeight={1}>
            {t('partners.verification.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {t('partners.verification.subtitle')}
          </Typography>
        </Box>
      </Stack>

      {verifications.map((item) => {
        if (item.type === 'IDENTITY') {
          return <IdentityCard key={item.type} item={item} onChanged={onChanged} onError={setSnack} />;
        }
        if (item.type === 'ADDRESS') {
          return <AddressCard key={item.type} item={item} onChanged={onChanged} onError={setSnack} />;
        }
        return <VerificationCardShell key={item.type} item={item} />;
      })}

      {snack && (
        <Alert severity="info" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      )}
    </Stack>
  );
}

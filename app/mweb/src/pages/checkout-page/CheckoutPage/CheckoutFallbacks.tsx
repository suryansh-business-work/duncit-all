import { Alert, Box, Skeleton, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';

export function EmptyCheckout({ onHome, title, action }: Readonly<{ onHome: () => void; title: string; action: string }>) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }} data-testid="checkout-unavailable">
      <Alert severity="info" sx={{ mb: 2 }}>{title}</Alert>
      <DuncitButton onClick={onHome} variant="contained">{action}</DuncitButton>
    </Box>
  );
}

export function CheckoutSkeleton() {
  const { t } = useTranslation();
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }} data-testid="checkout-loading" role="progressbar" aria-busy aria-label={t('mweb.a11y.loading')}>
      <Stack spacing={2}>
        <Skeleton variant="text" width="40%" height={40} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Skeleton variant="rounded" height={260} sx={{ flex: 1 }} />
          <Skeleton variant="rounded" height={420} sx={{ flex: 1 }} />
        </Stack>
      </Stack>
    </Box>
  );
}

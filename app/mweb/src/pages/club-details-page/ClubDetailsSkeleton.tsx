import { Box, Skeleton, Stack } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

export default function ClubDetailsSkeleton() {
  const { t } = useTranslation();
  return (
    <Stack data-testid="club-details-loading" spacing={3} role="progressbar" aria-busy aria-label={t('mweb.a11y.loading')}>
      <Skeleton variant="rectangular" height={280} sx={{ borderRadius: '24px' }} />
      <Stack direction="row" spacing={2} sx={{
        alignItems: "center"
      }}>
        <Skeleton variant="rounded" width={64} height={64} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="50%" height={36} />
          <Skeleton width="30%" height={20} />
        </Box>
      </Stack>
      <Skeleton variant="text" height={20} />
      <Skeleton variant="text" height={20} width="80%" />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} variant="rectangular" height={240} sx={{ borderRadius: '24px' }} />
        ))}
      </Box>
    </Stack>
  );
}
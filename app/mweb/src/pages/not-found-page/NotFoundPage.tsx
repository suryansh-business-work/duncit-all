import { Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/** 404 — shown for unknown routes: one icon, one line, one way home. mWeb twin
 * of the mobile NotFoundScreen. */
export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <Box data-testid="not-found-page" sx={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.paper',
            color: 'secondary.main',
          }}
        >
          <SearchOffIcon sx={{ fontSize: 44 }} />
        </Box>
        <Typography component="h1" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Page not found
        </Typography>
        <DuncitButton component={RouterLink} to="/" variant="contained" size="large">
          {t('mweb.notFound.goToHome')}
        </DuncitButton>
      </Stack>
    </Box>
  );
}

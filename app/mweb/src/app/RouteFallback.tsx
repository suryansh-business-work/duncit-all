import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';

/** What a route shows while its page chunk, or a gate in front of it, is still loading. */
export default function RouteFallback() {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="route-fallback"
      // A polite live region naming the wait, so a page that takes a moment to
      // arrive is not silence to a screen reader (WCAG 4.1.3).
      role="status"
      aria-label={t('ui.loader.loading')}
      sx={{ display: 'grid', placeItems: 'center', minHeight: '40dvh' }}
    >
      <CircularProgress data-testid="route-fallback-spinner" />
    </Box>
  );
}

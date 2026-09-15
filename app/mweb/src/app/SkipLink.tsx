import { Box } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import { MAIN_CONTENT_ID } from './appLayout';

/**
 * "Skip to main content" (WCAG 2.4.1): the first thing Tab reaches, so a
 * keyboard user is not walked through the header, the location bar and the
 * category rail on every page. Off-screen until focused.
 */
export default function SkipLink() {
  const { t } = useTranslation();
  return (
    <Box
      component="a"
      href={`#${MAIN_CONTENT_ID}`}
      data-testid="app-skip-link"
      sx={{
        position: 'absolute',
        left: -9999,
        zIndex: (theme) => theme.zIndex.tooltip,
        bgcolor: 'background.paper',
        color: 'primary.main',
        px: 2,
        py: 1,
        borderRadius: 1,
        fontWeight: 700,
        '&:focus': { left: 8, top: 8 },
      }}
    >
      {t('mweb.a11y.skipToContent')}
    </Box>
  );
}

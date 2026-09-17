import { Alert, Box, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  /** The iframe's accessible name — what this preview is a preview OF. */
  title: string;
  html: string;
  errors: string[];
  /** True from the keystroke that changed the MJML until the render lands. */
  loading: boolean;
}

/**
 * The rendered email, on both email pages.
 *
 * MJML is compiled on the SERVER, so every edit costs a round trip and the
 * frame below sits on the previous render while it happens. Without the line
 * at the top that reads as a preview that ignored the change; with it, the
 * stale frame is obviously stale and stays readable rather than blanking.
 *
 * The bar is kept above the frame rather than over it: an operator comparing
 * the old render with what they just typed needs to keep seeing the old one.
 */
export default function EmailPreviewFrame({ title, html, errors, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {errors.length > 0 && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          {errors.slice(0, 3).join(' · ')}
        </Alert>
      )}
      {loading && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <LinearProgress />
          <Typography
            variant="caption"
            sx={{ display: 'block', px: 1, py: 0.5, color: 'text.secondary' }}
          >
            {t('tech.common.renderingPreview')}
          </Typography>
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0, opacity: loading ? 0.55 : 1 }}>
        <iframe
          title={title}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
        />
      </Box>
    </Box>
  );
}

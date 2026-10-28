import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Alert, Box, CircularProgress } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  disabled: boolean;
  error: boolean;
  /** An image upload failed. Shares the one error slot with the AI error. */
  imageError?: boolean;
  /** Offer Improve with AI. Off, the bar only appears to report a failed image. */
  improve?: boolean;
  loading: boolean;
  onImprove: () => void;
}

export function RichTextActions({
  disabled,
  error,
  imageError = false,
  improve = true,
  loading,
  onImprove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const failed = error || imageError;
  if (!improve && !failed) return null;
  // One slot, so the newer failure wins rather than stacking two alerts in a bar
  // that is 40px tall.
  const message = imageError ? 'shell.richText.imageFailed' : 'shell.richText.improveError';
  return (
    <Box
      sx={{
        alignItems: { xs: 'stretch', sm: 'center' },
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1,
        justifyContent: 'space-between',
        p: 1,
      }}
    >
      {failed ? (
        <Alert severity="error" sx={{ flex: 1, py: 0 }}>
          {t(message)}
        </Alert>
      ) : (
        <Box />
      )}
      {improve ? (
        <DuncitButton
          aria-label={t('shell.richText.improve')}
          disabled={disabled || loading}
          onClick={onImprove}
          startIcon={loading ? <CircularProgress color="inherit" size={16} /> : <AutoAwesomeIcon />}
          variant="outlined"
          sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
        >
          {t(loading ? 'shell.richText.improving' : 'shell.richText.improve')}
        </DuncitButton>
      ) : null}
    </Box>
  );
}

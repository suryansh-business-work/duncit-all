import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  disabled: boolean;
  error: boolean;
  loading: boolean;
  onImprove: () => void;
}

export function RichTextActions({ disabled, error, loading, onImprove }: Readonly<Props>) {
  const { t } = useTranslation();
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
      {error ? (
        <Alert severity="error" sx={{ flex: 1, py: 0 }}>
          {t('shell.richText.improveError')}
        </Alert>
      ) : (
        <Box />
      )}
      <Button
        aria-label={t('shell.richText.improve')}
        disabled={disabled || loading}
        onClick={onImprove}
        startIcon={loading ? <CircularProgress color="inherit" size={16} /> : <AutoAwesomeIcon />}
        variant="outlined"
        sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
      >
        {t(loading ? 'shell.richText.improving' : 'shell.richText.improve')}
      </Button>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Box, Card, LinearProgress, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { RENDER_CRM_EMAIL_THEME_PREVIEW } from '../../../api/emailSettings.gql';
import type { EmailThemeFormValues } from '../../../forms/email-theme';

interface Props {
  /** The theme to show; null until the form has produced a valid one. */
  theme: EmailThemeFormValues | null;
}

const WIDTHS = { desktop: 640, phone: 375 } as const;
type PreviewResult = { renderCrmEmailThemePreview: { html: string; errors: string[] } };
const DEBOUNCE_MS = 450;

/**
 * The shared starter email rendered by the server under the theme being edited
 * — the same render path a lead's email takes — at desktop or phone width.
 * Renders wait until typing pauses, so each keystroke is not a round trip.
 */
export default function ThemePreview({ theme }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [width, setWidth] = useState<keyof typeof WIDTHS>('desktop');
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!theme) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await client.query<PreviewResult>({
          query: RENDER_CRM_EMAIL_THEME_PREVIEW,
          variables: { theme },
          fetchPolicy: 'network-only',
        });
        if (cancelled) return;
        setHtml(res.data?.renderCrmEmailThemePreview.html ?? '');
        setError(res.data?.renderCrmEmailThemePreview.errors[0] ?? null);
      } catch (e) {
        if (!cancelled) setError(parseApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client, theme]);

  return (
    <Card variant="outlined" sx={{ position: { lg: 'sticky' }, top: { lg: 16 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, py: 1.25 }}>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800, flex: 1 }}>
          {t('crm.emailSettings.livePreview')}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={width}
          onChange={(_, next) => next && setWidth(next)}
          aria-label={t('crm.emailSettings.previewWidth')}
        >
          <ToggleButton value="desktop" aria-label={t('crm.emailSettings.desktop')}>
            <DesktopWindowsIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="phone" aria-label={t('crm.emailSettings.phone')}>
            <SmartphoneIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box sx={{ height: 4 }}>{loading && <LinearProgress />}</Box>
      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ bgcolor: 'action.hover', p: 2, display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
        <Box
          component="iframe"
          title={t('crm.emailSettings.livePreview')}
          srcDoc={html}
          sandbox=""
          sx={{ width: WIDTHS[width], maxWidth: '100%', height: 720, border: 0, borderRadius: 1, bgcolor: 'background.paper' }}
        />
      </Box>
    </Card>
  );
}

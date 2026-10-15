import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/LightbulbOutlined';
import {
  LOADING_TIP_INTERVAL_MS,
  LOADING_TIP_TITLE_KEY,
  loadingTipKeyAt,
  nextLoadingTipIndex,
} from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  testId: string;
}

/**
 * A friendly first load: a spinner, a lightbulb, "Did you know?" and a tip
 * that changes every few seconds — instead of a bare spinner on a slow list.
 * The tips and their order come from `@duncit/utils` (loading-tips), so the
 * native twin (components/TipsLoader) shows the same ones.
 *
 * Only the spinner speaks to a screen reader ("Loading…"): the tip is not a
 * live region, so it is not re-announced every time it changes.
 */
export default function TipsLoader({ testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = globalThis.setInterval(() => setIndex((current) => nextLoadingTipIndex(current)), LOADING_TIP_INTERVAL_MS);
    return () => globalThis.clearInterval(timer);
  }, []);

  return (
    <Stack data-testid={testId} spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', p: 6, maxWidth: 420, mx: 'auto' }}>
      <CircularProgress aria-label={t('mweb.a11y.loading')} size={28} />
      <Box
        aria-hidden
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          color: 'secondary.main',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <LightbulbIcon fontSize="large" />
      </Box>
      <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600 }}>
        {t(LOADING_TIP_TITLE_KEY)}
      </Typography>
      <Typography data-testid={`${testId}-tip`} variant="body2" sx={{ color: 'text.secondary' }}>
        {t(loadingTipKeyAt(index))}
      </Typography>
    </Stack>
  );
}

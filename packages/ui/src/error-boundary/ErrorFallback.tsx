import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';

type ReportStatus = 'idle' | 'sending' | 'sent' | 'failed';

export interface ErrorFallbackProps {
  /** The crash id, shown so a person can quote it to support. */
  reference?: string;
  /** Fills the viewport — for the app-level boundary, which has no chrome around it. */
  fullScreen?: boolean;
  onRetry: () => void;
  onReport: () => Promise<void>;
}

/**
 * What a crashed page shows instead of itself. The visible half of
 * DuncitErrorBoundary — a class cannot call `useTranslation`. Says what
 * happened and what to do, never the error itself.
 */
export function ErrorFallback({ reference, fullScreen, onRetry, onReport }: Readonly<ErrorFallbackProps>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ReportStatus>('idle');
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The page vanished under the keyboard user's focus; put it somewhere that explains why.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const report = () => {
    setStatus('sending');
    onReport().then(
      () => setStatus('sent'),
      () => setStatus('failed')
    );
  };

  return (
    <Box
      data-testid="error-boundary-fallback"
      role="alert"
      sx={{ minHeight: fullScreen ? '100dvh' : '60dvh', display: 'grid', placeItems: 'center', p: 3 }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 480 }}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} aria-hidden />
        <Typography ref={headingRef} tabIndex={-1} component="h1" variant="h6" sx={{ outline: 'none' }}>
          {t('ui.errorBoundary.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ui.errorBoundary.body')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <DuncitButton data-testid="error-boundary-retry" variant="contained" startIcon={<RefreshIcon />} onClick={onRetry}>
            {t('ui.errorBoundary.retry')}
          </DuncitButton>
          {status === 'sent' ? null : (
            <DuncitButton
              data-testid="error-boundary-report"
              variant="outlined"
              startIcon={<BugReportOutlinedIcon />}
              disabled={status === 'sending'}
              onClick={report}
            >
              {status === 'sending' ? t('ui.errorBoundary.reporting') : t('ui.errorBoundary.report')}
            </DuncitButton>
          )}
        </Stack>
        {status === 'sent' && <Alert severity="success">{t('ui.errorBoundary.reported')}</Alert>}
        {status === 'failed' && <Alert severity="warning">{t('ui.errorBoundary.reportFailed')}</Alert>}
        {reference && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('ui.errorBoundary.reference', { vars: { id: reference } })}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

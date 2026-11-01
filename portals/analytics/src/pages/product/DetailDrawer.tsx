import type { ReactNode } from 'react';
import { Alert, Box, Drawer, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '@duncit/app-settings';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  loading: boolean;
  error?: unknown;
  onClose: () => void;
  testId: string;
  children: ReactNode;
}

/** The drill-down beside a Product table: one row's detail, with its own loading and error states. */
export default function DetailDrawer({ open, title, subtitle, loading, error, onClose, testId, children }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', md: 640 } } } }}>
      <Box sx={{ p: 3 }} data-testid={testId} role="region" aria-label={title}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} aria-label={t('analytics.product.close')} data-testid={`${testId}-close`}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {loading && <Loader variant="page" />}
        {Boolean(error) && <Alert severity="error">{parseApiError(error)}</Alert>}
        {!loading && !error && children}
      </Box>
    </Drawer>
  );
}

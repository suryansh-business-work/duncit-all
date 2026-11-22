import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitButton } from '@duncit/buttons';
import { formatStatementMoney, MWEB_POD_VIABILITY_KEYS, podViabilityNotice } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { EarningsPreview } from './useEarningsPreview';

interface Props {
  preview: EarningsPreview;
  /** The finance settings' currency symbol, for the amounts in the copy. */
  currency: string;
}

/**
 * Under the Ticket Price field: why Create Pod is off when the server's verdict
 * says this paid pod would be refused (the reason, the venue's minimum business
 * and the lowest ticket price that works), or that the check itself failed,
 * with a retry. A polite live region that is always mounted, so a screen
 * reader hears each new verdict as the price changes. Native twin:
 * ViabilityNotice (rule 27).
 */
export default function ViabilityNotice({ preview, currency }: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = (rupees: number) => formatStatementMoney(rupees, currency);
  const notice = preview.notViable ? podViabilityNotice(preview.projection, MWEB_POD_VIABILITY_KEYS, t, money) : null;
  const tone = preview.failed ? theme.palette.error.main : theme.palette.warning.main;
  const box = { alignItems: 'flex-start', p: 1.5, borderRadius: 1, bgcolor: alpha(tone, 0.12) };

  return (
    <Box aria-live="polite" aria-atomic="true" data-testid="create-pod-viability">
      {preview.failed && (
        <Stack direction="row" spacing={1.25} data-testid="create-pod-viability-failed" sx={box}>
          <ErrorOutlineIcon fontSize="small" color="error" />
          <Stack spacing={0.5} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
            <Typography variant="caption">{t('mweb.createPod.viability.checkFailed')}</Typography>
            <DuncitButton size="small" color="inherit" onClick={preview.retry} data-testid="create-pod-viability-retry">
              {t('mweb.createPod.viability.retry')}
            </DuncitButton>
          </Stack>
        </Stack>
      )}
      {notice && (
        <Stack direction="row" spacing={1.25} data-testid="create-pod-viability-notice" data-reason={notice.reason} sx={box}>
          <InfoOutlinedIcon fontSize="small" color="warning" />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2">{notice.title}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {notice.body}
            </Typography>
          </Box>
        </Stack>
      )}
    </Box>
  );
}

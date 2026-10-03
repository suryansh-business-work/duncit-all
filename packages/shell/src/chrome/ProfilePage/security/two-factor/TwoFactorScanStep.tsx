import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../../../i18n/useTranslation';
import { TwoFactorCodeForm } from '../../../../two-factor/two-factor-code';
import type { TwoFactorSetup } from '../../queries';

interface Props {
  setup: TwoFactorSetup;
  enabling: boolean;
  onEnable: (code: string) => Promise<void>;
}

/** Scan the QR code (or type the key), then prove it with the first code the app shows. */
export function TwoFactorScanStep({ setup, enabling, onEnable }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('shell.twoFactor.scanHint')}
      </Typography>
      <Box
        component="img"
        src={setup.qr_code_data_url}
        alt={t('shell.twoFactor.qrAlt')}
        data-testid="two-factor-qr"
        sx={{ width: 200, height: 200, alignSelf: 'center', bgcolor: 'common.white', p: 1, borderRadius: 2 }}
      />
      <Stack spacing={0.5}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('shell.twoFactor.manualKey')}
        </Typography>
        <Typography
          variant="body2"
          data-testid="two-factor-secret"
          sx={{ fontFamily: 'monospace', wordBreak: 'break-all', userSelect: 'all' }}
        >
          {setup.secret}
        </Typography>
      </Stack>
      <TwoFactorCodeForm
        allowRecovery={false}
        loading={enabling}
        submitLabel={t('shell.twoFactor.turnOn')}
        testId="two-factor-enable"
        onSubmit={onEnable}
      />
    </Stack>
  );
}

import { useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { copyToClipboard } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';

/**
 * The recovery codes, shown the one time they exist in readable form — the
 * server keeps only their hashes, so this screen is the last chance to save them.
 */
export function RecoveryCodesList({ codes }: Readonly<{ codes: readonly string[] }>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<boolean | null>(null);

  const copyAll = async () => setCopied(await copyToClipboard(codes.join('\n')));

  return (
    <Stack spacing={1.5}>
      <Alert severity="warning">{t('shell.twoFactor.recoveryWarning')}</Alert>
      <Box
        component="ul"
        aria-label={t('shell.twoFactor.recoveryTitle')}
        data-testid="two-factor-recovery-codes"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 1,
          listStyle: 'none',
          m: 0,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'action.hover',
        }}
      >
        {codes.map((code) => (
          <Typography key={code} component="li" variant="body2" sx={{ fontFamily: 'monospace', textAlign: 'center' }}>
            {code}
          </Typography>
        ))}
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <DuncitButton
          variant="outlined"
          size="small"
          startIcon={<ContentCopyIcon />}
          onClick={copyAll}
          data-testid="two-factor-recovery-copy"
        >
          {t('shell.twoFactor.copyCodes')}
        </DuncitButton>
        <Typography variant="caption" role="status" sx={{ color: copied === false ? 'error.main' : 'text.secondary' }}>
          {copied === true && t('shell.twoFactor.copied')}
          {copied === false && t('shell.twoFactor.copyFailed')}
        </Typography>
      </Stack>
    </Stack>
  );
}

import { Box, Chip, Stack, Typography } from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  hasKey: boolean;
  busy: boolean;
  /** True once a key was generated during this visit. */
  generated: boolean;
  error?: string;
  onGenerate: () => void;
}

/** Gateway API key status + one-click generation (server-side, nothing to copy). */
export default function ApiKeyRow({ hasKey, busy, generated, error, onGenerate }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Chip
          size="small"
          variant="outlined"
          icon={hasKey ? <CheckCircleIcon /> : undefined}
          color={hasKey ? 'success' : 'default'}
          label={hasKey ? t('crm.tools.apiKeySaved') : t('crm.tools.apiKeyMissing')}
        />
        <DuncitButton size="small" startIcon={<VpnKeyIcon fontSize="small" />} disabled={busy} onClick={onGenerate}>
          {hasKey ? t('crm.tools.regenerateApiKey') : t('crm.tools.generateApiKey')}
        </DuncitButton>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
        {t('crm.tools.generateApiKeyHint')}
      </Typography>
      {generated && (
        <Typography variant="caption" role="status" sx={{ color: 'success.main', display: 'block' }}>
          {t('crm.tools.apiKeyGenerated')}
        </Typography>
      )}
      {error && (
        <Typography variant="caption" color="error" role="alert" sx={{ display: 'block' }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

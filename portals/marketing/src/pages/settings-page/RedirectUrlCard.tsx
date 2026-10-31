import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_REDIRECT_URI, type SocialRedirectUriData } from './queries';

/**
 * The address every network's app must list as its OAuth redirect URL. One
 * URL for all of them — the signed state says which network is answering —
 * shown beside each app's keys so nobody has to guess it.
 */
export default function RedirectUrlCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<SocialRedirectUriData>(SOCIAL_REDIRECT_URI, { fetchPolicy: 'cache-first' });
  const [copied, setCopied] = useState(false);
  const url = data?.socialRedirectUri ?? '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // The clipboard is refused in some embedded views; the field stays selectable.
      setCopied(false);
    }
  };

  return (
    <SectionCard title={t('marketing.integrations.redirectTitle')} subtitle={t('marketing.integrations.redirectBody')}>
      {error && (
        <Alert severity="error" data-testid="redirect-url-error">
          {t('marketing.integrations.redirectUnavailable')}
        </Alert>
      )}
      {!error && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
          <TextField
            value={loading ? '' : url}
            size="small"
            fullWidth
            label={t('marketing.integrations.redirectTitle')}
            slotProps={{ input: { readOnly: true }, htmlInput: { 'data-testid': 'redirect-url-field' } }}
          />
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={copy}
            disabled={!url}
            data-testid="redirect-url-copy"
          >
            {copied ? t('marketing.integrations.copied') : t('marketing.integrations.copy')}
          </DuncitButton>
        </Stack>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
        {t('marketing.integrations.redirectNote')}
      </Typography>
    </SectionCard>
  );
}

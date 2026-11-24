import { useState } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';

export interface CopyUrlCardProps {
  title: string;
  subtitle: string;
  note: string;
  /** Shown instead of the field when the address could not be read. */
  errorText: string;
  url: string;
  loading: boolean;
  failed: boolean;
  /** `redirect-url`, `webhook-url`… — the card's test ids are built from it. */
  testIdPrefix: string;
}

/**
 * An address a person copies from Duncit into a provider's console (the OAuth
 * redirect, the webhook callback): read-only, with a Copy button that says
 * when it worked. The field stays selectable where the clipboard is refused.
 */
export default function CopyUrlCard({ title, subtitle, note, errorText, url, loading, failed, testIdPrefix }: Readonly<CopyUrlCardProps>) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

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
    <SectionCard title={title} subtitle={subtitle}>
      {failed && (
        <Alert severity="error" data-testid={`${testIdPrefix}-error`}>
          {errorText}
        </Alert>
      )}
      {!failed && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
          <TextField
            value={loading ? '' : url}
            size="small"
            fullWidth
            label={title}
            slotProps={{ input: { readOnly: true }, htmlInput: { 'data-testid': `${testIdPrefix}-field` } }}
          />
          <DuncitButton
            size="small"
            variant="outlined"
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={copy}
            disabled={!url}
            data-testid={`${testIdPrefix}-copy`}
          >
            {copied ? t('marketing.integrations.copied') : t('marketing.integrations.copy')}
          </DuncitButton>
        </Stack>
      )}
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
        {note}
      </Typography>
    </SectionCard>
  );
}

import { useState } from 'react';
import { Stack, TextField } from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EARN_LIMITS, isHttpsUrl } from './earn.types';

interface Props {
  disabled: boolean;
  existing: string[];
  onAdd: (url: string) => void;
}

/** Paste an image that already lives somewhere on https instead of uploading it. */
export default function EarnImageUrlInput({ disabled, existing, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const value = url.trim();
    if (!isHttpsUrl(value) || value.length > EARN_LIMITS.url) {
      setError(t('websiteApp.earn.errHttps'));
      return;
    }
    if (existing.includes(value)) {
      setError(t('websiteApp.earn.errDuplicate'));
      return;
    }
    setError(null);
    setUrl('');
    onAdd(value);
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
      <TextField
        size="small"
        fullWidth
        type="url"
        label={t('websiteApp.earn.imageUrl')}
        value={url}
        disabled={disabled}
        error={!!error}
        helperText={error ?? t('websiteApp.earn.imageUrlHint')}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        }}
        slotProps={{ htmlInput: { maxLength: EARN_LIMITS.url } }}
      />
      <DuncitButton variant="outlined" startIcon={<AddLinkIcon />} disabled={disabled || !url.trim()} onClick={add}>
        {t('websiteApp.earn.addImageUrl')}
      </DuncitButton>
    </Stack>
  );
}

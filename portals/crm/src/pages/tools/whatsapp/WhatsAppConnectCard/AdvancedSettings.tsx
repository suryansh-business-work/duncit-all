import { useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  baseUrl: string;
  hasKey: boolean;
  busy: boolean;
  onSave: (input: { base_url: string; api_key?: string }) => void;
}

/** Manual gateway URL / key override — only needed for a gateway other than ours. */
export default function AdvancedSettings({ baseUrl, hasKey, busy, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(baseUrl);
  const [apiKey, setApiKey] = useState('');

  return (
    <Accordion variant="outlined" disableGutters sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t('crm.tools.advancedSettings')}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <TextField
            label={t('crm.tools.gatewayUrl')}
            size="small"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('crm.tools.apiKey2')}
            size="small"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? t('crm.tools.apiKeyKeepPlaceholder') : t('crm.tools.apiKeyPastePlaceholder')}
            fullWidth
          />
          <DuncitButton
            variant="outlined"
            disabled={busy}
            onClick={() => onSave({ base_url: url, api_key: apiKey.trim() || undefined })}
          >
            {t('crm.tools.saveConnect')}
          </DuncitButton>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

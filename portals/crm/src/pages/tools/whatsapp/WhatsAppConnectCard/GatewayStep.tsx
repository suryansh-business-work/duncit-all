import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { WaGatewayForm, type WaGatewayFormValues } from '@/forms/wa-gateway';
import { WA_GENERATE_API_KEY, WA_SAVE_CONFIG, type WaConnection } from '../whatsappQueries';
import WhatsAppApiKeyHelp from '../WhatsAppApiKeyHelp';

interface Props {
  connection: WaConnection;
  onChanged: () => void;
  /** The gateway is saved and its key works: go on to Link WhatsApp. */
  onDone: () => void;
}

const LOGGER = logs.portal['crm'];

/**
 * Step 1: save the gateway URL and API key. The server checks the URL and asks the gateway
 * whether the key works before saving, so a wrong key is caught here rather than at Connect.
 * "Generate API key" has the server mint one with its own master key.
 */
export default function GatewayStep({ connection, onChanged, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [saveConfig, saveState] = useMutation<
    { waSaveConfig: WaConnection },
    { input: { base_url: string; api_key?: string } }
  >(WA_SAVE_CONFIG);
  const [generateKey, generateState] = useMutation<
    { waGenerateApiKey: { connection: WaConnection } },
    { base_url: string }
  >(WA_GENERATE_API_KEY);
  const [generated, setGenerated] = useState(false);

  const save = async (values: WaGatewayFormValues) => {
    try {
      await saveConfig({ variables: { input: { base_url: values.base_url, api_key: values.api_key || undefined } } });
    } catch (error) {
      LOGGER.warn('WhatsAppConnectCard', 'saveConfig', { error, code: 'wa_save_config_failed' });
      return; // shown via saveState.error
    }
    onChanged();
    onDone();
  };

  const generate = async (baseUrl: string) => {
    setGenerated(false);
    try {
      await generateKey({ variables: { base_url: baseUrl } });
    } catch (error) {
      LOGGER.warn('WhatsAppConnectCard', 'generateApiKey', { error, code: 'wa_generate_key_failed' });
      return; // shown via generateState.error
    }
    setGenerated(true);
    onChanged();
  };

  return (
    <Stack spacing={2}>
      <WaGatewayForm
        initialBaseUrl={connection.base_url}
        hasKey={connection.has_api_key}
        submitting={saveState.loading}
        generating={generateState.loading}
        error={saveState.error?.message || generateState.error?.message}
        notice={generated ? t('crm.tools.apiKeyGenerated') : null}
        onSubmit={save}
        onGenerate={generate}
      />
      <WhatsAppApiKeyHelp />
    </Stack>
  );
}

import { useState } from 'react';
import { YStack } from 'tamagui';
import { logs } from '@duncit/logs';

import { WaGatewayForm } from '@/forms/wa-gateway';
import {
  CrmAppWhatsappGenerateApiKeyDocument,
  CrmAppWhatsappSaveConfigDocument,
} from '@/graphql/whatsappGenerator';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { ApiKeyHelp } from './ApiKeyHelp';
import type { WaConnection } from './types';

const SCOPE = 'crm-app/WhatsAppConnect';

interface Props {
  connection: WaConnection;
  onChanged: () => void;
  /** The gateway is saved and its key works: go on to Link WhatsApp. */
  onDone: () => void;
}

/**
 * Step 1: save the gateway URL and API key the person typed. The server checks
 * the URL and asks the gateway whether the key works before saving, so a wrong
 * key is caught here rather than at Connect. "Generate API key" has the server
 * mint one with its own master key.
 */
export function GatewayStep({ connection, onChanged, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallback = t('crmApp.common.saveFailed');

  const save = async (values: { base_url: string; api_key: string }) => {
    setSaving(true);
    setError(null);
    let saved = false;
    try {
      await gqlRequest(CrmAppWhatsappSaveConfigDocument, {
        input: { base_url: values.base_url, api_key: values.api_key || undefined },
      });
      saved = true;
    } catch (err) {
      logs.mobileApp.warn(SCOPE, 'saveConfig', { error: err });
      setError(errorMessage(err, fallback));
    } finally {
      setSaving(false);
    }
    if (!saved) return;
    onChanged();
    onDone();
  };

  const generate = async (baseUrl: string) => {
    setGenerated(false);
    setGenerating(true);
    setError(null);
    try {
      await gqlRequest(CrmAppWhatsappGenerateApiKeyDocument, { base_url: baseUrl });
      setGenerated(true);
      onChanged();
    } catch (err) {
      logs.mobileApp.warn(SCOPE, 'generateApiKey', { error: err });
      setError(errorMessage(err, fallback));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <YStack gap="$3">
      <WaGatewayForm
        initialBaseUrl={connection.base_url}
        hasKey={connection.has_api_key}
        submitting={saving}
        generating={generating}
        error={error}
        notice={generated ? t('crm.tools.apiKeyGenerated') : null}
        onSubmit={save}
        onGenerate={generate}
      />
      <ApiKeyHelp />
    </YStack>
  );
}

import { getRuntimeEnvValue } from '../../config/runtimeEnv';
import { commsProviderService, type CommsProviderRuntimeConfig } from '@modules/crm/commsProvider/commsProvider.service';

export interface VobizResult {
  ok: boolean;
  message: string;
  provider: string;
  provider_id?: string | null;
  external_id?: string | null;
  recording_url?: string | null;
}

const PROVIDER = 'vobiz';

async function fallbackConfig(): Promise<CommsProviderRuntimeConfig> {
  const [baseUrl, apiKey, senderEmail, senderName, callerId] = await Promise.all([
    getRuntimeEnvValue('VOBIZ_BASE_URL'),
    getRuntimeEnvValue('VOBIZ_API_KEY'),
    getRuntimeEnvValue('VOBIZ_SENDER_EMAIL'),
    getRuntimeEnvValue('VOBIZ_SENDER_NAME'),
    getRuntimeEnvValue('VOBIZ_CALLER_ID'),
  ]);
  return {
    base_url: baseUrl.replace(/\/$/, ''),
    api_key: apiKey,
    sender_email: senderEmail,
    sender_name: senderName,
    caller_id: callerId,
  };
}

async function resolveConfig(type: 'VOBIZ_EMAIL' | 'VOBIZ_CALL', providerId?: string | null) {
  const provider = await commsProviderService.resolveRuntime(type, providerId);
  if (provider) {
    return {
      id: provider.id,
      name: provider.name,
      config: {
        base_url: (provider.config.base_url ?? '').replace(/\/$/, ''),
        api_key: provider.config.api_key ?? '',
        sender_email: provider.config.sender_email ?? '',
        sender_name: provider.config.sender_name ?? '',
        caller_id: provider.config.caller_id ?? '',
      },
    };
  }
  return { id: null as string | null, name: 'Default Vobiz (env)', config: await fallbackConfig() };
}

const notConfigured = (what: string, providerName: string): VobizResult => ({
  ok: false,
  provider: PROVIDER,
  message: `${providerName} is not configured for ${what}. Add VOBIZ_BASE_URL + VOBIZ_API_KEY in the Tech portal or create a provider.`,
});

async function post(baseUrl: string, apiKey: string, path: string, payload: Record<string, unknown>) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
}

export const vobizService = {
  async sendEmail(input: {
    to: string;
    subject: string;
    body: string;
    provider_id?: string | null;
  }): Promise<VobizResult> {
    const resolved = await resolveConfig('VOBIZ_EMAIL', input.provider_id);
    const cfg = resolved.config;
    if (!cfg.api_key || !cfg.base_url) {
      return { ...notConfigured('email', resolved.name), provider_id: resolved.id };
    }
    try {
      const res = await post(cfg.base_url, cfg.api_key, '/email/send', {
        from: cfg.sender_email,
        from_name: cfg.sender_name,
        to: input.to,
        subject: input.subject,
        html: input.body,
      });
      if (!res.ok) {
        return {
          ok: false,
          provider: PROVIDER,
          provider_id: resolved.id,
          message: `${resolved.name} email failed (HTTP ${res.status})`,
        };
      }
      const json: any = await res.json().catch(() => ({}));
      return {
        ok: true,
        provider: PROVIDER,
        provider_id: resolved.id,
        external_id: String(json?.id ?? json?.message_id ?? '') || null,
        message: `Email queued to ${input.to} via ${resolved.name}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        provider: PROVIDER,
        provider_id: resolved.id,
        message: err?.message || `${resolved.name} email request failed`,
      };
    }
  },

  async call(input: { to: string; provider_id?: string | null }): Promise<VobizResult> {
    const resolved = await resolveConfig('VOBIZ_CALL', input.provider_id);
    const cfg = resolved.config;
    if (!cfg.api_key || !cfg.base_url) {
      return { ...notConfigured('calls', resolved.name), provider_id: resolved.id };
    }
    try {
      const res = await post(cfg.base_url, cfg.api_key, '/calls/create', {
        from: cfg.caller_id,
        to: input.to,
        record: true,
      });
      if (!res.ok) {
        return {
          ok: false,
          provider: PROVIDER,
          provider_id: resolved.id,
          message: `${resolved.name} call failed (HTTP ${res.status})`,
        };
      }
      const json: any = await res.json().catch(() => ({}));
      return {
        ok: true,
        provider: PROVIDER,
        provider_id: resolved.id,
        external_id: String(json?.call_id ?? json?.id ?? '') || null,
        recording_url: String(json?.recording_url ?? '') || null,
        message: `Call initiated to ${input.to} via ${resolved.name}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        provider: PROVIDER,
        provider_id: resolved.id,
        message: err?.message || `${resolved.name} call request failed`,
      };
    }
  },
};

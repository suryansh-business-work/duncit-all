import { getRuntimeEnvValue } from '../../config/runtimeEnv';

export interface VobizResult {
  ok: boolean;
  message: string;
  provider: string;
}

const PROVIDER = 'vobiz';

async function loadConfig() {
  const [baseUrl, apiKey, senderEmail, senderName, callerId] = await Promise.all([
    getRuntimeEnvValue('VOBIZ_BASE_URL'),
    getRuntimeEnvValue('VOBIZ_API_KEY'),
    getRuntimeEnvValue('VOBIZ_SENDER_EMAIL'),
    getRuntimeEnvValue('VOBIZ_SENDER_NAME'),
    getRuntimeEnvValue('VOBIZ_CALLER_ID'),
  ]);
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, senderEmail, senderName, callerId };
}

const notConfigured = (what: string): VobizResult => ({
  ok: false,
  provider: PROVIDER,
  message: `Vobiz is not configured for ${what}. Set VOBIZ_BASE_URL and VOBIZ_API_KEY in the Tech portal.`,
});

async function post(baseUrl: string, apiKey: string, path: string, payload: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  return res;
}

export const vobizService = {
  async sendEmail(input: { to: string; subject: string; body: string }): Promise<VobizResult> {
    const cfg = await loadConfig();
    if (!cfg.apiKey || !cfg.baseUrl) return notConfigured('email');
    try {
      const res = await post(cfg.baseUrl, cfg.apiKey, '/email/send', {
        from: cfg.senderEmail,
        from_name: cfg.senderName,
        to: input.to,
        subject: input.subject,
        html: input.body,
      });
      if (!res.ok) return { ok: false, provider: PROVIDER, message: `Vobiz email failed (HTTP ${res.status})` };
      return { ok: true, provider: PROVIDER, message: `Email queued to ${input.to}` };
    } catch (err: any) {
      return { ok: false, provider: PROVIDER, message: err?.message || 'Vobiz email request failed' };
    }
  },

  async call(input: { to: string }): Promise<VobizResult> {
    const cfg = await loadConfig();
    if (!cfg.apiKey || !cfg.baseUrl) return notConfigured('calls');
    try {
      const res = await post(cfg.baseUrl, cfg.apiKey, '/calls/create', {
        from: cfg.callerId,
        to: input.to,
      });
      if (!res.ok) return { ok: false, provider: PROVIDER, message: `Vobiz call failed (HTTP ${res.status})` };
      return { ok: true, provider: PROVIDER, message: `Call initiated to ${input.to}` };
    } catch (err: any) {
      return { ok: false, provider: PROVIDER, message: err?.message || 'Vobiz call request failed' };
    }
  },
};

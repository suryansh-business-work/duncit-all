import { getRuntimeEnvValue } from './runtimeEnv';
import { logs } from '@observability/log';

/**
 * Local-dev ngrok tunnel. On a local server boot we open a free ngrok tunnel so
 * Twilio can reach our `/twilio/*` voice webhooks on localhost (Twilio can't hit
 * `localhost` directly). The tunnel's public URL then becomes the webhook base
 * (see `getWebhookBaseUrl`). No-op in production or when `NGROK_AUTHTOKEN` is
 * missing — get a free token at https://dashboard.ngrok.com/get-started/your-authtoken
 */
let publicUrl: string | null = null;
let starting = false;

export function getNgrokUrl(): string | null {
  return publicUrl;
}

export async function startNgrokTunnel(port: number): Promise<string | null> {
  if (process.env.NODE_ENV === 'production') return null;
  if (publicUrl || starting) return publicUrl;
  const authtoken = (process.env.NGROK_AUTHTOKEN || (await getRuntimeEnvValue('NGROK_AUTHTOKEN')) || '').trim();
  if (!authtoken) {
    logs.server.warn('ngrok', 'startNgrokTunnel', {
      msg:
        '[ngrok] NGROK_AUTHTOKEN not set — skipping tunnel. Twilio callbacks will not reach localhost. ' +
        'Add a free token (NGROK_AUTHTOKEN) from https://dashboard.ngrok.com/get-started/your-authtoken',
    });
    return null;
  }
  starting = true;
  try {
    const ngrok = await import('@ngrok/ngrok');
    const listener = await ngrok.forward({ addr: port, authtoken });
    publicUrl = listener.url();
    logs.server.info('ngrok', 'startNgrokTunnel', {
      msg: `🌐 ngrok tunnel open: ${publicUrl} -> http://localhost:${port} (Twilio webhooks will use this)`,
      publicUrl,
      port,
    });
    return publicUrl;
  } catch (err: any) {
    logs.server.warn('ngrok', 'startNgrokTunnel', {
      error: err,
      msg: '[ngrok] failed to start tunnel:',
    });
    return null;
  } finally {
    starting = false;
  }
}

export async function stopNgrokTunnel(): Promise<void> {
  try {
    const ngrok = await import('@ngrok/ngrok');
    await ngrok.kill();
  } catch {
    /* tunnel not running */
  }
  publicUrl = null;
}

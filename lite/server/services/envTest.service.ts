import type { LiteEnvCategory } from '../models/envEntry.model';
import { normalizeEmail } from '../utils/validate';
import { emailService, smtpFromConfig } from './email.service';
import { envEntryService, readString, type EnvConfig } from './envEntry.service';
import { probeMaps } from './maps.service';
import { msg91CredentialsFrom, msg91Probe } from './msg91.gateway';
import { settingsService } from './settings.service';
import { probeImagekit } from './upload.service';

export interface EnvTestResult {
  ok: boolean;
  message: string;
}

const GOOGLE_CLIENT_SUFFIX = '.apps.googleusercontent.com';

type Probe = (config: EnvConfig, to: string) => Promise<EnvTestResult>;

/** One probe per category: each proves the entry against its vendor; EMAIL sends a real message. */
const PROBES: Record<LiteEnvCategory, Probe> = {
  async EMAIL(config, to) {
    const smtp = smtpFromConfig(config);
    if (!smtp) return { ok: false, message: 'SMTP host is required' };
    const settings = await settingsService.get();
    const outcome = await emailService.sendRaw(
      normalizeEmail(to),
      `${settings.site_name} test email`,
      'This is a test email from the Lite console. If you can read it, the mailbox works.',
      settings.site_name,
      smtp,
    );
    return { ok: outcome.status === 'SENT', message: outcome.message };
  },
  IMAGEKIT: (config) => probeImagekit(readString(config, 'private_key')),
  async GOOGLE_OAUTH(config) {
    const clientId = readString(config, 'client_id');
    return clientId.endsWith(GOOGLE_CLIENT_SUFFIX)
      ? { ok: true, message: 'Client id has the expected shape' }
      : { ok: false, message: `A Google OAuth client id ends with ${GOOGLE_CLIENT_SUFFIX}` };
  },
  GOOGLE_MAPS: (config) => probeMaps(readString(config, 'api_key')),
  async MSG91(config) {
    const creds = msg91CredentialsFrom(config);
    return creds ? msg91Probe(creds) : { ok: false, message: 'Widget ID and auth key are both required' };
  },
};

export const envTestService = {
  /** Run an entry's probe and stamp the result on the entry. */
  async test(id: string, to: string | null | undefined, adminEmail: string | null | undefined): Promise<EnvTestResult> {
    const entry = await envEntryService.byId(id);
    const config = (entry.config ?? {}) as EnvConfig;
    const result = await PROBES[entry.category](config, to || adminEmail || '');
    await envEntryService.recordTest(id, result.ok);
    return result;
  },
};

import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { CrmAppSettingsModel } from './crmAppSettings.model';

const KEY = 'default';

/** The CRM console's `appConfig.key` — the portal key both the CRM portal and the CRM app sign in with. */
export const CRM_PORTAL_KEY = 'crm';

/**
 * The `x-duncit-app` the Duncit CRM app sends on every request
 * (`app/crm-app/src/services/graphql.client.ts`); the CRM web portal sends
 * `crm`, so a portal sign-in never matches it.
 */
export const CRM_APP_CLIENT = 'crm-app';

export interface CrmAppSettings {
  security_verification: boolean;
}

/** The settings as the CRM portal and the CRM app show them; defaults when nothing has been saved. */
export async function crmAppSettings(): Promise<CrmAppSettings> {
  const doc = await CrmAppSettingsModel.findOne({ key: KEY }).lean();
  return {
    // Only an explicit `false` turns it off: a missing document or field keeps the protection.
    security_verification: doc?.security_verification !== false,
  };
}

/** Turn the CRM app's Security Verification screen on or off. CRM managers only (the resolver checks). */
export async function updateCrmAppSettings(
  input: { security_verification?: boolean | null },
  user: AuthUser
): Promise<CrmAppSettings> {
  if (typeof input.security_verification !== 'boolean') {
    throw new GraphQLError('Choose whether the Duncit CRM app asks for Security Verification.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  await CrmAppSettingsModel.findOneAndUpdate(
    { key: KEY },
    { $set: { security_verification: input.security_verification, updated_by: user.id } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  // A security control changed: who turned it which way is kept beside the change log row.
  logs.server.info('crm', 'crmAppSecurityVerification', {
    by: user.id,
    security_verification: input.security_verification,
  });
  return crmAppSettings();
}

/**
 * Whether a Duncit CRM app sign-in must complete Security Verification.
 *
 * Read on every CRM app sign-in. If the setting cannot be read the answer is
 * yes: a database hiccup must never be what lets somebody skip the screen.
 */
export async function crmAppSecurityVerificationOn(): Promise<boolean> {
  try {
    return (await crmAppSettings()).security_verification;
  } catch (error) {
    logs.server.error('crm', 'crmAppSecurityVerification', {
      error,
      msg: 'CRM app settings could not be read; Security Verification stays on',
    });
    return true;
  }
}

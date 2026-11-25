import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { IosSigningModel, type IIosSigning } from './iosSigning.model';
import { createAppStoreProfile, ensureBundleId } from './appStoreConnect.gateway';
import {
  ascTokenOrThrow,
  badInput,
  expiredSigning,
  isExpired,
  newest,
  noSigning,
  requireAscConfig,
  signingBundle,
} from './iosSigning.service';

/**
 * iOS signing for the Duncit CRM app (app/crm-app).
 *
 * An Apple Distribution certificate signs every app of the team, and Apple
 * allows a team very few, so the CRM app does not get one of its own: it signs
 * with the member app's current certificate (made in Tech → App Builds →
 * Settings) and only needs an App Store profile for its own bundle ID. That
 * profile is made here the first time a CRM build asks, and again after the
 * member identity moves to a new certificate.
 */

const CRM_BUNDLE_KEY = 'APP_STORE_CONNECT_CRM_BUNDLE_ID';

/** The CRM bundle ID from the APP_STORE_CONNECT env entry, refused when missing or the member app's own. */
async function crmBundleId(memberBundleId: string): Promise<string> {
  const id = (await getRuntimeEnvValue(CRM_BUNDLE_KEY)).trim();
  if (!id) {
    throw badInput('Add the Duncit CRM bundle ID in Environment Variables → App Store Connect.');
  }
  if (id === memberBundleId) {
    throw badInput('The Duncit CRM bundle ID must be different from the member app’s bundle ID.');
  }
  return id;
}

/**
 * Register the CRM bundle ID if Apple has not seen it, then make an App Store
 * profile for it on the member identity's certificate. The CRM app uses no
 * capability (no push, no associated domains, no Sign in with Apple), so none
 * is switched on.
 */
async function createCrmProfile(
  token: string,
  bundleId: string,
  current: IIosSigning,
  by: string
): Promise<IIosSigning> {
  try {
    const bundleIdId = await ensureBundleId(token, bundleId);
    // Profile names must be unique on the team, and take letters, digits and spaces.
    const profileName = `${bundleId.replaceAll('.', ' ')} App Store ${Date.now()}`;
    const profile = await createAppStoreProfile(token, bundleIdId, current.certificate_id, profileName);
    const doc = await IosSigningModel.create({
      app: 'CRM',
      bundle_id: bundleId,
      team_id: current.team_id,
      certificate_id: current.certificate_id,
      certificate_serial: current.certificate_serial,
      certificate_base64: current.certificate_base64,
      private_key_pem: current.private_key_pem,
      profile_id: profile.id,
      profile_uuid: profile.uuid,
      profile_name: profile.name,
      profile_base64: profile.contentBase64,
      expires_at: current.expires_at,
      created_by: by,
    });
    logs.server.warn('appBuild', 'crmIosSigningGenerated', {
      by,
      bundle_id: bundleId,
      certificate_serial: current.certificate_serial,
      profile_uuid: profile.uuid,
    });
    return doc;
  } catch (err) {
    throw badInput(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Everything the crm-ios-build workflow signs and uploads with. Refuses before
 * any build time is spent when the CRM bundle ID is not set, when no member
 * identity exists yet, or when its certificate has expired.
 */
export async function crmIosSigningBundle(by: string) {
  const { creds, bundleId: memberBundleId } = await requireAscConfig();
  const bundleId = await crmBundleId(memberBundleId);
  const current = await newest().select('+private_key_pem');
  if (!current) throw noSigning();
  if (isExpired(current)) throw expiredSigning();

  const existing = await IosSigningModel.findOne({
    app: 'CRM',
    bundle_id: bundleId,
    certificate_id: current.certificate_id,
  })
    .sort({ created_at: -1 })
    .select('+private_key_pem');
  const doc = existing ?? (await createCrmProfile(ascTokenOrThrow(creds), bundleId, current, by));
  logs.server.warn('appBuild', 'iosSigningBundle', { by, app: 'CRM', certificate_serial: doc.certificate_serial });
  return signingBundle(doc, creds);
}

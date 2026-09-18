import { randomBytes } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { applePrivateKeyPem } from '@modules/access/auth/auth.apple';
import { AppBuildModel } from './appBuild.model';
import { IosSigningModel, type IIosSigning } from './iosSigning.model';
import { buildP12, certificateTeamId, newSigningRequest } from './iosSigning.crypto';
import {
  ascToken,
  createAppStoreProfile,
  createDistributionCertificate,
  ensureBundleId,
  ensureCapabilities,
  revokeCertificate,
  type AscCredentials,
} from './appStoreConnect.gateway';

/**
 * iOS signing, made by the server instead of by hand on a Mac.
 *
 * The App Store Connect API key on the APP_STORE_CONNECT env entry is the one
 * thing a person creates; from it, Generate makes an Apple Distribution
 * certificate (for a key pair generated here) and an App Store profile. The
 * ios-build workflow fetches them from here to sign, and the Tech portal
 * downloads them from a build's details.
 */

export type IosSigningFileKind = 'CERTIFICATE' | 'PROFILE' | 'P12' | 'API_KEY';

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const notConfigured = () =>
  badInput(
    'App Store Connect is not connected. Add the API key and bundle ID in Environment Variables → App Store Connect.'
  );

const noSigning = () =>
  badInput('No iOS signing files yet — generate them in Tech → App Builds → Settings → App Store Connect.');

interface AscConfig {
  creds: AscCredentials;
  bundleId: string;
}

async function readAscConfig(): Promise<AscConfig | null> {
  const [issuerId, keyId, privateKey, bundleId] = await Promise.all([
    getRuntimeEnvValue('APP_STORE_CONNECT_ISSUER_ID'),
    getRuntimeEnvValue('APP_STORE_CONNECT_KEY_ID'),
    getRuntimeEnvValue('APP_STORE_CONNECT_PRIVATE_KEY'),
    getRuntimeEnvValue('APP_STORE_CONNECT_BUNDLE_ID'),
  ]);
  const creds = { issuerId: issuerId.trim(), keyId: keyId.trim(), privateKey: privateKey.trim() };
  if (!creds.issuerId || !creds.keyId || !creds.privateKey || !bundleId.trim()) return null;
  return { creds, bundleId: bundleId.trim() };
}

async function requireAscConfig(): Promise<AscConfig> {
  const config = await readAscConfig();
  if (!config) throw notConfigured();
  return config;
}

/** What the portal may know about an identity. Never the key or the files. */
function pubSigning(doc: IIosSigning) {
  return {
    id: String(doc._id),
    bundle_id: doc.bundle_id,
    team_id: doc.team_id,
    certificate_serial: doc.certificate_serial,
    profile_name: doc.profile_name,
    expires_at: doc.expires_at?.toISOString() ?? null,
    created_by: doc.created_by,
    created_at: doc.created_at?.toISOString() ?? null,
  };
}

const newest = () => IosSigningModel.findOne().sort({ created_at: -1 });

/** The settings card: whether the key is there, for which app, and the current identity. */
export async function appStoreSettings() {
  const [config, current] = await Promise.all([readAscConfig(), newest()]);
  return {
    configured: Boolean(config),
    bundleId: config?.bundleId ?? '',
    signing: current ? pubSigning(current) : null,
  };
}

/** A password for one .p12. Made per download, so none is ever stored. */
const p12Password = () => randomBytes(16).toString('hex');

/**
 * Make a new identity at Apple and keep it. The App ID and its capabilities
 * are brought in line first, because a profile only carries the entitlements
 * its App ID has. A certificate whose profile then fails is revoked again —
 * Apple allows a team very few, and an orphan would hold one.
 */
export async function generateIosSigning(by: string) {
  const { creds, bundleId } = await requireAscConfig();
  let token: string;
  try {
    token = ascToken(creds);
  } catch {
    throw badInput('The App Store Connect key cannot sign. Paste the whole .p8 file, BEGIN and END lines included.');
  }
  try {
    const bundleIdId = await ensureBundleId(token, bundleId);
    await ensureCapabilities(token, bundleIdId);
    const request = await newSigningRequest(`${bundleId} distribution`);
    const cert = await createDistributionCertificate(token, request.csrPem);
    // Profile names must be unique on the team, and take letters, digits and spaces.
    const profileName = `${bundleId.replaceAll('.', ' ')} App Store ${Date.now()}`;
    const profile = await createAppStoreProfile(token, bundleIdId, cert.id, profileName).catch(async (err) => {
      await revokeCertificate(token, cert.id).catch((revokeErr) =>
        logs.server.error('appBuild', 'iosSigningRevoke', { error: revokeErr, certificate_id: cert.id })
      );
      throw err;
    });
    const doc = await IosSigningModel.create({
      bundle_id: bundleId,
      team_id: certificateTeamId(cert.contentBase64),
      certificate_id: cert.id,
      certificate_serial: cert.serialNumber,
      certificate_base64: cert.contentBase64,
      private_key_pem: request.privateKeyPem,
      profile_id: profile.id,
      profile_uuid: profile.uuid,
      profile_name: profile.name,
      profile_base64: profile.contentBase64,
      expires_at: cert.expiresAt ? new Date(cert.expiresAt) : null,
      created_by: by,
    });
    logs.server.warn('appBuild', 'iosSigningGenerated', {
      by,
      bundle_id: bundleId,
      certificate_serial: cert.serialNumber,
      profile_uuid: profile.uuid,
    });
    return pubSigning(doc);
  } catch (err) {
    throw badInput(err instanceof Error ? err.message : String(err));
  }
}

/** The identity that was newest when this build ran. Null on Android and on builds from before. */
export async function iosSigningForBuild(buildId: string) {
  const build = await AppBuildModel.findById(buildId, { platform: 1, created_at: 1 }).lean();
  if (build?.platform !== 'IOS') return null;
  const doc = await IosSigningModel.findOne({ created_at: { $lte: build.created_at } }).sort({ created_at: -1 });
  return doc ? pubSigning(doc) : null;
}

/**
 * One signing file, for a download from a build's details. The .p12 and the
 * .p8 carry private keys, so every download is logged with who asked.
 */
export async function iosSigningFile(id: string, kind: IosSigningFileKind, by: string) {
  const doc = await IosSigningModel.findById(id).select('+private_key_pem');
  if (!doc) throw badInput('Those signing files no longer exist.');
  logs.server.warn('appBuild', 'iosSigningDownload', { by, kind, certificate_serial: doc.certificate_serial });
  const base = doc.bundle_id;
  switch (kind) {
    case 'CERTIFICATE':
      return { file_name: `${base}-distribution.cer`, content_base64: doc.certificate_base64, password: '' };
    case 'PROFILE':
      return { file_name: `${base}-app-store.mobileprovision`, content_base64: doc.profile_base64, password: '' };
    case 'P12': {
      const password = p12Password();
      const content = buildP12(doc.private_key_pem, doc.certificate_base64, password);
      return { file_name: `${base}-distribution.p12`, content_base64: content, password };
    }
    case 'API_KEY': {
      const { creds } = await requireAscConfig();
      const pem = applePrivateKeyPem(creds.privateKey);
      return {
        file_name: `AuthKey_${creds.keyId}.p8`,
        content_base64: Buffer.from(pem).toString('base64'),
        password: '',
      };
    }
  }
}

/**
 * Everything the ios-build workflow signs and uploads with, in one answer:
 * the newest identity as a .p12 and a profile, and the API key altool uploads
 * with. Refuses an identity made for another bundle ID or already expired,
 * because either would fail an hour into the build instead of here.
 */
export async function iosSigningBundle(by: string) {
  const { creds, bundleId } = await requireAscConfig();
  const doc = await newest().select('+private_key_pem');
  if (!doc) throw noSigning();
  if (doc.bundle_id !== bundleId) {
    throw badInput(
      `The newest signing files are for ${doc.bundle_id}, but App Store Connect is set to ${bundleId}. Generate new ones.`
    );
  }
  if (doc.expires_at && doc.expires_at.getTime() <= Date.now()) {
    throw badInput('The iOS signing certificate has expired. Generate new signing files.');
  }
  const password = p12Password();
  logs.server.warn('appBuild', 'iosSigningBundle', { by, certificate_serial: doc.certificate_serial });
  return {
    team_id: doc.team_id,
    bundle_id: doc.bundle_id,
    profile_uuid: doc.profile_uuid,
    profile_name: doc.profile_name,
    profile_base64: doc.profile_base64,
    p12_base64: buildP12(doc.private_key_pem, doc.certificate_base64, password),
    p12_password: password,
    asc_key_id: creds.keyId,
    asc_issuer_id: creds.issuerId,
    asc_private_key: applePrivateKeyPem(creds.privateKey),
  };
}

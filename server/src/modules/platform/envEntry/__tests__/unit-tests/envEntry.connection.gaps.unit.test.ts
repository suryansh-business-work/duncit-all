/**
 * The vendor checks' failure sentences and the Cloudflare check, which the main
 * connection suite does not reach. Every gateway is mocked; what is asserted is
 * what an operator reads when something is thrown that is not an Error.
 */
jest.mock('@modules/platform/cloudflare/cloudflare.gateway', () => ({
  ...jest.requireActual('@modules/platform/cloudflare/cloudflare.gateway'),
  cloudflareVerifyToken: jest.fn(),
  cloudflareZone: jest.fn(),
  cloudflareRecords: jest.fn(),
}));
jest.mock('@modules/platform/dns/godaddy.gateway', () => ({
  ...jest.requireActual('@modules/platform/dns/godaddy.gateway'),
  godaddyDomain: jest.fn(),
  godaddyRecords: jest.fn(),
}));
jest.mock('@modules/platform/appBuild/appStoreConnect.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/appStoreConnect.gateway'),
  ascToken: jest.fn(),
  findApp: jest.fn(),
  assertCertificateAccess: jest.fn(),
}));
jest.mock('@modules/platform/msg91/msg91.gateway', () => ({
  ...jest.requireActual('@modules/platform/msg91/msg91.gateway'),
  msg91WidgetAnalytics: jest.fn(),
}));
jest.mock('@modules/ai/reel/reel.drive', () => ({ probeDriveAccount: jest.fn() }));
jest.mock('@utils/sonarqube', () => ({ ...jest.requireActual('@utils/sonarqube'), sonarGet: jest.fn() }));
jest.mock('@modules/platform/appBuild/googlePlay.gateway', () => ({
  ...jest.requireActual('@modules/platform/appBuild/googlePlay.gateway'),
  playAccessToken: jest.fn(),
  openEdit: jest.fn(),
  discardEdit: jest.fn(),
}));

import {
  aisensyConnection,
  appStoreConnectConnection,
  cloudflareConnection,
  godaddyConnection,
  googleDriveConnection,
  googlePlayConnection,
  msg91Connection,
  sonarqubeConnection,
} from '../../envEntry.connection';
import { cloudflareRecords, cloudflareVerifyToken, cloudflareZone } from '@modules/platform/cloudflare/cloudflare.gateway';
import { godaddyDomain, godaddyRecords } from '@modules/platform/dns/godaddy.gateway';
import { assertCertificateAccess, ascToken, findApp } from '@modules/platform/appBuild/appStoreConnect.gateway';
import { msg91WidgetAnalytics } from '@modules/platform/msg91/msg91.gateway';
import { sonarGet } from '@utils/sonarqube';
import { probeDriveAccount } from '@modules/ai/reel/reel.drive';
import { playAccessToken } from '@modules/platform/appBuild/googlePlay.gateway';

const reader = (values: Record<string, string>) => (key: string) => values[key] ?? '';

describe('cloudflareConnection', () => {
  const config = reader({ api_token: 'tok', account_id: 'acc', domain: 'duncit.com' });

  it('needs the token, account id and domain', async () => {
    await expect(cloudflareConnection(reader({ api_token: 'tok' }))).resolves.toEqual({
      ok: false, message: 'API token, account ID and domain are all required', details: [],
    });
  });

  it('counts the zone’s records and lists the nameservers Cloudflare assigned', async () => {
    (cloudflareVerifyToken as jest.Mock).mockResolvedValue('active');
    (cloudflareZone as jest.Mock).mockResolvedValue({ id: 'z1', status: 'active', name_servers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'] });
    (cloudflareRecords as jest.Mock).mockResolvedValue([{}, {}, {}]);
    await expect(cloudflareConnection(config)).resolves.toEqual({
      ok: true,
      message: 'Connected to duncit.com (active)',
      details: ['3 DNS records in the zone.', 'Assigned nameservers: a.ns.cloudflare.com, b.ns.cloudflare.com.'],
    });
  });

  it('does not list nameservers when Cloudflare has assigned none yet', async () => {
    (cloudflareVerifyToken as jest.Mock).mockResolvedValue('active');
    (cloudflareZone as jest.Mock).mockResolvedValue({ id: 'z1', status: 'pending', name_servers: [] });
    (cloudflareRecords as jest.Mock).mockResolvedValue([]);
    await expect(cloudflareConnection(config)).resolves.toMatchObject({ ok: true, details: ['0 DNS records in the zone.'] });
    (cloudflareZone as jest.Mock).mockResolvedValue({ id: 'z1', status: 'pending' });
    await expect(cloudflareConnection(config)).resolves.toMatchObject({ details: ['0 DNS records in the zone.'] });
  });

  it('treats a zone that is not added yet as a working connection, pointing at the button that adds it', async () => {
    (cloudflareVerifyToken as jest.Mock).mockResolvedValue('active');
    (cloudflareZone as jest.Mock).mockResolvedValue(null);
    await expect(cloudflareConnection(config)).resolves.toEqual({
      ok: true,
      message: 'Token active; duncit.com is not on Cloudflare yet',
      details: ['Add the zone from Tech → Security → Cloudflare.'],
    });
  });

  it('reports what went wrong, whether an Error or any other value was thrown', async () => {
    (cloudflareVerifyToken as jest.Mock).mockRejectedValueOnce(new Error('Cloudflare refused the API token.'));
    await expect(cloudflareConnection(config)).resolves.toEqual({ ok: false, message: 'Cloudflare refused the API token.', details: [] });
    (cloudflareVerifyToken as jest.Mock).mockRejectedValueOnce('boom');
    await expect(cloudflareConnection(config)).resolves.toEqual({ ok: false, message: 'boom', details: [] });
  });
});

describe('failure sentences', () => {
  it('GoDaddy: a rejected value is shown as text, and a zone with no nameservers lists none', async () => {
    const cfg = reader({ api_key: 'k', api_secret: 's', domain: 'duncit.com' });
    (godaddyDomain as jest.Mock).mockRejectedValue('godaddy exploded');
    await expect(godaddyConnection(cfg)).resolves.toEqual({ ok: false, message: 'godaddy exploded', details: [] });
    (godaddyDomain as jest.Mock).mockResolvedValue({ status: 'ACTIVE' });
    (godaddyRecords as jest.Mock).mockResolvedValue([]);
    await expect(godaddyConnection(cfg)).resolves.toMatchObject({ ok: true, details: ['0 DNS records in the zone.'] });
  });

  it('GoDaddy: no registrar status is passed over without failing', async () => {
    const cfg = reader({ api_key: 'k', api_secret: 's', domain: 'duncit.com' });
    (godaddyDomain as jest.Mock).mockResolvedValue({ status: 'ACTIVE', nameServers: ['ns01.domaincontrol.com'] });
    (godaddyRecords as jest.Mock).mockResolvedValue([{}]);
    const out = await godaddyConnection(cfg);
    expect(out.details).toEqual(['1 DNS records in the zone.', 'Nameservers: ns01.domaincontrol.com.']);
  });

  it('Play: a service-account key that cannot be parsed is read out as text', async () => {
    const out = await googlePlayConnection(reader({ service_account_json: 'not json', package_name: 'com.duncit.app' }));
    expect(out.ok).toBe(false);
    expect(typeof out.message).toBe('string');
    expect(out.message.length).toBeGreaterThan(0);
    (playAccessToken as jest.Mock).mockRejectedValue('token boom');
  });

  it('MSG91: a rejected analytics call is shown as text', async () => {
    (msg91WidgetAnalytics as jest.Mock).mockRejectedValue('msg91 down');
    await expect(msg91Connection(reader({ widget_id: 'w', auth_key: 'k' }))).resolves.toEqual({ ok: false, message: 'msg91 down', details: [] });
  });

  it('SonarQube: a rejected call is shown as text', async () => {
    (sonarGet as jest.Mock).mockRejectedValue('sonar down');
    const out = await sonarqubeConnection(reader({ host_url: 'https://sonar.test', token: 't', project_key: 'p' }));
    expect(out).toEqual({ ok: false, message: 'sonar down', details: [] });
  });

  it('App Store Connect: a failed app lookup and a key that cannot manage certificates are read out as text', async () => {
    const cfg = reader({ issuer_id: 'i', key_id: 'k', private_key: 'pk', bundle_id: 'com.duncit.app' });
    (ascToken as jest.Mock).mockReturnValue('jwt');
    (findApp as jest.Mock).mockRejectedValueOnce('lookup failed');
    await expect(appStoreConnectConnection(cfg)).resolves.toMatchObject({ ok: false, message: 'lookup failed' });
    (findApp as jest.Mock).mockResolvedValue({ name: 'Duncit' });
    (assertCertificateAccess as jest.Mock).mockRejectedValue('no certs');
    const out = await appStoreConnectConnection(cfg);
    expect(out).toMatchObject({ ok: false, message: 'This key cannot manage certificates' });
    expect(out.details[1]).toBe('no certs');
  });
});

describe('googleDriveConnection', () => {
  it('needs the service account key', async () => {
    await expect(googleDriveConnection(reader({}))).resolves.toEqual({ ok: false, message: 'The service account key is required', details: [] });
  });

  it('names the account Drive signed in as, and how to share a folder with it', async () => {
    (probeDriveAccount as jest.Mock).mockResolvedValue('reel@proj.iam.gserviceaccount.com');
    const out = await googleDriveConnection(reader({ service_account_json: '{}' }));
    expect(out).toMatchObject({ ok: true, message: 'Connected to Google Drive as reel@proj.iam.gserviceaccount.com' });
    expect(out.details[0]).toContain('Share each footage folder with reel@proj.iam.gserviceaccount.com');
  });

  it('says why it failed, and what to enable when Google answers 403', async () => {
    (probeDriveAccount as jest.Mock).mockRejectedValueOnce(new Error('HTTP 403'));
    await expect(googleDriveConnection(reader({ service_account_json: '{}' }))).resolves.toMatchObject({ ok: false, message: 'HTTP 403' });
    (probeDriveAccount as jest.Mock).mockRejectedValueOnce('plain');
    const out = await googleDriveConnection(reader({ service_account_json: '{}' }));
    expect(out).toMatchObject({ ok: false, message: 'plain' });
    expect(out.details[0]).toContain('enable the Google Drive API');
  });
});

describe('aisensyConnection without a destination', () => {
  it('does not need one: a missing or blank destination just checks the key is set', async () => {
    const cfg = reader({ api_key: `${Buffer.from('{"exp":9999999999}').toString('base64')}`, campaign_name: 'c' });
    const missing = await aisensyConnection(cfg);
    const blank = await aisensyConnection(cfg, '  ');
    const none = await aisensyConnection(cfg, undefined);
    expect(missing).toEqual(blank);
    expect(none).toEqual(blank);
  });
});

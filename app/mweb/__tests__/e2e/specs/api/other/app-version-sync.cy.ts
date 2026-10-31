/// <reference types="cypress" />
import { signInRunMember } from '../../../support/access-steps';

/**
 * Server: App version sync and force update — the public half of it.
 *
 * On every boot settingsService.applyEnvVersion copies APP_VERSION (the
 * deploy's app.json expo.version) into branding.app_latest_version, and the
 * public `appVersionInfo` query is what the native force-update gate reads
 * (settings.service.ts getAppVersionInfo). Scenario map: Server › App version
 * sync and force update — "Version upserted on boot" (query appVersionInfo
 * without auth: the latest version with the branding store URLs).
 *
 * Booting with a chosen APP_VERSION, or opening a native build against it, is
 * not something a suite can do to a shared server; what it can prove is that
 * the answer anyone gets signed out is a real version read straight off the
 * branding singleton, with the store links the gate sends people to.
 */

interface VersionInfo {
  latest_version: string;
  min_supported_version: string;
  android_store_url: string;
  ios_store_url: string;
}

interface BrandingVersion {
  app_latest_version: string;
  app_min_supported_version: string;
  android_app_url: string;
  ios_app_url: string;
}

const VERSION_INFO = `query E2eAppVersionInfo {
  appVersionInfo { latest_version min_supported_version android_store_url ios_store_url }
}`;
const BRANDING = `query E2eBrandingVersion {
  branding { app_latest_version app_min_supported_version android_app_url ios_app_url }
}`;

/** A store version as app.json carries it: major.minor.patch. */
const SEMVER = /^\d+\.\d+\.\d+$/;
/** The Play listing the server falls back to when Branding names none (settings.service.ts). */
const PLAY_LISTING = 'https://play.google.com/store/apps/details?id=';

describe('API · appVersionInfo is the branding version, public', { testIsolation: false }, () => {
  let signedOut: VersionInfo;

  before(() => {
    cy.gql<{ appVersionInfo: VersionInfo }>(VERSION_INFO, {}, { token: null }).then((data) => {
      signedOut = data.appVersionInfo;
    });
  });

  it('AV-01 a signed-out caller gets a real latest version and an https Play Store link', () => {
    expect(signedOut.latest_version, 'latest_version (synced from APP_VERSION on boot)').to.match(SEMVER);
    expect(signedOut.android_store_url, 'android_store_url').to.match(/^https:\/\//);
    if (signedOut.ios_store_url) expect(signedOut.ios_store_url, 'ios_store_url').to.match(/^https:\/\//);
  });

  it('AV-02 the minimum supported version is blank (nobody blocked) or a version the gate can compare', () => {
    // Never defaulted to latest_version: that moves on every deploy and would lock every older build out.
    if (signedOut.min_supported_version === '') return;
    expect(signedOut.min_supported_version, 'min_supported_version').to.match(/^\d+(\.\d+){0,2}$/);
  });

  it('AV-03 every field is read straight off the branding singleton', () => {
    cy.gql<{ branding: BrandingVersion }>(BRANDING, {}, { token: null }).then(({ branding }) => {
      expect(signedOut.latest_version).to.equal(branding.app_latest_version);
      expect(signedOut.min_supported_version).to.equal(branding.app_min_supported_version);
      expect(signedOut.ios_store_url).to.equal(branding.ios_app_url);
      if (branding.android_app_url) {
        expect(signedOut.android_store_url).to.equal(branding.android_app_url);
      } else {
        const url = signedOut.android_store_url;
        expect(url.startsWith(PLAY_LISTING), `${url} is the built-in Play listing`).to.equal(true);
        expect(url.length, 'the listing names a package').to.be.greaterThan(PLAY_LISTING.length);
      }
    });
  });

  it('AV-04 a signed-in member is told exactly the same thing', () => {
    signInRunMember().then((token) => {
      cy.gql<{ appVersionInfo: VersionInfo }>(VERSION_INFO, {}, { token }).then((data) => {
        expect(data.appVersionInfo).to.deep.equal(signedOut);
      });
    });
  });
});

import { ACCESS_DENIED, countOperation, expectNotSent } from '../../support/ui-staff';
import {
  cityAdminSeat,
  fieldInput,
  releaseAdminRoles,
  signInAdmin,
  typeInto,
  type AdminSeat,
} from '../../support/ui-admin-2';

/**
 * Admin › Upload Settings (/upload-settings/portals | mobile | mweb), as a City
 * Admin. Every admin role reads these (uploadSetting.resolver.ts ADMIN_READ);
 * only SUPER_ADMIN and TECH_MANAGER write them (ADMIN_WRITE). They govern every
 * upload on staging, so nothing is changed: the spec reads each surface,
 * proves the page's own validation, and proves a City Admin's save is refused
 * — sending the values already stored, so even a wrong gate would change
 * nothing.
 */

interface SurfaceSettings {
  surface: string;
  max_image_mb: number;
  max_video_mb: number;
  ai_image_monitoring_enabled: boolean;
}

const SETTINGS = `query E2eUploadSettings($surface: UploadSurface!) {
  uploadSettings(surface: $surface) { surface max_image_mb max_video_mb ai_image_monitoring_enabled }
}`;

const SURFACES = [
  { path: '/upload-settings/portals', surface: 'PORTALS', title: 'Portals Upload Setting' },
  { path: '/upload-settings/mobile', surface: 'MOBILE', title: 'Mobile App Upload Setting' },
  { path: '/upload-settings/mweb', surface: 'MWEB', title: 'mWeb Upload Setting' },
] as const;

const NOT_WHOLE = 'Enter a whole number of 1 or more.';

const stored = (surface: string) =>
  cy.gql<{ uploadSettings: SurfaceSettings }>(SETTINGS, { surface }).its('uploadSettings');

function openSurface(path: string): void {
  cy.interceptOperation('UploadSettings');
  cy.visitPortal('admin', path);
  cy.wait('@UploadSettings');
}

describe('Admin · Upload Settings (City Admin, run account)', () => {
  let seat: AdminSeat;

  before(() => {
    cityAdminSeat().then((s) => {
      seat = s;
    });
  });

  beforeEach(() => {
    if (seat) signInAdmin(seat.account);
  });

  after(() => {
    releaseAdminRoles(seat?.account);
  });

  it('UPL-01 each surface opens under its own heading with its own stored sizes', () => {
    for (const { path, surface, title } of SURFACES) {
      stored(surface).then((s: SurfaceSettings) => {
        openSurface(path);
        cy.byTestId('upload-settings-title').should('have.text', title);
        fieldInput('upload-settings-max-image').should('have.value', String(s.max_image_mb));
        fieldInput('upload-settings-max-video').should('have.value', String(s.max_video_mb));
      });
    }
  });

  it('UPL-02 a size that is not a whole number of 1 or more keeps "Save sizes & formats" off', () => {
    openSurface('/upload-settings/portals');
    const saves = countOperation('UpdateUploadSettings');
    for (const bad of ['0', '2.5', 'abc']) {
      typeInto('upload-settings-max-image', bad);
      cy.byTestId('upload-settings-max-image').should('contain.text', NOT_WHOLE);
      cy.byTestId('upload-settings-save-sizes').should('be.disabled');
    }
    typeInto('upload-settings-max-image', '15');
    typeInto('upload-settings-max-video', '0');
    cy.byTestId('upload-settings-max-video').should('contain.text', NOT_WHOLE);
    cy.byTestId('upload-settings-save-sizes').should('be.disabled');
    expectNotSent(saves, 'UpdateUploadSettings');
  });

  it('UPL-03 saving sizes & formats is refused to a City Admin, and the stored values stay', () => {
    stored('MWEB').then((before: SurfaceSettings) => {
      openSurface('/upload-settings/mweb');
      cy.interceptOperation('UpdateUploadSettings');
      cy.byTestId('upload-settings-save-sizes').should('be.enabled').click();
      cy.wait('@UpdateUploadSettings').its('response.body.errors.0.message').should('eq', ACCESS_DENIED);
      cy.byTestId('upload-settings-error').should('have.text', ACCESS_DENIED);
      stored('MWEB').should('deep.eq', before);
    });
  });

  it('UPL-04 the AI monitoring switch saves on toggle: refused, it keeps its saved state', () => {
    stored('PORTALS').then((before: SurfaceSettings) => {
      openSurface('/upload-settings/portals');
      cy.byTestId('upload-settings-ai').find('[aria-expanded]').first().click();
      cy.interceptOperation('UpdateUploadSettings');
      cy.byTestId('upload-settings-ai-switch').click();
      cy.wait('@UpdateUploadSettings').its('response.body.errors.0.message').should('eq', ACCESS_DENIED);
      cy.byTestId('upload-settings-error').should('have.text', ACCESS_DENIED);
      cy.byTestId('upload-settings-ai-switch').should(before.ai_image_monitoring_enabled ? 'be.checked' : 'not.be.checked');
      stored('PORTALS').its('ai_image_monitoring_enabled').should('eq', before.ai_image_monitoring_enabled);
    });
  });
});

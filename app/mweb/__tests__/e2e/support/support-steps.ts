/// <reference types="cypress" />
import { sendCode } from './account-steps';
import { openFromMenu } from './menu-steps';

/**
 * Help & Support, as a member walks it: the menu's Help & Support tile opens
 * the hub (`support-hub-page`), and each "More ways to reach us" tile
 * (`support-more-<key>`) opens one journey. Files a scenario attaches come from
 * the fixtures under a name that carries the run stamp.
 */

/** The hub's tiles and the page each one opens. */
const SUPPORT_TILES = {
  sos: '/support/sos',
  callback: '/support/callback',
  tickets: '/support/tickets',
  all: '/support/all',
  grievance: '/support/grievance',
  feedback: '/support/feedback',
} as const;

export type SupportTile = keyof typeof SUPPORT_TILES;

/** Where the SOS says the member is: a fixed point, so the browser never has to ask. */
const SOS_POSITION = { latitude: 12.9716, longitude: 77.5946, accuracy: 25 };

export function openSupportHub(): void {
  openFromMenu('sidebar-grid-support', '/support');
  cy.byTestId('support-hub-page').should('be.visible');
}

export function openSupportTile(tile: SupportTile): void {
  openSupportHub();
  cy.byTestId(`support-more-${tile}`).click();
  cy.location('pathname').should('eq', SUPPORT_TILES[tile]);
}

/** The fixture photo, aliased `@photo` for `runPhoto`. */
export const loadPhoto = () => cy.fixture('avatar.jpg', null).as('photo');

/** `@photo` under a name carrying the run stamp: `e2e-140920260300-screenshot.jpg`. */
export const runPhoto = (stamp: string, what: string): Cypress.FileReferenceObject => ({
  contents: '@photo',
  fileName: `e2e-${stamp}-${what}.jpg`,
});

/**
 * Add one screenshot through the shared media picker's device tab: choose the
 * file, then "Use this" uploads it and hands it back to the field as a thumbnail.
 */
export function attachThroughPicker(file: Cypress.FileReferenceObject): void {
  cy.byTestId('media-upload-add').click();
  cy.byTestId('media-device-dropzone').should('be.visible');
  cy.byTestId('media-device-file-input').selectFile(file, { force: true });
  sendCode('UploadImageToImagekit', () => {
    cy.byTestId('media-picker-done').should('be.enabled').click();
  });
  cy.byTestId('media-picker-done').should('not.exist');
  cy.byTestIdPrefix('media-thumb-').should('have.length', 1);
}

/**
 * Answer the page's location request with `SOS_POSITION`. Installed on the
 * loaded page, just before the SOS is sent — the only read of the location.
 */
export function stubSosLocation(): void {
  cy.window({ log: false }).then((win) => {
    const position = { coords: SOS_POSITION, timestamp: Date.now() } as GeolocationPosition;
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((success: PositionCallback) => {
      success(position);
    });
  });
}

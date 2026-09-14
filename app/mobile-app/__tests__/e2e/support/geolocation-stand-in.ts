/**
 * The browser's location, stood in for on the native web export.
 *
 * An SOS carries the sender's position (src/hooks/useBouncer.ts), read through
 * expo-location. On web that asks `navigator.permissions` and then
 * `navigator.geolocation.getCurrentPosition` with no timeout — and an automated
 * browser never answers the permission prompt, so SEND SOS would wait forever.
 * This grants the permission and answers with a fixed position, so the real
 * SOS (location included) reaches the server.
 */

/** A point in Bengaluru — any real coordinate will do; the server only stores it. */
export const STAND_IN_LOCATION = { lat: 12.9716, lng: 77.5946 };

/** An `onBeforeLoad` for `cy.visitApp`: location permission granted, position answered at once. */
export function geolocationStandIn(win: Cypress.AUTWindow): void {
  const permissions = win.navigator.permissions;
  const query = permissions.query.bind(permissions);
  cy.stub(permissions, 'query').callsFake((descriptor: PermissionDescriptor) => {
    if (descriptor.name === 'geolocation') return Promise.resolve({ state: 'granted' });
    return query(descriptor);
  });
  cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(
    (success: PositionCallback) => {
      const coords = {
        latitude: STAND_IN_LOCATION.lat,
        longitude: STAND_IN_LOCATION.lng,
        accuracy: 25,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      };
      success({ coords, timestamp: Date.now() } as unknown as GeolocationPosition);
    },
  );
}

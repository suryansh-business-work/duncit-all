import {
  flattenCatalogue,
  FULFILMENT_BUNDLE,
  MWEB_BUNDLE,
  PACKAGING_BUNDLE,
  PARTNERS_BUNDLE,
  useTranslation as useSharedTranslation,
} from '@duncit/app-settings';

/**
 * The studio Options copy is the one catalogue mWeb, native and this console
 * all render (`mweb.studioOptions.*`, keyed by @duncit/utils studio-options),
 * plus the venue words the Venue Earnings page and venue picker share with mWeb. Only
 * those slices are layered in — not the rest of the mWeb namespace.
 */
const SHARED_MWEB_PREFIXES = [
  'mweb.studioOptions.',
  'mweb.venueEarnings.',
  'mweb.common.podsCompleted',
  'mweb.venueManagePage.untitledVenue',
  // The shared ship-to rules (@duncit/forms makeAddressSchema) the Orders desk's address fix reuses.
  'mweb.address.validation.',
  // Warehouse ShipRocket states (@duncit/utils pickupShiprocketState) — one wording in all three.
  'mweb.brandWarehouses.state',
];

const sharedMwebCopy = Object.fromEntries(
  Object.entries(flattenCatalogue(MWEB_BUNDLE)).filter(([key]) =>
    SHARED_MWEB_PREFIXES.some((prefix) => key.startsWith(prefix)),
  ),
);

/**
 * The portal's own bundled copy, flattened once: `main.tsx` mounts it as the
 * LocaleProvider's fallback, and `useTranslation` below hands it to the shared
 * hook so a component rendered OUTSIDE that provider — a test, an error
 * boundary — still shows real words instead of raw keys.
 *
 * This is the thin per-surface wrapper @duncit/app-settings' own doc comment
 * asks for, rather than repeating the argument at every call site.
 *
 * The shared "Shipping & packaging" section of the listing form ships its own
 * `packaging.*` copy, layered in here.
 */
export const PARTNERS_FALLBACK = {
  ...flattenCatalogue(PARTNERS_BUNDLE),
  ...flattenCatalogue(PACKAGING_BUNDLE),
  // Order status / method words (@duncit/utils statusLabel) — shared with mWeb and the Products portal.
  ...flattenCatalogue(FULFILMENT_BUNDLE),
  ...sharedMwebCopy,
};

export const useTranslation = () => useSharedTranslation(PARTNERS_FALLBACK);

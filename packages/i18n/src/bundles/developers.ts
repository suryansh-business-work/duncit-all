import type { NestedCatalogue } from '../catalogue';

/**
 * The Developers Portal's own copy.
 *
 * The API reference is documentation rather than chrome, so it lives here too:
 * an integrator reading the endpoint list is a user like any other, and the
 * descriptions are prose somebody will want translated. What stays OUT is
 * anything an API client sends or receives — endpoint paths, scopes, header
 * names, JSON samples — because translating those would break the very
 * requests the page is teaching people to make.
 *
 * Endpoint copy is addressed by the LITERAL key strings held in
 * `apiReference.ts` (`titleKey`, `descriptionKey`). Composing a key from an id
 * would read fine and still break the build gate, which greps for literal
 * `t('…')`/`'key'` occurrences and would report every one of these as shipped
 * copy nothing renders.
 */
export const DEVELOPERS_BUNDLE: NestedCatalogue = {
  developers: {
    dashboard: {
      title: 'Developers',
      subtitle: 'Build on Duncit — venue APIs for slots, availability and bookings.',
      apiKeysTitle: 'API Keys',
      apiKeysText: 'Generate and revoke the keys your integrations authenticate with.',
      apiReferenceTitle: 'API Reference',
      apiReferenceText:
        'Venue discovery, slot availability and slot booking endpoints — with a live Try-It console.',
    },

    apiKeys: {
      title: 'API Keys',
      subtitle: 'Authenticate /api/v1 requests with the x-api-key header.',
      create: 'Create key',
      revoke: 'Revoke',
      statusActive: 'Active',
      statusRevoked: 'Revoked',
      empty: 'No API keys yet — create one to start calling the venue APIs.',
      search: 'Search name or key prefix',
      colName: 'Name',
      colKey: 'Key',
      colScopes: 'Scopes',
      colCreated: 'Created',
      colLastUsed: 'Last used',
      colStatus: 'Status',
      colRevokedAt: 'Revoked at',
    },

    createKey: {
      titleNew: 'Create API key',
      titleCreated: 'API key created',
      warning: 'Copy this key now — it is shown only once and cannot be recovered.',
      copyAria: 'Copy API key',
      copied: 'Copied to clipboard',
      nameLabel: 'Key name',
      namePlaceholder: 'e.g. Staging integration',
      cancel: 'Cancel',
      done: 'Done',
      submit: 'Create key',
      submitting: 'Creating…',
    },

    apiDocs: {
      title: 'API Reference',
      // {base} and {header} are the live API host and the auth header name —
      // substituted rather than written in, so a locale cannot fork the values
      // an integrator is meant to copy.
      subtitle:
        'Venue APIs, versioned under {base}. Authenticate every request with the {header} header.',
      keyLabel: 'Your API key (used by Try-It, never stored)',
      keyPlaceholder: 'dk_live_…',
      sampleResponse: 'SAMPLE RESPONSE',
      tryIt: 'TRY IT',
    },

    tryIt: {
      send: 'Send request',
      sending: 'Running…',
      needKey: 'Paste an API key above to send live requests.',
      failed: 'Request failed',
      status: 'HTTP {status}',
    },

    api: {
      // One entry per parameter MEANING, not per occurrence: `venueId` is the
      // same sentence on four endpoints, and four copies is four things to
      // translate and three chances to drift (rule 40).
      param: {
        venueId: 'Venue id.',
        venueIdFromList: 'Venue id from List venues.',
        from: 'ISO start bound (inclusive).',
        to: 'ISO end bound (exclusive).',
        slotId: 'Slot id from Slot availability.',
        bookedSlotId: 'The booked slot id.',
        externalRef: 'Your booking reference (max 120 chars).',
      },
      listVenues: {
        title: 'List venues',
        description:
          'All approved, active venues with their public profile (no owner or financial data).',
      },
      getVenue: {
        title: 'Get a venue',
        description: 'One venue by id. 404 when the venue is not approved or does not exist.',
      },
      venueSlots: {
        title: 'Slot availability',
        description:
          'Available (bookable) future slots for a venue — holiday-filtered, capped at 500. Optionally bound with from/to ISO timestamps.',
      },
      bookSlot: {
        title: 'Book a slot',
        description:
          'Atomically books an AVAILABLE slot for your key. 409 slot_unavailable when it was already taken. Pass your own reference in external_ref.',
      },
      cancelBooking: {
        title: 'Cancel a booking',
        description:
          'Releases a slot your key booked (keys can only cancel their own bookings). 409 when the slot is not yours or not booked.',
      },
    },
  },
};

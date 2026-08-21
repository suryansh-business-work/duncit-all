import type { NestedCatalogue } from '../catalogue';

/**
 * The Partners portal's own namespace, layered over the shell's by `mountPortal`.
 *
 * Only the Verification page is keyed so far — the rest of the portal still
 * ships plain strings, so this bundle is deliberately the beginning of that
 * sweep rather than a half-finished map of the whole portal: a key nobody
 * renders fails the Shared Gates check, so keys arrive with the screens that
 * use them. The English copy is byte-identical to the mWeb / native
 * Verification strings (CLAUDE rule 27).
 */
export const PARTNERS_BUNDLE: NestedCatalogue = {
  partners: {
    earn: {
      title: 'Earn with Duncit',
      subtitle: 'Pick a way to start earning on Duncit.',
    },
    verification: {
      title: 'Verification',
      subtitle: 'Verify your identity, address and email',
      submitted: 'Submitted for review.',
      typeIdentity: 'Identity',
      typeAddress: 'Address',
      typeEmail: 'Email',
      statusNotSubmitted: 'Not Verified',
      statusPending: 'Under review',
      statusApproved: 'Verified',
      statusRejected: 'Rejected',
      statusVerifiedByApp: 'Verified by the App',
      upload: 'Upload document',
      reupload: 'Re-upload',
      uploading: 'Uploading…',
      tooLarge: 'Please upload a document under 4 MB.',
      docFailed: 'Could not submit the document.',
      line1: 'Address line 1',
      line2: 'Address line 2 (optional)',
      state: 'State',
      city: 'City',
      pincode: 'Pincode',
      country: 'Country (optional)',
      addressRequired: 'Address line, city, state and pincode are required.',
      addressFailed: 'Could not submit the address.',
      submitAddress: 'Submit address',
      submitting: 'Submitting…',
    },
    /**
     * The Status chip on every partner pods table AND the Club Admin pods
     * page's status filter read these — one set of words, so a pod can never
     * be filtered under one name and labelled with another. The English copy
     * matches the chips these keys replaced.
     */
    podStatus: {
      filterLabel: 'Status',
      all: 'All statuses',
      active: 'Active',
      draft: 'Draft',
      awaitingVenue: 'Awaiting venue',
      venueRejected: 'Venue rejected',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  },
};

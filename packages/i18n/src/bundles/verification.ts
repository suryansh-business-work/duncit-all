import type { NestedCatalogue } from '../catalogue';

/**
 * Account verification copy — a namespace of its own, not a surface's.
 *
 * @duncit/verification renders in the PARTNER console, in mWeb AND in the
 * native app, so this copy belongs to no single bundle. It used to live twice:
 * `partners.verification.*` in the catalogue, and English literals hard-coded
 * into mWeb's and the app's cards. The two halves had already drifted — mWeb's
 * upload button never reached a translator at all — which is exactly what rule
 * 38 exists to stop.
 *
 * `partners.verification.*` stays in the partners bundle until the seeded rows
 * for these keys exist; nothing reads it any more.
 */
export const VERIFICATION_BUNDLE: NestedCatalogue = {
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
    uploadPhoto: 'Upload photo',
    uploadPdf: 'Upload PDF',
    tooLarge: 'Please upload a document under 4 MB.',
    docFailed: 'Could not submit the document.',
    photoPermission: 'Photo access is needed to upload a document.',

    emailNote: 'Your email is verified when you sign in — no action needed here.',

    line1: 'Address line 1',
    line2: 'Address line 2 (optional)',
    state: 'State',
    city: 'City',
    pincode: 'Pincode',
    country: 'Country (optional)',

    line1Placeholder: 'House / street',
    line2Placeholder: 'Apartment, landmark',
    statePlaceholder: 'e.g. Maharashtra',
    cityPlaceholder: 'e.g. Mumbai',
    pincodePlaceholder: 'e.g. 400001',
    countryPlaceholder: 'e.g. India',

    line1Required: 'Enter your street address',
    cityRequired: 'Enter your city',
    stateRequired: 'Enter your state',
    pincodeRequired: 'Enter your pincode',

    addressRequired: 'Address line, city, state and pincode are required.',
    addressFailed: 'Could not submit the address.',
    submitAddress: 'Submit address',
    updateAddress: 'Update address',
    submitting: 'Submitting…',
  },
};

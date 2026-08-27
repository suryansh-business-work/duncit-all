import {
  ADDRESS_ROWS,
  addressValuesFrom,
  buildAddressInput,
  isAddressComplete,
  isDocumentTooLarge,
  isVerificationLocked,
  isVerificationSettled,
  makeAddressSchema,
  rejectReasonOf,
  STATUS_META,
  TONE_CHIP_COLOR,
  TONE_HEX,
  uploadLabelKey,
  type AddressValues,
  type Verification,
} from '@duncit/verification';
import { VerificationCards, fallbackT } from '@duncit/verification/mui';
import { defineDemo, defineDemos } from '../types';

interface RosterMock {
  /** Exactly what `myVerifications` answers with. */
  items: Verification[];
}

interface AddressMock {
  values: AddressValues;
}

interface DocumentMock {
  /** What a picker reported. Native gives base64 when it has no size. */
  size: number | null;
  base64: string;
}

export default defineDemos('verification', [
  defineDemo<RosterMock>({
    id: 'roster',
    title: 'The three verification rows, as a partner reads them',
    note: 'Change any status to PENDING or APPROVED and that row loses its control — that is `isVerificationLocked`, and it is why an admin never approves one document having looked at another. Put text in reject_reason on a row that is not REJECTED and it stays hidden.',
    mock: {
      items: [
        {
          type: 'IDENTITY',
          status: 'REJECTED',
          document_url: 'https://ik.imagekit.io/duncit/verifications/aadhaar-front.jpg',
          reject_reason: 'The date of birth is not readable — please re-upload a clearer scan.',
          address: null,
        },
        {
          type: 'ADDRESS',
          status: 'NOT_SUBMITTED',
          document_url: null,
          reject_reason: null,
          address: null,
        },
        {
          type: 'EMAIL',
          status: 'VERIFIED_BY_APP',
          document_url: null,
          reject_reason: null,
          address: null,
        },
      ],
    },
    render: (mock) => (
      <VerificationCards
        items={mock.items}
        onChanged={() => undefined}
        onError={() => undefined}
      />
    ),
    compute: (mock) => ({
      'Row state': mock.items.map((item) => ({
        type: item.type,
        chip: fallbackT(STATUS_META[item.status].labelKey),
        tone: STATUS_META[item.status].tone,
        mui: TONE_CHIP_COLOR[STATUS_META[item.status].tone],
        native: TONE_HEX[STATUS_META[item.status].tone],
        locked: isVerificationLocked(item.status),
        settled: isVerificationSettled(item.status),
        reason: rejectReasonOf(item),
      })),
      'Upload button reads': mock.items
        .filter((item) => item.type === 'IDENTITY')
        .map((item) => fallbackT(uploadLabelKey(item.status))),
      'Why locked and settled differ':
        'PENDING locks the control without being settled; REJECTED is neither. One rule read two ways is how the two copies of this screen drifted.',
    }),
  }),

  defineDemo<AddressMock>({
    id: 'address',
    title: 'What the address form accepts',
    note: 'Blank the pincode and both answers flip together — the on-submit check and the Zod schema read the same four required fields. Leave line2 and country empty and they are dropped from the input rather than sent as empty strings.',
    mock: {
      values: {
        line1: '  12 Turner Road  ',
        line2: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        country: '',
      },
    },
    compute: (mock) => {
      const parsed = makeAddressSchema(fallbackT).safeParse(mock.values);
      return {
        'Complete enough to submit': isAddressComplete(mock.values),
        'Schema verdict': parsed.success
          ? 'accepted'
          : parsed.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`),
        'Sent to submitAddressVerification': buildAddressInput(mock.values),
        'Form layout': ADDRESS_ROWS.map((row) =>
          row.map((field) => `${fallbackT(field.labelKey)}${field.required ? ' *' : ''}`),
        ),
        'Seeded from an empty account': addressValuesFrom({ address: null }),
      };
    },
  }),

  defineDemo<DocumentMock>({
    id: 'document',
    title: 'The 4 MB identity-document cap',
    note: 'Set size to null and the base64 payload is measured instead — that is the native path, where a document picker often reports no size. The server only stores the URL, so this cap is the only thing enforcing it.',
    mock: {
      size: 5_242_880,
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk',
    },
    compute: (mock) => ({
      'Too large': isDocumentTooLarge({ size: mock.size, base64: mock.base64 }),
      'Measured from': mock.size === null ? 'the base64 payload' : 'the size the picker reported',
      'Message shown': fallbackT('verification.tooLarge'),
      'Base64 fallback only': isDocumentTooLarge({ base64: mock.base64 }),
    }),
  }),
]);

import {
  hostToValues,
  valuesToHostCategories,
  valuesToHostStep3,
} from '@duncit/entity-consoles';
import { defineDemo } from '../types';

/**
 * The host editor's mapping demo.
 *
 * Beside the venue one rather than inside the console's spec demos, for the same
 * reason: the mock is a whole host record with a real HOST- id, real Aadhaar/PAN
 * shapes and the multi-category set an approved Host Request seeds.
 */

/** A stored host as `host(host_doc_id:)` answers it. */
type HostRecordMock = Parameters<typeof hostToValues>[0];

const HOST: HostRecordMock = {
  id: '66f2b3c4d5e6f708192a3b4c',
  host_no: 'HOST-000317',
  user_id: '66d1c2d3e4f5a6b7c8d9e0f1',
  full_name: 'Ananya Iyer',
  email: 'ananya.iyer@example.com',
  phone: '9820045612',
  dob: '1994-11-02',
  aadhar_number: '412345678901',
  pan_number: 'AFZPI1234K',
  passport_photo_url: 'https://ik.imagekit.io/duncit/hosts/host-317-photo.jpg',
  police_verification_url: 'https://ik.imagekit.io/duncit/host-documents/host-317-pv.pdf',
  full_address: 'B-702, Hiranandani Gardens, Powai, Mumbai 400076',
  bank_account: {
    payout_method: 'UPI',
    account_holder_name: 'Ananya Iyer',
    account_number: '',
    ifsc_code: '',
    upi_id: 'ananya@okhdfcbank',
  },
  tags: ['repeat-host', 'high-rating'],
  host_categories: [
    {
      super_category_id: '66a0000000000000000000a1',
      category_id: '66a0000000000000000000b2',
      sub_category_id: '66a0000000000000000000c3',
      super_category_name: 'Social',
      category_name: 'Board Games',
      sub_category_name: 'Catan Night',
      request_no: 'HOSTREQ-000912',
    },
    {
      super_category_id: '66a0000000000000000000a1',
      category_id: '66a0000000000000000000b7',
      sub_category_id: '',
      super_category_name: 'Social',
      category_name: 'Trivia',
      sub_category_name: '',
      request_no: '',
    },
  ],
  step_completed: 4,
  status: 'APPROVED',
  is_active: true,
  reviewer_notes: 'Police verification checked against the original.',
  host_commission_pct: 12,
  submitted_at: '2026-03-04T07:20:00.000Z',
  approved_at: '2026-03-06T10:05:00.000Z',
  rejected_at: null,
  created_at: '2026-03-03T18:40:00.000Z',
  updated_at: '2026-08-28T09:12:00.000Z',
};

const NOTE =
  'The second category row is deliberately incomplete — Trivia with no sub-category. ' +
  'Watch it disappear from what the save sends: the server rejects a partial triple ' +
  'outright, so a row somebody started and abandoned is dropped rather than failing ' +
  'the whole save. Fill in its sub_category_id and it joins the payload.';

export const hostEditorMappingDemo = defineDemo<HostRecordMock>({
  id: 'host-editor-mapping',
  title: 'A partial category is dropped, not saved',
  note: NOTE,
  mock: HOST,
  compute: (mock) => {
    const values = hostToValues(mock);
    const categories = valuesToHostCategories(values);
    const step3 = valuesToHostStep3(values);
    return {
      'Form shows (identity)': `${values.full_name} · ${values.email} · ${values.phone}`,
      'Form shows (category rows)': values.categories
        .map((row) => [row.super_name, row.category_name, row.sub_name].filter(Boolean).join(' › '))
        .join('\n'),
      'adminUpdateHost categories sends': `${categories.length} of ${values.categories.length} row(s)`,
      'Rows dropped as incomplete': values.categories
        .filter((row) => !row.super_id || !row.category_id || !row.sub_id)
        .map((row) => row.category_name || '(unnamed)')
        .join(', ') || 'none',
      'adminUpdateHost step3 sends': Object.keys(step3).join(', '),
      'setHostDeductions sends': `commission ${values.host_commission_pct}% — on the USER id ${values.user_id}, not the host record`,
      'setHostActive runs': 'only when the live switch actually moved (it notifies the host)',
    };
  },
});

import type { HostDetail } from '../queries';
import { blankHostValues, type HostFormValues } from './types';

/** The two directions between the stored host record and the form. */
export function hostToValues(host: HostDetail): HostFormValues {
  return {
    id: host.id,
    user_id: host.user_id,
    full_name: host.full_name ?? '',
    email: host.email ?? '',
    phone: host.phone ?? '',
    dob: host.dob ?? '',
    aadhar_number: host.aadhar_number ?? '',
    pan_number: host.pan_number ?? '',
    passport_photo_url: host.passport_photo_url ?? '',
    police_verification_url: host.police_verification_url ?? '',
    full_address: host.full_address ?? '',
    bank_account: {
      payout_method: host.bank_account?.payout_method ?? '',
      account_holder_name: host.bank_account?.account_holder_name ?? '',
      account_number: host.bank_account?.account_number ?? '',
      ifsc_code: host.bank_account?.ifsc_code ?? '',
      upi_id: host.bank_account?.upi_id ?? '',
    },
    tags: host.tags ?? [],
    categories: (host.host_categories ?? []).map((category) => ({
      super_id: category.super_category_id ?? '',
      super_name: category.super_category_name ?? '',
      category_id: category.category_id ?? '',
      category_name: category.category_name ?? '',
      sub_id: category.sub_category_id ?? '',
      sub_name: category.sub_category_name ?? '',
    })),
    status: host.status,
    is_active: host.is_active,
    host_commission_pct: host.host_commission_pct ?? blankHostValues.host_commission_pct,
  };
}

/** Step 1 — who they are. */
export const valuesToHostStep1 = (values: HostFormValues) => ({
  full_name: values.full_name,
  email: values.email,
  phone: values.phone,
  dob: values.dob || undefined,
});

/** Step 2 — their identity documents. */
export const valuesToHostStep2 = (values: HostFormValues) => ({
  aadhar_number: values.aadhar_number,
  pan_number: values.pan_number,
  passport_photo_url: values.passport_photo_url,
});

/** Step 3 — verification, address, payout and tags. */
export const valuesToHostStep3 = (values: HostFormValues) => ({
  police_verification_url: values.police_verification_url,
  full_address: values.full_address,
  bank_account: values.bank_account,
  tags: values.tags,
});

/**
 * The operating categories, as the server's triple.
 *
 * Rows with an incomplete triple are dropped rather than sent: the server
 * rejects a partial one outright, which would fail the whole save over a row
 * somebody started and abandoned.
 */
export const valuesToHostCategories = (values: HostFormValues) =>
  values.categories
    .filter((category) => category.super_id && category.category_id && category.sub_id)
    .map((category) => ({
      super_category_id: category.super_id,
      category_id: category.category_id,
      sub_category_id: category.sub_id,
    }));

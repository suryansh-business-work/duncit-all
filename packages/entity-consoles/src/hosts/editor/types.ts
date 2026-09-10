import type { HostStatus } from '../queries';
import { blankBankValues, type VenueBankValues } from '../../venues/editor/types';

/**
 * A host record, as one form.
 *
 * The payout block is the venue editor's `VenueBankValues` rather than a second
 * declaration of the same five fields: it is literally the same
 * `BankAccountVerification` subdocument on the server (rule 34).
 */
export interface HostCategoryRow {
  super_id: string;
  super_name: string;
  category_id: string;
  category_name: string;
  sub_id: string;
  sub_name: string;
}

export interface HostFormValues {
  /** Empty while creating; the host record's doc id while editing. */
  id: string;
  /** The ACCOUNT this host record belongs to. */
  user_id: string;

  full_name: string;
  email: string;
  phone: string;
  dob: string;

  aadhar_number: string;
  pan_number: string;
  passport_photo_url: string;
  police_verification_url: string;
  full_address: string;

  bank_account: VenueBankValues;
  tags: string[];
  categories: HostCategoryRow[];

  status: HostStatus;
  is_active: boolean;
  /** 0 inherits the platform default at settlement. */
  host_commission_pct: number;
}

export const blankHostCategory: HostCategoryRow = {
  super_id: '',
  super_name: '',
  category_id: '',
  category_name: '',
  sub_id: '',
  sub_name: '',
};

export const blankHostValues: HostFormValues = {
  id: '',
  user_id: '',
  full_name: '',
  email: '',
  phone: '',
  dob: '',
  aadhar_number: '',
  pan_number: '',
  passport_photo_url: '',
  police_verification_url: '',
  full_address: '',
  bank_account: blankBankValues,
  tags: [],
  categories: [],
  status: 'DRAFT',
  is_active: true,
  host_commission_pct: 0,
};

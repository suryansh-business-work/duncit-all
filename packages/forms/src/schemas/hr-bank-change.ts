import { z } from 'zod';
import { BANK_ACCOUNT_NUMBER, IFSC } from '@duncit/regex';
import { HR_BANK_CHANGE_LIMITS } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * An employee asking for their salary to go to another account (Employee
 * console). The account number is typed twice; the proof is a private upload.
 * Matches the server's `bankChangeSchema`
 * (server/src/modules/hr/bankRequest/bankRequest.service.ts), which re-checks
 * the request and that the proof is the employee's own upload.
 */
const L = HR_BANK_CHANGE_LIMITS;

export interface BankChangeValues {
  account_holder_name: string;
  account_number: string;
  account_number_confirm: string;
  ifsc: string;
  bank_name: string;
  proof_url: string;
  note: string;
}

/** The API's BankChangeRequestInput. */
export interface BankChangeOutput {
  account_holder_name: string;
  account_number: string;
  ifsc: string;
  bank_name: string | null;
  proof_url: string;
  note: string | null;
  client_request_id: string;
}

export const bankChangeDefaults: BankChangeValues = {
  account_holder_name: '',
  account_number: '',
  account_number_confirm: '',
  ifsc: '',
  bank_name: '',
  proof_url: '',
  note: '',
};

export function makeBankChangeSchema(t: Translate) {
  return z
    .object({
      account_holder_name: z
        .string()
        .trim()
        .min(L.holderMin, t('hrShared.form.holderRequired'))
        .max(L.holderMax, t('hrShared.form.tooLong', { vars: { max: L.holderMax } })),
      account_number: z.string().trim().regex(BANK_ACCOUNT_NUMBER, t('hrShared.form.accountNumberInvalid')),
      account_number_confirm: z.string().trim(),
      ifsc: z.string().trim().toUpperCase().regex(IFSC, t('hrShared.form.ifscInvalid')),
      bank_name: z.string().trim().max(L.bankNameMax, t('hrShared.form.tooLong', { vars: { max: L.bankNameMax } })),
      proof_url: z.string().trim().min(1, t('hrShared.form.proofRequired')),
      note: z.string().trim().max(L.noteMax, t('hrShared.form.tooLong', { vars: { max: L.noteMax } })),
    })
    .refine((v) => v.account_number === v.account_number_confirm, {
      message: t('hrShared.form.accountsMismatch'),
      path: ['account_number_confirm'],
    });
}

export const toBankChangeInput = (values: BankChangeValues, clientRequestId: string): BankChangeOutput => ({
  account_holder_name: values.account_holder_name.trim(),
  account_number: values.account_number.trim(),
  ifsc: values.ifsc.trim().toUpperCase(),
  bank_name: values.bank_name.trim() || null,
  proof_url: values.proof_url.trim(),
  note: values.note.trim() || null,
  client_request_id: clientRequestId,
});

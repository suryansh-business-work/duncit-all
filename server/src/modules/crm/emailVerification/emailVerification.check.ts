import { isEmailAddress } from '@utils/email';
import { checkEmailWithReacher, type EmailCheckResult } from './emailVerification.client';
import { EmailVerificationModel, type EmailCheckSource } from './emailVerification.model';

/** Who ran a check — kept on every record, which is the trail of who verified what. */
export interface EmailCheckActor {
  id: string;
  email: string;
}

/** A malformed address cannot hold a mailbox; it is INVALID without asking SMTP. */
const MALFORMED: EmailCheckResult = {
  status: 'INVALID',
  is_valid_syntax: false,
  accepts_mail: false,
  can_connect_smtp: false,
  is_deliverable: false,
  is_catch_all: false,
  has_full_inbox: false,
  is_disabled: false,
  is_disposable: false,
  is_role_account: false,
  suggestion: '',
};

/**
 * Check one address and keep the record. Shared by the single check and the
 * bulk job's step, so both store exactly the same shape. Throws only when the
 * verifier itself could not be reached — that is not a verdict on the email.
 */
export async function checkAndRecord(
  rawEmail: string,
  actor: EmailCheckActor,
  source: EmailCheckSource,
  jobId: string | null = null
) {
  const email = rawEmail.trim().toLowerCase();
  const result = isEmailAddress(email) ? await checkEmailWithReacher(email) : MALFORMED;
  return EmailVerificationModel.create({ email, ...result, source, job_id: jobId, checked_by: actor });
}

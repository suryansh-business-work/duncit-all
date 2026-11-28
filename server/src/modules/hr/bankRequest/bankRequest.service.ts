/**
 * Employee bank-account changes: the employee asks with a proof document, HR
 * approves or declines, and only an approval writes the HR record — through
 * the same `bankService.update` HR's own edit uses, so the worker history and
 * the sealing are identical. Nobody approves their own change.
 */
import { Types } from 'mongoose';
import { z } from 'zod';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { duplicateKeyOn, isDuplicateKeyError } from '@utils/mongo-error';
import { BANK_ACCOUNT_NUMBER_PATTERN, IFSC_PATTERN } from '@utils/field-formats';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import { openField, sealField } from '@modules/portals/portalSecurity/portalSecurity.crypto';
import { privateFolder } from '@modules/platform/upload/uploadFolder';
import { signedPrivateUrl } from '@modules/platform/upload/privateMedia';
import { HrEmployeeModel, type IHrEmployee } from '@modules/hr/employee/employee.model';
import { HR_EMPLOYEE_LIMITS, lastFour, maskedTail } from '@modules/hr/employee/employee.rules';
import { actorOf } from '@modules/hr/employee/employee.events';
import { fail, objectId } from '@modules/hr/employee/employee.store';
import { bankService } from '@modules/hr/employee/employee.bank';
import { HrBankChangeRequestModel, type IHrBankChangeRequest } from './bankRequest.model';
import { notifyBankRequestDecided, notifyBankRequested } from './bankRequest.notify';

export const BANK_PROOF_KIND = 'bank_proof';
const PROOF_LINK_SECONDS = 10 * 60;
const L = HR_EMPLOYEE_LIMITS;
const NOTE_MAX = 500;

const optionalNote = z
  .string()
  .trim()
  .max(NOTE_MAX, `At most ${NOTE_MAX} characters`)
  .nullish()
  .transform((v) => v || null);

export const bankChangeSchema = z.object({
  account_holder_name: z.string().trim().min(2, 'Enter the name on the account').max(L.nameMax * 2, 'That name is too long'),
  account_number: z.string().trim().refine((v) => BANK_ACCOUNT_NUMBER_PATTERN.test(v), 'Account number is 6 to 18 digits'),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => IFSC_PATTERN.test(v), 'Enter a valid IFSC (e.g. HDFC0001234)'),
  bank_name: z
    .string()
    .trim()
    .max(L.bankNameMax, 'That bank name is too long')
    .nullish()
    .transform((v) => v || null),
  proof_url: z.string().trim().min(1, 'Upload a cancelled cheque or the first page of your passbook'),
  note: optionalNote,
  client_request_id: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/, 'The request id is malformed')
    .nullish()
    .transform((v) => v ?? null),
});

export const bankDecisionSchema = z
  .object({ approve: z.boolean(), note: optionalNote })
  .refine((v) => v.approve || (v.note?.length ?? 0) >= 3, { message: 'Say why the change is declined', path: ['note'] });

export const BANK_REQUEST_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['employee_name', 'employee_code', 'bank_name', 'ifsc'],
  sortFields: { created_at: 'created_at', employee_name: 'employee_name', status: 'status' },
  filterFields: { status: { type: 'enum' }, employee_name: { type: 'string' } },
  defaultSort: { created_at: -1 },
};

/** What a proof reference is, or null when it is not a file this account uploaded privately. */
export function proofKindOf(url: string, userId: string): 'IMAGE' | 'PDF' | null {
  let path: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    path = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  if (path.includes('..') || !path.includes(`${privateFolder(userId, BANK_PROOF_KIND)}/`)) return null;
  const ext = (/\.([a-z0-9]{2,5})$/i.exec(path)?.[1] ?? '').toLowerCase();
  if (ext === 'pdf') return 'PDF';
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext) ? 'IMAGE' : null;
}

const iso = (date: Date | null | undefined) => (date ? new Date(date).toISOString() : null);

export function toBankRequest(doc: IHrBankChangeRequest) {
  return {
    id: String(doc._id),
    employee_id: String(doc.employee_id),
    employee_name: doc.employee_name,
    employee_code: doc.employee_code,
    account_holder_name: doc.account_holder_name,
    account_number_masked: maskedTail(doc.account_last4),
    ifsc: doc.ifsc,
    bank_name: doc.bank_name,
    proof_kind: doc.proof_kind,
    note: doc.note,
    status: doc.status,
    decided_by: doc.decision?.by.name ?? null,
    decided_at: iso(doc.decision?.at),
    decision_note: doc.decision?.note ?? null,
    created_at: iso(doc.created_at),
  };
}

const summaryOf = (employee: IHrEmployee) => ({
  account_holder_name: employee.bank?.account_holder_name ?? null,
  account_number_masked: employee.bank?.account_last4 ? maskedTail(employee.bank.account_last4) : null,
  ifsc: employee.bank?.ifsc ?? null,
  bank_name: employee.bank?.bank_name ?? null,
  pan_masked: employee.bank?.pan_last4 ? maskedTail(employee.bank.pan_last4) : null,
  uan: employee.bank?.uan ?? null,
});

async function ownEmployee(userId: string): Promise<IHrEmployee | null> {
  return HrEmployeeModel.findOne({ user_id: new Types.ObjectId(userId) }).lean<IHrEmployee>();
}

async function loadRequest(id: string): Promise<IHrBankChangeRequest> {
  const doc = await HrBankChangeRequestModel.findById(objectId(id, 'bank change request')).lean<IHrBankChangeRequest>();
  return doc ?? fail('NOT_FOUND', 'Bank change request not found');
}

export const bankRequestService = {
  /** The Employee console's bank section. Null until HR has put the caller on record. */
  async mine(userId: string) {
    const employee = await ownEmployee(userId);
    if (!employee) return null;
    const history = await HrBankChangeRequestModel.find({ employee_id: employee._id }).sort({ created_at: -1 }).limit(10).lean<IHrBankChangeRequest[]>();
    const pending = history.find((r) => r.status === 'PENDING');
    return {
      current: summaryOf(employee),
      pending: pending ? toBankRequest(pending) : null,
      history: history.map(toBankRequest),
      can_request: employee.status !== 'EXITED' && !pending,
    };
  },

  async request(userId: string, raw: unknown): Promise<IHrBankChangeRequest> {
    const input = parseInput(bankChangeSchema, raw);
    if (input.client_request_id) {
      const prior = await HrBankChangeRequestModel.findOne({ user_id: new Types.ObjectId(userId), client_request_id: input.client_request_id }).lean<IHrBankChangeRequest>();
      if (prior) return prior;
    }
    const employee = await ownEmployee(userId);
    if (!employee) return fail('NOT_FOUND', 'HR has not added your employee record yet');
    if (employee.status === 'EXITED') fail('BAD_USER_INPUT', 'Your employment has ended, so your bank details are read-only');
    const proofKind = proofKindOf(input.proof_url, userId);
    if (!proofKind) fail('BAD_USER_INPUT', 'Upload the proof again from this account as an image or a PDF');
    const current = employee.bank;
    if (current?.account_number_sealed && current.ifsc === input.ifsc && openField(current.account_number_sealed) === input.account_number) {
      fail('BAD_USER_INPUT', 'This is already your salary account');
    }
    try {
      const doc = await HrBankChangeRequestModel.create({
        employee_id: employee._id,
        user_id: employee.user_id,
        employee_name: `${employee.personal.first_name} ${employee.personal.last_name}`.trim(),
        employee_code: employee.employee_code,
        account_holder_name: input.account_holder_name,
        account_number_sealed: sealField(input.account_number),
        account_last4: lastFour(input.account_number),
        ifsc: input.ifsc,
        bank_name: input.bank_name,
        proof_url: input.proof_url,
        proof_kind: proofKind,
        note: input.note,
        client_request_id: input.client_request_id,
      });
      const saved = doc.toObject<IHrBankChangeRequest>();
      logs.server.info('bankRequest.service', 'requested', { userId, requestId: String(saved._id) });
      await notifyBankRequested(saved);
      return saved;
    } catch (error) {
      if (isDuplicateKeyError(error) && duplicateKeyOn(error, 'employee_id')) fail('CONFLICT', 'You already have a bank change waiting for HR');
      throw error;
    }
  },

  async cancelMine(userId: string, id: string): Promise<IHrBankChangeRequest> {
    const doc = await HrBankChangeRequestModel.findOneAndUpdate(
      { _id: objectId(id, 'bank change request'), user_id: new Types.ObjectId(userId), status: 'PENDING' },
      { $set: { status: 'CANCELLED' } },
      { new: true }
    ).lean<IHrBankChangeRequest>();
    return doc ?? fail('BAD_USER_INPUT', 'Only a change that is still waiting can be cancelled');
  },

  async hrTable(query?: TableQueryInput) {
    const page = await runTableQuery<IHrBankChangeRequest>(HrBankChangeRequestModel, {}, query, BANK_REQUEST_TABLE_CONFIG, {
      projection: { account_number_sealed: 0, views: 0, proof_url: 0 },
    });
    return { rows: page.docs.map(toBankRequest), total: page.total, page: page.page, page_size: page.page_size };
  },

  /** HR's check: the full number next to a short-lived link to the proof. Every open is recorded. */
  async hrDetail(id: string, user: AuthUser) {
    const doc = await loadRequest(id);
    const employee = await HrEmployeeModel.findById(doc.employee_id).lean<IHrEmployee>();
    const [link, by] = await Promise.all([signedPrivateUrl(doc.proof_url, PROOF_LINK_SECONDS), actorOf(user)]);
    await HrBankChangeRequestModel.updateOne({ _id: doc._id }, { $push: { views: { by, at: new Date() } } });
    logs.server.info('bankRequest.service', 'opened', { requestId: id, userId: user.id });
    return {
      request: toBankRequest(doc),
      account_number: openField(doc.account_number_sealed),
      proof_url: link.url,
      proof_expires_at: link.expiresAt.toISOString(),
      current: employee ? summaryOf(employee) : null,
    };
  },

  async decide(id: string, raw: unknown, user: AuthUser): Promise<IHrBankChangeRequest> {
    const input = parseInput(bankDecisionSchema, raw);
    const doc = await loadRequest(id);
    if (doc.status !== 'PENDING') fail('BAD_REQUEST', 'This change has already been decided');
    if (String(doc.user_id) === user.id) fail('FORBIDDEN', 'You cannot decide a change to your own bank account. Ask another HR manager.');
    const actor = await actorOf(user);
    const decidedAt = new Date();
    const status = input.approve ? 'APPROVED' : 'REJECTED';
    const claimed = await HrBankChangeRequestModel.findOneAndUpdate(
      { _id: doc._id, status: 'PENDING' },
      { $set: { status, decision: { by: actor, at: decidedAt, note: input.note } } },
      { new: true }
    ).lean<IHrBankChangeRequest>();
    if (!claimed) return fail('CONFLICT', 'This change was decided by someone else a moment ago. Reload it.');
    if (input.approve) {
      try {
        const employee = await HrEmployeeModel.findById(doc.employee_id).lean<IHrEmployee>();
        if (!employee) fail('NOT_FOUND', 'Employee not found');
        // UAN is passed back as stored and PAN left out, so approving a bank change never clears either.
        await bankService.update(
          String(doc.employee_id),
          {
            account_holder_name: doc.account_holder_name,
            account_number: openField(doc.account_number_sealed),
            ifsc: doc.ifsc,
            bank_name: doc.bank_name,
            uan: employee.bank?.uan ?? null,
          },
          employee.revision,
          user
        );
      } catch (error) {
        // The HR record did not change, so the request goes back to waiting rather than claiming an approval.
        await HrBankChangeRequestModel.updateOne({ _id: doc._id, status: 'APPROVED', 'decision.at': decidedAt }, { $set: { status: 'PENDING', decision: null } });
        throw error;
      }
    }
    logs.server.info('bankRequest.service', 'decided', { requestId: id, status, userId: user.id });
    await notifyBankRequestDecided(claimed);
    return claimed;
  },
};

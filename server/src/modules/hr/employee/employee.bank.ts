/**
 * Bank and statutory details. The account number and PAN are sealed at rest
 * (the same AES-GCM seal as the marketing tokens and security logs), so a
 * database dump alone never yields them. Reads show `•••• 1234`; the full
 * values come only from `reveal`, and each reveal is a row in the worker
 * history naming who looked.
 *
 * On save, an account number or PAN left out of the input keeps the stored
 * one — the form cannot show a sealed value to re-submit — and an explicit
 * empty value clears it.
 */
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { openField, sealField } from '@modules/portals/portalSecurity/portalSecurity.crypto';
import { parseInput } from '@modules/targets/employeeTarget/employeeTarget.rules';
import type { IHrBank, IHrEmployee } from './employee.model';
import { actorOf, recordEvent, todayKey } from './employee.events';
import { fail, loadEmployee, writeAt } from './employee.store';
import { bankSchema, isEditable, lastFour, type BankInput } from './employee.rules';

const has = (raw: unknown, key: string) => typeof raw === 'object' && raw !== null && key in raw;

/** The stored block for an input: secrets sealed, a missing secret kept as it was. */
export function bankBlock(input: BankInput, raw: unknown, previous: IHrBank | null): IHrBank {
  const keepAccount = !has(raw, 'account_number') && previous;
  const keepPan = !has(raw, 'pan') && previous;
  return {
    account_holder_name: input.account_holder_name,
    account_number_sealed: keepAccount ? previous.account_number_sealed : input.account_number && sealField(input.account_number),
    account_last4: keepAccount ? previous.account_last4 : input.account_number && lastFour(input.account_number),
    ifsc: input.ifsc,
    bank_name: input.bank_name,
    pan_sealed: keepPan ? previous.pan_sealed : input.pan && sealField(input.pan),
    pan_last4: keepPan ? previous.pan_last4 : input.pan && lastFour(input.pan),
    uan: input.uan,
  };
}

const BANK_FIELDS: (keyof IHrBank)[] = ['account_holder_name', 'account_last4', 'account_number_sealed', 'ifsc', 'bank_name', 'pan_sealed', 'uan'];
const LABEL: Partial<Record<keyof IHrBank, string>> = { account_last4: 'bank.account_number', account_number_sealed: 'bank.account_number', pan_sealed: 'bank.pan' };

/** Which bank fields moved — names only, never the values. */
function changedFields(before: IHrBank | null, after: IHrBank) {
  const fields = new Set<string>();
  for (const key of BANK_FIELDS) {
    if ((before?.[key] ?? null) !== (after[key] ?? null)) fields.add(LABEL[key] ?? `bank.${key}`);
  }
  return [...fields].map((field) => ({ field, from: null, to: 'updated' }));
}

export const bankService = {
  async update(id: string, raw: unknown, expectedRevision: number, user: AuthUser): Promise<IHrEmployee> {
    const employee = await loadEmployee(id);
    if (!isEditable(employee.status)) fail('BAD_USER_INPUT', 'This employee has left. Rehire them to change their bank details.');
    const input = parseInput(bankSchema, raw);
    const next = bankBlock(input, raw, employee.bank ?? null);
    const changes = changedFields(employee.bank ?? null, next);
    if (changes.length === 0) return employee;
    const actor = await actorOf(user);
    const saved = await writeAt(employee, expectedRevision, { bank: next, updated_by: actor });
    await recordEvent({ employeeId: employee._id, kind: 'BANK_UPDATED', effectiveDate: todayKey(), actor, changes });
    logs.server.info('employee.bank', 'updated', { employeeId: id, userId: user.id, fields: changes.map((c) => c.field) });
    return saved;
  },

  /** The full account number and PAN, for HR only — and written to the worker history every time. */
  async reveal(id: string, user: AuthUser) {
    const employee = await loadEmployee(id);
    const bank = employee.bank ?? null;
    await recordEvent({ employeeId: employee._id, kind: 'BANK_VIEWED', effectiveDate: todayKey(), actor: await actorOf(user) });
    logs.server.info('employee.bank', 'revealed', { employeeId: id, userId: user.id });
    return {
      account_holder_name: bank?.account_holder_name ?? null,
      account_number: bank?.account_number_sealed ? openField(bank.account_number_sealed) : null,
      ifsc: bank?.ifsc ?? null,
      bank_name: bank?.bank_name ?? null,
      pan: bank?.pan_sealed ? openField(bank.pan_sealed) : null,
      uan: bank?.uan ?? null,
    };
  },
};

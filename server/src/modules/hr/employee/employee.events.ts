import { Types, type ClientSession } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { appFormat } from '@utils/app-time';
import { userDisplayOf } from '@modules/access/user/user.display';
import type { IHrActor } from './employee.model';
import { HrEmployeeEventModel, type IHrEmployeeEvent, type IHrFieldChange } from './employeeEvent.model';
import type { HrEventKind } from './employee.rules';

/** Today in the admin's time zone, as `YYYY-MM-DD` — never the container's UTC day. */
export const todayKey = (now: Date = new Date()): string => appFormat(now, 'yyyy-MM-dd');

/** The signed-in person as the record names them — read from their account, never the payload. */
export async function actorOf(user: Pick<AuthUser, 'id'>): Promise<IHrActor> {
  const display = await userDisplayOf(user.id);
  return { user_id: new Types.ObjectId(user.id), name: display.name };
}

type Flat = Record<string, string | null>;

const asText = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/** `{ job: { job_title: 'A' } }` → `{ 'job.job_title': 'A' }`, for the fields named. */
export function flatten(source: object, fields: readonly string[]): Flat {
  const out: Flat = {};
  for (const field of fields) {
    let value: unknown = source;
    for (const part of field.split('.')) value = (value as Record<string, unknown> | null | undefined)?.[part];
    out[field] = asText(value);
  }
  return out;
}

/** Every named field whose text moved. A save that changed nothing yields no rows. */
export function diffFlat(before: Flat, after: Flat): IHrFieldChange[] {
  const changes: IHrFieldChange[] = [];
  for (const field of Object.keys(after)) {
    const from = before[field] ?? null;
    const to = after[field] ?? null;
    if (from !== to) changes.push({ field, from, to });
  }
  return changes;
}

export interface RecordEventInput {
  employeeId: Types.ObjectId;
  kind: HrEventKind;
  effectiveDate: string;
  actor: IHrActor;
  changes?: IHrFieldChange[];
  note?: string | null;
  session?: ClientSession;
}

/**
 * Append one row to the worker history. Inside a transaction the row commits
 * or rolls back with the change it describes; outside one (a reveal), a
 * failed write is logged and never undoes what already happened.
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  const doc = {
    employee_id: input.employeeId,
    kind: input.kind,
    effective_date: input.effectiveDate,
    changes: input.changes ?? [],
    note: input.note ?? null,
    actor: input.actor,
  };
  if (input.session) {
    await HrEmployeeEventModel.create([doc], { session: input.session });
    return;
  }
  try {
    await HrEmployeeEventModel.create(doc);
  } catch (error) {
    logs.server.error('employee.events', 'record', { error, msg: 'worker history row not written', kind: input.kind });
  }
}

export async function eventsFor(employeeId: Types.ObjectId, limit = 200): Promise<IHrEmployeeEvent[]> {
  return HrEmployeeEventModel.find({ employee_id: employeeId }).sort({ created_at: -1, _id: -1 }).limit(limit).lean<IHrEmployeeEvent[]>();
}

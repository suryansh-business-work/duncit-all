import { isValidObjectId } from 'mongoose';
import type { UserDisplay } from '@modules/access/user/user.display';
import { E2eFlowModel } from '@modules/platform/e2eFlow/e2eFlow.model';
import { TableChangeLogModel, type ITableChangeLog } from '@modules/platform/tableChangeLog/tableChangeLog.model';
import { MANUAL_TEST_LIMITS as L } from './manualTest.constants';
import { ManualTestCaseModel, ManualTestColumnModel } from './manualTest.model';
import { iso, peopleOf, personPub, requireId } from './manualTest.pub';

/*
 * A case's Activity tab, read from the platform's global table change log.
 *
 * Every write a signed-in person makes to a case — an edit on its page, a drag
 * on the board, a status change from the table — is already captured there,
 * field by field with who, when, from and to (tableChangeLog plugin). A second,
 * module-local history would be a second place for the trail to have holes.
 * This only chooses which of those rows a tester cares about and names the ids
 * in them.
 */

/** Fields a person changes on purpose; rank and the bookkeeping fields are left out. */
const TRACKED_FIELDS = [
  'title',
  'type',
  'priority',
  'column_id',
  'assignee_id',
  'reporter_id',
  'labels',
  'surface',
  'environment',
  'description',
  'preconditions',
  'expected_result',
  'actual_result',
  'steps',
  'e2e_flow_id',
  'e2e_sub_flow_id',
  'due_date',
  'estimate_minutes',
];

/** Long rich-text and step lists: the entry says THAT they changed, not the HTML. */
const CONTENT_FIELDS = new Set(['description', 'preconditions', 'expected_result', 'actual_result', 'steps']);
const PERSON_FIELDS = new Set(['assignee_id', 'reporter_id']);
const FLOW_FIELDS = new Set(['e2e_flow_id', 'e2e_sub_flow_id']);

type LogRow = Pick<
  ITableChangeLog,
  'action' | 'field' | 'old_value' | 'new_value' | 'actor_user_id' | 'actor_name' | 'created_at'
> & { _id: unknown };

interface Names {
  columns: Map<string, string>;
  people: Map<string, UserDisplay>;
  flows: Map<string, string>;
}

/** Every id the rows' values name, by kind. */
function idsIn(rows: readonly LogRow[], fields: ReadonlySet<string>): string[] {
  return rows
    .filter((row) => fields.has(row.field))
    .flatMap((row) => [row.old_value, row.new_value])
    .filter((value) => isValidObjectId(value));
}

/** Flow and sub flow names, from one read of the flows they belong to. */
async function flowNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const flows = await E2eFlowModel.find({ $or: [{ _id: { $in: ids } }, { 'sub_flows._id': { $in: ids } }] })
    .select('name sub_flows._id sub_flows.name')
    .lean();
  for (const flow of flows) {
    names.set(String(flow._id), flow.name);
    for (const sub of flow.sub_flows ?? []) names.set(String(sub._id), sub.name);
  }
  return names;
}

async function namesFor(rows: readonly LogRow[]): Promise<Names> {
  const columnIds = idsIn(rows, new Set(['column_id']));
  const [columns, people, flows] = await Promise.all([
    columnIds.length ? ManualTestColumnModel.find({ _id: { $in: columnIds } }).select('name').lean() : [],
    peopleOf([...idsIn(rows, PERSON_FIELDS), ...rows.map((row) => row.actor_user_id)]),
    flowNames(idsIn(rows, FLOW_FIELDS)),
  ]);
  return { columns: new Map(columns.map((column) => [String(column._id), column.name])), people, flows };
}

/** A logged value as a person reads it: a name for an id, nothing for a long body. */
function shown(field: string, value: string, names: Names): string {
  if (!value || CONTENT_FIELDS.has(field)) return '';
  if (field === 'column_id') return names.columns.get(value) ?? '';
  if (PERSON_FIELDS.has(field)) return names.people.get(value)?.name ?? '';
  if (FLOW_FIELDS.has(field)) return names.flows.get(value) ?? '';
  return value;
}

/** Who made the change — their current name, or the one logged when the account is gone. */
function actorOf(row: LogRow, people: Map<string, UserDisplay>) {
  const person = personPub(people, row.actor_user_id);
  return { id: person?.id ?? '', name: person?.name || row.actor_name, photo: person?.photo ?? '' };
}

export const manualTestActivityService = {
  /** One page of a case's history, newest first. */
  async list(caseId: string, offset: number) {
    requireId(caseId, 'Case');
    const start = Math.max(0, Math.trunc(offset || 0));
    const filter = {
      collection_name: ManualTestCaseModel.collection.collectionName,
      doc_id: caseId,
      $or: [{ action: 'CREATE' }, { action: 'UPDATE', field: { $in: TRACKED_FIELDS } }],
    };
    const [rows, total] = await Promise.all([
      TableChangeLogModel.find(filter)
        .sort({ created_at: -1, _id: -1 })
        .skip(start)
        .limit(L.activityPageSize)
        .select('action field old_value new_value actor_user_id actor_name created_at')
        .lean<LogRow[]>(),
      TableChangeLogModel.countDocuments(filter),
    ]);
    const names = await namesFor(rows);
    return {
      rows: rows.map((row) => ({
        id: String(row._id),
        action: row.action,
        field: row.field,
        old_value: shown(row.field, row.old_value, names),
        new_value: shown(row.field, row.new_value, names),
        actor: actorOf(row, names.people),
        created_at: iso(row.created_at),
      })),
      total,
    };
  },
};

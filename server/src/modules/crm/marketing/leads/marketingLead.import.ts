import { userActor, withRun } from '../runs/marketingRun.service';
import { emailKey, handleKey, isPhone, websiteHost } from './marketingLead.keys';
import { leadActor, refuse, upsertLead } from './marketingLead.service';
import { LEAD_LIMITS, LEAD_PIPELINES, type LeadInput, type MarketingLeadPipeline } from './marketingLead.types';

/**
 * A CSV, already parsed by the page into rows of cells, becomes leads. The
 * mapping says which column holds what; every row is checked first and the
 * bad ones reported by number, then the good ones go through the same upsert
 * every source uses — so a row naming a lead already here merges into it.
 * The whole import is one recorded run.
 */
export interface ImportMapping {
  /** Column index of each field; null or -1 when the file has no such column. */
  name: number;
  company?: number | null;
  email?: number | null;
  phone?: number | null;
  website?: number | null;
  instagram_handle?: number | null;
  city?: number | null;
  tags?: number | null;
  /** The pipeline every imported lead joins. */
  pipeline?: MarketingLeadPipeline | null;
}

export type ImportOutcome = 'ADDED' | 'MERGED' | 'SKIPPED';

export interface ImportRowResult {
  /** 1-based, as the person counts rows in the file. */
  row: number;
  outcome: ImportOutcome;
  reason: string;
  lead_id: string;
}

export interface ImportResult {
  added: number;
  merged: number;
  skipped: number;
  run_id: string;
  rows: ImportRowResult[];
}

type Row = readonly string[];

/** Cells holding several values are split on commas or semicolons. */
const LIST_SPLIT = /[;,]/;

const cell = (row: Row, index: number | null | undefined): string =>
  index === null || index === undefined || index < 0 ? '' : (row[index] ?? '').trim();

const cells = (row: Row, index: number | null | undefined): string[] =>
  cell(row, index)
    .split(LIST_SPLIT)
    .map((value) => value.trim())
    .filter(Boolean);

/** Why one row cannot be a lead, or '' when it can. */
export function rowProblem(row: Row, mapping: ImportMapping): string {
  if (!cell(row, mapping.name)) return 'No name';
  const badEmail = cells(row, mapping.email).find((email) => !emailKey(email));
  if (badEmail) return `"${badEmail}" is not an email address`;
  const badPhone = cells(row, mapping.phone).find((phone) => !isPhone(phone));
  if (badPhone) return `"${badPhone}" is not a phone number`;
  const website = cell(row, mapping.website);
  if (website && !websiteHost(website)) return `"${website}" is not a web address`;
  const handle = cell(row, mapping.instagram_handle);
  if (handle && !handleKey(handle)) return `"${handle}" is not an Instagram handle`;
  return '';
}

/** The lead one good row describes. */
export function rowInput(row: Row, mapping: ImportMapping, importId: string): LeadInput {
  return {
    name: cell(row, mapping.name),
    company: cell(row, mapping.company),
    pipeline: mapping.pipeline ?? 'GENERAL',
    source: 'IMPORT',
    emails: cells(row, mapping.email),
    phones: cells(row, mapping.phone),
    website: cell(row, mapping.website),
    instagram_handle: cell(row, mapping.instagram_handle),
    city: cell(row, mapping.city),
    tags: cells(row, mapping.tags),
    source_ref: { import_id: importId },
  };
}

function checkMapping(rows: readonly Row[], mapping: ImportMapping): void {
  if (rows.length === 0) refuse('The file has no rows to import.');
  if (rows.length > LEAD_LIMITS.import_rows.max) refuse(`Import at most ${LEAD_LIMITS.import_rows.max} rows at a time.`);
  if (!Number.isInteger(mapping.name) || mapping.name < 0) refuse('Say which column holds the name.');
  if (mapping.pipeline && !LEAD_PIPELINES.includes(mapping.pipeline)) refuse('That pipeline does not exist.');
}

/** The rows that can be leads, each with its number, and a SKIPPED result for each that cannot. */
function validateRows(rows: readonly Row[], mapping: ImportMapping) {
  const good: Array<{ row: number; data: Row }> = [];
  const skipped: ImportRowResult[] = [];
  rows.forEach((data, index) => {
    const problem = rowProblem(data, mapping);
    if (problem) skipped.push({ row: index + 1, outcome: 'SKIPPED', reason: problem, lead_id: '' });
    else good.push({ row: index + 1, data });
  });
  return { good, skipped };
}

export async function importLeads(
  rows: readonly Row[],
  mapping: ImportMapping,
  user: { id: string; email?: string | null }
): Promise<ImportResult> {
  checkMapping(rows, mapping);
  const [actor, runActor] = await Promise.all([leadActor(user), userActor(user)]);
  return withRun(
    { workflow: 'LEAD_IMPORT', name: `Import ${rows.length} leads from a file`, trigger: 'USER', actor: runActor },
    async (run) => {
      const { good, skipped } = await run.step('validate', 'Check the rows', async () => validateRows(rows, mapping), {
        input_summary: `${rows.length} rows`,
        summarize: (r) => `${r.good.length} usable, ${r.skipped.length} skipped`,
      });
      const results = await run.step(
        'save',
        'Add or merge the leads',
        async () => {
          const saved: ImportRowResult[] = [];
          for (const { row, data } of good) {
            const { lead, merged } = await upsertLead(rowInput(data, mapping, run.id), actor);
            saved.push({ row, outcome: merged ? 'MERGED' : 'ADDED', reason: '', lead_id: lead.id });
          }
          return saved;
        },
        { summarize: (saved) => `${saved.filter((r) => r.outcome === 'ADDED').length} added, ${saved.filter((r) => r.outcome === 'MERGED').length} merged` }
      );
      const all = [...results, ...skipped].sort((a, b) => a.row - b.row);
      return {
        added: results.filter((r) => r.outcome === 'ADDED').length,
        merged: results.filter((r) => r.outcome === 'MERGED').length,
        skipped: skipped.length,
        run_id: run.id,
        rows: all,
      };
    }
  );
}

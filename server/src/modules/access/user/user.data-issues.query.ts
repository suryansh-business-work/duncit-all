/**
 * The data issues of user.data-issues.ts as database filters — so Admin > Users
 * can list every account with one, and the Users dashboard can count them.
 *
 * Each filter states the same rule `dataIssuesOf` applies to a row, over the
 * stored fields, so a row the filter returns is a row that shows the chip.
 */
import type { TableQueryInput } from '@utils/table-query';
import { UserModel } from './user.model';
import { FILLED, LIVE_ACCOUNTS, REAL_NUMBER, USER_DATA_ISSUES, type UserDataIssue } from './user.data-issues';

type Filter = Record<string, unknown>;

/** A stored string field as an expression, '' when unset. */
const field = (path: string) => ({ $ifNull: [path, ''] });
const matches = (path: string, regex: RegExp) => ({ $regexMatch: { input: field(path), regex: regex.source } });

/** The linked Gmail as toPublic reads it: the stored one, else the email itself. */
const linkedGmail = { $toLower: { $ifNull: ['$auth.google_email', field('$auth.email')] } };

const CONTACT_MISMATCH: Filter = {
  $expr: {
    $or: [
      {
        $and: [
          matches('$auth.phone.number', REAL_NUMBER),
          matches('$communication.whatsapp.number', REAL_NUMBER),
          { $ne: [{ $trim: { input: field('$auth.phone.number') } }, { $trim: { input: field('$communication.whatsapp.number') } }] },
        ],
      },
      {
        $and: [
          { $gt: [field('$auth.google_id'), ''] },
          matches('$auth.email', FILLED),
          { $regexMatch: { input: linkedGmail, regex: FILLED.source } },
          { $ne: [linkedGmail, { $toLower: field('$auth.email') }] },
        ],
      },
    ],
  },
};

/** Contact keys (`email:…` / `phone:…`) held by more than one live account. */
async function sharedKeys(): Promise<{ emails: string[]; numbers: string[] }> {
  const gmail = {
    $cond: [{ $gt: [field('$auth.google_id'), ''] }, { $concat: ['email:', linkedGmail] }, 'email:'],
  };
  const rows = await UserModel.aggregate<{ _id: string }>(
    [
      { $match: LIVE_ACCOUNTS },
      {
        $project: {
          keys: {
            $setUnion: [
              [
                { $concat: ['email:', { $toLower: field('$auth.email') }] },
                gmail,
                { $concat: ['phone:', { $trim: { input: field('$auth.phone.number') } }] },
                { $concat: ['phone:', { $trim: { input: field('$communication.whatsapp.number') } }] },
              ],
            ],
          },
        },
      },
      { $unwind: '$keys' },
      { $match: { $or: [{ keys: /^email:\S/ }, { keys: /^phone:.*[1-9]/ }] } },
      { $group: { _id: '$keys', accounts: { $sum: 1 } } },
      { $match: { accounts: { $gt: 1 } } },
    ],
    { allowDiskUse: true }
  );
  const values = (prefix: string) =>
    rows.filter((row) => row._id.startsWith(prefix)).map((row) => row._id.slice(prefix.length));
  return { emails: values('email:'), numbers: values('phone:') };
}

/** The filter for one issue. The duplicate ones read the shared keys once and are handed them. */
function issueFilter(issue: UserDataIssue, shared: { emails: string[]; numbers: string[] }): Filter {
  switch (issue) {
    case 'MISSING_NAME':
      return { 'profile.first_name': { $not: FILLED } };
    case 'MISSING_EMAIL':
      return { 'auth.email': { $not: FILLED } };
    case 'MISSING_PHONE':
      return { 'auth.phone.number': { $not: REAL_NUMBER } };
    case 'DUPLICATE_EMAIL':
      return {
        $or: [
          { 'auth.email': { $in: shared.emails } },
          { 'auth.google_id': { $type: 'string' }, 'auth.google_email': { $in: shared.emails } },
        ],
      };
    case 'DUPLICATE_PHONE':
      return {
        $or: [
          { 'auth.phone.number': { $in: shared.numbers } },
          { 'communication.whatsapp.number': { $in: shared.numbers } },
        ],
      };
    case 'CONTACT_MISMATCH':
      return CONTACT_MISMATCH;
  }
}

const needsSharedKeys = (issues: readonly UserDataIssue[]) =>
  issues.some((issue) => issue === 'DUPLICATE_EMAIL' || issue === 'DUPLICATE_PHONE');

const NO_SHARED = { emails: [], numbers: [] };

/** Live accounts with ANY of `issues` — the list's "Data issues" filter. */
export async function dataIssuesFilter(issues: readonly UserDataIssue[]): Promise<Filter> {
  const shared = needsSharedKeys(issues) ? await sharedKeys() : NO_SHARED;
  return { ...LIVE_ACCOUNTS, $or: issues.map((issue) => issueFilter(issue, shared)) };
}

/** How many live accounts have each issue, and how many have at least one. */
export async function countDataIssues(): Promise<{ byIssue: Map<UserDataIssue, number>; affected: number }> {
  const shared = await sharedKeys();
  const filters = USER_DATA_ISSUES.map((issue) => issueFilter(issue, shared));
  const [affected, ...counts] = await Promise.all([
    UserModel.countDocuments({ ...LIVE_ACCOUNTS, $or: filters }),
    ...filters.map((filter) => UserModel.countDocuments({ ...LIVE_ACCOUNTS, ...filter })),
  ]);
  return { byIssue: new Map(USER_DATA_ISSUES.map((issue, i) => [issue, counts[i]])), affected };
}

/** The issues a table filter names, valid ones only — unknown values are dropped like any table filter. */
const parseDataIssues = (values: readonly string[]): UserDataIssue[] =>
  USER_DATA_ISSUES.filter((issue) => values.includes(issue));

/** The table's own field for "has a data issue" — a column filter, not a stored path. */
const DATA_ISSUES_FIELD = 'data_issues';

/**
 * A users table query with its `data_issues` filter lifted out into a base
 * filter (live accounts with any of the chosen issues), and the rest left for
 * the table engine. No issue chosen, or none valid, leaves the query as it was.
 */
export async function splitDataIssuesFilter(
  input: TableQueryInput | null | undefined
): Promise<{ base: Filter; rest: TableQueryInput | null | undefined }> {
  const chosen = input?.filters?.filter((f) => f.field === DATA_ISSUES_FIELD) ?? [];
  if (!input || chosen.length === 0) return { base: {}, rest: input };
  const rest = { ...input, filters: input.filters?.filter((f) => f.field !== DATA_ISSUES_FIELD) };
  const issues = parseDataIssues(chosen.flatMap((f) => f.values ?? (f.value ? [f.value] : [])));
  return { base: issues.length ? await dataIssuesFilter(issues) : {}, rest };
}

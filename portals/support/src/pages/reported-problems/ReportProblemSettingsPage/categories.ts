import type { ReportProblemCategory } from '../../../graphql/reported-problems';

/**
 * A category as the page edits it.
 *
 * `uid` exists only so React has a stable key: a chip added here has no server
 * key yet, and keying an editable list by its array index re-uses the wrong row
 * the moment one is removed.
 */
export interface EditableCategory extends ReportProblemCategory {
  uid: string;
}

let sequence = 0;

/** A chip the user just typed. No key — the server derives a stable one from
 * the label, so renaming later never orphans the reports filed under it. */
export const draftCategory = (label: string, sort_order: number): EditableCategory => {
  sequence += 1;
  return { uid: `draft-${sequence}`, key: '', label, is_active: true, sort_order };
};

export const toEditable = (rows: ReportProblemCategory[]): EditableCategory[] =>
  rows.map((row) => ({ ...row, uid: row.key }));

export const renameCategory = (rows: EditableCategory[], uid: string, label: string) =>
  rows.map((row) => (row.uid === uid ? { ...row, label } : row));

export const toggleCategory = (rows: EditableCategory[], uid: string, is_active: boolean) =>
  rows.map((row) => (row.uid === uid ? { ...row, is_active } : row));

export const removeCategory = (rows: EditableCategory[], uid: string) =>
  rows.filter((row) => row.uid !== uid);

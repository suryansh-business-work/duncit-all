import { Schema, model, type Document, type Types } from 'mongoose';
import {
  MANUAL_TEST_CASE_TYPES,
  MANUAL_TEST_CATEGORIES,
  MANUAL_TEST_ENVIRONMENTS,
  MANUAL_TEST_PRIORITIES,
  type ManualTestCaseType,
  type ManualTestCategory,
  type ManualTestEnvironment,
  type ManualTestPriority,
} from './manualTest.constants';

/*
 * Three collections, and no history of their own: every field change a person
 * makes to a case is already captured by the global table change log
 * (`tableChangeLog`), which the case's Activity tab reads back. The audit-fields
 * plugin stamps created_by / updated_by on all three.
 */

/** One column of the board — "In Review", "Blocked". Admin-managed, never hardcoded. */
export interface IManualTestColumn extends Document {
  name: string;
  /** Left-to-right position; rewritten as a whole on reorder. */
  order: number;
  category: ManualTestCategory;
  /** Cards the column should hold at most; null for no limit. A warning, never a refusal. */
  wip_limit: number | null;
  created_at: Date;
  updated_at: Date;
}

const columnSchema = new Schema<IManualTestColumn>(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    category: { type: String, enum: MANUAL_TEST_CATEGORIES, required: true },
    wip_limit: { type: Number, default: null },
  },
  { collection: 'manual_test_columns', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

columnSchema.index({ order: 1, _id: 1 });
columnSchema.index({ category: 1 });
// One column per name, whatever its case — two "In Review" columns is a board
// nobody can read, and it is what makes the boot seed safe on two instances.
columnSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const ManualTestColumnModel = model<IManualTestColumn>('ManualTestColumn', columnSchema);

/** One step of a case: what the tester does, and what should happen. */
export interface IManualTestStep {
  action: string;
  expected: string;
}

export interface IManualTestCase extends Document {
  /** The n of `QA-<n>`, from an atomic counter — sorting by key sorts by this. */
  number: number;
  key: string;
  title: string;
  type: ManualTestCaseType;
  priority: ManualTestPriority;
  /** PRIORITY_WEIGHT of `priority`, so the table sorts by severity. */
  priority_weight: number;
  column_id: Types.ObjectId;
  /** Fractional, lexicographic position inside the column (see manualTest.rank). */
  rank: string;
  assignee_id: Types.ObjectId | null;
  reporter_id: Types.ObjectId | null;
  labels: string[];
  /** The console or app the case is about — a PORTAL_REGISTRY key, or ''. */
  surface: string;
  environment: ManualTestEnvironment;
  description: string;
  preconditions: string;
  expected_result: string;
  actual_result: string;
  steps: IManualTestStep[];
  e2e_flow_id: Types.ObjectId | null;
  e2e_sub_flow_id: Types.ObjectId | null;
  due_date: Date | null;
  estimate_minutes: number | null;
  /** When the case last landed in a PASSED or FAILED column. */
  executed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const stepSchema = new Schema<IManualTestStep>(
  {
    action: { type: String, required: true, trim: true },
    expected: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const caseSchema = new Schema<IManualTestCase>(
  {
    number: { type: Number, required: true },
    key: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: MANUAL_TEST_CASE_TYPES, default: 'TEST_CASE' },
    priority: { type: String, enum: MANUAL_TEST_PRIORITIES, default: 'MEDIUM' },
    priority_weight: { type: Number, default: 3 },
    column_id: { type: Schema.Types.ObjectId, ref: 'ManualTestColumn', required: true },
    rank: { type: String, required: true },
    assignee_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reporter_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    labels: { type: [String], default: [] },
    surface: { type: String, default: '' },
    environment: { type: String, enum: MANUAL_TEST_ENVIRONMENTS, default: 'STAGING' },
    description: { type: String, default: '' },
    preconditions: { type: String, default: '' },
    expected_result: { type: String, default: '' },
    actual_result: { type: String, default: '' },
    steps: { type: [stepSchema], default: [] },
    e2e_flow_id: { type: Schema.Types.ObjectId, ref: 'E2eFlow', default: null },
    e2e_sub_flow_id: { type: Schema.Types.ObjectId, default: null },
    due_date: { type: Date, default: null },
    estimate_minutes: { type: Number, default: null },
    executed_at: { type: Date, default: null },
  },
  { collection: 'manual_test_cases', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Identity: one key per case, ever.
caseSchema.index({ number: 1 }, { unique: true });
caseSchema.index({ key: 1 }, { unique: true });
// The board: one column's cards in rank order.
caseSchema.index({ column_id: 1, rank: 1, _id: 1 });
// The board's filters, each beside the column it is read per.
caseSchema.index({ assignee_id: 1, column_id: 1 });
caseSchema.index({ type: 1, column_id: 1 });
caseSchema.index({ priority: 1, column_id: 1 });
caseSchema.index({ surface: 1, column_id: 1 });
caseSchema.index({ environment: 1, column_id: 1 });
// Label filter and the distinct-labels autocomplete.
caseSchema.index({ labels: 1 });
// The table's sorts (each with the _id tie-breaker runTableQuery appends).
caseSchema.index({ updated_at: -1, _id: -1 });
caseSchema.index({ created_at: -1, _id: -1 });
caseSchema.index({ priority_weight: -1, _id: -1 });
caseSchema.index({ title: 1, _id: 1 });
caseSchema.index({ due_date: 1, _id: 1 });
// "Executed in the last 7 days" on the dashboard.
caseSchema.index({ executed_at: -1 });

export const ManualTestCaseModel = model<IManualTestCase>('ManualTestCase', caseSchema);

/** A comment on a case — rich text, editable by its author only. */
export interface IManualTestComment extends Document {
  case_id: Types.ObjectId;
  author_id: Types.ObjectId | null;
  body: string;
  /** Set when the author edits it; null for a comment never edited. */
  edited_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const commentSchema = new Schema<IManualTestComment>(
  {
    case_id: { type: Schema.Types.ObjectId, ref: 'ManualTestCase', required: true },
    author_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    body: { type: String, required: true },
    edited_at: { type: Date, default: null },
  },
  { collection: 'manual_test_comments', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

commentSchema.index({ case_id: 1, created_at: 1, _id: 1 });

export const ManualTestCommentModel = model<IManualTestComment>('ManualTestComment', commentSchema);

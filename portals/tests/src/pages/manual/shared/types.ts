import type {
  ManualTestActivity,
  ManualTestCard,
  ManualTestCase,
  ManualTestColumn,
  ManualTestComment,
  ManualTestLinkedFlow,
  ManualTestPerson,
  ManualTestStep,
  ManualTestSurface,
} from '@duncit/gql-types';

/*
 * The shapes this console's documents select — the generated schema types,
 * narrowed to the fields each document actually asks for.
 */

export type ManualPerson = Pick<ManualTestPerson, 'id' | 'name' | 'photo'>;

export type ManualColumn = Pick<ManualTestColumn, 'id' | 'name' | 'order' | 'category' | 'wip_limit' | 'case_count'>;

export type ManualCard = Pick<
  ManualTestCard,
  'id' | 'key' | 'title' | 'type' | 'priority' | 'column_id' | 'rank' | 'labels' | 'due_date' | 'updated_at'
> & { __typename?: 'ManualTestCard'; assignee?: ManualPerson | null };

export interface BoardColumnData {
  column: ManualColumn;
  cases: ManualCard[];
  total: number;
}

export interface BoardData {
  manualTestBoard: { columns: BoardColumnData[] };
}

export type ManualRow = Pick<
  ManualTestCard,
  'id' | 'key' | 'title' | 'type' | 'priority' | 'column_id' | 'surface' | 'environment' | 'labels' | 'updated_at'
> & {
  column?: Pick<ManualTestColumn, 'id' | 'name' | 'category'> | null;
  assignee?: ManualPerson | null;
};

export type ManualCase = Pick<
  ManualTestCase,
  | 'id'
  | 'key'
  | 'title'
  | 'type'
  | 'priority'
  | 'column_id'
  | 'assignee_id'
  | 'reporter_id'
  | 'labels'
  | 'surface'
  | 'environment'
  | 'description'
  | 'preconditions'
  | 'expected_result'
  | 'actual_result'
  | 'due_date'
  | 'estimate_minutes'
  | 'created_at'
  | 'updated_at'
> & {
  steps: Pick<ManualTestStep, 'action' | 'expected'>[];
  column?: Pick<ManualTestColumn, 'id' | 'name' | 'category'> | null;
  assignee?: ManualPerson | null;
  reporter?: ManualPerson | null;
  e2e_flow?: Pick<ManualTestLinkedFlow, 'id' | 'name'> | null;
  e2e_sub_flow?: Pick<ManualTestLinkedFlow, 'id' | 'name'> | null;
};

export type ManualComment = Pick<
  ManualTestComment,
  'id' | 'body' | 'edited_at' | 'created_at' | 'can_edit' | 'can_delete'
> & { author?: ManualPerson | null };

export type ManualActivity = Pick<ManualTestActivity, 'id' | 'action' | 'field' | 'old_value' | 'new_value' | 'created_at'> & {
  actor: ManualPerson;
};

export type ManualSurface = Pick<ManualTestSurface, 'key' | 'name'>;

/** The board filter as the URL holds it — empty strings for "any". */
export interface BoardFilterValues {
  search: string;
  assignee: string;
  type: string;
  priority: string;
  label: string;
  surface: string;
}

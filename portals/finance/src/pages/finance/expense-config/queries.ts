import { gql } from '@apollo/client';

/**
 * The four Expense dropdowns, and the entity behind an expense.
 *
 * Every list on the Expense form, the Expense Settings screen and the
 * dashboard's filters is read from here. Nothing in this portal declares a
 * category, a payment method or a Related From type as a constant any more —
 * that is the whole point of the feature (rule 9 of the spec).
 */
const OPTION_FIELDS = `
  id
  kind
  key
  label
  entity_source
  sort_order
  is_active
  is_system
  usage_count
`;

/** The four independent lists, by their server-side `kind`. */
export const EXPENSE_OPTION_KINDS = [
  'RELATED_FROM_TYPE',
  'CATEGORY',
  'PAYMENT_METHOD',
  'COMPENSATION_METHOD',
] as const;
export type ExpenseOptionKind = (typeof EXPENSE_OPTION_KINDS)[number];

export const EXPENSE_OPTIONS = gql`
  query ExpenseOptions($kind: String!) {
    expenseOptions(kind: $kind) {
      id
      key
      label
      entity_source
    }
  }
`;

export const EXPENSE_OPTIONS_TABLE = gql`
  query ExpenseOptionsTable($kind: String!) {
    expenseOptionsTable(kind: $kind) {
      ${OPTION_FIELDS}
    }
    expenseEntitySources
  }
`;

export const CREATE_EXPENSE_OPTION = gql`
  mutation CreateExpenseOption($kind: String!, $input: ExpenseOptionInput!) {
    createExpenseOption(kind: $kind, input: $input) {
      ${OPTION_FIELDS}
    }
  }
`;

export const UPDATE_EXPENSE_OPTION = gql`
  mutation UpdateExpenseOption($option_id: ID!, $input: ExpenseOptionInput!) {
    updateExpenseOption(option_id: $option_id, input: $input) {
      ${OPTION_FIELDS}
    }
  }
`;

export const DELETE_EXPENSE_OPTION = gql`
  mutation DeleteExpenseOption($option_id: ID!) {
    deleteExpenseOption(option_id: $option_id)
  }
`;

export const EXPENSE_RELATED_ENTITIES = gql`
  query ExpenseRelatedEntities($type_key: String!, $search: String) {
    expenseRelatedEntities(type_key: $type_key, search: $search) {
      id
      name
      reference
    }
  }
`;

export const EXPENSE_RELATED_ENTITY = gql`
  query ExpenseRelatedEntity($type_key: String!, $entity_id: ID!) {
    expenseRelatedEntity(type_key: $type_key, entity_id: $entity_id) {
      id
      name
      reference
    }
  }
`;

export interface ExpenseOption {
  id: string;
  key: string;
  label: string;
  entity_source: string;
}

export interface ExpenseOptionRow extends ExpenseOption {
  kind: ExpenseOptionKind;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  /** Null on the form's read, which does not count usage. */
  usage_count: number | null;
}

export interface ExpenseRelatedEntity {
  id: string;
  name: string;
  reference: string;
}

/**
 * The four compensation states, which are the ONE list that stays in code.
 *
 * They are not configurable and must not be: the server derives them from the
 * money on every write, so an operator adding a fifth would create a state
 * nothing can ever put an expense into.
 */
export const COMPENSATION_STATUSES = ['PENDING', 'PARTIAL', 'FULL', 'REJECTED'] as const;
export type CompensationStatus = (typeof COMPENSATION_STATUSES)[number];

export const COMPENSATION_STATUS_COLORS = {
  PENDING: 'warning',
  PARTIAL: 'info',
  FULL: 'success',
  REJECTED: 'error',
} as const;

/**
 * Status -> translation key. Written out rather than composed: the rule-38 gate
 * only sees a key that appears somewhere as a quoted literal.
 */
export const COMPENSATION_STATUS_KEYS: Readonly<Record<CompensationStatus, string>> = {
  PENDING: 'finance.expenseConfig.statusPending',
  PARTIAL: 'finance.expenseConfig.statusPartial',
  FULL: 'finance.expenseConfig.statusFull',
  REJECTED: 'finance.expenseConfig.statusRejected',
};

/** Translation key per option list, for the Settings tab strip. */
export const KIND_LABEL_KEYS: Readonly<Record<ExpenseOptionKind, string>> = {
  RELATED_FROM_TYPE: 'finance.expenseConfig.kindRelatedFrom',
  CATEGORY: 'finance.expenseConfig.kindCategory',
  PAYMENT_METHOD: 'finance.expenseConfig.kindPaymentMethod',
  COMPENSATION_METHOD: 'finance.expenseConfig.kindCompensationMethod',
};

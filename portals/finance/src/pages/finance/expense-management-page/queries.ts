import { gql } from '@apollo/client';
import type { TableFilterValue, TableQueryState } from '@duncit/table';

const EXPENSE_FIELDS = `
  id
  date
  category
  amount
  refund_total
  net_amount
  description
  vendor_name
  payment_method
  reference
  attachment_url
  refunds {
    refund_id
    date
    amount
    note
  }
  created_at
`;

export const EXPENSES = gql`
  query Expenses($filter: ExpenseFilterInput) {
    expenses(filter: $filter) {
      ${EXPENSE_FIELDS}
    }
  }
`;

export const EXPENSES_TABLE = gql`
  query ExpensesTable($query: TableQueryInput) {
    expensesTable(query: $query) {
      total
      rows {
        ${EXPENSE_FIELDS}
      }
    }
  }
`;

export const EXPENSE_SUMMARY = gql`
  query ExpenseSummary($filter: ExpenseFilterInput) {
    expenseSummary(filter: $filter) {
      total
      gross_total
      refund_total
      count
      by_category {
        category
        total
      }
    }
  }
`;

export const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      ${EXPENSE_FIELDS}
    }
  }
`;

export const UPDATE_EXPENSE = gql`
  mutation UpdateExpense($id: ID!, $input: CreateExpenseInput!) {
    updateExpense(expense_doc_id: $id, input: $input) {
      ${EXPENSE_FIELDS}
    }
  }
`;

export const DELETE_EXPENSE = gql`
  mutation DeleteExpense($id: ID!) {
    deleteExpense(expense_doc_id: $id)
  }
`;

export const ADD_REFUND = gql`
  mutation AddExpenseRefund($id: ID!, $input: AddExpenseRefundInput!) {
    addExpenseRefund(expense_doc_id: $id, input: $input) {
      ${EXPENSE_FIELDS}
    }
  }
`;

export const REMOVE_REFUND = gql`
  mutation RemoveExpenseRefund($id: ID!, $refund_id: String!) {
    removeExpenseRefund(expense_doc_id: $id, refund_id: $refund_id) {
      ${EXPENSE_FIELDS}
    }
  }
`;

export const UPLOAD_FILE = gql`
  mutation UploadExpenseAttachment($fileBase64: String!, $fileName: String!, $mimeType: String, $folder: String) {
    uploadImageToImagekit(fileBase64: $fileBase64, fileName: $fileName, mimeType: $mimeType, folder: $folder) {
      url
    }
  }
`;

export const EXPENSE_CATEGORIES = [
  'RENT',
  'SALARY',
  'MARKETING',
  'UTILITIES',
  'SOFTWARE',
  'TRAVEL',
  'LOGISTICS',
  'OFFICE',
  'PROFESSIONAL_FEES',
  'OTHER',
];

export const PAYMENT_METHODS = ['UPI', 'BANK_TRANSFER', 'CASH', 'CARD', 'CHEQUE', 'OTHER'];

export const labelize = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');

export interface ExpenseSummaryFilter {
  search?: string;
  category?: string;
  payment_method?: string;
  from?: string;
  to?: string;
  min_amount?: number;
  max_amount?: number;
}

const rangeBounds = (f: TableFilterValue): [string | undefined, string | undefined] => {
  if (f.op === 'between') return [f.values?.[0], f.values?.[1]];
  if (f.op === 'gte') return [f.value, undefined];
  if (f.op === 'lte') return [undefined, f.value];
  return [undefined, undefined];
};

const applyExpenseFilter = (filter: ExpenseSummaryFilter, f: TableFilterValue) => {
  if (f.field === 'category' && f.op === 'eq' && f.value) filter.category = f.value;
  if (f.field === 'payment_method' && f.op === 'eq' && f.value) filter.payment_method = f.value;
  if (f.field === 'date') {
    const [from, to] = rangeBounds(f);
    if (from) filter.from = from;
    if (to) filter.to = to;
  }
  if (f.field === 'amount') {
    const [min, max] = rangeBounds(f);
    if (min) filter.min_amount = Number(min);
    if (max) filter.max_amount = Number(max);
  }
};

/** Maps the table's query state to ExpenseFilterInput so the summary chips
 * (gross/refunds/net/by-category) track the table's search + filters. */
export function tableStateToExpenseFilter(q: TableQueryState): ExpenseSummaryFilter | undefined {
  const filter: ExpenseSummaryFilter = {};
  const search = q.search.trim();
  if (search) filter.search = search;
  for (const f of q.filters) applyExpenseFilter(filter, f);
  return Object.keys(filter).length ? filter : undefined;
}

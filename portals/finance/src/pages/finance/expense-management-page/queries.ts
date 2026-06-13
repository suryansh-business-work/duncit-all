import { gql } from '@apollo/client';

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

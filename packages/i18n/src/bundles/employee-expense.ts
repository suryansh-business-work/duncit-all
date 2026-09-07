import type { NestedCatalogue } from '../catalogue';

/**
 * Employee expense claims — the copy for BOTH ends of one flow.
 *
 * The employee files a claim in the Employee console and Finance decides on it
 * in the Finance console, so the same claim is described twice on two different
 * surfaces. A namespace per PORTAL would mean two copies of "Awaiting review",
 * "Paid to" and every category label, and the two would drift the first time
 * somebody reworded one of them (rule 34).
 *
 * So this namespace is shipped by both: the Employee portal spreads it on its
 * own, the Finance portal layers it over FINANCE_BUNDLE. `mine.*` is what only
 * the claimant sees, `review.*` is what only Finance sees, and everything else
 * — the columns, the statuses, the form, the validation — is shared.
 */
export const EMPLOYEE_EXPENSE_BUNDLE: NestedCatalogue = {
  employeeExpense: {
    // The Employee console's own page.
    mine: {
      title: 'My Expenses',
      subtitle:
        'Claim back what you paid out of pocket. Finance reviews every claim before it is paid.',
      newClaim: 'New claim',
      editClaim: 'Edit claim',
      fileClaim: 'File claim',
      empty: 'You have not filed an expense claim yet.',
      search: 'Search claim id, merchant or reference',
      totalClaimed: 'Total claimed',
      awaitingReview: 'Awaiting review',
      approved: 'Approved',
      rejected: 'Rejected',
      claimsFiled: '{count} claim(s) filed',
      awaitingCount: '{count} awaiting a decision',
      approvedCount: '{count} approved',
      rejectedCount: '{count} rejected',
      lockedHint: 'A claim can only be changed while it is still awaiting review.',
      withdraw: 'Withdraw claim',
      withdrawTitle: 'Withdraw this claim?',
      withdrawBody:
        'Claim {claim} for {amount} will be removed. You can always file it again.',
    },

    // The Finance console's approval queue.
    review: {
      title: 'Employee Expenses',
      subtitle:
        'What employees paid out of pocket, and what you decided. An approved claim is money Duncit owes the person.',
      empty: 'No claims match these filters.',
      search: 'Search employee, claim id, merchant or reference',
      pendingValue: 'Awaiting your decision',
      approvedValue: 'Approved',
      rejectedValue: 'Rejected',
      claimedValue: 'Claimed all time',
      employeesCount: 'across {count} employee(s)',
      claimsCount: '{count} claim(s)',
      tabPending: 'Awaiting review',
      tabApproved: 'Approved',
      tabRejected: 'Rejected',
      tabAll: 'All claims',
      openClaim: 'Review claim',
      approve: 'Approve',
      reject: 'Reject',
      noteLabel: 'Note to the employee',
      noteHintApprove: 'Optional — anything the employee should know.',
      noteHintReject: 'Required — tell the employee why this was rejected.',
      alreadyDecided: 'This claim has already been decided.',
      noBillWarning: 'No bill is attached to this claim.',
      decidedBy: 'Decided {when}',
    },

    // Shared by both lists.
    col: {
      claim: 'Claim',
      employee: 'Employee',
      date: 'Spend date',
      category: 'Category',
      merchant: 'Paid to',
      spend: 'Spent on',
      amount: 'Amount',
      status: 'Status',
      bill: 'Bill',
      reviewed: 'Reviewed',
    },

    status: {
      PENDING: 'Awaiting review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
    },

    bill: {
      missing: 'Not attached',
      view: 'View bill',
    },

    // The claim form, shared by the employee's dialog and Finance's read-only
    // detail panel.
    form: {
      spendDate: 'Spend date',
      category: 'Category',
      amount: 'Amount',
      merchant: 'Paid to',
      paymentMethod: 'How you paid',
      billNumber: 'Bill / invoice number',
      billUpload: 'Bill or receipt',
      billUploadHint: 'Image or PDF. Attach it now or add it before Finance reviews the claim.',
      upload: 'Upload',
      reference: 'Reference / transaction id',
      description: 'What it was for',
      pickASpendDate: 'Pick the day you paid',
      pickACategory: 'Pick a category',
      pickAPaymentMethod: 'Pick how you paid',
      enterAnAmountGreaterThan0: 'Enter an amount greater than 0',
      tooLong: 'Too long',
    },
  },
};

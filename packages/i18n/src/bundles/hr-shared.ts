import type { NestedCatalogue } from '../catalogue';

/**
 * Payroll, leave, holidays and salary-account changes — the words every
 * console that shows them shares: statuses, issues, kinds, and the validation
 * messages of the `@duncit/forms` HR schemas. Shipped by the HR, Finance and
 * Employee consoles, each of which adds its own screen copy in its own bundle.
 */
export const HR_SHARED_BUNDLE: NestedCatalogue = {
  hrShared: {
    runStatus: { DRAFT: 'Draft', APPROVED: 'Approved by HR', RELEASED: 'Released', COMPLETED: 'Paid' },
    issue: {
      NO_COMPENSATION: 'No pay revision',
      NO_BANK: 'No bank account',
      NEGATIVE_NET: 'Deductions exceed earnings',
      UNSUPPORTED_CURRENCY: 'Not paid in rupees',
      PENDING_LEAVE: 'Leave waiting for a decision',
      TARGET_NOT_REVIEWED: 'Target not reviewed yet',
    },
    payoutStatus: { PROCESSING: 'Processing', PAID: 'Paid', FAILED: 'Failed' },
    payslipStatus: {
      ON_HOLD: 'On hold',
      NOT_PAYABLE: 'Nothing to pay',
      SCHEDULED: 'Scheduled',
      PROCESSING: 'Processing',
      PAID: 'Paid',
      FAILED: 'Payment delayed',
    },
    payTiming: { SAME_MONTH: 'In the same month', NEXT_MONTH: 'In the next month' },
    adjustmentType: { EARNING: 'Earning', DEDUCTION: 'Deduction' },
    leaveStatus: { PENDING: 'Waiting', APPROVED: 'Approved', REJECTED: 'Declined', CANCELLED: 'Cancelled' },
    halfDay: { FIRST_HALF: 'First half', SECOND_HALF: 'Second half' },
    accrual: { YEARLY: 'All at the start of the year', MONTHLY: 'A twelfth each month' },
    bankStatus: { PENDING: 'Waiting for HR', APPROVED: 'Approved', REJECTED: 'Declined', CANCELLED: 'Withdrawn' },
    calendarKind: { HOLIDAY: 'Holiday', LEAVE: 'Your leave', TEAM_LEAVE: 'Team leave', PAYDAY: 'Payday', TARGET_DUE: 'Target report due' },
    form: {
      required: 'This is required',
      tooLong: 'Must be at most {max} characters',
      dateInvalid: 'Choose a valid date',
      endBeforeStart: 'The last day cannot be before the first day',
      halfDaySameDate: 'A half day must start and end on the same date',
      spanMax: 'One request can cover at most {max} days',
      noteRequired: 'Write at least 3 characters',
      leaveTypeRequired: 'Choose a leave type',
      numberRequired: 'Enter a number',
      daysRange: '{what} must be between 0 and {max} days',
      halfSteps: 'Use steps of half a day',
      codeInvalid: 'Use 1-12 capital letters, digits or _, starting with a letter',
      quotaLabel: 'The yearly quota',
      carryLabel: 'The carry-forward limit',
      weeklyOffsMax: 'Keep at least one working day in the week',
      wholeNumber: 'Enter a whole number',
      backdateRange: 'Choose 0 to {max} days',
      adjustRange: 'Adjust by at most {max} days',
      adjustNonZero: 'Adjust by more than zero days',
      holderRequired: 'Enter the name on the account',
      accountNumberInvalid: 'An account number is 6 to 18 digits',
      ifscInvalid: 'Enter a valid IFSC, for example HDFC0001234',
      proofRequired: 'Upload a cancelled cheque or the first page of your passbook',
      accountsMismatch: 'The account numbers do not match',
      amountPositive: 'Enter an amount above zero',
      amountTooLarge: 'That amount is too large',
      twoDecimals: 'Use at most two decimals',
      payOnPast: 'The pay date cannot be in the past',
      payOnTooFar: 'The pay date can be at most {max} days ahead',
      payDayRange: 'Choose a day from {min} to {max}',
      leadDaysRange: 'Choose {min} to {max} days',
      monthRequired: 'Choose a month',
    },
  },
};

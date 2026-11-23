/**
 * Who may move money on a payment. One list, read by `refundPayment`, by the
 * refund-to-source action and by the Refund area's `can_refund` flag, so the
 * button and the server can never disagree about who is allowed to press it.
 */
export const PAYMENT_WRITE_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

import type { NestedCatalogue } from '../catalogue';

/**
 * The Finance portal's own namespace, layered over the shell's by `mountPortal`.
 *
 * Only the payment screens are keyed so far — the Payment Logs list and the
 * per-payment audit page. The rest of the portal still ships plain strings, so
 * this bundle is deliberately the beginning of that sweep rather than a
 * half-finished map of the whole portal: a key nobody renders fails the Shared
 * Gates check, so keys arrive with the screens that use them.
 *
 * Two things on the audit page are NOT keyed here on purpose:
 *  - `PaymentStep.label` / `.detail`, which the SERVER composes (it names the
 *    pipeline step and carries the failure message); localizing those means
 *    returning a key from the resolver, which is a server change, not copy.
 *  - Enum-ish values echoed straight from the database (fulfilment status,
 *    coupon discount type, gateway name) — they are data, not sentences.
 */
export const FINANCE_BUNDLE: NestedCatalogue = {
  finance: {
    payment: {
      // The Payment Logs list.
      logsTitle: 'Payment Logs',
      logsEmpty: 'No payments yet.',
      logsSearch: 'Search txn id, invoice, name or email',
      colWhen: 'When',
      colCustomer: 'Customer',
      colDescription: 'Description',
      colSubtotal: 'Subtotal',
      colFee: 'Fee',
      colGst: 'GST',
      colTotal: 'Total',
      colStatus: 'Status',
      colIds: 'IDs',
      colPaidAt: 'Paid at',
      colGateway: 'Gateway',
      colActions: 'Actions',
      statusPending: 'Pending',
      statusSuccess: 'Success',
      statusFailed: 'Failed',
      statusRefunded: 'Refunded',
      downloadInvoice: 'Download invoice',
      noInvoiceGenerated: 'No invoice generated',
      refund: 'Refund',
      refundOnlySuccess: 'Only successful payments can be refunded',
      invoiceUnavailable: 'Invoice not available',
      invoiceDownloadFailed: 'Could not download invoice',
      refundFailed: 'Refund failed',
      // The refund confirmation.
      refundDialogTitle: 'Refund payment',
      refundReason: 'Reason (optional)',
      cancel: 'Cancel',
      refunding: 'Refunding…',
      confirmRefund: 'Confirm refund',

      // The audit page.
      backToLogs: 'Back to Payment Logs',
      notFound: 'Payment not found.',
      noInvoiceNumber: 'No invoice number',
      notPaid: 'not paid',
      // The three states Finance must not be able to miss.
      refundRequired: 'Refund required',
      refundRequiredBody:
        'The money was captured but the booking could not be written. Nothing was created for this payment — refund it.',
      finalizeFailedTitle: 'Checkout finalization failed',
      finalizeFailedBody:
        'Part of what this payment was supposed to create was never written. Check the pipeline steps below, then re-run or refund.',
      stillFinishingTitle: 'Still finishing',
      stillFinishingBody:
        'The booking itself was written, but the follow-up work (invoice PDF, receipt email, shipment) has not all completed yet.',

      // The money waterfall. `platformFeeNote` is the line that stops anyone
      // reading the fee as an addend — see AmountBreakupCard.
      amountBreakup: 'Amount Breakup',
      originalTotal: 'Original total',
      couponDiscount: 'Coupon discount',
      couponDiscountWith: 'Coupon discount ({code})',
      coinsRedeemedLine: 'Coins redeemed ({n})',
      subtotalNetGst: 'Subtotal (net of GST)',
      gstPct: 'GST ({pct}%)',
      totalCharged: 'Total charged',
      duncitShare: "Of which Duncit's share",
      platformFeeOfSubtotal: 'Platform fee ({pct}% of subtotal)',
      platformFeeNote:
        "Already included in the total charged above — Duncit's revenue is carved out of the subtotal, not added to it.",

      // What checkout created.
      artifactsTitle: 'What checkout created',
      artifactsCaption: 'Each row is verified against the database, not the pipeline log.',
      artifactCreated: 'Created',
      artifactNotApplicable: 'Not applicable',
      artifactMissing: 'Missing',
      artifactItem: 'Item',
      artifactReference: 'Reference',
      artifactsEmpty: 'Nothing was recorded for this payment.',
      artifactsSearch: 'Search item or reference',
      recordCount: '{n} records',

      // The pipeline.
      stepsTitle: 'Pipeline steps',
      stepsEmpty:
        'This payment was finalized before step tracking shipped — see the table above for what exists.',
      finalizeAttemptsOne: '{n} finalize attempt',
      finalizeAttemptsMany: '{n} finalize attempts',
      stepNotRun: 'not run',

      // Duncit Coins. The card renders even when nothing moved, because an
      // absence is a fact Finance needs to see rather than a missing card.
      coinsTitle: 'Duncit Coins',
      coinsSpent: 'Coins spent',
      coinsEarned: 'Coins earned',
      coinsEmpty: 'No coins were used on this payment.',
      balanceAfter: 'Balance after',
      coinSource: 'Source',
      coinReason: 'Reason',
      earnRate: 'Earn rate',

      // The coupon.
      couponTitle: 'Coupon',
      couponCode: 'Code',
      discountCharged: 'Discount charged',
      discountType: 'Discount type',
      discountValue: 'Discount value',
      couponName: 'Title',
      couponDeleted: 'This coupon has since been deleted.',

      // The booking.
      podBookingTitle: 'Pod booking',
      pod: 'Pod',
      podDate: 'Date',
      seats: 'Seats',
      membership: 'Membership',
      membershipStatus: 'Membership status',
      ticketCode: 'Ticket code',
      ticketStatus: 'Ticket status',

      // Product orders.
      ordersTitle: 'Product orders',
      orderNo: 'Order no',
      orderMethod: 'Method',
      orderStatus: 'Status',
      orderItems: 'Items',
      orderTotal: 'Total',
      orderAwb: 'AWB',
      ordersEmpty: 'No product orders on this payment.',
      ordersSearch: 'Search order no or AWB',

      // Customer + billing.
      customerTitle: 'Customer & billing',
      customerName: 'Name',
      customerEmail: 'Email',
      customerPhone: 'Phone',
      billTo: 'Bill to',
      billingEmail: 'Billing email',
      billingPhone: 'Billing phone',
      gstin: 'GSTIN',
      billingAddress: 'Address',
      gatewayReference: 'Gateway reference',
    },
  },
};

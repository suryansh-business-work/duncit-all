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
      // Both halves of the coin movement a payment caused. Hidden columns by
      // default — most orders spend no coins — but they are what makes a total
      // smaller than its line items explainable.
      colCoinsUsed: 'Coins used',
      colCoinsEarned: 'Coins earned',
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
      artifactStatus: 'Status',
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
    // Finance > Gift Cards — the dashboard, the card book and the ledger.
    /**
     * Withdrawal Payments, which is now two screens: the pod list and one pod's
     * requests. Only the NEW copy is keyed — the per-withdrawal table below the
     * drill-down is older and still ships plain strings, so its columns are not
     * here. Keys arrive with the screens that render them (see the note above).
     */
    withdrawals: {
      title: 'Withdrawal Payments',
      subtitle:
        'Withdrawal requests raised against each pod by hosts, venue owners, e-commerce brands and club admins.',
      colPodTitle: 'Pod Title',
      colRequestedFrom: 'Requested From',
      colStatus: 'Status',
      // A pod is only settled once every request against it has been paid.
      statusPending: 'Pending',
      statusApproved: 'Approved',
      searchPods: 'Search pod title',
      empty: 'No withdrawals have been requested against any pod yet.',
      // Says WHY the list is empty, so a role filter never reads as "no data".
      emptyForRole: 'No pod has a withdrawal request from a {role} yet.',
      roleFilter: 'Role',
      roleAll: 'All roles',
      roleHost: 'Host',
      roleVenueOwner: 'Venue Owner',
      roleEcommBrand: 'E-Commerce Brand',
      roleClubAdmin: 'Club Admin',
      // The one pod's requests.
      back: 'Back to Withdrawal Payments',
      detailSubtitle: 'Every withdrawal request raised against this pod.',
      detailEmpty: 'No withdrawal requests for this pod.',
      notFound: 'This pod has no withdrawal requests.',
    },
    giftCards: {
      dashboardTitle: 'Gift Cards',
      periodLabel: 'Period',
      months: '{n} months',
      tileSold: 'Cards sold',
      tileSoldValue: 'Value sold',
      tileRedeemedValue: 'Converted to coins',
      tileOutstanding: 'Outstanding liability',
      tileExpired: 'Expired unredeemed',
      tileValidity: 'Validity',
      validityMonths: '{n} months from purchase',
      monthlyTitle: 'Sold vs redeemed by month',
      chartSold: 'Sold',
      chartRedeemed: 'Redeemed',
      // Cards page
      cardsTitle: 'Gift Cards — Cards',
      cardsSearch: 'Search code, recipient, payment id',
      cardsEmpty: 'No gift cards sold yet.',
      colCode: 'Code',
      colTheme: 'Theme',
      colAmount: 'Amount',
      colStatus: 'Status',
      colBuyer: 'Buyer',
      colRecipient: 'Recipient',
      colRedeemer: 'Redeemed by',
      colExpires: 'Expires',
      colCreated: 'Purchased',
      colPayment: 'Payment',
      statusActive: 'Active',
      statusRedeemed: 'Redeemed',
      statusExpired: 'Expired',
      themeShop: 'Pod Shop',
      // Logs page
      logsTitle: 'Gift Cards — Logs',
      logsSearch: 'Search code or payment id',
      logsEmpty: 'No gift card activity yet.',
      colWhen: 'When',
      colUser: 'User',
      colType: 'Type',
      colSource: 'Source',
      colBalanceAfter: 'Balance after',
      typeIssue: 'Issued',
      typeRedeem: 'Redeemed',
      // Settings card (on the dashboard)
      settingsTitle: 'Sales policy',
      denominationsLabel: 'Amount presets',
      denominationsHint: 'Comma-separated whole rupees, e.g. 500, 1000, 2000',
      minAmountLabel: 'Minimum amount',
      maxAmountLabel: 'Maximum amount',
      validityLabel: 'Validity (months)',
      saveSettings: 'Save policy',
      settingsSaved: 'Gift card policy saved',
      settingsError: 'The policy could not be saved. Please try again.',
    },
  },
};

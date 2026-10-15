import type { CatalogueFlow } from './catalogue.types';

/**
 * Staff-portal scenarios the catalogue was missing: Finance, Legal, Tech, Communications,
 * Marketing, Analytics, Logs, Admin, the shared portal shell and the server role gates.
 * Flows that share a name with another catalogue file are merged into it by index.ts.
 */
export const STAFF_GAP_FLOWS: readonly CatalogueFlow[] = [
  {
    name: 'Finance: Food Menu Defaults',
    description:
      'Finance\'s default GST on venue QR food orders (tax mode INCLUSIVE or EXCLUSIVE and a whole GST % from 0 to 28) at /food-menu-defaults, used by every venue that does not set its own GST. Read by SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER and FINANCE_USER; written only by SUPER_ADMIN or FINANCE_MANAGER (a city-bound CITY_ADMIN is refused as a platform-wide setting).',
    sub_flows: [
      {
        name: 'Set GST mode (inclusive/exclusive) and the default GST rate',
        description:
          'updateFoodTaxDefaults stores tax_mode and gst_pct on the finance settings and foodTaxDefaults returns them after a reload; the actor is recorded in a server log line (finance-settings / foodTaxDefaults with actorId, before and after), not on the settings document.',
        steps: [
          [
            'Sign in to finance.duncit.com as FINANCE_MANAGER and open /food-menu-defaults',
            'Header "Food Menu Defaults" / "How GST meets the food prices of venues that take QR orders." with an info alert starting "Every venue follows these unless it sets its own GST."',
          ],
          [
            'Read the form on a fresh settings row',
            'Radio group "GST on menu prices" with "GST added to prices" selected, field "GST %" reading 5, and Save disabled until something changes',
          ],
          [
            'Choose "Prices include GST" and set GST % to 12',
            'Save enables',
          ],
          [
            'Click Save',
            'Button reads "Saving…", then toast "Food menu defaults saved"; the form re-opens clean on the stored values',
          ],
          [
            'Reload the page',
            'The form shows "Prices include GST" and 12 (the foodTaxDefaults query returns INCLUSIVE and 12)',
          ],
          [
            'Check the server logs for the save',
            'One info line under finance-settings / foodTaxDefaults carrying the FINANCE_MANAGER user id with before EXCLUSIVE 5 and after INCLUSIVE 12',
          ],
        ],
      },
      {
        name: 'GST rate out of range or unknown tax mode is refused',
        description:
          'The form (shared @duncit/forms food-tax schema) and the server both refuse a GST % outside 0 to 28 (VENUE_FOOD_GST_PCT_MAX) or a fractional one; an unknown tax mode never reaches the resolver because FoodTaxMode is a GraphQL enum. Stored defaults stay unchanged.',
        steps: [
          [
            'On /food-menu-defaults enter 30 in "GST %" and leave the field',
            'Field error "GST must be a whole number from 0 to 28." and nothing is sent',
          ],
          [
            'Call updateFoodTaxDefaults with input { tax_mode: EXCLUSIVE, gst_pct: 30 } as FINANCE_MANAGER',
            'BAD_USER_INPUT "GST must be a whole number from 0 to 28"',
          ],
          [
            'Call it with gst_pct -1',
            'BAD_USER_INPUT "GST must be a whole number from 0 to 28"',
          ],
          [
            'Call it with tax_mode MIXED',
            'GraphQL validation error that the value does not exist in the FoodTaxMode enum; the resolver does not run',
          ],
          [
            'Query foodTaxDefaults',
            'tax_mode and gst_pct are exactly what they were before the refused calls',
          ],
        ],
      },
      {
        name: 'Non-finance role cannot change food tax defaults',
        description:
          'updateFoodTaxDefaults requires SUPER_ADMIN, CITY_ADMIN or FINANCE_MANAGER and then refuses a city-bound admin as a platform-wide write; FINANCE_USER can read the defaults but not change them.',
        steps: [
          [
            'Call updateFoodTaxDefaults with no token',
            '"Not authenticated" (UNAUTHENTICATED)',
          ],
          [
            'Call it with a VENUE_OWNER token',
            '"Access Denied" (FORBIDDEN)',
          ],
          [
            'Call it with a SUPPORT_MANAGER token',
            '"Access Denied" (FORBIDDEN)',
          ],
          [
            'Call it with a FINANCE_USER token',
            '"Access Denied" (FORBIDDEN); the same token can still read foodTaxDefaults',
          ],
          [
            'Call it with a CITY_ADMIN token that has an assigned city and no FINANCE_MANAGER role',
            'FORBIDDEN "Only Finance or a super admin can change platform-wide finance settings"',
          ],
          [
            'Query foodTaxDefaults as FINANCE_MANAGER',
            'The defaults are unchanged',
          ],
        ],
      },
      {
        name: 'Default GST flows into a food order invoice (inclusive vs exclusive)',
        description:
          'Tax is per venue, not per menu item: a venue whose "Set this venue\'s own GST" switch is off prices orders with Finance\'s default (effectiveFoodTax). EXCLUSIVE adds round(net x pct / 100) on top; INCLUSIVE backs the tax out of the net and the total does not move. The order freezes the tax it was placed with and the invoice PDF splits it into CGST and SGST halves that add up to the tax exactly.',
        steps: [
          [
            'On /food-menu-defaults save "GST added to prices" with GST % 5',
            'Toast "Food menu defaults saved"',
          ],
          [
            'As a guest open the venue at /venue/:id?selectedtab=menu (venue own GST switched off), add one ₹200 item and place and pay the order',
            'The order total is ₹210: taxable ₹200 plus ₹10 GST',
          ],
          [
            'Download the invoice from the order page',
            'The PDF lists Subtotal ₹200, Taxable value ₹200, CGST (2.5%) ₹5, SGST (2.5%) ₹5 and "Total paid" ₹210',
          ],
          [
            'Back in Finance save "Prices include GST" with GST % 5 and place the same ₹200 order again',
            'The total stays ₹200: taxable ₹190.48 and tax ₹9.52',
          ],
          [
            'Download the second invoice',
            'CGST (2.5%) ₹4.76 and SGST (2.5%) ₹4.76; Taxable value plus both halves equals "Total paid" ₹200 to the paisa',
          ],
          [
            'Re-download the first invoice',
            'It still shows the exclusive 5% figures it was placed with',
          ],
          [
            'Turn on the venue\'s own GST at 18% and place another order',
            'That venue\'s order uses 18%, ignoring the Finance default',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Payment Logs',
    description:
      'Payment Logs and the per-shop logs, order refunds, round offs and user refund logs.',
    sub_flows: [
      {
        name: 'Food orders never create a platform Payment or payout',
        description:
          'A venue QR food order is paid into the venue\'s own Razorpay account and lives only on VenueFoodOrder; it never writes a Payment, wallet credit, payment release or withdrawal, so no Finance money page lists it.',
        steps: [
          [
            'As a guest place and pay a food order at a venue that takes QR orders',
            'The order shows as paid on the guest order page',
          ],
          [
            'Open /payment-logs and search the guest\'s name or email',
            'No row for the food order; the KPI cards do not change',
          ],
          [
            'Open /round-offs and /user-refund-logs and search the same guest',
            'No row for the food order',
          ],
          [
            'Open /payment-release',
            'No release request is created for the food order or its venue',
          ],
          [
            'Open /withdrawals and check the venue owner\'s wallet',
            'No pod, request or wallet credit comes from the food order',
          ],
          [
            'Cancel the food order from the venue side so it refunds',
            'The refund goes back through the venue\'s Razorpay; /user-refund-logs still shows nothing for it',
          ],
        ],
      },
      {
        name: 'Browse payment round-offs',
        description:
          'Read-only /round-offs lists every payment whose bill was rounded up to a whole rupee (pod bookings, Pod Shop cart, pet store, gift cards) with server totals over the whole filter; opening a row goes to that payment.',
        steps: [
          [
            'Open /round-offs',
            'Header "Round Offs" with the subtitle "Every bill is rounded up to the next whole rupee before coins are applied..." and totals "Payments rounded", "Round off added" and "Round off collected"',
          ],
          [
            'Read a row for a pod booking whose bill was ₹249.40',
            'Source "Pod booking", "Amount before round off" ₹249.40 and "Round off" ₹0.60',
          ],
          [
            'Filter Source to "Ecomm (pet store)"',
            'Only pet-store payments remain and the totals follow the filter, not just the visible page',
          ],
          [
            'Compare "Round off collected" with "Round off added" when a failed payment is in the filter',
            '"Round off collected" counts only successful payments, so it is lower',
          ],
          [
            'Click a row',
            'Navigates to /payment-logs/:id for that payment',
          ],
          [
            'On a clean database open /round-offs',
            'Empty text "No payment has needed rounding yet."',
          ],
        ],
      },
      {
        name: 'Pod Shop payment logs',
        description:
          'shopPaymentsTable(shop: POD_SHOP) is scoped by the server to non-pet-store payments that are shop carts or pod bookings with shop add-ons, so a pet-store payment can never appear; read roles are the Payment Logs ones (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER, FINANCE_USER, LOGS_MANAGER).',
        steps: [
          [
            'Open /pod-shop/payment-logs',
            'Header "Pod Shop — Payment Logs" with the subtitle ending "Pet-store payments are never listed here." and the KPI cards',
          ],
          [
            'Read a shop cart payment and a pod booking that carried add-ons',
            'Column "Checkout" reads "Shop cart" and "Pod booking add-on" respectively, with status and total',
          ],
          [
            'Search the buyer of a pet-store order',
            'No row appears',
          ],
          [
            'Search a pod booking with no shop add-ons',
            'No row appears',
          ],
          [
            'Click a row',
            'Navigates to /payment-logs/:id',
          ],
          [
            'Call shopPaymentsTable with a SUPPORT_MANAGER token',
            '"Access Denied" (FORBIDDEN)',
          ],
        ],
      },
      {
        name: 'Pod Shop order refunds',
        description:
          'Read-only order-level refunds (a cancelled order or a returned item) for the Pod Shop only, showing where the money went back; there is no reason column, the Status column carries the refund state and a failure reason column explains a refused gateway refund.',
        steps: [
          [
            'Open /pod-shop/order-refunds',
            'Header "Pod Shop — Order Refunds" with the subtitle ending "Pet-store refunds are never listed here." and totals Refunds, "Refunded to original payment", "Duncit Coins refunded", "Manual payout needed"',
          ],
          [
            'Read the row of a cancelled pod-shop order paid by Razorpay and coins',
            'Kind "Cancellation", Order total, "To original payment (Razorpay)", "Duncit Coins refunded", "Total refunded" and "Refunded to" "Razorpay + Coins"',
          ],
          [
            'Read the row of a returned item',
            'Kind "Return" with the return number under "Order / return no"',
          ],
          [
            'Read a refund Razorpay refused',
            'Status "Failed", "Manual payout needed" set and a "Failure reason"',
          ],
          [
            'Search the buyer of a pet-store refund',
            'No row appears',
          ],
          [
            'Click a row',
            'Navigates to the refunded payment at /payment-logs/:id',
          ],
        ],
      },
      {
        name: 'Ecomm store payment logs',
        description:
          'shopPaymentsTable(shop: ECOMM) is fixed by the server to payments stamped metadata.store.channel PET_STORE (ecomm.duncit.com), Cash on Delivery included; Pod Shop payments never appear.',
        steps: [
          [
            'Open /ecomm/payment-logs',
            'Header "Ecomm (Pet Store) — Payment Logs" with the subtitle ending "Pod Shop payments are never listed here."',
          ],
          [
            'Read a prepaid pet-store order and a Cash on Delivery order',
            'Column "Payment method" reads "Prepaid" and "Cash on Delivery"',
          ],
          [
            'Search the buyer of a Pod Shop cart',
            'No row appears',
          ],
          [
            'Compare the KPI cards with /payment-logs',
            'The ecomm cards count only pet-store payments',
          ],
          [
            'Call shopPaymentsTable with shop ECOMM using an ECOMM_MANAGER token',
            '"Access Denied" (FORBIDDEN)',
          ],
        ],
      },
      {
        name: 'Ecomm order refunds',
        description:
          'Read-only pet-store refunds (cancellations, including a force cancel and refund, and refunded returns) whose amounts match the order; pet-store refunds are not sent to Razorpay, Finance pays them back by hand.',
        steps: [
          [
            'Open /ecomm/order-refunds',
            'Header "Ecomm (Pet Store) — Order Refunds" with the subtitle ending "Pod Shop refunds are never listed here."',
          ],
          [
            'Force cancel and refund a paid pet-store order from the Products console, then reload',
            'A "Cancellation" row appears whose "Total refunded" equals the order total',
          ],
          [
            'Hover the "Manual payout needed" total',
            'Hint "Pet-store refunds are not sent to Razorpay: Finance pays the amount back to the original payment method."',
          ],
          [
            'Search the buyer of a Pod Shop refund',
            'No row appears',
          ],
          [
            'Click a row',
            'Navigates to /payment-logs/:id of the refunded payment',
          ],
        ],
      },
      {
        name: 'Every refund the platform paid back is listed',
        description:
          'userRefundsTable lists every payment stamped metadata.refunded_at by the four refund writers (admin refundPayment, pod cancellation, delayed release of a held cancellation refund, a filled Backout); Pod Shop and pet-store order refunds are on the Order Refunds pages instead. The same page is mounted in the Logs console.',
        steps: [
          [
            'Open /user-refund-logs',
            'Header "User Refund Logs" with the subtitle "Every refund paid back to a buyer — from the admin console, a cancelled pod, or a Backout whose spot was filled."',
          ],
          [
            'Refund a payment from /payment-logs and reload',
            'A row with "Refund amount" equal to the total, Kind "Full", the Reason and "Initiated by" "Finance console"',
          ],
          [
            'Process a Backout refund for a buyer who keeps other seats',
            'A row with Kind "Part" and the payment status still successful',
          ],
          [
            'Cancel a pod with paid attendees as its host',
            'Each attendee payment appears with its refunded amount',
          ],
          [
            'Place a payment on refund hold and search it',
            'It does not appear until the refund is released',
          ],
          [
            'Open logs.duncit.com/user-refund-logs as LOGS_MANAGER',
            'The same table loads',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Payment Release',
    description:
      'Per-pod payment release requests at /payment-release and /payment-release/:requestId.',
    sub_flows: [
      {
        name: 'Approve all payouts of one pod from the per-pod release page',
        description:
          'approvePodPaymentRelease (SUPER_ADMIN, CITY_ADMIN in scope, FINANCE_MANAGER) approves every PENDING payout on the request in full, credits each beneficiary wallet and the page shows the same four-way split, host first, the payouts were cut from.',
        steps: [
          [
            'Open /payment-release and click a completed pod\'s row',
            'Navigates to /payment-release/:requestId with the pod title, a status chip, "Total requested" and sections Payouts, Settlement and "Pod media" (plus the venue bill when there is one)',
          ],
          [
            'Read the Settlement section',
            'Host earning first, then "Venue Take", "Club Admin Take" and "Duncit Commission & Govt Charges", adding back to the collection',
          ],
          [
            'Click "Approve all payouts"',
            'Confirm "Approve this pod’s payouts?" — "Every pending payout on this request — <amount> in total — is approved in full and credited to its beneficiary’s wallet. This cannot be undone."',
          ],
          [
            'Confirm',
            'Toast "Payouts approved and credited to the wallets."; every payout reads approved with its "Approved amount" and the button disappears',
          ],
          [
            'Check the host, venue owner and club admin wallets',
            'Each is credited exactly its payout and the amounts match the Settlement section',
          ],
          [
            'Call approvePodPaymentRelease again for the same id',
            'BAD_USER_INPUT "Nothing on this request is waiting for approval"',
          ],
          [
            'Call it with a ZONAL_ADMIN token',
            '"Access Denied" (FORBIDDEN)',
          ],
        ],
      },
      {
        name: 'Double or concurrent approval credits wallets only once',
        description:
          'approveGroup claims each payout with an atomic PENDING to APPROVED update before crediting, so a second approver racing the first skips any payout already claimed; a payout whose credit fails is put back to PENDING and named in the error so it can be retried.',
        steps: [
          [
            'Fire two approvePodPaymentRelease calls for the same request id in parallel as FINANCE_MANAGER',
            'Neither returns a second credit: the loser either skips every claimed payout and returns the detail, or answers "Nothing on this request is waiting for approval"',
          ],
          [
            'Read each beneficiary wallet\'s transactions',
            'Exactly one payout credit per payee for this pod',
          ],
          [
            'Read the releases on the request',
            'Each payout is APPROVED once with a single reviewed_by and reviewed_at',
          ],
          [
            'Make one payee\'s wallet credit fail, then approve all',
            'Error "Could not pay <release id>. Nothing was lost — those are still pending, approve again to retry."; the other payouts are approved',
          ],
          [
            'Fix the failure and approve again',
            'Only the payout left PENDING is credited; the others are not credited twice',
          ],
        ],
      },
      {
        name: 'CITY_ADMIN cannot approve payouts or refunds for another city\'s pod',
        description:
          'Finance money writes are city/zone scoped by financeScope.ts assertPodFinanceScope (not rbac assertScope), so the refusal text is "This is outside the city or zone you administer", not "Out of city scope"; FINANCE_MANAGER and SUPER_ADMIN are never city-bound.',
        steps: [
          [
            'As a CITY_ADMIN with assigned_city A, call approvePodPaymentRelease(id) for a release batch that holds a city-B pod',
            'FORBIDDEN "This is outside the city or zone you administer"; nothing is approved or paid',
          ],
          [
            'As the same CITY_ADMIN, call refundPayment(payment_doc_id) for a booking of a city-B pod',
            'FORBIDDEN "This is outside the city or zone you administer"; the payment is not refunded',
          ],
          [
            'Call reviewPaymentReleaseRequest(request_id) for a city-B pod\'s release request',
            'FORBIDDEN "This is outside the city or zone you administer"',
          ],
          [
            'Repeat refundPayment as a CITY_ADMIN with no assigned_city, or for a payment tied to no pod',
            'Refused with the same message: the scope check is fail-closed',
          ],
          [
            'Call approvePodPaymentRelease for a batch whose pods are all in city A',
            'The scope check passes and the batch is approved',
          ],
          [
            'As FINANCE_MANAGER, call approvePodPaymentRelease and refundPayment for the city-B pod',
            'Both succeed: FINANCE_MANAGER is not city-bound',
          ],
        ],
      },
      {
        name: 'ZONAL_ADMIN can raise a release request but not approve it',
        description:
          'createPaymentReleaseRequest accepts ADMIN_POD (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER) within the caller\'s zone; reviewPaymentReleaseRequest and approvePodPaymentRelease require ADMIN_RW (SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER).',
        steps: [
          [
            'As ZONAL_ADMIN, call createPaymentReleaseRequest for a completed pod in one of their assigned_zones',
            'The request is created',
          ],
          [
            'As ZONAL_ADMIN, call createPaymentReleaseRequest for a pod outside their zones',
            'FORBIDDEN "This is outside the city or zone you administer"',
          ],
          [
            'As ZONAL_ADMIN, call reviewPaymentReleaseRequest on the request they raised',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As ZONAL_ADMIN, call approvePodPaymentRelease for the batch',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As HOST or VENUE_OWNER, call reviewPaymentReleaseRequest',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As FINANCE_MANAGER, review and approve the same request',
            'Both calls succeed',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Pod Finance',
    description:
      'Per-pod money breakdown at /pod-finance and /pod-finance/:podId.',
    sub_flows: [
      {
        name: 'Pod money split sums to what guests paid',
        description:
          'podFinanceBreakdown feeds the shared EarningsSplitView: host first, then Venue Take, Club Admin Take and Duncit Commission & Govt Charges (GST, platform fee and the host and venue commissions); the four buckets add back to the collection exactly and a drift shows a reconcile warning. No gateway fee is taken from the split, and coins and multi-ticket discounts are already off "Customer paid".',
        steps: [
          [
            'Open /pod-finance/:podId for a paid pod with a venue',
            'Header with the pod title, settlement chip and "<n> bookings · Customer paid <amount>"',
          ],
          [
            'Read the split',
            'Host earning first, then "Where the rest goes" with "Venue Take", "Club Admin Take" and "Duncit Commission & Govt Charges", each with "<pct>% of collection"',
          ],
          [
            'Add the four bucket amounts',
            'They equal the collection the split was computed on, to the paisa',
          ],
          [
            'Open "Duncit Commission & Govt Charges"',
            'Lines "GST @<pct>% (paid to Govt.)", "Platform fee @<pct>%", "Commission from host @<pct>%" and "Commission from venue @<pct>%"',
          ],
          [
            'Open a pod where buyers spent Duncit Coins',
            'A line "Duncit Coins · <n> spent on these bookings (already off the collected total)"',
          ],
          [
            'Look for the reconcile warning',
            '"These figures do not reconcile — refresh, or contact support if this persists." is absent',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Backout Refunds',
    description:
      'Backout requests and refunds at /backout-refunds and /backout-refunds/:id.',
    sub_flows: [
      {
        name: 'Refund breakup per payment method and earned-coin revocation',
        description:
          'The per-method split lives in the "Refund breakup" dialog on /backout-refunds, not on the read-only detail page; the legs are the gateway (CASH) and Duncit Coins (there is no gift card leg), each processed once, and EARN_REVOKE takes back coins the booking earned, only after the coin leg.',
        steps: [
          [
            'On a booking paid partly with coins, open /backout-refunds/:id',
            'Read-only Payment and Refund cards with Deduction and "Refund payable"; no refund action on this page',
          ],
          [
            'Back on /backout-refunds click Refund on its "Spot Filled" row',
            'Dialog "Refund breakup" with "Paid via" Razorpay and Duncit Coins, one box per leg and an "Earned coins revoked" box',
          ],
          [
            'Click "Revoke coins" before the coin leg',
            'It is disabled: "Refund the Duncit Coins first. The revoked coins are taken from them before the balance."',
          ],
          [
            'Process the Razorpay leg',
            'Toast "Refund part processed"; the box reads "Processed <at>"',
          ],
          [
            'Call processBackoutRefund with part CASH again',
            'Refused "This part of the refund has already been processed"',
          ],
          [
            'Process the coin leg, then revoke the earned coins',
            'Coin wallet credited the coin share and debited "Coins to revoke"; the request reads PROCESSED',
          ],
          [
            'Call processBackoutRefund with part COINS on a booking paid only by Razorpay',
            'Refused "This booking was not paid that way — there is nothing to refund there"',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Cancellations',
    description:
      'Cancelled pods at /cancellations, /cancellations/venue and /cancellations/host.',
    sub_flows: [
      {
        name: 'Venue and host cancellation tabs',
        description:
          'Each page asks podCancellations for one kind (VENUE or HOST) and hides the "Cancelled by" filter; its row count matches the matching card on /cancellations (podCancellationStats).',
        steps: [
          [
            'Open /cancellations and note "Cancelled by hosts" and "Cancelled by venues"',
            'Two counts N_host and N_venue',
          ],
          [
            'Open /cancellations/venue',
            'Header "Venue Cancel" — "Pods that ended because the venue declined the booking." and an info alert that attendee refunds here should always be zero',
          ],
          [
            'Count its rows',
            'N_venue rows, every one cancelled by a venue, with "Attendee refunds" zero',
          ],
          [
            'Open /cancellations/host',
            'Header "Host Cancel" — "Pods cancelled by their host — every successful payment is refunded at cancel time."',
          ],
          [
            'Count its rows and open one',
            'N_host rows; the dialog shows the host\'s reason, attendees refunded and the venue booked slot value',
          ],
          [
            'With no host-cancelled pods open /cancellations/host',
            'Empty text "No host-cancelled pods yet."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Invoices',
    description:
      'Invoice identity and payout invoice templates at /invoices and /invoices/:kind.',
    sub_flows: [
      {
        name: 'Edit the host and product payout invoice templates',
        description:
          'updateFinanceSettings saves invoice_templates.host and invoice_templates.product independently; the host payout PDF uses the host template when a host release is approved, and each product seller gets an invoice from the product template when a pod completes.',
        steps: [
          [
            'Open /invoices/host',
            'Header "Host Invoice" — "Sent to the host when their pod payout is approved." with Document heading, Terms & conditions, Footer note and "Email note (covering message)"',
          ],
          [
            'Change the Document heading and click Save',
            'Toast "Invoice template saved"',
          ],
          [
            'Open /invoices/product',
            'Header "Product Invoice" — "Sent to each product seller for products sold on a completed pod." with its own values, untouched',
          ],
          [
            'Change the product Terms & conditions and Save',
            'Toast "Invoice template saved"; /invoices/host still shows its new heading',
          ],
          [
            'Approve a host payout on a completed pod',
            'The host payout PDF carries the new host heading',
          ],
          [
            'Complete a pod that sold a seller\'s products',
            'The seller\'s emailed invoice carries the new product terms',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Withdrawals',
    description:
      'Withdrawal requests and per-role minimums at /withdrawals and /withdrawals/settings.',
    sub_flows: [
      {
        name: 'Withdrawal settings page',
        description:
          'updateWithdrawalMinimums (SUPER_ADMIN or FINANCE_MANAGER; a city-bound admin is refused) stores per-role floors read at request time; requestWithdrawal refuses a balance or amount below the withdrawer\'s floor. The server accepts any non-negative amount (rounded to paise) while the form allows only whole rupees up to 10,00,000.',
        steps: [
          [
            'On /withdrawals/settings save the Venue Owner minimum as 3000',
            'Toast "Venue Owner minimum saved"',
          ],
          [
            'As a venue owner with ₹2500 balance call requestWithdrawal',
            'BAD_USER_INPUT "A Venue Owner can withdraw once the wallet balance reaches ₹3000. Available: ₹2500."',
          ],
          [
            'With ₹5000 balance request ₹1000',
            'BAD_USER_INPUT "The minimum withdrawal for a Venue Owner is ₹3000."',
          ],
          [
            'Request ₹3000',
            'A PENDING withdrawal is created and the wallet is debited',
          ],
          [
            'Lower the minimum to 500',
            'The PENDING request keeps its amount; it is not re-gated',
          ],
          [
            'Call updateWithdrawalMinimums with host -5',
            'BAD_USER_INPUT "host minimum must be 0 or more"',
          ],
          [
            'Call it with a FINANCE_USER token',
            '"Access Denied" (FORBIDDEN)',
          ],
        ],
      },
    ],
  },
  {
    name: 'Legal: Policies',
    description:
      'Website, app and partner policies managed in the Legal console.',
    sub_flows: [
      {
        name: 'Create or edit the brand & seller consent policy',
        description:
          'The first save on /brand-consent creates the policy with the fixed slug brand-partner-consent (type "Brand & Seller Policy", sort order 999, not a signup policy); later saves update it in place. The brand onboarding wizard\'s consent step reads the active policy (server cache up to 10 s) and a changed wording makes signed partners sign again.',
        steps: [
          [
            'Sign in to legal.duncit.com as LEGAL_MANAGER and open /brand-consent with no consent yet',
            'Header "Brand Consent" and info "No Brand Consent has been written yet. Write it below and save."',
          ],
          [
            'Click "Save consent" with Consent text "Too short"',
            'Error "Consent text must be at least 20 characters"',
          ],
          [
            'Enter a title and consent text, leave it published, click "Save consent"',
            'Toast "Brand Consent saved."; a warning replaces the info: "Changing the wording means every partner must sign again before their next submission."',
          ],
          [
            'Open /policies',
            'A row with slug brand-partner-consent and type "Brand & Seller Policy"',
          ],
          [
            'Edit the consent text on /brand-consent and save',
            'Toast "Brand Consent saved." and "Last updated <when>"; no second policy is created',
          ],
          [
            'Open the final consent step of the brand onboarding wizard as a partner who signed earlier',
            'The new wording shows with "The consent wording changed since you signed. Read and sign it again."',
          ],
          [
            'Switch it to Unpublished and save',
            'The wizard step reads "Legal has not published a Brand Consent yet. You can submit without it for now."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Telemetry',
    description:
      'Logs, bugs, error logs and error boundary crashes from every surface.',
    sub_flows: [
      {
        name: 'Error Boundaries page lists reported page crashes',
        description:
          'A crash caught by DuncitErrorBoundary and a Report an issue press both land on /error-boundaries as telemetry rows (component errorBoundary); the data blob is scrubbed of tokens, but the detail dialog still shows the signed-in user, email, session and IP, so the row is not PII-free as the premise claims.',
        steps: [
          [
            'On a portal page force a render error',
            'The page shows "Something went wrong" with "Retry" and "Report an issue"; the shell and sidebar stay usable',
          ],
          [
            'Click "Report an issue"',
            '"Sending report…" then "Thanks — the report reached our team."',
          ],
          [
            'As TECH_MANAGER open /error-boundaries',
            'Header "Error Boundaries"; table When, Event, Env, Surface, Platform, Route, Boundary, App version, User, Message, newest first',
          ],
          [
            'Find the crash',
            'Two rows for the route: Event "Crash" (outlined) and Event "Reported" (filled), Boundary "Page / screen"',
          ],
          [
            'Click the Reported row',
            'Dialog with Reference (crash id), Boundary, Surface, Route, Environment, URL, User, Email, Session, IP address, Message, Stack trace and Component stack',
          ],
          [
            'Open /error-boundaries with no crashes in range',
            'Empty text "No crashes caught yet."',
          ],
        ],
      },
      {
        name: 'Bulk delete logs by ticked rows, filtered view or date window',
        description:
          'deleteTelemetryRecords deletes exactly the ticked rows, the filtered view or a date window; an unscoped delete needs SUPER_ADMIN. The delete runs synchronously (deleteMany) and returns a count, so no background job shows in the header, unlike the premise.',
        steps: [
          [
            'On /telemetry/logs tick two rows',
            'Bar "2 selected on this page"',
          ],
          [
            'Click Delete in the bar',
            'Confirm "Delete the selected rows?" — "The 2 rows ticked on this page will be deleted permanently. Nothing else is touched."; on confirm toast "Deleted 2 rows" and only those rows go',
          ],
          [
            'Search a page name, tick all and click "Select all N matching this view", then Delete',
            'Confirm "Delete every row matching this view?"; toast "Deleted N rows"; rows outside the search remain',
          ],
          [
            'Click "Delete rows…" and set only a To date',
            'Dialog "Delete telemetry logs" under "Narrow by date" counts "N rows are in range and will be deleted permanently."',
          ],
          [
            'Set From after To',
            '"From is after To, so nothing falls between them."',
          ],
          [
            'As TECH_MANAGER clear all filters and dates in the dialog',
            '"This empties the collection…" with "A delete this wide is a Super Admin’s to run…"; the server answers "Access Denied" for an unscoped delete by a non-SUPER_ADMIN',
          ],
        ],
      },
      {
        name: 'Delete-all on logs is SUPER_ADMIN only',
        description:
          'An unscoped deleteTelemetryRecords and deleteAllEmailLogs require DELETE_ALL_ROLES = [SUPER_ADMIN]; a narrowed telemetry delete stays with TELEMETRY_WRITE (SUPER_ADMIN, TECH_MANAGER).',
        steps: [
          [
            'As TECH_MANAGER, open a telemetry log page with no filter, search or date and open the delete dialog',
            'Info "A delete this wide is a Super Admin’s to run. Narrow it with a filter, a search or a date first." and the delete button is disabled',
          ],
          [
            'As TECH_MANAGER, call deleteTelemetryRecords with an unscoped scope',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As TECH_MANAGER, call deleteTelemetryRecords with a date window',
            'Succeeds and deletes only the narrowed rows',
          ],
          [
            'As COMMUNICATIONS_MANAGER, open /emails/logs in the Communications console',
            'No "Delete everything" action is offered',
          ],
          [
            'As COMMUNICATIONS_MANAGER or TECH_MANAGER, call deleteAllEmailLogs',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As SUPER_ADMIN, confirm "Delete every email log?" with "Delete everything"',
            'Every email log is deleted and the count is returned',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Table API',
    description:
      'Each signed-in person’s own token for every portal table’s GET API at /table-api/settings; GET /table-api/<tableQuery> runs as the token’s owner.',
    sub_flows: [
      {
        name: 'Rotate and revoke my table API token',
        description:
          'rotateMyTableApiToken issues a new token and retires the old one; revokeMyTableApiToken disables it. The resolvers only use requireAuth (any signed-in user), not a TECH role gate.',
        steps: [
          [
            'Open /table-api',
            'Redirects to /table-api/settings with card "Your table API token" and "No token yet"',
          ],
          [
            'Click "Generate token"',
            'Toast "New token ready. Copy fresh GET URLs wherever you use them."; the token, "Issued <date> · never used" and a sample GET URL appear',
          ],
          [
            'Call GET /table-api/myApiKeysTable?token=<token>&page=1&page_size=25',
            'JSON rows; the caption then reads "last used <date>"',
          ],
          [
            'Click "Rotate token"',
            'Confirm "Rotate your table API token?"; on "Rotate token" a new token shows',
          ],
          [
            'Call the GET URL with the old token',
            'HTTP 401 UNAUTHENTICATED "Send your table API token as ?token= or the x-table-api-token header…"',
          ],
          [
            'Click "Revoke token" and confirm',
            'Toast "Token revoked. Every GET URL built from it has stopped working."; "No token yet" and Copy/Revoke disabled',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Database',
    description:
      'Database Info (/database/info) and Media Organizer (/database/media-organizer). Resolvers allow SUPER_ADMIN and TECH_MANAGER.',
    sub_flows: [
      {
        name: 'Read live database info',
        description:
          'techDatabaseInfo shows the masked connection string (user:••••@host, never the password), storage tiles and the collections table.',
        steps: [
          [
            'Open /database',
            'Redirects to /database/info with header "Database · Info"',
          ],
          [
            'Read the Connection card',
            '"Read-only. The password is masked and never leaves the server."; Connection string reads mongodb://<user>:••••@<host>; no password anywhere in the DOM',
          ],
          [
            'Read the tiles',
            'DATA, ON DISK, INDEXES, COLLECTIONS tiles with counts',
          ],
          [
            'Search the Collections table',
            '"Every collection in <db>, largest on disk first."; empty search shows "No collections."',
          ],
          [
            'With the API disconnected from Mongo',
            'Error "The API is not connected to its database right now…"',
          ],
          [
            'Call techDatabaseInfo as CITY_ADMIN',
            '"Access Denied"',
          ],
        ],
      },
      {
        name: 'Dry-run, apply and roll back an ImageKit folder reorganisation',
        description:
          'startMediaOrganizer plans copies into /{env}/{bucket}/{id}/{kind}; Copy now copies (never moves) and rewrites records; Roll back points records at the original URLs again.',
        steps: [
          [
            'Open /database/media-organizer and click "Dry run"',
            'No confirm; a run starts in the header and appears under Runs with To copy / Already in place / Shared counts; nothing is copied',
          ],
          [
            'Click Files on the run',
            '"Files in this run" lists Original path, New path, Owner, Status',
          ],
          [
            'Click "Copy now" on the dry run',
            'Confirm "Copy this run’s files?"; on confirm files are copied and records rewritten; originals still load',
          ],
          [
            'Click "Copy now" again on a run with nothing pending',
            'Button disabled; via API "That run has nothing left to copy."',
          ],
          [
            'Click "Roll back"',
            'Confirm "Roll this run back?"; records point at their original URLs and the Rolled back count rises',
          ],
          [
            'Start while a run is in progress',
            'Error "The media organizer is already running — wait for it to finish or stop it first."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Domain and DNS',
    description:
      'The GoDaddy domain and zone: /domain/overview, /domain/dns-records, /domain/staging and /domain/port-mapping. Resolvers allow SUPER_ADMIN and TECH_MANAGER.',
    sub_flows: [
      {
        name: 'Add, edit and delete a DNS record',
        description:
          'addDnsRecord / updateDnsRecord / deleteDnsRecord write the GoDaddy zone; a malformed value is refused by the form.',
        steps: [
          [
            'Open /dns/records',
            'Redirects to /domain/dns-records with record type tabs and Host, Stack, Value, TTL (seconds) columns',
          ],
          [
            'Click "Add record", pick type A and enter value "abc"',
            'Error "Enter an IPv4 address, e.g. 203.0.113.10."',
          ],
          [
            'Enter name "test.duncit.com"',
            'Error "Leave out .duncit.com — it is added for you."',
          ],
          [
            'Enter name "e2e-test", a valid IPv4 and Save',
            'Toast "Saved"; the row appears',
          ],
          [
            'Click "Edit record" on it',
            'Type and name are locked ("Type and name are the record’s address…"); change the value and Save, toast "Saved"',
          ],
          [
            'Click "Delete record" and confirm "Delete"',
            'Confirm "Delete the A record e2e-test → <ip>?…"; toast "Deleted"',
          ],
        ],
      },
      {
        name: 'Sync staging DNS and read port mapping',
        description:
          'syncStagingDns rewrites staging hosts to production’s values and reports synced/failed; portMappings reads domain to port routes from nginx sites-available.',
        steps: [
          [
            'Open /domain/staging with a host missing on staging',
            'Banner "N host(s) differ between staging and production…"; the row shows "Missing on staging"',
          ],
          [
            'Click "Sync all (N)"',
            'Confirm "Copy production onto staging?" listing hosts; on "Sync staging" toast "N staging host(s) now match production."',
          ],
          [
            'When GoDaddy refuses one',
            '"x synced, y refused by GoDaddy. <reason>"',
          ],
          [
            'Open /domain/port-mapping',
            '"Port Mapping" canvas of domain to "Port <n>" from sites-available; a disabled site marked "Site not enabled in nginx"',
          ],
          [
            'Filter by a site file',
            'Only that site’s domains are drawn',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Security',
    description:
      'SSL certificates (/security/ssl), the GoDaddy to Cloudflare move (/security/cloudflare) and SonarQube (/security/sonarqube, /security/sonarqube-settings).',
    sub_flows: [
      {
        name: 'Copy DNS to Cloudflare; nameserver switch gated on parity',
        description:
          'copyDnsToCloudflare mirrors GoDaddy records; setDomainNameServers(CLOUDFLARE) is refused while any record is GoDaddy only; checkCloudflareActivation asks Cloudflare to re-check.',
        steps: [
          [
            'Open /security/cloudflare with records not yet copied',
            'Banner "N GoDaddy record(s) are not on Cloudflare yet…" and the "GoDaddy only" stat',
          ],
          [
            'On the Nameservers tab try the Cloudflare switch',
            'Blocked "N GoDaddy record(s) are not on Cloudflare yet. Copy them on the DNS records tab before switching."',
          ],
          [
            'Call setDomainNameServers(target: CLOUDFLARE) via the API',
            'Refused "N GoDaddy record(s) are not on Cloudflare yet and would stop resolving: … Copy them first."',
          ],
          [
            'Click "Copy all to Cloudflare (N)" and confirm "Copy to Cloudflare"',
            'Toast "N record(s) copied to Cloudflare."; banner "Cloudflare holds every record GoDaddy answers for…"',
          ],
          [
            'Flip the switch and confirm "Change nameservers"',
            'Toast "Nameservers changed for duncit.com."',
          ],
          [
            'Click "Re-check now"',
            'Toast "Cloudflare is checking the nameservers again."',
          ],
        ],
      },
      {
        name: 'List certbot certificates and live-check one',
        description:
          'sslCertificates lists every certbot certificate with expiry; sslLiveCheck dials each host and reports the served certificate.',
        steps: [
          [
            'Open /ssl',
            'Redirects to /security/ssl with "SSL Certificates", Certificates / Fewest days left / Hosts covered stats',
          ],
          [
            'Read the table',
            'Days left, Expires, Auto-renews from, Key type, Coverage, Issuer per certificate; under 30 days triggers the "Under 30 days left on…" banner',
          ],
          [
            'Click "Details" on a certificate',
            'Dialog with Common name, Valid from, SHA-256 fingerprint and "What each host serves now"',
          ],
          [
            'Read each host’s live check',
            '"Serving this certificate", "Serving a different certificate", "Untrusted certificate" or "Unreachable" with "Served certificate expires <date>"',
          ],
        ],
      },
      {
        name: 'Read the SonarQube quality gate and edit its settings',
        description:
          'The page mounts the Analytics console’s SONARQUBE entity dashboard (entityAnalytics readable by SUPER_ADMIN, ANALYTICS_MANAGER, TECH_MANAGER); settings are the SONARQUBE Environment Variables category and secrets are never echoed.',
        steps: [
          [
            'Open /security/sonarqube',
            '"SonarQube analytics" — "What the last code scan found, security first…" with the dashboard read live from SonarQube',
          ],
          [
            'Open /security/sonarqube-settings',
            '"SonarQube Settings" with the SonarQube entries table',
          ],
          [
            'Edit the entry and leave the token blank, then Save',
            'Helper "Leave blank to keep existing"; the stored token is kept and never shown',
          ],
          [
            'Click "Test connection"',
            'The test drawer reports the result and Last tested updates',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Google Analytics',
    description:
      'The GA4 tag each Duncit website loads, one per website, at /google-analytics.',
    sub_flows: [
      {
        name: 'Save and delete a GA site per website',
        description:
          'saveGoogleAnalyticsSite stores the measurement id per website, the public googleAnalyticsTag query feeds the site within a minute, and deleteGoogleAnalyticsSite removes it.',
        steps: [
          [
            'Open /google-analytics',
            'Rows per website such as "Main website — duncit.com" with status Live / Off / Not set',
          ],
          [
            'Click "Add website tag" and enter "UA-123"',
            'Error "Enter a GA4 measurement ID, like G-XXXXXXXXXX."',
          ],
          [
            'Enter a valid G- id, keep "Load the tag on this website" on and Save',
            'Toast "Saved"; status Live',
          ],
          [
            'Reload duncit.com after a minute',
            'The page loads the gtag for that id',
          ],
          [
            'Click "Remove tag" and confirm',
            'Confirm "Remove the tag <id> from <website>?…"; toast "Deleted"; status Not set',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: MSG91 OTP',
    description:
      'MSG91 OTP Logs, Analytics and Settings (/msg91-otp/*), also mounted in Communications. Reads allow SUPER_ADMIN, COMMUNICATIONS_MANAGER, TECH_MANAGER; logs add LOGS_MANAGER.',
    sub_flows: [
      {
        name: 'Configure MSG91 OTP and read logs and analytics',
        description:
          'Settings is the MSG91 Environment Variables category (widget ID and auth key, secrets not echoed); logs and analytics are read live from MSG91 for a 3-day and 5-day window.',
        steps: [
          [
            'Open /msg91-otp with MSG91 not configured',
            'Redirects to /msg91-otp/logs with "MSG91 is not configured yet…" and "Open MSG91 Settings"',
          ],
          [
            'Open /msg91-otp/settings and add the MSG91 entry',
            '"MSG91 Settings" with the entries table; saving keeps the auth key hidden ("Leave blank to keep existing" on edit)',
          ],
          [
            'In the test drawer click "Send OTP" with a test number',
            'Confirm "Send a real SMS?"; on "Send SMS" the request ID fills in',
          ],
          [
            'Open /msg91-otp/logs and click Load for today',
            'The request appears with Request ID, Number, Requested at, Verified',
          ],
          [
            'Pick a window wider than 3 days',
            'Error "MSG91 allows at most 3 days in one window"',
          ],
          [
            'Open /msg91-otp/analytics',
            'Tiles Requests, Verified, Retries, Tokens verified and "Requests per day"; empty window "No OTP traffic in this window."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: App Builds',
    description:
      'Android and iOS CI builds, store pushes, store listing and store releases.',
    sub_flows: [
      {
        name: 'Generate iOS signing and push a build to TestFlight / App Review',
        description:
          'generateIosSigning creates the Distribution certificate and profile on /app-builds/settings; pushAppBuildToAppStore uploads the IPA and the row shows each App Store step.',
        steps: [
          [
            'Open /app-builds/settings with App Store Connect connected',
            'Card "App Store Connect" — "Connected for <bundle>. No signing files yet…"',
          ],
          [
            'Click "Generate signing files" and confirm',
            'Confirm "Generate iOS signing files?"; toast "Signing files generated. The next iOS build signs with them."',
          ],
          [
            'On /app-builds/ios hover TestFlight on a staging build',
            '"Only a successful production build with a stored IPA and a build number can go to App Store Connect."',
          ],
          [
            'Click TestFlight on a production build',
            'Confirm "Push <build> to TestFlight?"; on "Push" toast "<build> is on its way to TestFlight…"',
          ],
          [
            'Wait for Apple',
            'The App Store cell shows "Processed and on TestFlight since <when> — pushed by <by>."',
          ],
          [
            'Push the same build to App Store',
            'Confirm warns it is submitted to App Review and cannot be taken back; then "Submitted to App Review on <when>…"',
          ],
        ],
      },
      {
        name: 'Staging build channel and resumable Play upload step log',
        description:
          'A STAGING build announces in its staging Slack channel (falling back to production); the Play upload is resumable within one push (parts retried after asking Google how far it got), and the step log is shown only for a failed push.',
        steps: [
          [
            'On /app-builds/settings set "Android staging builds channel" and Save',
            'Toast "Build channels saved."',
          ],
          [
            'Finish a Staging Android build',
            'Slack announces in the staging channel; with it empty, in the production channel',
          ],
          [
            'Push a production AAB to Internal while a part upload fails',
            'The push retries the part from the byte Google holds and finishes "On Google Play internal as version code N"',
          ],
          [
            'Let a push fail after its retries',
            'Cell shows "Push to internal testing failed: <error> Press to try again."',
          ],
          [
            'Click "View the logs of the failed push to internal testing"',
            'Dialog "Push failed — logs" with "Steps of the push", timestamped lines such as "part at N% failed (attempt x of y)"',
          ],
        ],
      },
      {
        name: 'Edit the Play and App Store listing',
        description:
          'updateStoreListing saves ONE listing shared by both stores (not per store, unlike the premise); appStoreCategories fills the Primary category picker; lengths, URLs and image counts are validated.',
        steps: [
          [
            'Open /app-builds/store-listing',
            '"Store Listing" with tabs Copy & links, Screenshots, Review & contact, One-time setup',
          ],
          [
            'Clear App name and click "Save listing"',
            'Error "Required."',
          ],
          [
            'Enter Support URL "http://x"',
            'Error "Must be an https:// URL."',
          ],
          [
            'Put "duncit.com" in Copyright',
            'Error "Apple refuses a URL or web address here…"',
          ],
          [
            'Open Primary category without App Store Connect',
            '"Connect App Store Connect under Environment Variables to load Apple’s categories."',
          ],
          [
            'Fix the fields and Save',
            'Toast "Store listing saved." and "Last saved by <by> on <when>."',
          ],
        ],
      },
      {
        name: 'Track a store rejection and resolve it',
        description:
          'logStoreRejection records the reason with AI advice and sends mail and Slack per release-notice settings; resolveStoreIssue closes it and stops reminders.',
        steps: [
          [
            'Open /app-builds/releases and the Google Play tab',
            'Info that Play’s API never reports a review outcome and to press Log rejection',
          ],
          [
            'Click "Log rejection" and submit with no version',
            'Error "Name the version that was rejected."',
          ],
          [
            'Enter the version and reason and click "Log and advise"',
            'Toast "Rejection logged — the advice is written and the notices are on their way."; the row shows Rejected',
          ],
          [
            'Open the row',
            'Dialog "Version <v> · build <b>" with the advice and "Mail and Slack sent <when>"',
          ],
          [
            'Click "Mark resolved" and confirm',
            'Confirm "Mark this issue resolved?"; toast "Issue marked resolved."; reminders stop',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Environment Variables',
    description:
      'Credential entries per provider category and the portal-to-entry mapping at /.',
    sub_flows: [
      {
        name: 'Apple sign-in and ShipRocket sandbox keys tested from Env',
        description:
          'Test connection on APPLE_SIGNIN and on a ShipRocket entry in Sandbox mode reports success or a clear error; once the per-entry attempt cap is used, the test is not sent.',
        steps: [
          [
            'On / open the Sign in with Apple category and test an entry missing the Key ID',
            '"Team ID, Services ID, Key ID and private key are all required"',
          ],
          [
            'Test a valid Apple entry',
            '"Apple accepted this key for <services id>"; a mismatched key gives "Apple rejected this client"',
          ],
          [
            'Turn on "Sandbox mode — book test orders only" on a ShipRocket entry without sandbox email and test',
            '"Sandbox mode is on: the sandbox email and password are required"',
          ],
          [
            'Test from a network ShipRocket has not allowed',
            '"ShipRocket’s sandbox turned the request away before it reached the login (HTTP 498, Access Denied)…"',
          ],
          [
            'Test with valid sandbox keys',
            '"ShipRocket sandbox accepted the credentials and issued a token" with "SANDBOX mode — …" detail',
          ],
          [
            'Test again past the cap set under ?selectedtab=settings',
            '"Test limit reached: x of y attempts used in the last N hours. Nothing was sent…"',
          ],
        ],
      },
      {
        name: 'COMMUNICATIONS_MANAGER may edit channel entries only',
        description:
          'envEntry.resolver.ts lets COMMUNICATIONS_MANAGER (CHANNEL_MANAGE) read and manage only the MSG91 category; TECH_MANAGE (SUPER_ADMIN, TECH_MANAGER) manages every category.',
        steps: [
          [
            'As COMMUNICATIONS_MANAGER, query envEntries with a filter naming another category',
            'Only MSG91 entries return: the category is pinned to MSG91',
          ],
          [
            'As COMMUNICATIONS_MANAGER, query envEntry(id) for a non-MSG91 entry',
            'Returns null',
          ],
          [
            'As COMMUNICATIONS_MANAGER, createEnvEntry and updateEnvEntry on a throwaway MSG91 entry',
            'Both succeed',
          ],
          [
            'As COMMUNICATIONS_MANAGER, createEnvEntry with category EMAIL or update a payment entry',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As COMMUNICATIONS_MANAGER, call updateEnvAttemptSettings or query envEntriesForPortal',
            'FORBIDDEN "Access Denied" (TECH_MANAGE only)',
          ],
        ],
      },
    ],
  },
  {
    name: 'Communications: WhatsApp automation',
    description:
      'The Automation tab of communications /whatsapp (?selectedtab=automation): every platform-sent WhatsApp scenario joined against AiSensy, with the global kill switch, per-scenario switches, provisioning, header media and Reconcile. Reads and writes need SUPER_ADMIN, CITY_ADMIN or COMMUNICATIONS_MANAGER (whatsapp.resolver.ts); sends go through whatsappService.send, which files one WaMessageLog row per attempt and refuses a second row for the same event, entity and number.',
    sub_flows: [
      {
        name: 'Provision and enable the 8 venue scenarios',
        description:
          'Each drafted venue scenario is provisioned in two presses (Create template, then Create campaign once Meta approves) and then switched on; Reconcile leaves no blocker. The transactional ones (placed, ready, cancelled, received) cannot be switched off at all.',
        steps: [
          [
            'Sign in to the Communications console as COMMUNICATIONS_MANAGER and open /whatsapp?selectedtab=automation',
            'The "WhatsApp sending" switch, "Reconcile with AiSensy" and the scenarios table (Scenario, Audience, Category, Campaign, Template, Values, Media, Status, Enabled, Blocker) render',
          ],
          [
            'Search the table for "venue_food" and read a venue row that has no campaign yet',
            'Blocker reads "No AiSensy campaign named "venue_food_order_placed"" and the row offers "Create template"',
          ],
          [
            'Press "Create template" on VENUE_FOOD_ORDER_PLACED',
            'Toast "Template submitted to Meta — the row updates once it is approved." and the Template column shows the submitted template as PENDING',
          ],
          [
            'After Meta approves it, press "Create campaign" on the same row',
            'Toast "Campaign created. The scenario can send now." and the Blocker reads "Ready to send"',
          ],
          [
            'Repeat for VENUE_FOOD_ORDER_READY, _SERVED, _CANCELLED, _RECEIVED, VENUE_FOOD_FEEDBACK_RECEIVED, VENUE_EVENTS_SUBSCRIBED and VENUE_NEW_EVENT',
            'Every one of the 8 rows reaches "Ready to send"',
          ],
          [
            'Look at the Enabled switch on VENUE_FOOD_ORDER_PLACED, then switch VENUE_NEW_EVENT off and on',
            'The transactional row is locked with "Cannot be switched off"; the notification row toggles and the board answers with the new state',
          ],
          [
            'Turn the global "WhatsApp sending" switch on and press "Reconcile with AiSensy"',
            'Toast "Reconciled with AiSensy." and, with every row wired, the banner "Every scenario is wired and ready to send."',
          ],
          [
            'Call provisionWhatsappScenario(event_key: "VENUE_NEW_EVENT") with a MARKETING_MANAGER token',
            'FORBIDDEN "Access Denied"; nothing is created at AiSensy',
          ],
        ],
      },
      {
        name: 'VENUE_FOOD_ORDER_PLACED fires after a guest pays a food order',
        description:
          'markFoodOrderPaid flips payment_status PENDING to PAID in one guarded write; only that winner messages the guest (their account when signed in, else the typed number) with name, order number, venue, total and the order link.',
        steps: [
          [
            'As a guest, place a food order from a venue QR (placeVenueFoodOrder) and pay it so verifyVenueFoodOrderPayment succeeds',
            'The order reads PAID',
          ],
          [
            'Open Communications > WhatsApp > Logs',
            'One Automatic row for venue_food_order_placed to the guest number, with values [guest name, order number, venue name, total, order link]',
          ],
          [
            'Open the order link from that row',
            'It opens /venue/<venueId>/food-order/<orderId> with key and utm_campaign=venue_food_order_placed',
          ],
          [
            'Call verifyVenueFoodOrderPayment again for the same order, and let the payment sweep pass over it',
            'The order is already PAID, so nothing is re-sent and there is still exactly one venue_food_order_placed row for it',
          ],
          [
            'Repeat with the global WhatsApp switch off',
            'The row is filed as skipped with reason "Automatic WhatsApp is switched off" and nothing goes to AiSensy',
          ],
        ],
      },
      {
        name: 'VENUE_FOOD_ORDER_RECEIVED fires after the venue accepts the order',
        description:
          'Premise differs from code: VENUE_FOOD_ORDER_RECEIVED goes to the venue owner when the guest PAYS (whatsappFoodOrderPaid), not when the venue accepts; moving an order to ACCEPTED sends nothing. No message when the venue has no owner account.',
        steps: [
          [
            'Pay a food order at a venue whose owner has an account and a WhatsApp number',
            'Besides the guest message, one Automatic row for venue_food_order_received goes to the owner',
          ],
          [
            'Read that row',
            'Values are [owner name, order number, venue name, total, table label or "—", order board link] and the link points at the partners /venues/food-orders board',
          ],
          [
            'As the venue, move the order to ACCEPTED with setVenueFoodOrderStatus',
            'The order moves; no new WhatsApp row is written for the guest or the owner',
          ],
          [
            'Pay an order at a venue with no owner_user_id',
            'The guest still gets venue_food_order_placed; no venue_food_order_received row is written',
          ],
        ],
      },
      {
        name: 'VENUE_FOOD_ORDER_READY fires after the venue marks the order ready',
        description:
          'setVenueFoodOrderStatus moves a PAID order forward with a write guarded by its current status; only a move to READY sends VENUE_FOOD_ORDER_READY to the guest, once.',
        steps: [
          [
            'As the venue owner, call setVenueFoodOrderStatus(order, "READY") on a paid order',
            'The order reads READY and one venue_food_order_ready row goes to the guest with [name, order number, venue, order link]',
          ],
          [
            'Call it again with "READY"',
            'BAD_REQUEST "An order can only move forward"; no second row',
          ],
          [
            'Call it on an unpaid order',
            'BAD_REQUEST "Only a paid order can be moved"',
          ],
          [
            'Send two READY moves at once from the board',
            'One wins; the other gets CONFLICT "This order was just updated — refresh and try again" and only one message is filed',
          ],
        ],
      },
      {
        name: 'VENUE_FOOD_ORDER_SERVED fires after the venue marks the order served',
        description:
          'A move to SERVED stamps served_at and sends VENUE_FOOD_ORDER_SERVED to the guest with the order link carrying feedback=1, asking them to rate it.',
        steps: [
          [
            'Move a READY order to "SERVED" with setVenueFoodOrderStatus',
            'The order reads SERVED and one venue_food_order_served row goes to the guest',
          ],
          [
            'Open the link from that row',
            'The order page opens with feedback=1 and utm_campaign=venue_food_order_served, ready to rate',
          ],
          [
            'Try to move it to "READY" again',
            'BAD_REQUEST "An order can only move forward"; no further message',
          ],
        ],
      },
      {
        name: 'VENUE_FOOD_ORDER_CANCELLED fires after the order is cancelled',
        description:
          'cancelVenueFoodOrder cancels a PAID order that is not SERVED or CANCELLED in one guarded write, starts the refund and sends VENUE_FOOD_ORDER_CANCELLED to the guest once.',
        steps: [
          [
            'As the venue owner, cancel a paid order with reason "ab"',
            'BAD_USER_INPUT "Tell the guest why the order is cancelled"; nothing is sent',
          ],
          [
            'Cancel it with a valid reason',
            'The order reads CANCELLED with payment REFUND_PENDING (or refunded) and one venue_food_order_cancelled row goes to the guest with [name, order number, venue, total, order link]',
          ],
          [
            'Cancel the same order again',
            'BAD_REQUEST "This order can no longer be cancelled"; no second row',
          ],
          [
            'Try to cancel a SERVED order',
            'BAD_REQUEST "This order can no longer be cancelled"',
          ],
        ],
      },
      {
        name: 'VENUE_FOOD_FEEDBACK_RECEIVED fires after a guest rates the order with photos',
        description:
          'submitVenueFoodFeedback saves the rating once per SERVED order and tells the venue owner the stars; photos are optional, so a rating without photos fires it too.',
        steps: [
          [
            'As the guest, submit feedback on a SERVED order with rating 4 and up to the allowed photos',
            'The rating saves and one venue_food_feedback_received row goes to the venue owner with [owner name, order number, venue, "4/5", board link]',
          ],
          [
            'Submit feedback for the same order again',
            'CONFLICT "This order has already been rated"; no second row',
          ],
          [
            'Submit rating 6',
            'BAD_USER_INPUT "Choose a rating from 1 to 5"',
          ],
          [
            'Rate an order that is not SERVED yet',
            'BAD_REQUEST "You can rate an order once it has been served"',
          ],
        ],
      },
      {
        name: 'VENUE_EVENTS_SUBSCRIBED fires after a member subscribes to venue events',
        description:
          'The "tell me about events here" choice at food checkout becomes a subscription only once the order is PAID; the confirmation is sent only by the write that created the (venue, number) row, so it goes once per number per venue.',
        steps: [
          [
            'Place a food order with the events subscription ticked and leave it unpaid',
            'No subscriber row and no WhatsApp message',
          ],
          [
            'Pay the order',
            'A subscriber row is created and one venue_events_subscribed row goes to the order number with [first name, venue name, venue link]',
          ],
          [
            'Place and pay a second order at the same venue from the same number with the box ticked',
            'No new subscriber row and no second venue_events_subscribed message',
          ],
          [
            'Pay an order with the box unticked',
            'No subscription and no message',
          ],
        ],
      },
      {
        name: 'VENUE_NEW_EVENT fires after a subscribed venue publishes a new pod/event',
        description:
          'When a venue slot request is approved and the pod goes live, notifyVenueSubscribers messages every active subscriber of that venue in the background, keyed on the pod id so a pod approved twice does not message twice; account holders also get an in-app notification.',
        steps: [
          [
            'Have two active subscribers on a venue, then approve a host slot request at that venue',
            'The approval returns at once; each subscriber number gets one venue_new_event row with [first name, venue, pod title, date, time, pod link]',
          ],
          [
            'Read the subscriber whose number belongs to an account',
            'They also get an in-app notification titled "New at <venue>"',
          ],
          [
            'Trigger the same pod approval path again',
            'No second venue_new_event row for the same pod and number',
          ],
          [
            'Decline a slot request at the venue',
            'No venue_new_event message goes out',
          ],
        ],
      },
      {
        name: 'Scenario and default media',
        description:
          'A media-header template sends the row override first, else the asset cached off its campaign, else the platform default image or document set under Settings (setWhatsappScenarioMedia / setWhatsappDefaultMedia).',
        steps: [
          [
            'On the Settings tab save "abc" as the Default header image',
            'Error "Use a full public link that starts with http:// or https://"',
          ],
          [
            'Save a valid public image link as the default',
            'Toast "Default header image saved."; the Automation tab no longer warns that some scenarios have no default',
          ],
          [
            'Set a Default header document link and its File name',
            'The document default saves and the payment and booking (document-header) rows stop showing a header blocker',
          ],
          [
            'On the Automation tab open "Set media…" on a row and enter "ftp://x"',
            'Field error "A full public link that starts with http:// or https://."',
          ],
          [
            'Enter a valid public link and save',
            'Toast "Header asset saved." and the Media cell reads "Custom asset"',
          ],
          [
            'Trigger that scenario',
            'The new WhatsApp log row records the custom asset as its media URL',
          ],
          [
            'Open "Set media…" again and press "Clear custom asset"',
            'The Media cell falls back to "Campaign asset" or "Default asset"',
          ],
        ],
      },
    ],
  },
  {
    name: 'Marketing: WhatsApp campaigns',
    description:
      'Campaigns and Templates tabs of communications /whatsapp: AiSensy campaigns and templates with how many messages each has produced. Reads need SUPER_ADMIN, CITY_ADMIN or COMMUNICATIONS_MANAGER (waCampaign.resolver.ts).',
    sub_flows: [
      {
        name: 'Campaign and template show messages-sent counts',
        description:
          'The Sent column comes from waSendCounts: SENT messages over all attempts, summing campaign sends (sent_count over recipient_count) and automatic log rows (status SENT over all rows) per campaign name; a template sums every campaign that sends it. Attempts include skipped and failed rows.',
        steps: [
          [
            'Open /whatsapp?selectedtab=campaigns',
            'A "Sent" column shows a number per campaign, with "of N" beside it when not every attempt was sent',
          ],
          [
            'Hover a count',
            'Tooltip "<sent> sent of <attempts> tried — open the log"',
          ],
          [
            'Hover a campaign nothing has used',
            'Tooltip "Nothing has gone out on this yet"',
          ],
          [
            'Compare a scenario campaign count with the WhatsApp log rows for that campaign',
            'Sent equals rows with status SENT; the "of" figure equals all rows, skipped and failed included',
          ],
          [
            'Click the count',
            'The Logs tab opens narrowed with "Showing only what went out on <campaign>." and a "Show everything" action',
          ],
          [
            'Open the Templates tab and read a template used by two campaigns',
            'Its Sent figure is the sum of both campaigns',
          ],
          [
            'Call waSendCounts with a MARKETING_MANAGER token',
            'FORBIDDEN "Access Denied"',
          ],
        ],
      },
      {
        name: 'MARKETING_MANAGER cannot use WhatsApp; COMMUNICATIONS_MANAGER cannot send email campaigns',
        description:
          'waCampaign.resolver.ts ADMIN_ROLES = SUPER_ADMIN, CITY_ADMIN, COMMUNICATIONS_MANAGER; marketing.resolver.ts ADMIN_ROLES = SUPER_ADMIN, CITY_ADMIN, MARKETING_MANAGER, so cross-console calls fail both ways.',
        steps: [
          [
            'As MARKETING_MANAGER, call sendWaCampaign',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As MARKETING_MANAGER, query waCampaignsTable',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As COMMUNICATIONS_MANAGER, call sendMarketingCampaign(campaign_id)',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As COMMUNICATIONS_MANAGER, call createMarketingCampaign or query marketingCampaigns',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As COMMUNICATIONS_MANAGER, query waCampaignsTable; as MARKETING_MANAGER, query marketingCampaigns',
            'Both return data',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Emails',
    description:
      'Email delivery dashboard, MJML templates, fragments and logs (now served by the Communications console).',
    sub_flows: [
      {
        name: 'Visual designer toggle round-trips with MJML',
        description:
          'The body editor toggles between Code (MJML source) and Design (GrapesJS visual designer) over the same MJML; the toggle changes how it is edited, never what is stored, and the saved template is what Send test email renders.',
        steps: [
          [
            'Open communications /emails/templates and select a template',
            'The editor shows the Code view titled "MJML source" with the Verify MJML and format actions',
          ],
          [
            'Press "Design" in the "How to edit the body" toggle',
            'Title changes to "Visual designer" ("Loading the designer…" first) and the canvas shows the same content; the format and verify actions hide',
          ],
          [
            'Edit a text block in the designer, then press "Code"',
            'The MJML source contains the edit and the preview re-renders with it',
          ],
          [
            'Press "Code" again while already in Code',
            'Nothing changes — the view stays on Code rather than emptying the editor',
          ],
          [
            'Save (or let Auto-save run)',
            '"All changes saved" shows',
          ],
          [
            'Send a test email with the template',
            'The received email matches the preview, including the change made in the designer',
          ],
          [
            'Open Design when the designer cannot load',
            'Message "The designer could not start: <reason>. The Code view still works."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Short Links',
    description:
      'Tracked duncit.com short links and external links with click analytics and GDPR controls.',
    sub_flows: [
      {
        name: 'Create and inspect a tracked external link (GDPR)',
        description:
          'External Links (/external-links) shortens a non-Duncit https URL into a tracked link; clicks are stored minimised (no address hash, city or user agent) when the browser sends GPC/DNT and the policy obeys them, or when the visitor did not consent.',
        steps: [
          [
            'Open marketing /external-links',
            'Header "External Links" with tabs Links and "Privacy & GDPR"; empty text "No external links yet. Create one to shorten a non-Duncit URL."',
          ],
          [
            'Click "New external link" and enter a Duncit destination',
            'Error "Use a full https:// link to a public site — a Duncit address belongs on the Short Links page"',
          ],
          [
            'Enter a destination on a domain in the Blocked domains list',
            'Refused with "<domain> is on the blocked-domain list — ask an admin if this link is meant to go out"',
          ],
          [
            'Create it with a valid https partner URL',
            'The link is listed and its detail page /external-links/:linkId opens with "This link leaves Duncit"',
          ],
          [
            'Open the short link once normally and once with Sec-GPC: 1 while "Obey Do-Not-Track and Global Privacy Control" is on',
            'Both clicks are counted; the GPC click has no city, address hash or user agent',
          ],
          [
            'On "Privacy & GDPR" set Keep clicks for to a non-number and save',
            'Error "Retention has to be a number of days"',
          ],
        ],
      },
      {
        name: 'Erase/purge clicks and rotate the IP salt',
        description:
          'Erase click data (eraseShortLinkClicks) deletes every click of one link but keeps the link and its lifetime count; the retention sweep (purgeShortLinkClicks) deletes clicks past the window on every link; rotating the salt (rotateShortLinkIpSalt) makes earlier hashes unlinkable to later ones. Server roles SUPER_ADMIN, CITY_ADMIN, MARKETING_MANAGER.',
        steps: [
          [
            'On /short-links/:linkId press "Erase click data"',
            'Confirm "Erase every click on this link?" explaining the link keeps working and keeps its lifetime click count',
          ],
          [
            'Confirm',
            'Toast "<N> clicks erased"; the clicks table is empty while the link still redirects',
          ],
          [
            'On External Links > "Privacy & GDPR" press "Run retention sweep now"',
            'Confirm "Run the retention sweep now?" with button "Delete now"',
          ],
          [
            'Confirm',
            'Toast "<N> clicks deleted"; only clicks older than the retention window are gone and Last sweep shows the count',
          ],
          [
            'Press "Rotate address salt" and confirm "Rotate salt"',
            'Toast "Address salt rotated — earlier hashes are now unlinkable"; Salt last rotated updates',
          ],
          [
            'Click a link again from a device that clicked before the rotation',
            'The new click hash differs from its earlier one, so it counts as a new unique visitor; old clicks are unchanged',
          ],
          [
            'Call purgeShortLinkClicks with a TECH_MANAGER token',
            'FORBIDDEN "Access Denied"',
          ],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Social Accounts',
    description:
      'marketing /social-accounts with tabs Accounts, Publish, Posts, Analytics, Monitoring and Ideas: LinkedIn, Facebook + Instagram, X and YouTube accounts connected by OAuth. Server roles SUPER_ADMIN, CITY_ADMIN, MARKETING_MANAGER (social.resolver.ts).',
    sub_flows: [
      {
        name: 'Connect, sync and disconnect a social account',
        description:
          'Connect calls socialConnectUrl and sends the marketer to the provider consent screen; the callback lands back with the outcome. Sync now (syncSocialAccount) pulls the account; Disconnect (disconnectSocialAccount) removes it and its posts, comments and history from Duncit.',
        steps: [
          [
            'Open /social-accounts with a provider not configured in Tech',
            'Its card says "Not set up yet — Tech adds it under Environment Variables › Social apps."',
          ],
          [
            'On LinkedIn press "Connect" and approve on the provider',
            'Back on the page, toast "LinkedIn connected — 1 account added." and the account row appears',
          ],
          [
            'Connect again and cancel on the provider screen',
            'Toast "Connection cancelled."',
          ],
          [
            'Press "Sync now" on the account',
            'Toast "<name> synced" and the row shows "Last synced <when>"; a refused sync shows its error (or "Sync failed")',
          ],
          [
            'Press Disconnect on the row',
            'Confirm "Disconnect this account?" — "<name> stops syncing, and its posts, comments and history are removed from Duncit. Nothing changes on the network itself."',
          ],
          [
            'Confirm',
            'Toast "<name> disconnected" and the row is gone',
          ],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Social Calendar',
    description:
      'marketing /social-calendar: the Social Accounts publishing calendar on its own page — compose, schedule, share now, retry and delete posts across connected accounts. AI ideas live on Social Accounts > Ideas.',
    sub_flows: [
      {
        name: 'Schedule, edit, retry and share-now a social post',
        description:
          'createScheduledSocialPost puts a post on its date, updateScheduledSocialPost edits it, shareScheduledSocialPostNow sends it at once and retryScheduledSocialPost re-sends to the networks that failed; ideas come from generateSocialIdeas on the Social Accounts Ideas tab.',
        steps: [
          [
            'Open /social-calendar with no account connected',
            'Info "No social account is connected yet. Connect Instagram, Facebook or LinkedIn to start posting." with "Connect accounts"',
          ],
          [
            'Press a future date, pick an account, leave text and media empty and press Schedule',
            'Error "Write something or add an image or video"',
          ],
          [
            'Pick a past time and press Schedule',
            'Error "Pick a date and time in the future"',
          ],
          [
            'Write text, pick a future time and press Schedule',
            'Toast "Post scheduled" and the post sits on that date showing "Goes out <when>"',
          ],
          [
            'Open it, edit the text in "Edit post" and save',
            'The calendar item shows the new text at the same time',
          ],
          [
            'Press "Share now" on a scheduled post',
            'Toast "Sending now" and it moves to Sent (or Partly sent / Failed)',
          ],
          [
            'On a Failed or Partly sent post press "Retry failed"',
            'Toast "Retrying the networks that failed"',
          ],
          [
            'On Social Accounts > Ideas press "Generate ideas"',
            'Toast "<N> new ideas are ready" and idea cards appear with "Use this idea"',
          ],
        ],
      },
    ],
  },
  {
    name: 'Analytics: Dashboards',
    description:
      'The Analytics console (requiredRoles ANALYTICS_MANAGER; resolvers SUPER_ADMIN, ANALYTICS_MANAGER) renders one entity dashboard per path from analytics/src/pages/entity-analytics/pages.ts — Users at / then Pods, Revenue, Shop, Pet Store and the rest — each with KPI tiles, trends, breakdowns, period controls and per-tile goals.',
    sub_flows: [
      {
        name: 'Open each dashboard with period presets and a custom range',
        description:
          'entityAnalytics returns KPIs, trend and breakdown for the chosen period: rolling 7 days / 30 days / 90 days / 12 months or calendar This month / Last month / Month / Custom; no date can be in the future and To cannot precede From.',
        steps: [
          [
            'Sign in as ANALYTICS_MANAGER and open /',
            'Redirects to /users with heading "Users analytics" and KPI tiles',
          ],
          [
            'Open each dashboard from the sidebar (e.g. /pods, /revenue, /shop, /pet-store)',
            'Each loads its own title, tiles, trend and breakdowns; a page with no rows shows "Nothing to show for this period yet."',
          ],
          [
            'Pick "90 days" under Reporting period',
            'Tiles recompute and deltas read "vs previous 90 days"',
          ],
          [
            'Pick "Last month"',
            'Figures cover the whole previous calendar month',
          ],
          [
            'Pick "Custom" and set From and To',
            'Figures cover exactly that range; future days are disabled and To cannot be before From',
          ],
          [
            'Use "More details" on a tile',
            'The source console opens in a new tab',
          ],
          [
            'Call entityAnalytics for REVENUE with a CITY_ADMIN token',
            'FORBIDDEN "Access Denied" (CITY_ADMIN may read only the USERS dashboard)',
          ],
        ],
      },
      {
        name: 'Set a KPI target and see progress',
        description:
          'setAnalyticsTarget stores a goal per tile (count or amount scaled monthly to the period); the tile then shows progress, "Goal met" or, for lower-is-better numbers, "Goal: at most N".',
        steps: [
          [
            'On a dashboard tile press "Set a goal"',
            'Dialog "Goal for <tile>" with the Goal field',
          ],
          [
            'Save it empty',
            'Error "Enter a goal."',
          ],
          [
            'Enter -5',
            'Error "Enter a number of zero or more."',
          ],
          [
            'Enter a goal above the current value and press "Save goal"',
            'Toast "Goal saved." and the tile reads "Goal <target> · <percent> there"',
          ],
          [
            'Set a goal below the current value',
            'The tile shows "Goal met"',
          ],
          [
            'Open "Change the goal" and press "Remove goal"',
            'Toast "Goal removed." and the progress line disappears',
          ],
        ],
      },
    ],
  },
  {
    name: 'Analytics: Alerts',
    description:
      'Analytics /settings/alerts: watch any dashboard number; alerts are checked hourly and email their people (and Slack if asked) when tripped. analyticsAlert.resolver.ts requires SUPER_ADMIN or ANALYTICS_MANAGER.',
    sub_flows: [
      {
        name: 'Create, check-now, edit and delete an alert',
        description:
          'createAnalyticsAlert persists the rule; checkAnalyticsAlertNow reads the number this minute and notifies at once when it trips; update and delete edit or stop it.',
        steps: [
          [
            'Open /settings/alerts and press "Add alert", then save empty',
            'Errors "Enter a name.", "Pick the number to watch.", "Enter the threshold." and "Add an address to email, or turn on Slack."',
          ],
          [
            'Choose "Rises by" with threshold 0',
            'Error "A change threshold must be more than 0%."',
          ],
          [
            'Fill name, dashboard, tile, "Goes above" a value the number already exceeds, an email, and save',
            'Toast "Alert added. It is checked within the hour." and the row appears under "Your alerts"',
          ],
          [
            'Press "Check now" on it',
            'Toast "<name> tripped — its people have been told." and State reads Tripped; the recipient gets the email',
          ],
          [
            'Edit the threshold above the number and Check now again',
            'Toast "Alert saved." then "<name>: the number is within its line."',
          ],
          [
            'Press Remove and confirm "Remove this alert?"',
            'Toast "Alert removed."',
          ],
          [
            'Call createAnalyticsAlert with a CITY_ADMIN token',
            'FORBIDDEN "Access Denied"',
          ],
        ],
      },
    ],
  },
  {
    name: 'Analytics: Analytics Mails',
    description:
      'Analytics /settings/analytics-mails: dashboard reports emailed daily or weekly with a PDF of the full report, plus a one-minute scheduler that sends what is due. analyticsMail.resolver.ts requires SUPER_ADMIN or ANALYTICS_MANAGER.',
    sub_flows: [
      {
        name: 'Subscribe to a dashboard mail and send now with PDF',
        description:
          'createAnalyticsMailSubscription saves the subscriber and mails them a notice at once; sendAnalyticsMailNow sends the report with a duncit-analytics-<date>.pdf attachment; deleting stops it.',
        steps: [
          [
            'Press "Add subscriber" and save with no dashboards picked',
            'Error "Pick at least one dashboard."',
          ],
          [
            'Enter "abc" as Email address',
            'Error "Enter a valid email address."',
          ],
          [
            'Save a valid subscriber (Weekly, two dashboards)',
            'Toast "Subscriber added. They have been told by email." and the notice reaches the inbox',
          ],
          [
            'Add the same email again',
            'Error "That address is already subscribed."',
          ],
          [
            'Press "Send now" on the row',
            'Toast "Report sent to <email>." and the mail carries every figure plus a duncit-analytics-<yyyy-mm-dd>.pdf attachment',
          ],
          [
            'Remove the subscriber and confirm',
            'Toast "Subscriber removed." and no further reports go to them',
          ],
          [
            'Call sendAnalyticsMailNow with a MARKETING_MANAGER token',
            'FORBIDDEN "Access Denied"',
          ],
        ],
      },
      {
        name: 'Scheduled analytics mails go out on cadence',
        description:
          'startAnalyticsMailScheduler ticks every minute; runIfDue does nothing while "Send analytics reports" is off, and otherwise claims each due active subscriber by last_sent_at before sending, so each gets one mail per slot and paused ones none.',
        steps: [
          [
            'Under "When reports go out" switch "Send analytics reports" off and save',
            'Hint "Sending is off. Subscribers are kept, and nobody is mailed until you switch it on." and at the send time nobody is mailed',
          ],
          [
            'Switch it on, set "Send at" to a minute ahead in the platform zone and save',
            'Toast "Schedule saved."',
          ],
          [
            'Wait past the send time with one Daily active subscriber and one Paused subscriber',
            'The active one receives exactly one report; the paused one receives none',
          ],
          [
            'Read the subscribers table',
            'The active row shows Last report as Sent and the Next report slot moves to the next day',
          ],
          [
            'Let the next minutes tick by',
            'No duplicate report is sent for the same slot',
          ],
        ],
      },
    ],
  },
  {
    name: 'Logs: Logs console',
    description:
      'The Logs console (requiredRoles LOGS_MANAGER) mounts other consoles\' log pages as they are, grouped Tech, AI, Communications, Finance, Legal and Pods, with the Analytics Logs dashboard at /. Reads add LOGS_READER (LOGS_MANAGER) on the server; writes never do, so a write button on a borrowed page is refused server-side.',
    sub_flows: [
      {
        name: 'Browse every console\'s logs by category',
        description:
          'Each sidebar entry opens the owning console page with its data. Premise differs from code: the borrowed pages are mounted unchanged, so write actions (refund, retry, cancel, delete) still render; only the WhatsApp log drops Duplicate. The server refuses those writes for LOGS_MANAGER.',
        steps: [
          [
            'Sign in to the Logs console as LOGS_MANAGER',
            'The Logs dashboard opens at / with sidebar groups Tech, AI, Communications, Finance, Legal and Pods',
          ],
          [
            'Open Tech > Telemetry Logs, Error Logs and Rate Limit Blocks',
            'Each table loads rows at /telemetry/logs, /telemetry/error-logs and /rate-limiting/blocked',
          ],
          [
            'Open AI > OpenAI Logs and AI Monitoring Logs',
            'Rows load at /openai/logs and /monitoring',
          ],
          [
            'Open Communications > Email Logs, WhatsApp Logs and MSG91 OTP Logs > Logs',
            'Rows load; the WhatsApp page is headed "WhatsApp Logs" and its rows have no Duplicate action',
          ],
          [
            'Open Finance > Payment Logs and click a row',
            'The payment detail opens at /payment-logs/:id inside the Logs console',
          ],
          [
            'Open Legal > Policy Acceptance Logs and Pods > Pod Monitoring (AI)',
            'Both tables load with data',
          ],
        ],
      },
      {
        name: 'LOGS_MANAGER reads borrowed logs but cannot refund, retry or delete',
        description:
          'paymentsTable and userRefundsTable admit LOGS_READER, but refundPayment and retryPaymentSteps need SUPER_ADMIN, CITY_ADMIN or FINANCE_MANAGER, WhatsApp send writes and email log deletes need the Communications roles, and the Finance console requires FINANCE_MANAGER or FINANCE_USER.',
        steps: [
          [
            'As a LOGS_MANAGER-only account call paymentsTable and userRefundsTable',
            'Both return rows',
          ],
          [
            'On /payment-logs use a row Refund action and confirm',
            'The refund fails with "Access Denied" (FORBIDDEN) and the payment is unchanged',
          ],
          [
            'On /payment-logs/:id press "Retry" on a failed step',
            'retryPaymentSteps returns FORBIDDEN "Access Denied"; the steps are unchanged',
          ],
          [
            'On /whatsapp/logs try to cancel, retry or delete a send',
            'FORBIDDEN "Access Denied"; the send is unchanged',
          ],
          [
            'Call deleteEmailLogs and deleteAllEmailLogs',
            'FORBIDDEN "Access Denied"; no email log row is removed',
          ],
          [
            'Sign in to the Finance console with the same account',
            'The shell refuses access and no Finance page renders',
          ],
        ],
      },
      {
        name: 'Pod monitoring page',
        description:
          'Premise differs from code: Pod Monitoring (AI) is not live pod health; it is the AI risk-scored audit trail of every pod edit, status change and critical action (podAuditLogsTable, readable by SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN and LOGS_MANAGER).',
        steps: [
          [
            'Open Pods > Pod Monitoring (AI) at /pod-monitoring',
            'Heading "Pod Monitoring (AI)" with subtitle "Every pod edit, status change and critical action — risk-scored by AI for auditability."',
          ],
          [
            'Read the table',
            'Columns When, Pod, Action, By, Changes, AI Risk and AI Summary; "No pod activity recorded yet." when empty',
          ],
          [
            'Search for a pod title',
            'Only that pod\'s audit rows remain',
          ],
          [
            'Click a row',
            'The detail dialog shows the AI risk chip, when and who, the note and each changed field; Close returns to the table',
          ],
        ],
      },
    ],
  },
  {
    name: 'Admin: Localization Translations',
    description:
      'The Localization console (requiredRoles LOCALIZATION_MANAGER) edits the server catalogue at /translations; writes need SUPER_ADMIN, TECH_MANAGER or LOCALIZATION_MANAGER. Apps read publicTranslations and render server text, then the default locale, then their bundled fallback.',
    sub_flows: [
      {
        name: 'Edited translation reaches the apps without a deploy',
        description:
          'Premise differs from code: there is no bundle revision to bump. publicTranslations is served through the Redis response cache (TTL, default 60 s) and fetched cache-first per app session, so an edit shows on the next app load after the TTL; a key absent on the server renders from the bundled fallback.',
        steps: [
          [
            'In the Localization console open /translations, open a mweb namespace and click a key shown on an mWeb page',
            'Dialog "Edit translation" with one field per active locale',
          ],
          [
            'Change the English value and save',
            'Toast "Translation updated" and the entries table shows the new value',
          ],
          [
            'Reload the mWeb page after about a minute',
            'The page shows the new copy; no deploy happened',
          ],
          [
            'Call publicTranslations(locale: "en") with ?noRedis=true right after the edit',
            'The new value comes back at once, bypassing the cache',
          ],
          [
            'Delete a key that the mWeb bundle ships and reload mWeb',
            'The page still renders the bundled fallback text for that key',
          ],
          [
            'Save a translation with a CITY_ADMIN token',
            'FORBIDDEN "Access Denied" and nothing changes',
          ],
        ],
      },
      {
        name: 'Read-only localization roles cannot edit translations',
        description:
          'localization.resolver.ts ADMIN_READ = SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER, TECH_MANAGER, LOCALIZATION_MANAGER; ADMIN_WRITE = SUPER_ADMIN, TECH_MANAGER, LOCALIZATION_MANAGER.',
        steps: [
          [
            'As CITY_ADMIN, ZONAL_ADMIN or SUPPORT_USER, query translationsTable and locales',
            'Both return data',
          ],
          [
            'As the same roles, call upsertTranslation and deleteTranslation',
            'Each returns FORBIDDEN "Access Denied"',
          ],
          [
            'As the same roles, call upsertLocale, deleteLocale or importTranslationKeys',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As the same roles, call startAiTranslation',
            'FORBIDDEN "Access Denied"; no auto-translate job starts',
          ],
          [
            'As LOCALIZATION_MANAGER, call upsertTranslation',
            'The translation is saved',
          ],
        ],
      },
    ],
  },
  {
    name: 'Admin: Users',
    description:
      'The user directory at /users and the Users Dashboard at /users-dashboard.',
    sub_flows: [
      {
        name: 'Users Dashboard and contact-data issue flags',
        description:
          'The Users Dashboard (the Analytics USERS page mounted in Admin) counts accounts with contact-data issues, and /users tints every account with a server-computed data_issues entry red with one chip per issue.',
        steps: [
          [
            'As SUPER_ADMIN open "Users Dashboard" in the admin sidebar (/users-dashboard)',
            'Heading "Users Dashboard" with "How many members Duncit has, when they were last seen, who they are, and whose contact data needs fixing." above the analytics widgets',
          ],
          [
            'Find the contact-data breakdown widget',
            'A "Contact data issues" breakdown lists slices such as "No name", "No email", "Number shared with another account" and "Contacts disagree" with their counts',
          ],
          [
            'Prepare a member with no phone number and one whose email is also used by another live account, then open /users',
            'The subtitle reads "Every account on Duncit. Rows in red have missing, duplicate or mismatched contact data."; both rows are tinted red',
          ],
          [
            'Read the "Data Issues" cell of those rows',
            'Red outlined chips name each issue, e.g. "No phone" and "Duplicate email"; a clean account shows "None"',
          ],
          [
            'Filter the Data Issues column by "Duplicate email"',
            'Only accounts carrying that issue are returned by the server; the column cannot be sorted',
          ],
          [
            'Fix the phone number on the member from the Profile tab and return to /users',
            'The "No phone" chip and the red tint are gone for that row',
          ],
          [
            'Sign in to Admin as FINANCE_USER and open /users-dashboard',
            'The dashboard data is refused with "Access Denied": the USERS analytics read allows SUPER_ADMIN, ANALYTICS_MANAGER, CITY_ADMIN, ZONAL_ADMIN and SUPPORT_USER only',
          ],
        ],
      },
      {
        name: 'CITY_ADMIN / ZONAL_ADMIN cannot edit a user outside their city or zone',
        description:
          'updateUser takes MUTATING_ROLES (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN) and deleteUser only SUPER_ADMIN and CITY_ADMIN; both then call rbac assertScope on the target user\'s city and zone.',
        steps: [
          [
            'As CITY_ADMIN of city A, call updateUser for a user whose city is B',
            'FORBIDDEN "Out of city scope"',
          ],
          [
            'As ZONAL_ADMIN, call updateUser for a user whose zone is not in their assigned_zones',
            'FORBIDDEN "Out of zone scope"',
          ],
          [
            'As CITY_ADMIN of city A, call updateUser for a user in city A',
            'The user is updated',
          ],
          [
            'As CITY_ADMIN of city A, call deleteUser for a city-B user',
            'FORBIDDEN "Out of city scope"',
          ],
          [
            'As ZONAL_ADMIN, call deleteUser for any user',
            'FORBIDDEN "Access Denied" — deleteUser is SUPER_ADMIN and CITY_ADMIN only',
          ],
          [
            'As CITY_ADMIN, call updateUser for a user with no city set',
            'Succeeds: assertScope only refuses when the target has a city',
          ],
          [
            'As SUPER_ADMIN, call updateUser for a user in any city',
            'Succeeds: SUPER_ADMIN bypasses the scope check',
          ],
        ],
      },
      {
        name: 'CITY_ADMIN sees only their city in user lists and dashboards',
        description:
          'usersTable, users, partnersTable and user(user_id) are narrowed server-side by readScope (middleware/rbac.ts): a CITY_ADMIN sees members whose city is their assigned_city, a ZONAL_ADMIN members in their assigned_zones, and one with nothing assigned is refused. dashboardTotals (SUPER_ADMIN and CITY_ADMIN only) counts users, hosts, clubs, pods and venues inside the same place (analytics.place.ts); support tickets are website contact messages with no place, so a city admin sees 0 for them.',
        steps: [
          [
            'As CITY_ADMIN of city A, open /users',
            'Only users whose city is A are listed, and the total counts only them; a city filter for another city returns nothing',
          ],
          [
            'As CITY_ADMIN of city A, open /partners',
            'Only partners whose city is A are listed, and the total counts only them',
          ],
          [
            'As CITY_ADMIN of city A, open /users/<id> for a user of city B',
            'FORBIDDEN "Out of city scope"; the user is not shown',
          ],
          [
            'As CITY_ADMIN, open /dashboard',
            'Users, hosts, clubs, pods and venues count only city A; support tickets read 0',
          ],
          [
            'As SUPER_ADMIN, open /dashboard',
            'The totals are platform-wide, including every support ticket',
          ],
          [
            'As ZONAL_ADMIN or SUPPORT_USER, query dashboardTotals',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As SUPPORT_USER or MARKETING_MANAGER, query usersTable',
            'Rows return (DIRECTORY_ROLES), unscoped',
          ],
        ],
      },
      {
        name: 'SUPPORT_USER can view users but not change them',
        description:
          'SUPPORT_USER is in ADMIN_ROLES (read) but not MUTATING_ROLES; the user details page does not hide edit, status or delete controls by role, so the server refusal is what the person sees.',
        steps: [
          [
            'Sign in to the Admin console as SUPPORT_USER and open /users/:user_id',
            'User details load',
          ],
          [
            'Look at the header and profile',
            'Status, delete and profile save controls are still shown (no role gating in UserDetailsPage)',
          ],
          [
            'Change a profile field and save',
            'An error alert "Access Denied"; nothing is saved',
          ],
          [
            'Call updateUser via GraphQL as SUPPORT_USER',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'Call deleteUser via GraphQL as SUPPORT_USER',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'Log a call or email on the user (recordUserContactAction)',
            'Succeeds — contact actions take ADMIN_ROLES',
          ],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Payments, Coins & Shop Orders',
    description:
      'The Payment & Refund Logs and Shop Orders tabs on /users/:user_id: the business summary, payments, refunds and Duncit Coin ledger, and the Pod Shop orders of one member, each narrowed to that account on the server.',
    sub_flows: [
      {
        name: 'Payment & Refund Logs, coin and shop-order tabs on a user',
        description:
          'Payments, refunds and the coin ledger read the platform Finance tables filtered by user_id (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER, FINANCE_USER, LOGS_MANAGER); shop orders need SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER or PRODUCTS_MANAGER. Unlike the row premise, SUPPORT_USER is refused on both tabs.',
        steps: [
          [
            'As SUPER_ADMIN open /users/<member id> for a member with payments, a refund and a Pod Shop order, then click the "Payment & Refund Logs" tab',
            'The URL carries ?selectedtab=payment-refund-logs and the "Business from this user" summary shows Net business, Total paid, Refunded and Coin balance tiles',
          ],
          [
            'Read the "Payments" and "Refunds" tables',
            'Only this member\'s payments and refunds are listed (AdminUserPaymentsTable / AdminUserRefundsTable with a user_id eq filter), newest first',
          ],
          [
            'Read the "Duncit Coin" table',
            'Only this member\'s coin credits and debits are listed with the balance after each move',
          ],
          [
            'Open the same tab for a member with no payments',
            'The tables read "This user has made no payments.", "Nothing has been refunded to this user." and "No coin activity for this user."',
          ],
          [
            'Click the "Shop Orders" tab',
            'The "Pod Shop orders" table lists only orders placed by this member (userProductOrdersTable with user_id), with status and refund columns',
          ],
          [
            'Sign in as ZONAL_ADMIN and open the Payment & Refund Logs tab',
            'Payments and refunds load, the Coin balance tile reads "Your role cannot read Duncit Coin." and the Duncit Coin table is not rendered',
          ],
          [
            'Sign in as FINANCE_USER and open the Shop Orders tab',
            'The table shows a red error alert with the server message "Access Denied" instead of rows',
          ],
          [
            'Sign in as SUPPORT_USER and open the Payment & Refund Logs tab',
            'The summary shows "Could not load this user’s payment summary. Access Denied" and the tables show the same refusal',
          ],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Profile & Account Status',
    description:
      'The /users/:user_id header, summary card and Profile tab.',
    sub_flows: [
      {
        name: 'Demographics shown read-only as the member\'s dropdowns',
        description:
          'Gender and Pet Owner on the Profile tab render the member\'s own answers with the same option labels as mWeb and the app, and cannot be edited by an admin.',
        steps: [
          [
            'On mWeb, as a member, set Gender to Female and Pet Owner to Yes on Edit profile and save',
            'The answers are stored on the member account',
          ],
          [
            'As SUPER_ADMIN open /users/<that member id> on the Profile tab',
            'Two select fields labelled "Gender" and "Pet Owner" show "Female" and "Yes"',
          ],
          [
            'Click the Gender field and try to choose another option',
            'The field is read-only: the value does not change and "Save Changes" stays disabled',
          ],
          [
            'Open a member who never answered these questions',
            'Both fields are blank, like any other empty profile field',
          ],
          [
            'Edit another profile field and click "Save Changes"',
            'Snackbar "User updated"; gender and pet-owner answers are unchanged because UpdateUserInput carries neither',
          ],
        ],
      },
    ],
  },
  {
    name: 'Admin: Categories',
    description:
      'Category Management at /categories.',
    sub_flows: [
      {
        name: 'Challenge Tools mapped on sub-categories only',
        description:
          'The Challenge Tools section appears only when editing a SUB-category; tools are chosen per sub-category with nothing inherited, the server refuses a mapping on any other level, and the mapping is limited to SUPER_ADMIN, CHALLENGE_MANAGER and CITY_ADMIN.',
        steps: [
          [
            'As SUPER_ADMIN open /categories and click Edit on a super category, then on a category',
            'Neither "Edit Super Category" nor "Edit Category" shows a "Challenge Tools" section',
          ],
          [
            'Click + on Sub-Categories',
            'The "New Sub-Category" dialog shows "Challenge Tools" with "Save this sub-category first, then edit it to choose its challenge tools." and no editor',
          ],
          [
            'Save it, then click Edit on the new sub-category',
            'The section reads "Switch challenges on, then choose the scoring tools hosts can use for pods in this sub-category." with the challenge settings form',
          ],
          [
            'Switch on "Enable challenges", pick tools under "Allowed universal tools" and click "Save challenge settings"',
            'The mapping saves; Challenge Portal > Category Mapping shows the same tools for this sub-category',
          ],
          [
            'Edit a sibling sub-category under the same category',
            'It has its own empty settings; nothing is inherited from the parent or sibling',
          ],
          [
            'Call upsertChallengeCategoryMapping for a CATEGORY-level id',
            'The server refuses with "Challenge tools are chosen per sub-category"',
          ],
          [
            'Sign in as ZONAL_ADMIN and open Edit on a sub-category',
            'The section shows "Challenge settings could not be loaded. Refresh to try again." because the mapping read is refused with "Access Denied"',
          ],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Sign in',
    description:
      'The shared console login screen.',
    sub_flows: [
      {
        name: 'Sign in with password then the authenticator code',
        description:
          'For an account with authenticator 2FA on, the password (or emailed code) door is refused with TWO_FACTOR_REQUIRED carrying a 5-minute challenge; ConsoleCompleteTwoFactorLogin with a valid code issues the session.',
        steps: [
          [
            'On any console /login enter the email and password of a staff account with 2FA on and click "Sign in"',
            'No token is stored; a dialog "Two-step verification" opens with "Open your authenticator app and enter the 6-digit code for this account."',
          ],
          [
            'Read the code field',
            'It is labelled "Code" with the hint "The 6-digit code from your app, or one of your recovery codes"',
          ],
          [
            'Click "Verify" with the field empty',
            'Validation shows "Enter the 6-digit code from your app, or a recovery code" and nothing is sent',
          ],
          [
            'Enter the current 6-digit TOTP code and click "Verify"',
            'The button reads "Checking…", ConsoleCompleteTwoFactorLogin returns the session, the console token is stored and the dashboard opens',
          ],
          [
            'Check the user document',
            'auth.last_login_provider is EMAIL, auth.last_login_at is fresh and the accepted TOTP step is recorded',
          ],
          [
            'Sign out and sign in again using one unused recovery code instead of the TOTP',
            'Sign-in succeeds and that recovery code is removed, so it cannot be used again',
          ],
          [
            'On a console the account has no role for, enter correct credentials',
            'The role gate refuses with "You do not have access to this portal" before the 2FA dialog opens',
          ],
        ],
      },
      {
        name: 'Wrong, expired or reused authenticator code is refused',
        description:
          'A wrong or replayed code issues no token and counts toward an account-wide limit: five wrong codes lock the second step for 15 minutes; a challenge older than 5 minutes is expired.',
        steps: [
          [
            'At the "Two-step verification" dialog enter a wrong 6-digit code and click "Verify"',
            'The dialog stays open with "Incorrect code — 4 attempts left" and no token is stored',
          ],
          [
            'Sign in again and reuse the code that already opened a session in its 30-second step',
            'The replay is refused like a wrong code with the remaining attempts count',
          ],
          [
            'Enter wrong codes until the fifth failure',
            'The error reads "Too many wrong codes. Try again after 15 minutes."; even a correct code is refused until the lock ends',
          ],
          [
            'Start a sign-in, wait more than 5 minutes at the dialog, then enter a correct code',
            'The dialog closes and the login screen shows "This sign-in has expired. Sign in again."',
          ],
          [
            'Call completeTwoFactorLogin with a tampered challenge_token',
            'The server answers TWO_FACTOR_CHALLENGE_EXPIRED "This sign-in has expired. Sign in again." and no token',
          ],
          [
            'Click "Cancel" on the dialog',
            'The dialog closes, the login form is shown again and no session exists',
          ],
        ],
      },
      {
        name: 'SUPER_ADMIN opens every console',
        description:
          'hasPortalAccess on the server and hasAppAccess in the shell both short-circuit on SUPER_ADMIN, so a SUPER_ADMIN-only account signs in to every gated staff console.',
        steps: [
          [
            'Sign in at admin.duncit.com/login with an account holding only SUPER_ADMIN',
            'Sign-in succeeds and the admin Hub opens',
          ],
          [
            'Repeat at the Finance, Tech, HR, Logs, Analytics, Localization, Communications, Support, CRM and Challenges consoles',
            'Each console accepts the login and renders its dashboard although the account holds none of its listed roles',
          ],
          [
            'Reload any of those consoles',
            'The in-session role gate keeps the session; the page is not bounced to /login?denied=1',
          ],
          [
            'Open the apps drawer and "Jump to Portal"',
            'The dialog states "You can open every portal." and lists no portals without access',
          ],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Profile and sign out',
    description:
      'The shared /profile page with its Profile, Security and Notifications tabs.',
    sub_flows: [
      {
        name: 'Set up and enable authenticator 2FA from the profile',
        description:
          'ShellStartTwoFactorSetup returns a fresh secret and QR code; a valid TOTP in ShellEnableTwoFactor turns it on and the ten recovery codes are shown once.',
        steps: [
          [
            'Open /profile and click the "Security" tab',
            'The URL selects the security tab; the "Authenticator app" section shows an "Off" chip and "Set up authenticator app"',
          ],
          [
            'Click "Set up authenticator app"',
            'Dialog "Set up authenticator app" shows a QR code, "Scan this QR code with your authenticator app, then enter the 6-digit code it shows." and the manual key',
          ],
          [
            'Enter a wrong 6-digit code and click "Turn on"',
            'The dialog shows "That code does not match. Check the app and try again." and 2FA stays off',
          ],
          [
            'Enter the current TOTP computed from the shown key and click "Turn on"',
            'The title changes to "Save your recovery codes" with ten codes and the warning that they will not be shown again',
          ],
          [
            'Click outside the dialog',
            'It stays open; only "I\'ve saved them" closes it',
          ],
          [
            'Click "I\'ve saved them"',
            'The section chip reads "On" with "On since <time>." and "Recovery codes left: 10."',
          ],
          [
            'Call startTwoFactorSetup again through the API for the same account',
            'The server refuses with "Authenticator app sign-in is already on. Turn it off first to set up a new app."',
          ],
        ],
      },
      {
        name: 'Disable 2FA requires a current code',
        description:
          'ShellDisableTwoFactor needs a current authenticator or recovery code; a wrong one is refused and counted, a valid one turns it off and the next console sign-in skips the challenge.',
        steps: [
          [
            'On /profile Security with 2FA on click "Turn off"',
            'Dialog "Turn off authenticator app?" asks for a code from the app or a recovery code',
          ],
          [
            'Click "Turn off" with an empty code',
            'Validation shows "Enter the 6-digit code from your app, or a recovery code"',
          ],
          [
            'Enter a wrong 6-digit code',
            'The dialog shows "Incorrect code — 4 attempts left" and the chip still reads "On"',
          ],
          [
            'Enter the current TOTP and click "Turn off"',
            'The dialog closes and the chip reads "Off"',
          ],
          [
            'Sign out and sign in with the password',
            'The session opens directly with no "Two-step verification" dialog',
          ],
          [
            'Call disableTwoFactor when 2FA is already off',
            'The server refuses with "Authenticator app sign-in is not on."',
          ],
        ],
      },
      {
        name: 'Change password with an OTP',
        description:
          'ShellRequestPasswordChangeOtp checks the current password and emails a 6-digit code valid for 10 minutes (email only, no SMS); ShellChangePasswordWithOtp sets the new password and the old one stops working. Other open sessions are not signed out by this change.',
        steps: [
          [
            'On /profile Security click "Change password"',
            'Dialog "Change password" asks for the "Current password" with "Enter your current password. We will email you a 6-digit code to confirm the change."',
          ],
          [
            'Enter a wrong current password and click "Send code"',
            'The dialog shows "Current password is incorrect" and no email is sent',
          ],
          [
            'Enter the correct current password and click "Send code"',
            'A green notice "We have emailed you a 6-digit code." shows with "6-digit code", "New password" and "Confirm new password" fields',
          ],
          [
            'Enter a wrong code and a valid new password, click "Update password"',
            'The dialog shows "Invalid OTP" and the password is unchanged',
          ],
          [
            'Enter the new password equal to the current one',
            'The dialog shows "Your new password must be different from your current one."',
          ],
          [
            'Enter the emailed code and a new password, click "Update password"',
            'The dialog closes, the section shows "Last changed <time>" and a password-changed email is sent',
          ],
          [
            'Sign out and sign in with the old password',
            'The login alert shows "Invalid email or password"; the new password signs in',
          ],
        ],
      },
      {
        name: 'Sign out everywhere',
        description:
          'ShellSignOutEverywhere seals every token issued before now (this browser included), so other sessions lose their user on the next request.',
        steps: [
          [
            'Sign in to the same console in browser A and browser B',
            'Both show the dashboard',
          ],
          [
            'In browser A open /profile Security and click "Sign out of all devices"',
            'A confirm dialog "Sign out of all devices?" explains every browser and app will be signed out',
          ],
          [
            'Click "Cancel"',
            'Nothing changes and both sessions stay signed in',
          ],
          [
            'Click "Sign out of all devices" again and confirm',
            'Browser A is signed out and lands on the login screen',
          ],
          [
            'In browser B make any request, e.g. reload the page',
            'The server no longer recognises the token; protected queries fail with "Not authenticated" and the shell shows the "User data not loaded" dialog',
          ],
          [
            'Click "Logout" in that dialog and sign in again in browser B',
            'A fresh session opens normally',
          ],
        ],
      },
      {
        name: 'Mail, WhatsApp and OTP channel preferences and profile visibility',
        description:
          'ShellSetMyMailPreference, ShellSetMyWhatsappPreference, ShellSetMyOtpChannel and ShellSetProfileVisibility save on toggle and persist across reloads.',
        steps: [
          [
            'Open /profile and click the "Notifications" tab',
            'Sections "Email", "WhatsApp" and "Sign-in and verification codes" load with one switch per category or channel',
          ],
          [
            'Turn off an optional email category',
            'The switch saves and "Preferences updated" shows; "Always on" categories cannot be switched',
          ],
          [
            'Turn off an optional WhatsApp category',
            'The switch saves with "Preferences updated"; an account without a WhatsApp number sees "No WhatsApp number yet" instead',
          ],
          [
            'Try to switch off the only code channel that can still carry a code',
            'That switch is locked and cannot be turned off',
          ],
          [
            'Turn on another code channel that has an address',
            'The switch saves; a channel with no address stays locked off',
          ],
          [
            'On the "Profile" tab switch "Private profile" on under "Privacy"',
            'The switch turns on and the profile visibility is PRIVATE',
          ],
          [
            'Reload /profile and revisit both tabs',
            'Every switch shows the saved value',
          ],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Tables',
    description:
      'Shared @duncit/table toolbar features on every console table: server-side bulk delete run as a background job, the Download menu, the GET API dialog and the per-table change logs drawer.',
    sub_flows: [
      {
        name: 'Server-side bulk delete with background job progress',
        description:
          'StartBulkDelete deletes the ticked rows or every row matching the current search and filters through the table\'s own delete mutation; only tables in the bulk-delete registry and roles listed for that table may start one; MyBackgroundJobs shows progress and CancelBackgroundJob stops it.',
        steps: [
          [
            'On a registered table you may delete from (e.g. Tech E2E Flows) tick two disposable rows',
            'A "Delete 2 selected" button appears beside the toolbar actions',
          ],
          [
            'Click it',
            'A confirm "Delete 2 rows?" says they will be deleted on the server; click "Delete"',
          ],
          [
            'Watch the header',
            '"Deletion started. Follow it from the header." shows and a background-task indicator reports progress; when done, exactly those two rows are gone',
          ],
          [
            'Filter the table to a set of disposable rows and click "Delete all matching rows"',
            'A confirm "Delete all <n> matching rows?" uses the server count, including rows on pages not opened',
          ],
          [
            'Confirm, then open the indicator',
            'The "Background tasks" drawer shows the job with "<done> of <total> · <percent>%"',
          ],
          [
            'Click "Stop this task" while it is running',
            'The job shows "Cancelled"; rows already deleted stay deleted and the rest remain',
          ],
          [
            'Call startBulkDelete for that table as a role not listed for it',
            'The server refuses with "Access Denied" and writes nothing',
          ],
          [
            'Call startBulkDelete in ALL mode with filters that match nothing',
            'The server refuses with "No rows match — there is nothing to delete."',
          ],
        ],
      },
      {
        name: 'Table GET API dialog and CSV/JSON download',
        description:
          'The Download menu saves the current page or all rows matching the current query as CSV or JSON; the GET API dialog shows a GET URL (not a curl command) for the same query carrying the viewer\'s table API token.',
        steps: [
          [
            'On any server-backed table apply a search and a filter, then click the "Download" icon',
            'A menu lists "Current page as CSV", "Current page as JSON", "All rows as CSV" and "All rows as JSON"',
          ],
          [
            'Pick "Current page as CSV"',
            'A file named <tableId>-page-<page>.csv downloads with the visible columns of the rows on screen',
          ],
          [
            'Pick "All rows as JSON"',
            'A file named <tableId>-all.json downloads with every row matching the current search and filters',
          ],
          [
            'Click the "GET API" icon as a user with a table API token',
            'The dialog shows "GET <url>" with the token, search, filters, sort and page, plus "This URL carries your personal token. Treat it like a password."',
          ],
          [
            'Click "Copy GET URL" and request the URL',
            'Snackbar "GET URL copied"; the URL returns the same rows as JSON with total, total_pages and next/previous page URLs',
          ],
          [
            'Open the dialog as a user with no token',
            'An info alert says to generate one in Tech portal → Table API → Settings and the URL shows YOUR_TOKEN',
          ],
        ],
      },
      {
        name: 'Table change logs',
        description:
          'The change-logs toolbar button opens a drawer (TableChangeLogs) listing who changed which row and field, newest first, for the rows the table shows the viewer.',
        steps: [
          [
            'Edit one field of a row in a table, e.g. rename a record, and return to the table',
            'The toolbar button reads "Change logs (<count>)"',
          ],
          [
            'Click it',
            'A drawer "Change logs — <table>" opens with "Every change a person made to the rows this table shows you: who, what, when and from where. Newest first."',
          ],
          [
            'Read the newest entry',
            'When, Changed by, Email, Roles, Action "Updated", Record, Field, Before and After show the edit, with Surface, IP address and Browser',
          ],
          [
            'Click "Close change logs"',
            'The drawer closes',
          ],
          [
            'Open the drawer on a table with no recorded edits',
            'It reads "No changes recorded yet."',
          ],
        ],
      },
      {
        name: 'Bulk delete honours each table\'s own role list',
        description:
          'startBulkDelete refuses with FORBIDDEN "Access Denied" when the caller lacks the table\'s role list (e.g. FINANCE for expensesTable, LEGAL for policiesTable) and only offers tables from bulkDeletableTables.',
        steps: [
          [
            'As MARKETING_MANAGER, query bulkDeletableTables',
            'Marketing tables (e.g. shortLinksTable, couponsTable) are listed; expensesTable and policiesTable are not',
          ],
          [
            'As MARKETING_MANAGER, call startBulkDelete with table expensesTable',
            'FORBIDDEN "Access Denied"; no job is created',
          ],
          [
            'As TECH_MANAGER, call startBulkDelete with table policiesTable',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'Call startBulkDelete with a table not in the target list',
            'Refused "This table does not support bulk delete."',
          ],
          [
            'As FINANCE_MANAGER, call startBulkDelete on expensesTable for disposable rows matching nothing',
            'Refused "No rows match — there is nothing to delete."',
          ],
          [
            'As FINANCE_MANAGER, call startBulkDelete on expensesTable for seeded disposable rows',
            'A background job is created with the matching total and the rows are deleted',
          ],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Session, boot and access gates',
    description:
      'What mountPortal does before and around the chrome.',
    sub_flows: [
      {
        name: 'Page crash shows Retry and Report an Issue without killing the console',
        description:
          'Each routed page sits in PageErrorBoundary inside the chrome: a render crash shows the Duncit error boundary, the sidebar keeps working, Retry re-renders, and the report is logged with a redacted message and route only.',
        steps: [
          [
            'Force a render error in one routed page of a console',
            'The page area shows "Something went wrong" and "This part of Duncit ran into a problem. Try again, or tell us about it so we can fix it." with "Retry", "Report an issue" and "Reference: <id>"',
          ],
          [
            'Look at the header and sidebar',
            'They still render and respond',
          ],
          [
            'Click "Report an issue"',
            'The button reads "Sending report…", then "Thanks — the report reached our team." and the button disappears',
          ],
          [
            'Check Tech → Error Boundaries',
            'An entry for the portal with the route path (no query string) and a redacted message, without user data',
          ],
          [
            'Remove the cause and click "Retry"',
            'The page re-renders in place without a full reload',
          ],
          [
            'With the page still crashing, click another sidebar item',
            'The boundary clears on the path change and the new page renders normally',
          ],
        ],
      },
      {
        name: 'Protected staff operations refuse an anonymous caller',
        description:
          'Every staff resolver calls requireRole, which first runs requireAuth, so a request with no token gets UNAUTHENTICATED "Not authenticated" and no data.',
        steps: [
          [
            'Send the financeDashboardStats query to the GraphQL endpoint with no Authorization header',
            'The response has errors[0].message "Not authenticated" with extensions.code UNAUTHENTICATED and data is null',
          ],
          [
            'Send tickets (Support) with no token',
            'Same "Not authenticated" UNAUTHENTICATED error; no ticket rows are returned',
          ],
          [
            'Send venueLeadsTable (CRM) with no token',
            'Same "Not authenticated" UNAUTHENTICATED error; no lead data leaks',
          ],
          [
            'Send updateFinanceSettings (a mutation) with no token',
            'Same "Not authenticated" error and the finance settings are unchanged',
          ],
        ],
      },
      {
        name: 'USER/HOST/VENUE_OWNER tokens are refused on every staff operation',
        description:
          'A member or partner token (USER, HOST, VENUE_OWNER, CLUB_ADMIN, ECOMM_MANAGER) holds none of the staff role lists, so requireRole answers FORBIDDEN "Access Denied".',
        steps: [
          [
            'Call financeDashboardStats with a plain USER token',
            'errors[0].message is "Access Denied" with extensions.code FORBIDDEN; data is null',
          ],
          [
            'Call tickets with a HOST token',
            'The server answers "Access Denied" (FORBIDDEN); no tickets are returned',
          ],
          [
            'Call venueLeadsTable with a VENUE_OWNER token',
            'The server answers "Access Denied" (FORBIDDEN)',
          ],
          [
            'Call updateFinanceSettings with a CLUB_ADMIN token, then with an ECOMM_MANAGER token',
            'Both answer "Access Denied" (FORBIDDEN) and nothing is written',
          ],
        ],
      },
    ],
  },
  {
    name: 'Admin: Console Access & Setup',
    description:
      'Who may use the Admin Panel and how other roles are refused.',
    sub_flows: [
      {
        name: 'Admin console login refused for roles outside requiredRoles',
        description:
          'The server login gate (assertPortalLogin, portal_key admin) refuses FINANCE_MANAGER, TECH_MANAGER, HOST and USER with "You do not have access to this portal" before the client role gate runs; SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER land on /hub.',
        steps: [
          [
            'On admin /login enter the correct e-mail address and password of a FINANCE_MANAGER account and click "Sign in"',
            'The login card shows the error alert "You do not have access to this portal" (FORBIDDEN); no admin_token is stored and the page stays on /login',
          ],
          [
            'Repeat with TECH_MANAGER, HOST and USER accounts',
            'Each gets the same "You do not have access to this portal" alert and no page of the console renders',
          ],
          [
            'With a refused account, request a one-time code in the OTP panel',
            'The request answers ok silently but no code is minted or mailed, so no session can be obtained this way',
          ],
          [
            'Sign in with SUPER_ADMIN, then CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER accounts',
            'Each sign-in succeeds and the browser lands on /hub',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Admin. Please contact your administrator." before any attempt',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Access and dashboards',
    description:
      'Who may use the Finance console and how other roles are refused.',
    sub_flows: [
      {
        name: 'Finance console login refused for roles outside requiredRoles',
        description:
          'Finance requiredRoles and the server gate are FINANCE_MANAGER and FINANCE_USER (SUPER_ADMIN passes), so FINANCE_USER is NOT refused as the row assumed; CITY_ADMIN, SUPPORT_MANAGER and USER get "You do not have access to this portal".',
        steps: [
          [
            'On finance /login sign in with the correct credentials of a CITY_ADMIN account',
            'The login card shows the error alert "You do not have access to this portal"; no finance_token is stored and the page stays on /login',
          ],
          [
            'Repeat with SUPPORT_MANAGER and USER accounts',
            'Each gets the same "You do not have access to this portal" alert and no console page renders',
          ],
          [
            'Sign in with a FINANCE_USER account',
            'Sign-in succeeds and the Finance dashboard opens (FINANCE_USER is in requiredRoles)',
          ],
          [
            'Sign in with SUPER_ADMIN and with FINANCE_MANAGER',
            'Both land on the Finance dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Finance. Please contact your administrator."',
          ],
        ],
      },
      {
        name: 'FINANCE_USER (Finance Analyst) cannot open Finance nor call finance resolvers',
        description:
          'Actual behaviour differs from the row: FINANCE_USER is the read-only analyst seat (FINANCE_READER), so it signs in to Finance and its reads work, while every finance write stays FORBIDDEN "Access Denied".',
        steps: [
          [
            'On finance /login sign in with a FINANCE_USER account',
            'Sign-in succeeds and the Finance dashboard renders its overview',
          ],
          [
            'Call financeDashboardStats with the FINANCE_USER token',
            'The query returns data (FINANCE_READ includes FINANCE_USER)',
          ],
          [
            'Call podPaymentReleasesTable with the FINANCE_USER token',
            'Rows are returned; no error',
          ],
          [
            'Call updateFinanceSettings with any input using the FINANCE_USER token',
            'The server answers "Access Denied" (FORBIDDEN); settings are unchanged because ADMIN_RW is SUPER_ADMIN, CITY_ADMIN and FINANCE_MANAGER only',
          ],
          [
            'Call createPaymentReleaseRequest with the FINANCE_USER token',
            'The server answers "Access Denied" (FORBIDDEN) and no release request is created',
          ],
        ],
      },
    ],
  },
  {
    name: 'Support: Access and dashboard',
    description:
      'Who may use the Support console and how other roles are refused.',
    sub_flows: [
      {
        name: 'Support console login refused for roles outside requiredRoles',
        description:
          'Support requiredRoles and the server gate are SUPPORT_MANAGER and SUPPORT_USER (SUPER_ADMIN passes), so SUPPORT_USER is allowed contrary to the row; CITY_ADMIN and USER get "You do not have access to this portal".',
        steps: [
          [
            'On support /login sign in with the correct credentials of a CITY_ADMIN account',
            'The login card shows the error alert "You do not have access to this portal"; no support_token is stored and the page stays on /login',
          ],
          [
            'Repeat with a USER account',
            'The same "You do not have access to this portal" alert shows and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then SUPPORT_MANAGER, then SUPPORT_USER',
            'Each sign-in succeeds and lands on the Support dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Support. Please contact your administrator."',
          ],
        ],
      },
      {
        name: 'Support Agent (SUPPORT_USER) passes server guards but cannot sign in to the console',
        description:
          'Actual behaviour differs from the row: support requiredRoles and the server portal gate both include SUPPORT_USER, so a Support Agent signs in and works tickets; only manager-only resolvers refuse it.',
        steps: [
          [
            'On support /login sign in with a SUPPORT_USER account',
            'Sign-in succeeds; no access-denied alert; the Support dashboard opens',
          ],
          [
            'Click "Tickets" in the sidebar',
            'The tickets table loads rows (tickets allows SUPER_ADMIN, SUPPORT_MANAGER, SUPPORT_USER)',
          ],
          [
            'Call tickets via GraphQL with the SUPPORT_USER token',
            'Data is returned without error',
          ],
          [
            'Call updateMailAutomationRule with the SUPPORT_USER token',
            'The server answers "Access Denied" (FORBIDDEN)',
          ],
        ],
      },
    ],
  },
  {
    name: 'Legal: Access and dashboard',
    description:
      'Who may use the Legal console and how other roles are refused.',
    sub_flows: [
      {
        name: 'Legal console login refused for roles outside requiredRoles',
        description:
          'The server gate for portal_key legal allows LEGAL_MANAGER (SUPER_ADMIN passes); CITY_ADMIN, SUPPORT_MANAGER and USER are refused with "You do not have access to this portal".',
        steps: [
          [
            'On legal /login sign in with the correct credentials of a CITY_ADMIN account',
            'The login card shows the error alert "You do not have access to this portal"; no legal_token is stored and the page stays on /login',
          ],
          [
            'Repeat with SUPPORT_MANAGER and USER accounts',
            'Each gets the same alert and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then LEGAL_MANAGER',
            'Both land on the Legal dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Legal. Please contact your administrator."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Tech: Access and role gates',
    description:
      'Who may use the Tech console and how other roles are refused.',
    sub_flows: [
      {
        name: 'Tech console login refused for roles outside requiredRoles',
        description:
          'The server gate for portal_key tech allows TECH_MANAGER (SUPER_ADMIN passes); CITY_ADMIN, COMMUNICATIONS_MANAGER and USER are refused with "You do not have access to this portal".',
        steps: [
          [
            'On tech /login sign in with the correct credentials of a CITY_ADMIN account',
            'The login card shows the error alert "You do not have access to this portal"; no tech_token is stored and the page stays on /login',
          ],
          [
            'Repeat with COMMUNICATIONS_MANAGER and USER accounts',
            'Each gets the same alert and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then TECH_MANAGER',
            'Both land on / (Environment Variables), the first Tech page',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Tech. Please contact your administrator."',
          ],
        ],
      },
      {
        name: 'TECH_MANAGER is refused SUPER_ADMIN-only ops (terminal, DB backup/restore, data clone, delete-everything)',
        description:
          'TECH_EXEC = [SUPER_ADMIN] (tech.resolver.ts) guards techExec, every backup/restore operation except dbBackupStore, every data clone operation and the account purges; the UI shows the server error instead of hiding the pages.',
        steps: [
          [
            'As TECH_MANAGER, call techExec with any command',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As TECH_MANAGER, call runDbBackup and restoreDbBackup(id)',
            'Each returns FORBIDDEN "Access Denied"; no backup or restore job starts',
          ],
          [
            'As TECH_MANAGER, open /database/backups',
            'The settings query fails and the page shows a red alert "Access Denied"; no schedule card renders',
          ],
          [
            'As TECH_MANAGER, call startDataClone and open the Data Clone page',
            'FORBIDDEN "Access Denied"; the page shows a red alert "Access Denied"',
          ],
          [
            'As TECH_MANAGER, call purgeAccountCompletely(request_doc_id)',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As SUPER_ADMIN, query dbBackupSettings and dataCloneTargets',
            'Both return data (do not restore or clone in the test)',
          ],
        ],
      },
    ],
  },
  {
    name: 'CRM: Access and dashboard',
    description:
      'Who may use the CRM console and how other roles are refused.',
    sub_flows: [
      {
        name: 'CRM console login refused for roles outside requiredRoles',
        description:
          'The server gate for portal_key crm allows CRM_MANAGER (SUPER_ADMIN passes); SUPPORT_USER, CITY_ADMIN and USER are refused with "You do not have access to this portal" (the server message, not the shell sentence).',
        steps: [
          [
            'On crm /login sign in with the correct credentials of a SUPPORT_USER account',
            'The login card shows the error alert "You do not have access to this portal"; no crm_token is stored and the page stays on /login',
          ],
          [
            'Repeat with CITY_ADMIN and USER accounts',
            'Each gets the same alert and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then CRM_MANAGER',
            'Both land on the CRM dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit CRM. Please contact your administrator."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Access and dashboard',
    description:
      'Who may use the Marketing console and how other roles are refused.',
    sub_flows: [
      {
        name: 'Marketing console login refused for roles outside requiredRoles',
        description:
          'The server gate for portal_key marketing allows MARKETING_MANAGER (SUPER_ADMIN passes); ADS_MANAGER, COMMUNICATIONS_MANAGER and USER are refused with "You do not have access to this portal".',
        steps: [
          [
            'On marketing /login sign in with the correct credentials of an ADS_MANAGER account',
            'The login card shows the error alert "You do not have access to this portal"; no marketing_token is stored and the page stays on /login',
          ],
          [
            'Repeat with COMMUNICATIONS_MANAGER and USER accounts',
            'Each gets the same alert and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then MARKETING_MANAGER',
            'Both land on the Marketing dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Marketing. Please contact your administrator."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Communications: Access',
    description:
      'communications.duncit.com sign-in gate: the console and the server login gate (portal_key communications) admit COMMUNICATIONS_MANAGER, and SUPER_ADMIN passes every console.',
    sub_flows: [
      {
        name: 'Communications console login refused for roles outside requiredRoles',
        description:
          'MARKETING_MANAGER, TECH_MANAGER and USER are refused by the server login gate with "You do not have access to this portal"; SUPER_ADMIN and COMMUNICATIONS_MANAGER land on the dashboard.',
        steps: [
          [
            'On communications /login sign in with the correct credentials of a MARKETING_MANAGER account',
            'The login card shows the error alert "You do not have access to this portal"; no communications_token is stored and the page stays on /login',
          ],
          [
            'Repeat with TECH_MANAGER and USER accounts',
            'Each gets the same alert and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then COMMUNICATIONS_MANAGER',
            'Both land on the Communications dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Communications. Please contact your administrator."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Localization: Access',
    description:
      'Localization console sign-in gate: the console and the server login gate (portal_key localization) admit LOCALIZATION_MANAGER, and SUPER_ADMIN passes every console.',
    sub_flows: [
      {
        name: 'Localization console login refused for roles outside requiredRoles',
        description:
          'TECH_MANAGER, SUPPORT_USER and USER are refused by the server login gate with "You do not have access to this portal"; SUPER_ADMIN and LOCALIZATION_MANAGER land on the dashboard.',
        steps: [
          [
            'On localization /login sign in with the correct credentials of a TECH_MANAGER account',
            'The login card shows the error alert "You do not have access to this portal"; no localization_token is stored and the page stays on /login',
          ],
          [
            'Repeat with SUPPORT_USER and USER accounts',
            'Each gets the same alert and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then LOCALIZATION_MANAGER',
            'Both land on the Localization dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Localization. Please contact your administrator."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Logs: Access',
    description:
      'Logs console sign-in gate: the console and the server login gate (portal_key logs) admit LOGS_MANAGER, and SUPER_ADMIN passes every console.',
    sub_flows: [
      {
        name: 'Logs console login refused for roles outside requiredRoles',
        description:
          'TECH_MANAGER, FINANCE_MANAGER and USER are refused by the server login gate with "You do not have access to this portal"; SUPER_ADMIN and LOGS_MANAGER land on the dashboard.',
        steps: [
          [
            'On logs /login sign in with the correct credentials of a TECH_MANAGER account',
            'The login card shows the error alert "You do not have access to this portal"; no logs_token is stored and the page stays on /login',
          ],
          [
            'Repeat with FINANCE_MANAGER and USER accounts',
            'Each gets the same alert and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then LOGS_MANAGER',
            'Both land on the Logs dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Logs. Please contact your administrator."',
          ],
        ],
      },
    ],
  },
  {
    name: 'Analytics: Access',
    description:
      'Analytics console sign-in gate: the console and the server login gate (portal_key analytics) admit ANALYTICS_MANAGER, and SUPER_ADMIN passes every console.',
    sub_flows: [
      {
        name: 'Analytics console login refused for roles outside requiredRoles',
        description:
          'CITY_ADMIN, MARKETING_MANAGER and USER are refused by the server login gate with "You do not have access to this portal"; SUPER_ADMIN and ANALYTICS_MANAGER land on the first dashboard.',
        steps: [
          [
            'On analytics /login sign in with the correct credentials of a CITY_ADMIN account',
            'The login card shows the error alert "You do not have access to this portal"; no analytics_token is stored and the page stays on /login',
          ],
          [
            'Repeat with MARKETING_MANAGER and USER accounts',
            'Each gets the same alert and no console page renders',
          ],
          [
            'Sign in with SUPER_ADMIN, then ANALYTICS_MANAGER',
            'Both sign in and / opens the first Analytics dashboard',
          ],
          [
            'Open /login?denied=1 directly',
            'The alert shows "You do not have access to Duncit Analytics. Please contact your administrator."',
          ],
        ],
      },
      {
        name: 'CITY_ADMIN and MARKETING_MANAGER cannot read entity analytics',
        description:
          'entityReaders returns ANALYTICS_ROLES for every entity except USERS (adds CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER), LOGS (adds LOGS_MANAGER) and SONARQUBE (adds TECH_MANAGER).',
        steps: [
          [
            'As CITY_ADMIN, query entityAnalytics(entity: PODS)',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As MARKETING_MANAGER, query entityAnalytics(entity: PODS) or entity USERS',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As CITY_ADMIN, query entityAnalytics(entity: USERS)',
            'Returns data (Admin Users Dashboard readers), counted only over the members of their assigned city (readScope)',
          ],
          [
            'As CITY_ADMIN with no city assigned, query entityAnalytics(entity: USERS)',
            'FORBIDDEN "Out of city scope"',
          ],
          [
            'As CITY_ADMIN, query analyticsCities',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As CITY_ADMIN, sign in to the Analytics console',
            'Refused "You do not have access to Duncit Analytics. Please contact your administrator."',
          ],
          [
            'As ANALYTICS_MANAGER, query entityAnalytics(entity: PODS)',
            'Returns data',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Duncit Coin',
    description:
      'Coin settings, stats and manual adjustments.',
    sub_flows: [
      {
        name: 'CITY_ADMIN reads coins and gift cards but cannot change them',
        description:
          'Reads use COIN_ADMIN_READ / GIFT_CARD_ADMIN_READ (SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER, FINANCE_USER); writes use *_WRITE (SUPER_ADMIN, FINANCE_MANAGER). The trail of a manual adjustment is a coin ledger row (source ADMIN_GRANT/ADMIN_DEDUCT with the reason), not a separate audit table.',
        steps: [
          [
            'As CITY_ADMIN, query coinAdminStats and giftCardAdminStats',
            'Both return data',
          ],
          [
            'As CITY_ADMIN, call updateCoinSettings, adjustUserCoins and updateGiftCardSettings',
            'Each returns FORBIDDEN "Access Denied"',
          ],
          [
            'As CITY_ADMIN, query coinUserSearch',
            'FORBIDDEN "Access Denied" (the user picker for adjustments is write-gated)',
          ],
          [
            'As CITY_ADMIN, sign in to the Finance console',
            'Refused "You do not have access to Duncit Finance. Please contact your administrator."',
          ],
          [
            'As FINANCE_USER, query coinAdminStats then call adjustUserCoins',
            'Stats return; the adjustment is FORBIDDEN "Access Denied"',
          ],
          [
            'As FINANCE_MANAGER, call adjustUserCoins with direction GRANT and an empty reason',
            'Refused "A reason is required — it is what the ledger row explains"',
          ],
          [
            'As FINANCE_MANAGER, call adjustUserCoins with direction GRANT, coins and a reason',
            'Succeeds; a CREDIT coin transaction with source ADMIN_GRANT and the reason is written',
          ],
        ],
      },
    ],
  },
  {
    name: 'Finance: Employee Expenses',
    description:
      'Approval queue for out-of-pocket employee claims at /employee-expenses.',
    sub_flows: [
      {
        name: 'An EMPLOYEE files a claim but cannot approve it',
        description:
          'Filing uses EMPLOYEE_RW (EMPLOYEE, SUPER_ADMIN); reviewEmployeeExpense uses FINANCE_RW (SUPER_ADMIN, CITY_ADMIN, FINANCE_MANAGER). There is no self-approval check, so a SUPER_ADMIN (in both lists) can approve their own claim.',
        steps: [
          [
            'As EMPLOYEE, call createEmployeeExpense',
            'The claim is created with status PENDING',
          ],
          [
            'As the same EMPLOYEE, call reviewEmployeeExpense on their own claim with decision APPROVED',
            'FORBIDDEN "Access Denied"; the claim stays PENDING',
          ],
          [
            'As FINANCE_MANAGER, call reviewEmployeeExpense with decision REJECTED and no note',
            'Refused "Give the employee a reason for the rejection"',
          ],
          [
            'As FINANCE_MANAGER, call reviewEmployeeExpense with decision APPROVED',
            'The claim becomes APPROVED with reviewed_by and reviewed_at set',
          ],
          [
            'As SUPER_ADMIN, file a claim and approve it yourself',
            'Both calls succeed today — no reviewer-is-not-claimant guard exists',
          ],
        ],
      },
    ],
  },
  {
    name: 'Admin: Upload Settings',
    description:
      'Per-surface upload rules for Portals, the Mobile App and mWeb.',
    sub_flows: [
      {
        name: 'Upload settings and branding are read-only for CITY_ADMIN / SUPPORT_USER',
        description:
          'updateUploadSettings and updateBranding require SUPER_ADMIN or TECH_MANAGER; TECH_MANAGER cannot sign in to the Admin console, so it writes through the API only.',
        steps: [
          [
            'As CITY_ADMIN, open /upload-settings/portals',
            'The settings load',
          ],
          [
            'Change a size limit and save',
            'A red alert "Access Denied"; the setting is unchanged',
          ],
          [
            'As ZONAL_ADMIN or SUPPORT_USER, call updateUploadSettings',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As CITY_ADMIN, call updateBranding',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As TECH_MANAGER, sign in to the Admin console',
            'Refused "You do not have access to Duncit Admin. Please contact your administrator."',
          ],
          [
            'As TECH_MANAGER, call updateUploadSettings and updateBranding via GraphQL',
            'Both succeed',
          ],
        ],
      },
    ],
  },
  {
    name: 'Support: FAQs',
    description:
      'FAQ management.',
    sub_flows: [
      {
        name: 'SUPPORT_USER cannot write FAQs or mailbox rules',
        description:
          'FAQ writes use FAQ_RW (SUPER_ADMIN, CITY_ADMIN, SUPPORT_MANAGER) and mail rules RULE_ROLES (SUPER_ADMIN, SUPPORT_MANAGER); SUPPORT_USER is in SUPPORT_ROLES for tickets and chat.',
        steps: [
          [
            'As SUPPORT_USER, call createFaq, updateFaq and deleteFaq',
            'Each returns FORBIDDEN "Access Denied"',
          ],
          [
            'As SUPPORT_USER, query faqSubmissionsTable or call updateFaqSubmissionStatus',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As SUPPORT_USER, call updateMailAutomationRule or query mailAutomationPreview',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As SUPPORT_USER, call updateTicketStatus on a ticket',
            'Succeeds (SUPPORT_ROLES)',
          ],
          [
            'As SUPPORT_MANAGER, call createFaq',
            'The FAQ is created',
          ],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Ads',
    description:
      'Ad request review.',
    sub_flows: [
      {
        name: 'ADS_MANAGER cannot approve its own ad',
        description:
          'submitAdRequest takes ADS_SUBMIT plus ECOMM_MANAGER; reviewAdRequest, stopAdRequest, deleteAdRequest and updateAdPricing take MARKETING_REVIEW (SUPER_ADMIN, MARKETING_MANAGER). SUPER_ADMIN is in both lists and can review its own submission.',
        steps: [
          [
            'As ADS_MANAGER, call submitAdRequest',
            'The request is created',
          ],
          [
            'As the same ADS_MANAGER, call reviewAdRequest(id, approve: true)',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As ADS_MANAGER, call stopAdRequest(id) and updateAdPricing',
            'Each returns FORBIDDEN "Access Denied"',
          ],
          [
            'As ADS_MANAGER, query adRequestsTable',
            'FORBIDDEN "Access Denied"; myAdRequestsTable returns their own requests',
          ],
          [
            'As MARKETING_MANAGER, call reviewAdRequest(id, approve: true)',
            'The request is approved',
          ],
        ],
      },
    ],
  },
  {
    name: 'Marketing: Coupons',
    description:
      'Platform coupons.',
    sub_flows: [
      {
        name: 'Only coupon roles can create or edit coupons',
        description:
          'coupon.resolver.ts ADMIN_RW = SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, FINANCE_MANAGER, MARKETING_MANAGER, with city/zone scope for CITY_ADMIN and ZONAL_ADMIN; venue food coupons use a separate venue-owner path.',
        steps: [
          [
            'As SUPPORT_USER, COMMUNICATIONS_MANAGER or VENUE_OWNER, call createCoupon',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As the same roles, call updateCoupon and deleteCoupon',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As CITY_ADMIN, call createCoupon with scope POD for a pod in another city',
            'FORBIDDEN "This is outside the city or zone you administer"',
          ],
          [
            'As CITY_ADMIN, call createCoupon with a non-POD (platform) scope',
            'FORBIDDEN "This is outside the city or zone you administer" — no pod places it in their city',
          ],
          [
            'As MARKETING_MANAGER, call createCoupon with a platform scope',
            'The coupon is created',
          ],
        ],
      },
    ],
  },
  {
    name: 'CRM: Lead calls and emails',
    description:
      'Lead communication logs.',
    sub_flows: [
      {
        name: 'SUPPORT_USER reads lead communication logs but cannot edit leads',
        description:
          'communicationLog.resolver.ts CRM_READ adds CITY_ADMIN, ZONAL_ADMIN and SUPPORT_USER to SUPER_ADMIN and CRM_MANAGER; lead queries and mutations use CRM_RW (SUPER_ADMIN, CRM_MANAGER), so those roles cannot even list leads.',
        steps: [
          [
            'As SUPPORT_USER, query communicationLogs and communicationLog(id)',
            'Both return data',
          ],
          [
            'As SUPPORT_USER, call requestCommunicationTranscript(id)',
            'Allowed (CRM_READ)',
          ],
          [
            'As SUPPORT_USER, call createVenueLead, updateVenueLead or deleteVenueLead',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As CITY_ADMIN or ZONAL_ADMIN, query venueLeadsTable',
            'FORBIDDEN "Access Denied"',
          ],
          [
            'As SUPPORT_USER, sign in to the CRM console',
            'Refused: the console requires CRM_MANAGER',
          ],
        ],
      },
    ],
  },
];

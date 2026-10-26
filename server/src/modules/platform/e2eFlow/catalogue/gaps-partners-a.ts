import type { CatalogueFlow } from './catalogue.types';

/**
 * Partner-side scenarios the gap audit found missing from the catalogue (first half):
 * venue food, publish page, pod partner requests, Partner Brand orders and returns,
 * the Venues, Products, Onboarding and Clubs consoles, the ecomm.duncit.com pet store
 * and its Ecomm portal, and denied-role checks. Flows sharing a name with another
 * catalogue file are merged by name; their sub flows are appended.
 */
export const PARTNER_GAP_FLOWS_A: readonly CatalogueFlow[] = [
  {
    name: 'Partners: Venue Food Menu',
    description:
      'The Food Menu page at /venues/food-menu in partners-app.duncit.com: the shared @duncit/venue-food editor for an APPROVED venue\'s dishes, QR ordering, the Razorpay account guests pay and the GST on food, saved through updateApprovedVenue.',
    sub_flows: [
      {
        name: 'Switch food on and publish a menu for an approved venue',
        description: 'An owner of an APPROVED venue turns on offers_food, adds dishes with food type, spice level, price and photos, and saves through updateApprovedVenue; the public venue (publicVenue) then returns offers_food true and the saved dishes.',
        steps: [
          ['Sign in to partners-app.duncit.com as a VENUE_OWNER with an APPROVED venue and open /venues/food-menu', 'Header "Food Menu" with hint "The dishes guests can order and how ordering works"; the menu editor card renders for the selected venue'],
          ['Turn on "Does this venue offer food?"', 'The menu section appears with "Add menu item" and the empty text "No menu items yet."'],
          ['Click "Add menu item" and fill "Item name" = Paneer Tikka, "Menu section" = Starters, "Price" = 249, "Food type" = Vegetarian, "Spice level" = Medium', 'The dish card shows the typed values with no field errors'],
          ['Click "Add photo" on the dish and upload one image (ImageKit)', 'A thumbnail appears and the counter reads "Photos (1 of 5)"'],
          ['Click "Save"', 'updateApprovedVenue is sent with offers_food true and food_menu; a success toast "Food menu saved" shows and the form reloads on the server copy (the dish now has an id)'],
          ['Reload /venues/food-menu', 'The switch is still on and Paneer Tikka is listed with price 249, Vegetarian, Medium and its photo'],
          ['Query publicVenue for this venue signed out (or open its public venue page)', 'offers_food is true and food_menu contains Paneer Tikka with the saved fields; food_ordering.razorpay_integration_id is null in the public answer'],
        ],
      },
      {
        name: 'Food menu limits and validation (count, images, price max, discount max)',
        description: 'The editor enforces venueRegistrationConfig caps (food_menu_limit 200, food_image_limit 5, food_price_max 100000, food_discount_max_pct 90) with field errors, and updateApprovedVenue refuses the same input server side with BAD_USER_INPUT.',
        steps: [
          ['On /venues/food-menu for an approved food venue, clear a dish name and click "Save"', 'Field error "Give this menu item a name"; no mutation is sent'],
          ['Set the dish "Price" to 0, then to 100001, clicking "Save" each time', 'Field error "Enter a price of at least 1", then "The price cannot be more than 100000"'],
          ['Add photos to one dish until 5 are attached', 'The counter reads "Photos (5 of 5)" and no sixth photo can be added'],
          ['Set "QR order discount %" to 91 and click "Save"', 'Field error "Enter a whole number from 0 to 90"'],
          ['Send updateApprovedVenue directly with a dish price of 100001', 'Refused with BAD_USER_INPUT "Enter a price between 1 and 100000 for "<dish name>""'],
          ['Send updateApprovedVenue directly with 6 images on one dish, then with 201 dishes, then food_ordering.discount_pct 91', 'Refused: ""<dish name>" can have at most 5 photos", then "A menu can list at most 200 items", then "The discount must be a whole number from 0 to 90"; the venue is unchanged'],
        ],
      },
      {
        name: 'Pick or add the Razorpay account guests pay',
        description: 'The owner picks one of their own connected Razorpay accounts (myPartnerIntegrations) or adds one through the Integrations connection dialog; QR ordering cannot be switched on without a connected account and an available dish, the server only accepts the owner\'s own connected account, and secrets are never returned.',
        steps: [
          ['On /venues/food-menu (food on, one available dish, no account picked) look at "Online ordering & payments"', 'Intro "Guests pay this Razorpay account directly. Duncit does not hold or settle this money."; the "Accept food orders from the venue QR" switch is disabled with hint "Pick a connected Razorpay account and keep at least one menu item available first."'],
          ['Open the "Razorpay account" select', 'Options are "No account" plus each saved Razorpay connection with "Test mode" / "Live mode — real money" or its failed-check message; helper "Only an account that passed its connection check can be picked."'],
          ['Click "Add Razorpay account", fill "Connection name" and the test key id + secret, click "Save & test connection"', 'savePartnerIntegration runs; toast "Connection saved"; a connection that passed its check is picked automatically in the select'],
          ['Turn on "Accept food orders from the venue QR" and click "Save"', '"Food menu saved"; after reload the account is still picked and the switch is on'],
          ['Inspect the myPartnerIntegrations response in the network tab', 'Only id, provider, label, status and brands are returned; no key secret value is present'],
          ['Send updateApprovedVenue with food_ordering.enabled true and razorpay_integration_id empty', 'Refused: "Connect a Razorpay account before taking food orders"'],
          ['Send updateApprovedVenue with another owner\'s Razorpay connection id', 'Refused: "That Razorpay account does not belong to the owner of this venue" (an unverified own account gives "That Razorpay account has not passed its connection check yet")'],
        ],
      },
      {
        name: 'GST override and GSTIN on food invoices',
        description: 'With the override off a venue\'s food orders use Finance\'s food tax defaults; with "Set this venue\'s own GST" on, its own mode and GST % (0-28) apply. The server resolves tax_mode/gst_pct, so totals prove it. A valid GSTIN is saved once, locked for the owner and printed on the invoice.',
        steps: [
          ['Under "GST on food" on /venues/food-menu leave "Set this venue\'s own GST" off and place a test QR order', 'The order total uses the Finance Food Menu default (tax mode and GST %)'],
          ['Turn on "Set this venue\'s own GST", choose "GST added to prices", set "GST %" to 29 and click "Save"', 'Field error "GST must be a whole number from 0 to 28."; nothing is saved'],
          ['Set "GST %" to 12 and click "Save"', '"Food menu saved"; a new QR order is priced with 12% added on top of the menu prices'],
          ['Type an invalid "GST number (GSTIN)" such as 12345 and click "Save"', 'Field error "Enter a valid 15-character GSTIN, like 22ABCDE1234F1Z5." (server: "Enter a valid 15-character GSTIN")'],
          ['Enter a valid GSTIN and save, then reload', 'The GSTIN shows read-only with helper "Printed on every food invoice. It is locked once saved — ask Duncit support to change it."'],
          ['Send updateApprovedVenue as the owner with a different GSTIN', 'Refused FORBIDDEN: "The GST number cannot be changed once saved — ask Duncit support to change it"'],
          ['Download the invoice of a paid order (venueFoodOrderInvoicePdfBase64)', 'The PDF is titled "TAX INVOICE" and prints "GSTIN: <saved GSTIN>"'],
        ],
      },
      {
        name: 'Unapproved venue is sent to the venue form Food section',
        description: 'For a venue that is not APPROVED the Food Menu page shows the not-approved notice instead of the editor, and its "Edit venue" button opens the registration form on the Food tab; updateApprovedVenue also refuses non-approved venues.',
        steps: [
          ['Sign in as a VENUE_OWNER whose selected venue is DRAFT or SUBMITTED and open /venues/food-menu', 'An info alert reads "This venue is not approved yet. Until it is, its food menu is edited in the venue form with the rest of the application."; no menu form is rendered'],
          ['Click "Edit venue" in the alert', 'Navigates to /register-venue/<venueId>?selectedtab=food with the Food Menu section open'],
          ['Send updateApprovedVenue for that venue directly', 'Refused BAD_REQUEST: "Only approved venues can be edited here"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Food Dashboard',
    description:
      'The Food Dashboard at /venues/food-dashboard: venueFoodStats(venue_id, days) for the selected food-serving venue, shown as tiles, breakdowns, a daily chart and recent feedback through @duncit/venue-food.',
    sub_flows: [
      {
        name: 'Food dashboard tiles, daily chart, breakdowns and recent feedback',
        description: 'venueFoodStats for the picked period (7, 30, 90 days or all time, 0 = all time) returns totals matching the seeded paid orders; status and top-dish breakdowns and the daily chart render once there are orders, and recent feedback lists ratings with photos.',
        steps: [
          ['Open /venues/food-dashboard as the owner of a food venue with seeded paid orders', 'Header "Food Dashboard"; the "Period" select defaults to its first range and stat tiles render (Orders, Revenue, Average order, Cancelled, Discounts given, scans and more)'],
          ['Pick "Last 7 days", then "Last 30 days", then "All time" in "Period"', 'venueFoodStats is re-run with days 7, 30 and 0; "Orders" and "Revenue" equal the seeded paid orders in each window (revenue leaves cancelled orders out)'],
          ['Look at the breakdown panels', '"Orders by status" lists each status with its count and "Top dishes" lists dishes as "<qty> sold · <revenue>"'],
          ['Look at "Daily orders and revenue"', 'A line chart of orders and revenue per day; with orders on a single day it says "The trend appears once there are orders on two or more days."'],
          ['Look at "Recent feedback"', 'Each entry shows "<name> · Order <no>", its stars and the feedback photos'],
          ['Pick a period with no orders', 'Info "No food orders in this period yet. Paid orders from your venue QR are counted here." and "No feedback in this period yet. Guests can rate an order once it is served."'],
        ],
      },
      {
        name: 'Food pages for a venue that does not serve food',
        description: 'For a selected venue with offers_food off, Food Dashboard, Food Orders and Food Coupons show their own "does not offer food" info alert with an "Edit venue" button to the venue form Food tab instead of tables.',
        steps: [
          ['Select an approved venue with offers_food off and open /venues/food-dashboard', 'Info "This venue does not offer food. Turn food on in its Food Menu section to see its food numbers."; no tiles'],
          ['Open /venues/food-orders', 'Info "This venue does not offer food. Turn food on in its Food Menu section to take orders."; no order table'],
          ['Open /venues/food-coupons', 'Info "This venue does not offer food. Turn food on in its Food Menu section to give guests food coupons."; no coupon table'],
          ['Click "Edit venue" in the alert', 'Navigates to /register-venue/<venueId>?selectedtab=food'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Food Orders',
    description:
      'The food order board at /venues/food-orders: venueFoodOrdersTable for the selected venue (paid, refund-pending and refunded orders), moving orders forward with setVenueFoodOrderStatus, cancelling with a full refund on the venue\'s own Razorpay, and the order details dialog.',
    sub_flows: [
      {
        name: 'Move a paid food order PLACED to SERVED',
        description: 'setVenueFoodOrderStatus moves a PAID order forward along PLACED, ACCEPTED, PREPARING, READY, SERVED; each row shows the one next step and updates in place. The guest WhatsApp goes out only on READY and SERVED (not on every step), and a failed send never fails the move.',
        steps: [
          ['Open /venues/food-orders and find a Paid order in status "Placed"', 'The "Action" column shows "Accept", "View" and "Cancel & refund"'],
          ['Click "Accept"', 'Toast "Order <no> is now Accepted"; the row status chip reads "Accepted" and the button becomes "Start preparing"'],
          ['Click "Start preparing"', 'Toast "Order <no> is now Preparing"; the button becomes "Mark ready"'],
          ['Click "Mark ready"', 'Status "Ready"; a VENUE_FOOD_ORDER_READY WhatsApp is recorded for the guest\'s number'],
          ['Click "Mark served"', 'Status "Served"; no advance or "Cancel & refund" button remains, only "View"; a VENUE_FOOD_ORDER_SERVED WhatsApp is recorded'],
          ['Reload the page', 'The order still reads "Served" (served_at set on the server)'],
        ],
      },
      {
        name: 'Cancel a paid food order with a reason (full refund)',
        description: 'cancelVenueFoodOrder needs a 3-300 character reason, sets CANCELLED and REFUND_PENDING in one guarded write, refunds the full total on the venue\'s own Razorpay (receipt-keyed, so no double refund) and tells the guest; a second cancel is refused.',
        steps: [
          ['On /venues/food-orders click "Cancel & refund" on a Paid, not-served order', 'Dialog "Cancel order <no>?" with "<guest> is refunded <amount> in full, from your Razorpay account. This cannot be undone."'],
          ['Type "ab" in "Reason for cancelling" and click "Cancel & refund"', 'Field error "Tell the guest why, in at least 3 characters"; no mutation is sent'],
          ['Type "Kitchen closed early" and click "Cancel & refund"', 'Toast "Order <no> cancelled. The guest has been refunded." (or "... The refund is on its way to the guest."); the row shows status "Cancelled" and payment "Refunded" or "Refund pending"'],
          ['Check the venue\'s Razorpay test dashboard', 'Exactly one refund for the full order total exists on the payment'],
          ['Send cancelVenueFoodOrder again for the same order', 'Refused BAD_REQUEST: "This order can no longer be cancelled"; no second refund is created'],
          ['Click "View" on the order', 'The details dialog shows the "Reason for cancelling" line with the typed reason'],
        ],
      },
      {
        name: 'Illegal food order transitions are refused',
        description: 'The server only moves PAID orders forward (skipping ahead is allowed, going back is not), refuses moving or cancelling cancelled/unpaid orders and cancelling a SERVED order; the board shows the server message in an error toast and reloads.',
        steps: [
          ['Send setVenueFoodOrderStatus(status: ACCEPTED) for a PREPARING order', 'Refused BAD_REQUEST: "An order can only move forward"'],
          ['Send setVenueFoodOrderStatus(status: CANCELLED) or an unknown status', 'Refused BAD_USER_INPUT: "Choose a valid order status"'],
          ['Send setVenueFoodOrderStatus(status: READY) for a CANCELLED (refunded) order or a PENDING-payment order', 'Refused BAD_REQUEST: "Only a paid order can be moved"'],
          ['Send cancelVenueFoodOrder for a SERVED order', 'Refused BAD_REQUEST: "This order can no longer be cancelled"'],
          ['Open the board on two tabs, click "Accept" on one, then "Accept" on the stale row in the other', 'The second tab shows an error toast with the server message ("An order can only move forward" or "This order was just updated — refresh and try again") and the table reloads to "Accepted"'],
        ],
      },
      {
        name: 'Order details dialog and filters',
        description: 'venueFoodOrdersTable is server-paginated with search and status/payment filters pinned to the venue; the details dialog shows guest, table/seat, note, item lines and money lines. Discrepancy: the dialog has no GST/tax line, only subtotal, QR discount, coupon and total.',
        steps: [
          ['Open /venues/food-orders for a venue with orders in several statuses', 'Columns: Order, Placed at, Guest, Phone, Table / seat, Items, Total, Payment, Order status, Rating, Action; newest first'],
          ['Filter "Order status" to Ready', 'Only Ready orders remain; the table request carries the status filter'],
          ['Type a guest phone number in "Search order, guest, phone or table"', 'Only that guest\'s orders remain'],
          ['Click "View" on an order placed with a coupon from a table QR', 'Dialog "Order <no>" lists Placed at, Guest, Phone, Table / seat (the table label), Note and each line as "<qty> × <name>" with "<price> each"'],
          ['Look at the money lines', '"Subtotal", "QR discount (<pct>%)" when a QR discount applied, "Coupon <code> (<pct>%)" with the discount, then "Total"'],
          ['Click "Close"', 'The dialog closes and the board resumes its periodic refresh'],
        ],
      },
      {
        name: 'Owner cannot read or act on another venue\'s food data',
        description: 'Every food board and coupon operation checks venue ownership in managedVenue (venues-console editors excepted): another owner gets FORBIDDEN "Not your venue", a signed-out caller "Not authenticated"; the /venues pages are behind SectionGate (VENUE_OWNER).',
        steps: [
          ['Signed in as owner A, send venueFoodOrdersTable and venueFoodStats with venue B\'s id', 'Both refused FORBIDDEN: "Not your venue"'],
          ['As owner A, send setVenueFoodOrderStatus and cancelVenueFoodOrder for an order of venue B', 'Refused FORBIDDEN: "Not your venue"; the order is unchanged and no refund is made'],
          ['As owner A, send createVenueFoodCoupon with venue B\'s id, and update/setActive/deleteVenueFoodCoupon on venue B\'s coupon', 'Each refused FORBIDDEN: "Not your venue"'],
          ['As owner A, send updateApprovedVenue with food fields for venue B', 'Refused FORBIDDEN: "Not your venue"'],
          ['Send venueFoodOrdersTable without a session', 'Refused: "Not authenticated"'],
          ['Sign in as a user without VENUE_OWNER (e.g. HOST only) and type /venues/food-orders', 'SectionGate redirects to / and on to the user\'s own area; the board never renders'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Food Coupons',
    description:
      'Food Coupons at /venues/food-coupons: the venue\'s percent coupon codes for QR food orders (venueFoodCouponsTable, create/update/setActive/deleteVenueFoodCoupon), as guests see them through availableVenueFoodCoupons.',
    sub_flows: [
      {
        name: 'Create, edit, pause and delete a food coupon',
        description: 'Coupons created, edited, switched off and deleted on the page reflect in venueFoodCouponsTable and in availableVenueFoodCoupons for guests; a deleted coupon is removed but past orders keep their code and discount.',
        steps: [
          ['Open /venues/food-coupons and click "New coupon"', 'Dialog "New food coupon" with Code, Description, "Discount (%)", Minimum order, Valid from/until, Total uses, Uses per person and "Active"'],
          ['Enter code LUNCH10, discount 10 and click "Save"', 'Toast "Coupon LUNCH10 created"; the row shows Discount "10%" and Uses "0 · no limit"'],
          ['Click "Edit" on LUNCH10, change discount to 15 and "Total uses" to 50, click "Save"', 'Toast "Coupon LUNCH10 updated"; the row shows "15%" and "0 of 50"'],
          ['Switch the row\'s active toggle off', 'Toast "Coupon LUNCH10 is off. Guests can no longer use it."; availableVenueFoodCoupons no longer lists it'],
          ['Switch it back on', 'Toast "Coupon LUNCH10 is active. Guests can use it now."; availableVenueFoodCoupons lists it again (venue ordering must be on)'],
          ['Click "Delete" and confirm in "Delete coupon LUNCH10?"', 'Toast "Coupon LUNCH10 deleted"; the row disappears'],
          ['View a past order that used LUNCH10 on /venues/food-orders', 'Its details still show "Coupon LUNCH10 (15%)" with the discount'],
        ],
      },
      {
        name: 'Food coupon form validation',
        description: 'The coupon form refuses a missing or malformed code, a discount outside 1-90 and an end before the start, and the server refuses the same plus a code the venue already has. Food coupons are percent-only: there is no flat amount.',
        steps: [
          ['Click "New coupon" and "Save" with the code empty', 'Field error "Enter a coupon code"'],
          ['Type code "-X" and save', 'Field error "Use 3 to 30 characters" or "Use only A–Z, 0–9, hyphens and underscores, starting with a letter or a digit"'],
          ['Set "Discount (%)" to 0, then 91', 'Field error "Enter a whole number from 1 to 90"'],
          ['Set "Valid until" before "Valid from"', 'Field error "The end must be after the start"'],
          ['Save a valid coupon whose code already exists on this venue', 'The dialog shows the server error "This venue already has a coupon with this code"'],
          ['Send createVenueFoodCoupon directly with discount_pct 0 and then valid_until before valid_from', 'Refused: "The discount must be a whole number from 1 to 90", then "The end date must be after the start date"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Publish Page',
    description:
      'Publish Your Venue (/venues/publish) and Publish Your Host Page (/host/publish): the shared @duncit/public-page card that publishes one tracked short link per page, its QR, the A4 poster, a venue\'s table label and the page tracking numbers (publishPublicPage, myPublicPage).',
    sub_flows: [
      {
        name: 'Publish the venue public page and copy its tracked link',
        description: 'publishPublicPage(VENUE, ref_id) returns one tracked link for the owner\'s approved, active venue; repeating it returns the same link, and myPublicPage then reports published with link, QR and tracking stats.',
        steps: [
          ['Open /venues/publish as the owner of an approved, active venue never published', 'Header "Publish Your Venue"; card "Publish your venue" with a "Publish" button'],
          ['Click "Publish"', 'The button reads "Publishing…"; then a "Published" chip, "Your page link" with the URL, QR, "Copy link", "Open page", "Download QR", "Download A4 poster" and "Page tracking" appear'],
          ['Click "Copy link"', 'Snackbar "Link copied" and the clipboard holds the URL'],
          ['Send publishPublicPage(kind: VENUE, ref_id) again', 'The same url and code are returned (idempotent)'],
          ['Change "Period" in "Page tracking" to "All time"', 'myPublicPage re-runs with days 0 and shows Link opens, Unique visitors and the funnel counts'],
          ['As another owner, send publishPublicPage(VENUE) with this venue\'s id', 'Refused NOT_FOUND: "Venue not found"'],
        ],
      },
      {
        name: 'Unapproved venue cannot be published',
        description: 'A selected venue that is not APPROVED shows the venue-publish-needs-approval alert and no publish card; the server refuses publishing a non-approved or inactive venue.',
        steps: [
          ['Select a SUBMITTED venue and open /venues/publish', 'Info alert "Your venue can be published once it is approved."; no "Publish" button'],
          ['Send publishPublicPage(kind: VENUE, ref_id: <submitted venue>)', 'Refused FAILED_PRECONDITION: "A venue can be published once it is approved and active"'],
        ],
      },
      {
        name: 'Download the A4 poster PDF',
        description: '"Download A4 poster" runs myPublicPagePosterPdfBase64 with the headline and footer and saves <slug>-poster.pdf; a failure shows the posterFailed snackbar. Works for the venue page and the host page.',
        steps: [
          ['On a published /venues/publish card click "Download A4 poster"', 'The button reads "Preparing poster…" then a file <venue-slug>-poster.pdf downloads'],
          ['Open the PDF', 'An A4 page with the venue, the QR and headline "Scan to see the pods happening here" (or "Scan to see the Menu & pods happening here" for a food venue) and footer "Find your people on Duncit"'],
          ['On /host/publish (published) click "Download A4 poster"', '<host-slug>-poster.pdf downloads with headline "Scan to join my next pod"'],
          ['Make the query fail (block the GraphQL request) and click again', 'Snackbar "We couldn\'t make the poster. Please try again."'],
        ],
      },
      {
        name: 'Download the venue table label PDF',
        description: 'Only the venue card offers "Download table label": myVenueTableLabelPdfBase64(venue_id, headline) returns a PDF whose QR is a VENUE_MENU link for a food venue (the page link otherwise); failures show the tableLabelFailed notice.',
        steps: [
          ['On a published /venues/publish card for a food venue click "Download table label"', 'The button reads "Preparing table label…" then <venue-slug>-table-label.pdf downloads'],
          ['Scan the label QR', 'It opens the venue food menu (VENUE_MENU link) where guests can order'],
          ['Open /host/publish (published)', 'No "Download table label" button is shown'],
          ['Send myVenueTableLabelPdfBase64 with headline ""', 'Refused BAD_USER_INPUT: "Label text is required"'],
          ['Block the request and click "Download table label"', 'Snackbar "We couldn\'t make the table label. Please try again."'],
        ],
      },
      {
        name: 'Publish the host public page',
        description: 'On /host/publish the signed-in host publishes their own page: publishPublicPage(HOST) returns the tracked link and myPublicPage the insights; an account without the HOST role is refused.',
        steps: [
          ['Sign in as an approved HOST and open /host/publish', 'Header "Publish Your Host Page"; card "Publish your host page" with "Publish"'],
          ['Click "Publish"', '"Published" chip, "Your page link", QR, "Copy link", "Download QR", "Download A4 poster" and "Page tracking" appear'],
          ['Reload the page', 'The same link is shown (myPublicPage published true)'],
          ['Send publishPublicPage(kind: HOST) as a user without the HOST role', 'Refused FORBIDDEN: "Only an approved host can publish a host page"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Earnings',
    description:
      'Venue Earnings at /venues/earnings: myVenueEarningsSummary tiles and the myVenuePayouts table, built from the VENUE_BILLING payment releases of every venue the owner has.',
    sub_flows: [
      {
        name: 'View venue earnings table',
        description: 'Rows are the owner\'s VENUE_BILLING payment releases (PENDING/APPROVED/REJECTED); Lifetime Earnings sums APPROVED releases, Pending sums PENDING requests and This Month the APPROVED ones reviewed this month, so approved totals match the wallet credits Finance released.',
        steps: [
          ['Open /venues/earnings as an owner whose venues had completed pods approved by Finance', 'Header "Venue Earnings" with hint "What your slots earned and your payouts"; tiles Lifetime Earnings, Pending, This Month, Pods completed'],
          ['Compare the table rows with the venue\'s payment releases', 'One row per release with Pod, Date, Status chip (PENDING/APPROVED/REJECTED) and Amount (approved amount, else breakdown payout, else requested)'],
          ['Compare "Lifetime Earnings" with the wallet ledger', 'It equals the sum of APPROVED releases, i.e. the venue-bill credits in the owner\'s wallet'],
          ['Sign in as an owner with no releases', 'Tiles show 0 and the table shows "Payouts appear here after a pod at your venue completes."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Pod Partner Requests',
    description:
      'Pod Requests between venues and hosts in partners-app: nearby search (/venues/nearby-hosts, /host/nearby-venues), sending within a monthly quota, accept/decline, slot pick and confirm, and withdrawal (podPartnerRequest resolvers, scoped to the two parties).',
    sub_flows: [
      {
        name: 'Venue finds nearby hosts and sends a pod request',
        description: 'For an approved, active venue with a city, nearbyHostsForVenue lists hosts by radius and category; sending (VENUE_TO_HOST) creates a REQUESTED request, the card shows the status chip and the quota line drops by one.',
        steps: [
          ['Open /venues/nearby-hosts as the owner of an approved venue with a location', 'Search filters (Venue when several, "Radius", "Category") and "<remaining> of <limit> requests left this month"'],
          ['Wait for results', 'Host cards with name, categories and "<km> km away", each with "Request Pod"'],
          ['Click "Request Pod" on a host, type a note in "Note (optional)" and submit "Request Pod"', 'The dialog closes and "Pod Request sent." shows; that card now shows the "Requested" chip'],
          ['Look at the quota line', 'Remaining is one less than before'],
          ['Open /venues/pod-requests', 'The request is under "Your requests to hosts" as Requested'],
          ['Send the same request again via sendPodPartnerRequest', 'Refused CONFLICT: "You already have an open Pod Request with this partner"'],
        ],
      },
      {
        name: 'Host finds nearby venues and sends a pod request',
        description: 'nearbyVenuesForHost lists approved venues near the host\'s location; a HOST_TO_VENUE request is created and appears on /host/pod-requests under the sent list.',
        steps: [
          ['Open /host/nearby-venues as an active host', '"Search Nearby Venues" filters and the quota line'],
          ['Wait for results', 'Venue cards with name, locality/city and "<km> km away" and "Request Pod"'],
          ['Click "Request Pod" on a venue and submit', '"Pod Request sent."; the card shows the "Requested" chip'],
          ['Open /host/pod-requests', 'The request appears under "Your requests to venues" with "Requested on <date>"'],
        ],
      },
      {
        name: 'Accept or decline an incoming pod request',
        description: 'Only the receiving side answers: respondPodPartnerRequest moves REQUESTED to ACCEPTED or REJECTED and notifies the sender, whose list then shows the outcome.',
        steps: [
          ['As the receiving host open /host/pod-requests/<id> of a Requested request', '"Accept" and "Decline" buttons'],
          ['Click "Accept"', 'Status becomes "Accepted"; the request moves to the "Venue Accepted Requests" tab and the slot picker shows'],
          ['As the sending venue owner open /venues/pod-requests', 'The request shows "Accepted" under "Your requests to hosts"'],
          ['On another Requested request click "Decline"', 'Status "Declined"'],
          ['As the sender, send respondPodPartnerRequest for your own request', 'Refused FORBIDDEN: "Only the receiver can answer this request"'],
          ['Answer an already answered request again', 'Refused CONFLICT: "This request has moved on — refresh to see where it is."'],
        ],
      },
      {
        name: 'Request and answer a slot on an accepted request',
        description: 'On an ACCEPTED request the receiver picks one of the venue\'s open slots (requestPodPartnerSlot holds it, SLOT_REQUESTED); the sender confirms (SLOT_CONFIRMED) or declines (hold freed, back to ACCEPTED).',
        steps: [
          ['As the receiver open the Accepted request detail', '"Pick a slot" with "Choose one of the venue\'s open slots. The other side confirms it before the pod is created." and the venue\'s open slots (or "This venue has no open slots right now.")'],
          ['Choose a slot and click "Send Slot Request"', 'Status "Slot requested" and the note "Waiting for the other side to confirm the slot."'],
          ['As the sender open the request and click "Decline slot"', 'Status returns to "Accepted"; the slot is free again and the receiver sees "Pick a slot"'],
          ['Receiver sends a slot again; sender clicks "Confirm slot"', 'Status "Slot confirmed"; the host sees "Create Pod", the venue "The slot is confirmed. The host creates the pod next."'],
          ['As the sender send requestPodPartnerSlot', 'Refused FORBIDDEN: "The other side picks the slot"'],
        ],
      },
      {
        name: 'Cancel your own pod request',
        description: 'The sender withdraws an unanswered request from its detail page (cancelPodPartnerRequest, REQUESTED to CANCELLED, shown as "Withdrawn"). Discrepancy: withdrawing does not give the monthly quota back; only a failed send releases it.',
        steps: [
          ['As the sender open /host/pod-requests and click your Requested request', 'The detail shows "Waiting for the other side to answer." and "Withdraw"'],
          ['Note the quota on /host/nearby-venues, then click "Withdraw"', 'Status becomes "Withdrawn"'],
          ['Reopen /host/nearby-venues', 'The quota line is unchanged (no request is given back)'],
          ['As the receiver send cancelPodPartnerRequest', 'Refused FORBIDDEN: "Only the sender can withdraw this request"'],
        ],
      },
      {
        name: 'Request quota exhausted',
        description: 'podPartnerRequestQuota counts per venue (VENUE side) or per host per month against the admin override or the default of 10; at 0 remaining the Request Pod buttons are disabled and sendPodPartnerRequest is refused atomically with LIMIT_REACHED.',
        steps: [
          ['Set the venue\'s "Maximum Host Requests / Month" to 1 (admin) and send one request from /venues/nearby-hosts', 'The line reads "You have used all 1 Pod Requests for this month." in red'],
          ['Look at the result cards', 'Every "Request Pod" button is disabled'],
          ['Send sendPodPartnerRequest directly for another host', 'Refused LIMIT_REACHED: "You have used all 1 requests for this month."'],
          ['Set the override to 0 and send', 'Refused LIMIT_REACHED: "You have used all 0 requests for this month."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Studio Options',
    description:
      'Each studio\'s Options page (/venues/options, /host/options, /ecomm/options, /club-admin/options): the shared studio-options catalogue as a list of links, for the role the user holds, with Auto Pods following its flag and app-only screens left out.',
    sub_flows: [
      {
        name: 'Studio Options hubs per role',
        description: 'Each options page lists the studio\'s catalogue options (studioOptionsFor with console true) for a user holding that studio\'s role, each row linking to its partner page; Venue Options also has the venue picker the other venue pages follow. A user without the role gets an empty list.',
        steps: [
          ['As a VENUE_OWNER open /venues/options', 'Header "Venue Options", a venue picker with "Every venue option opens for this venue", then rows Dashboard, Your Venues, Slot Requests, Availability Calendar, Venue Settings, Venue Earnings, Publish Your Venue, Food Dashboard, Food Menu, Food Orders, Food Coupons, ... Verification, Withdrawal'],
          ['Pick the second venue in the picker and click "Publish Your Venue"', 'Navigates to /venues/publish with the picked venue selected'],
          ['As a HOST open /host/options', '"Host Options" lists Dashboard, Your Pods, Create a Pod, Pod Requests From Venues, Search Nearby Venues, Change Requests, Publish Your Host Page, Verification, Withdrawal (no app-only Host Share/Categories)'],
          ['As an ECOMM_MANAGER open /ecomm/options', '"Brand Options" lists Dashboard, Your Brands, Integrations, Brand Orders, ShipRocket Pickup Addresses, Product Returns, Deletion Refunds, Verification, Withdrawal'],
          ['As a CLUB_ADMIN open /club-admin/options', '"Club Options" lists Dashboard, Your Clubs, Pod Monitoring (AI), Change Requests, Verification, Withdrawal'],
          ['Turn the auto_pods flag on and reload /venues/options', 'An "Auto Pods" row appears after Slot Requests'],
          ['As a VENUE_OWNER with no venues open /venues/options', 'Info "You have no venues yet." with "Add a venue" linking to /register-venue/new'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Wallet & Withdrawals',
    description:
      'Gap scenarios appended to Partners: Wallet & Withdrawals.',
    sub_flows: [
      {
        name: 'Download the wallet statement',
        description: '"Download statement" on /wallet runs myWalletStatementFile for the signed-in user only, as PDF or CSV, for a preset or custom period (at most 366 days, no future dates); rows reconcile opening + credits - debits = closing. There is no separate round-off line.',
        steps: [
          ['Open /wallet and click "Download statement"', 'Dialog "Download statement" with "Every earning, withdrawal and reversal in the period, with your opening and closing balance.", "Period" and "Format"'],
          ['Pick "This month", format CSV, click "Download"', 'A CSV downloads named ...withdrawal-statement-<from>_to_<to>.csv and "Your statement is ready."'],
          ['Compare the CSV with myWalletTransactions for the period', 'One row per ledger entry; Opening balance + credits - debits equals the Closing balance and the Totals row counts the transactions'],
          ['Pick "Custom range" with To before From', 'Field error "The end date must be on or after the start date"'],
          ['Pick a custom range longer than 366 days', 'Error "A statement can cover at most 366 days"'],
          ['Pick a period with no transactions and download PDF', 'The PDF downloads and the dialog says "No transactions in this period. Your statement shows the opening and closing balance only."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Host Pods',
    description:
      'Gap scenarios appended to Partners: Host Pods.',
    sub_flows: [
      {
        name: 'Create a FREE physical pod at a partner venue',
        description: 'A physical pod can be FREE: the shared pod form drops the Amount field and the earnings projection, saves pod_type FREE with pod_amount 0, warns under the slot picker when the partner\'s slot is priced, and members then join instantly with no checkout.',
        steps: [
          ['As an approved HOST on /host/pods click "New Pod", fill title, description, club, keep Physical, pick another partner\'s approved venue and a priced slot', 'Start and end fill from the slot; the Pod type, Occurrence, Amount and No. of spots fields are shown'],
          ['Set "Pod type" to "Free"', 'The Amount field disappears (not disabled), the earnings projection is no longer rendered and the spots hint reads "Total spots, including the host’s own seat."'],
          ['Look under the slot picker', 'Info alert: "This pod is free, so Duncit will not pay the venue for this slot. The host settles the venue’s charges with the venue directly, and the venue is asked not to confirm the slot until the host has spoken to them or transferred the amount."'],
          ['Add an image and click "Save"', 'Snackbar "Pod created."; the pod is stored with pod_type FREE and pod_amount 0 and waits for the venue\'s decision'],
          ['Repeat with a ₹0 slot or one of the host\'s own venues', 'No free-pod venue note is shown and the slot books instantly'],
          ['Once the pod is live, open it in mWeb as a USER', 'The CTA reads "Join free pod"; joining adds the member immediately with no Razorpay checkout and no Payment row'],
          ['As that member open the pod again', 'The action is "Cancel Spot" (dialog "Cancel your spot?"), not a backout/refund'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Slot Requests',
    description:
      'Gap scenarios appended to Partners: Slot Requests.',
    sub_flows: [
      {
        name: 'Approve a slot request for a free pod',
        description: 'A slot request whose pod is FREE shows the free-pod notice instead of the slot price and earnings breakdown, on the list card and the decision page; approving still books the slot and puts the pod live, with no venue money attached.',
        steps: [
          ['As the VENUE_OWNER open /venues/requests with a FREE physical pod pending on one of your priced slots', 'The card shows a warning alert titled "This pod is free" with "Please coordinate with the host. The host will contact you about your charges. Please do not confirm the slot until the host has called you to discuss or has transferred the amount."'],
          ['Check the card details', 'Venue, Slot and Requested are shown but no "Slot price" detail; the link button reads "View request" instead of "View earnings"'],
          ['Click "View request"', '/venues/requests/<slotId> shows the same free-pod notice in place of the earnings breakdown'],
          ['Check the slot request email / in-app note the owner received', 'Both carry "This pod is free, so please coordinate with the host directly..." in place of the earnings line'],
          ['Back on the list click "Approve" then "Approve booking"', '"Booking approved — the pod is now live." and the card leaves the list; slot BOOKED, pod venue_approval_status APPROVED and is_active true'],
          ['Open /venues/pods for that venue', 'The pod\'s price column reads "Free" and no venue earning is shown for it'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Integrations',
    description:
      'E-Commerce Brand > Integrations at partners-app.duncit.com/ecomm-brand/integrations: the Razorpay and ShipRocket accounts a brand partner saves once (owner-scoped myPartnerIntegrations / savePartnerIntegration / recheck / delete) and picks per brand in the brand wizard\'s Integration step (useBrandIntegration).',
    sub_flows: [
      {
        name: 'Save a Razorpay or ShipRocket integration once and use it per brand',
        description: 'savePartnerIntegration stores a named connection, runs the vendor check immediately and only ever returns the public half (secrets reported as has_secret); recheck re-probes it; a connection that passed its check can be picked for any of the partner\'s brands via useBrandIntegration.',
        steps: [
          ['As an ECOMM_MANAGER open /ecomm-brand/integrations', 'Hero "Integrations" with "Save your Razorpay and ShipRocket accounts once, then pick them for any of your brands..."; Razorpay and ShipRocket cards each show "No <provider> account saved yet." when empty'],
          ['On Razorpay click "Add connection"', 'Dialog "Add Razorpay connection" with "Connection name", "Key ID", "Key Secret" and optional "Webhook secret (optional)"'],
          ['Enter a name and Razorpay test keys, then save', 'Toast "Connection saved"; the row shows the name, the key id (no secret), status chips ("Connected", "Test mode") and "Not used by any brand yet"'],
          ['Add a ShipRocket connection with the sandbox API user and "Sandbox mode — test orders only" on', 'Saved and checked; the row shows a "Sandbox — test orders" chip'],
          ['Click "Test again" on a row', 'recheckPartnerIntegration runs; the row refreshes with the new check result'],
          ['Open a brand\'s wizard at /ecomm-brand/<brandId>/edit, Integration step, and pick the saved Razorpay account in "Razorpay account"', 'Toast "Razorpay account picked for this brand"; the brand\'s integration status turns connected'],
          ['Return to /ecomm-brand/integrations', 'The Razorpay row now reads "Used by <brand name>"'],
          ['Query myPartnerIntegrations directly', 'Only the caller\'s own connections return, with status.has_secret true and no key_secret/password value'],
        ],
      },
      {
        name: 'Invalid credentials and deleting an integration in use',
        description: 'A key the vendor refuses is still saved but its row shows not-connected with the vendor\'s reason and it cannot be picked for a brand; deleting is disabled in the UI while any brand uses the connection and the server refuses it naming the brands (or a venue using it for food orders).',
        steps: [
          ['On /ecomm-brand/integrations add a Razorpay connection with a wrong Key Secret', 'The dialog closes with "Connection saved", but the row shows "Not connected" and the provider\'s failure message'],
          ['Click "Test again"', 'The row stays not connected and shows the vendor\'s reason again'],
          ['In a brand wizard Integration step open "Razorpay account"', 'That connection is listed as "<name> — failed its last check" and cannot be picked (hint "Only accounts that passed their last check can be picked.")'],
          ['Call useBrandIntegration with that connection id', 'Refused: "This connection did not pass its last check. Test it again on the Integrations page first."'],
          ['Save a connection with an empty name', '"Give this connection a name" (61+ chars: "Keep the name under 60 characters")'],
          ['On a connection used by a brand look at "Delete"', 'The button is disabled with the caption "A connection in use cannot be deleted. Pick another account on those brands first."'],
          ['Call deletePartnerIntegration for it directly', 'Refused: "In use by <brand>. Choose another connection on that brand first."'],
          ['Delete an unused connection and confirm "Delete <name>?"', 'Toast "Connection deleted" and the row disappears'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Orders',
    description:
      'E-Commerce Brand > Orders at partners-app.duncit.com/ecomm-brand/orders and /ecomm-brand/orders/:orderId: Pod Shop orders on the partner\'s own brands (brandProductOrdersTable / brandProductOrder, owner-scoped), with ShipRocket booking, documents, tracking, address fix and cancel & refund.',
    sub_flows: [
      {
        name: 'Browse brand orders and open one',
        description: 'brandProductOrdersTable returns only POD_SHOP orders containing the caller\'s brands; the detail page shows progress, items, ship-to, shipment and scans, and another partner\'s order id answers "Order not found".',
        steps: [
          ['As an ECOMM_MANAGER open /ecomm-brand/orders', 'Hero "Orders" with "Pod Shop orders on your brands..." and a table with Order, Buyer, Items, Total, Delivery, Status, Refund, AWB and Created columns'],
          ['Use the "Brand" picker to choose one brand, then "All brands"', 'Rows narrow to that brand\'s orders, then return to every own brand; a picked brand also shows "Delete this brand"'],
          ['Search by order number, buyer or AWB in "Search order, buyer or AWB"', 'Only matching rows remain; with none the table reads "No orders yet."'],
          ['Click an order row', '/ecomm-brand/orders/<id> with title "Order <no>" and subtitle buyer · amount · method'],
          ['Read the page', 'Sections "Progress" (stepper), "Items" ("<qty> × <price>"), "Ship to" (address, Phone, Email) and "Shipment" ("The shipment is not booked with ShipRocket yet." before booking)'],
          ['Open /ecomm-brand/orders/<id of another partner\'s order>', 'Warning "This order was not found on your brands."; the server answers "Order not found"'],
        ],
      },
      {
        name: 'Book a ShipRocket shipment and print documents',
        description: 'Book shipment calls brandBookProductOrderShipment on the brand\'s own ShipRocket account; label, invoice and manifest become available once an AWB exists; Refresh tracking pulls courier scans. A partial ShipRocket failure is stored on the order and shown, with Retry booking.',
        steps: [
          ['Open an unbooked shipped order of a brand with a connected ShipRocket account and synced pickup address', 'Buttons "Book shipment", "Fix address" and "Cancel & refund" are shown; no documents yet'],
          ['Click "Book shipment"', 'Toast "Shipment booked with ShipRocket."; Shipment lists ShipRocket order, Shipment, Courier, AWB, Pickup scheduled; "Book shipment" and "Fix address" disappear'],
          ['If ShipRocket stops part-way', 'Error toast "ShipRocket could not book the shipment: <error>", Shipment shows "ShipRocket could not book this shipment: <error>" and the button reads "Retry booking"'],
          ['Click "Print" for "Label", then "Download" for "Invoice" and "Manifest"', '"Opening the print dialog…" then "Document downloaded."; a document ShipRocket has not made yet gives "ShipRocket has not made this document yet. Try again in a minute."'],
          ['Click "Refresh tracking"', 'Toast "Tracking updated."; Tracking status and "Courier scans" refresh'],
          ['On a sandbox-booked order', 'Chip "Sandbox — test order" with the hint that no courier will collect the parcel'],
          ['Call brandBookProductOrderShipment on a cancelled order', 'Refused: "This order was cancelled"'],
        ],
      },
      {
        name: 'Update delivery address before shipping',
        description: 'The brand can fix the ship-to of a live shipped order only until ShipRocket has the order (shiprocket.order_id), not merely until an AWB is assigned as the row assumed; after booking the button is hidden and the server refuses.',
        steps: [
          ['Open an unbooked shipped order and click "Fix address"', 'Dialog "Fix the delivery address for <no>" prefilled with "Deliver to", phone, email, address lines, "Landmark", city, state and pincode'],
          ['Clear "Deliver to" and save', 'Validation blocks the save; the server would answer "Enter the name to deliver to"'],
          ['Enter an invalid email', '"Enter a valid email address."'],
          ['Correct the address and click "Save address"', 'Toast "Delivery address updated." and "Ship to" shows the new address'],
          ['Book the shipment, then look for "Fix address"', 'The button is gone once the order is booked with ShipRocket'],
          ['Call brandUpdateProductOrderAddress on the booked order', 'Refused: "The shipment is already booked with this address — cancel it with the courier first"'],
          ['Call it on a pickup (non-SHIP) order', 'Refused: "Only a shipped order has a delivery address"'],
        ],
      },
      {
        name: 'Brand cancels an order and the customer is refunded',
        description: 'brandCancelProductOrder (source BRAND) atomically claims an open POD_SHOP order, stops the courier, restocks, and refunds the paid amount to Razorpay and spent coins as coins, once; allowed only before courier pickup and only when every line is the partner\'s brand.',
        steps: [
          ['On an unshipped paid order click "Cancel & refund"', 'Dialog "Cancel order <no> and refund the buyer?" explaining stock goes back and <buyer> is refunded <amount> in full'],
          ['Submit with an empty "Reason (the buyer sees this)"', '"Give the reason — the buyer is told it." and nothing is sent'],
          ['Enter a reason and click "Cancel order & refund"', 'Toast "Order cancelled. The buyer’s refund has started."; section "Cancelled & refund" shows Cancelled on, Reason, Refund status, "Back to the original payment" and "Duncit Coins returned"'],
          ['Check the data', 'Order cancelled_at set, cancelled_by BRAND:<email>, line quantities back in inventory, one refund with initiated_by POD_SHOP_BRAND_CANCEL'],
          ['Look for "Cancel & refund" again', 'No action buttons on a cancelled order'],
          ['Call brandCancelProductOrder again for the same order', 'Refused: "This order is already delivered or cancelled" and no second refund is issued'],
          ['Try on an order already picked up by the courier', 'Refused: "The courier already has this parcel, so it can no longer be cancelled from here..."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Returns',
    description:
      'E-Commerce Brand > Product returns at partners-app.duncit.com/ecomm-brand/returns: Pod Shop returns on the partner\'s own brands (podShopReturnsTable as BRAND actor), approved or rejected, followed through the ShipRocket reverse pickup, received and refunded.',
    sub_flows: [
      {
        name: 'Approve, receive and refund a Pod Shop return',
        description: 'Approve moves a REQUESTED return to APPROVED and books a ShipRocket reverse pickup for a shipped order; Mark received moves it to RECEIVED; Refund buyer claims the refund atomically (refund.status \'\' -> PENDING), restocks and refunds once.',
        steps: [
          ['As an ECOMM_MANAGER open /ecomm-brand/returns', 'Hero "Product returns" and a table with Return, Order, Buyer, Items, Value and status columns'],
          ['Open a Requested return and click "Approve"', 'Dialog "Approve return <no>" with optional "Note to the buyer (optional)" and hint "For a shipped order, a ShipRocket pickup is booked on your account."'],
          ['Confirm "Approve"', 'Toast "Return approved."; status Approved and the Pickup section shows the AWB/courier once booked'],
          ['Click "Mark received"', 'Toast "Return marked as received." and status Received'],
          ['Click "Refund buyer" and confirm "Refund return <no>?"', 'Toast "Refund sent to the buyer."; status Refunded and the Refund section shows the amount and Duncit coins returned'],
          ['Call refundPodShopReturn again for the same return', 'Refused: "Refund once the goods are back at the pickup address" (status is no longer RECEIVED); no second refund is created'],
          ['Open a return of another partner\'s brand by id via GraphQL', '"Return not found"'],
        ],
      },
      {
        name: 'Reject a return and retry failed pickup or refund',
        description: 'Reject needs a buyer-facing reason and only works on REQUESTED; Retry pickup is offered only on an APPROVED return whose pickup failed; Retry refund is offered only when the refund FAILED (server re-sends only for FAILED or PENDING and is a no-op otherwise).',
        steps: [
          ['On a Requested return click "Reject" and submit with an empty note', '"Tell the buyer why the return is rejected." and nothing is sent'],
          ['Enter "Why are you rejecting it?" and confirm "Reject"', 'Toast "Return rejected."; status Rejected and the decision note is stored'],
          ['Call rejectPodShopReturn or approvePodShopReturn again on it', '"Only a requested return can be rejected" / "Only a requested return can be approved"'],
          ['Open an Approved return whose ShipRocket pickup failed', 'Pickup shows "ShipRocket could not book the pickup: <error>" and a "Retry pickup" button'],
          ['Click "Retry pickup"', 'Toast "Pickup booking retried."; calling it on a non-APPROVED return answers "Only an approved return still waiting for its pickup can be retried"'],
          ['Open a return whose Razorpay refund failed', '"Retry refund" is shown; on any other refund state the button is absent'],
          ['Click "Retry refund"', 'The refund is re-sent; if Razorpay refuses again "Razorpay could not refund the buyer: <error>"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Deletion',
    description:
      'Deleting a LIVE (approved) brand or product from partners-app.duncit.com/ecomm-brand: a catalog deletion request with an impact preview, a dated window and a running-orders mode, reviewed by the Products team, plus the Deletion Refunds list of orders it cancelled.',
    sub_flows: [
      {
        name: 'Request brand or product deletion with the impact preview, then withdraw',
        description: 'For an APPROVED brand the delete action opens a request dialog fed by catalogDeletionPreview (running orders, open returns, products); requestCatalogDeletion takes the brand and its products off sale immediately and files one request per product; withdrawCatalogDeletion closes it while open and puts it back on sale. Entry is the Your brands row menu or the wizard\'s Brand status card, not /ecomm-brand/:brandId.',
        steps: [
          ['On /ecomm-brand open the row menu ("Options for <brand>") of an APPROVED brand with an open order and choose "Delete brand"', 'Dialog "Delete <brand>" loads the preview: "Orders and returns are still running" with "<n> running order(s) and <m> open return(s) include this item.", "Running orders" and "Products deleted with this brand (<count>)"'],
          ['Read the options', '"What should happen to running orders?" with "Let running orders be delivered, then delete" and "Cancel all running orders now and refund buyers in full"; "Deletion date" hint "Pick a day between <earliest> and <latest>."'],
          ['Submit without a date', '"Pick the deletion date."'],
          ['Pick a date inside the window, choose a mode and click "Send deletion request"', 'Toast "Deletion request sent for <brand>. It is off the shop while the Products team reviews it."; the brand is deactivated and each live product gets a child request'],
          ['Try a second request for the same brand via GraphQL', '"A deletion request for this is already open"'],
          ['Choose "Withdraw deletion request" from the row menu and confirm "Withdraw the deletion request?"', 'Toast "Deletion request withdrawn — <brand> is back on sale."'],
          ['Call withdrawCatalogDeletion on a child product request', '"This product is part of a brand deletion — withdraw the brand request instead"'],
          ['Delete a brand still in setup (not APPROVED)', 'A plain confirm "Delete <brand>?" deletes it outright with "Brand deleted." (no request)'],
        ],
      },
      {
        name: 'Deletion refunds table',
        description: 'myDeletionRefundsTable lists the partner\'s own orders that an approved CANCEL_AND_REFUND deletion request cancelled, with each buyer\'s refund to payment, coins returned and refund status.',
        steps: [
          ['As an ECOMM_MANAGER open /ecomm-brand/deletion-refunds', 'Hero "Deletion Refunds" and a table with Order, Deletion request, Buyer, Brand, Items, Order total, Refund status, Refund to payment, Coins returned, Cancelled on, Refunded on, Razorpay refund ref and Refund problem'],
          ['With no deletion-cancelled orders', '"No order has been cancelled by a deletion request yet."'],
          ['Search "Search order, buyer or deletion request" for a request number', 'Only orders cancelled by that request remain'],
          ['Pick one brand in the Brand picker', 'Only that brand\'s refunds show'],
          ['Click a row', 'The order detail page opens with "Cancelled & refund" showing the Deletion request number and refund status'],
          ['Check a row whose Razorpay refund failed', 'Refund status "Refund failed — Duncit Finance will pay it out" and the Refund problem column carries the error'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Settings & Warehouses',
    description:
      'Gap scenarios appended to Partners: Brand Settings & Warehouses.',
    sub_flows: [
      {
        name: 'Add, default, deactivate and sync brand pickup addresses',
        description: 'Opening brand settings runs syncMyBrandPickupLocations against the brand\'s ShipRocket account; addresses can be made primary, switched inactive, or deleted, but disabling the primary is refused and delete/disable is blocked while myBrandPickupLocationUsage shows products shipping from it.',
        steps: [
          ['Open /ecomm-brand/<brandId>/settings for a brand with a ShipRocket integration', '"Checking your pickup addresses with ShipRocket…" then "Last synced <at>" (or "ShipRocket could not be read: <error>") above "Pickup Addresses"'],
          ['Click "Add pickup address", fill the form and save', '"Pickup address saved."; the card shows "Awaiting approval" and "Products cannot ship from this pickup address until the Duncit team approves it."'],
          ['On a second approved address click the make-primary icon ("Make <name> the primary pickup address")', '"<name> is now the primary pickup address." and the "Primary" chip moves'],
          ['Switch the primary address\'s Active toggle off', 'Dialog says "<name> is the primary pickup address. Make another one primary first, then disable it."; the server refuses with "This is the primary pickup address — make another one primary before disabling it"'],
          ['Switch off a non-primary address no product uses and confirm "Disable"', '"<name> is now inactive. It can no longer be chosen for a product." and an "Inactive" chip'],
          ['Click delete on an address products ship from', 'Dialog "Delete pickup address" lists the products with "<n> product(s) ship from <name>. Move each one to another pickup address, then come back." and no delete is possible'],
          ['Call deleteMyBrandPickupLocation for it directly', '"This pickup address cannot be deleted — <n> product(s) ship from it. Move them to another pickup address first: <names>."'],
          ['Delete an unused address', '"<name> will be deleted. No product ships from it." then "Pickup address deleted."'],
        ],
      },
    ],
  },
  {
    name: 'Venues: Venue Food',
    description:
      'The food tabs of a venue record in venues.duncit.com (/venues/:venueId?selectedtab=foodMenu|foodDashboard|foodOrders|foodCoupons): the shared @duncit/venue-food Food Menu, Food dashboard, Food orders and Food coupons tools in admin mode, gated by consoleEditors(\'VENUE\').',
    sub_flows: [
      {
        name: 'Food Menu tab edits the menu in admin mode',
        description: 'The Food menu tab mounts VenueFoodMenu in admin mode (reads venue, saves through updateApprovedVenue as an editor); the owner\'s Razorpay account is shown as a status only and never sent from the console, and the editor may change the invoice GSTIN.',
        steps: [
          ['As ALL_VENUES_ACCESS open /venues/<approvedVenueId>?selectedtab=foodMenu', 'Tab "Food menu" renders the form with "Does this venue offer food?", "Menu", "Online ordering & payments" and "GST on food"'],
          ['Look at the ordering account', 'No account picker; it reads "A Razorpay account is linked for these orders." or "No Razorpay account is linked yet — the owner connects one from the Partner console before ordering can be switched on."'],
          ['Click "Add menu item", enter "Item name" and "Price", add a photo', 'The row is added; a price below 1 shows "Enter a price of at least 1"'],
          ['Click "Save"', 'Toast "Food menu saved"; the request carries no razorpay_integration_id'],
          ['Look at the GSTIN field', 'Hint "Printed on every food invoice. The owner can add it once; you can change it here."'],
          ['Open the tab for a venue that is not approved', 'Info "This venue is not approved yet. Until it is, its food menu is edited in the venue form..." with an "Edit venue" button to /venues/<id>/edit'],
        ],
      },
      {
        name: 'Staff cancels and refunds a food order from the console',
        description: 'cancelVenueFoodOrder claims the order atomically (PAID and not SERVED/CANCELLED), refunds the guest in full from the venue\'s own Razorpay account once, releases the coupon use, messages the guest and writes a structured server log line (no separate audit record). The gate is consoleGovernors(\'VENUE\') or the venue owner: ALL_VENUES_ACCESS runs the board but is refused the refund and is not shown the button, and a CITY_ADMIN / ZONAL_ADMIN may refund only a venue in their own city / locality (financeScope.ts assertVenueFinanceScope).',
        steps: [
          ['As SUPER_ADMIN open /venues/<venueId>?selectedtab=foodOrders on a food-serving venue', 'Table "Food orders" with Order, Guest, Table / seat, Items, Total, Payment and Order status columns'],
          ['On a PAID, not-served order click "Cancel & refund"', 'Dialog "Cancel order <no>?" with "<guest> is refunded <amount> in full, from your Razorpay account. This cannot be undone."'],
          ['Enter fewer than 3 characters in "Reason for cancelling"', 'Validation blocks the submit'],
          ['Enter a reason and click "Cancel & refund"', 'Toast "Order <no> cancelled. The guest has been refunded." (or "...The refund is on its way to the guest."); status Cancelled, payment Refunded or Refund pending'],
          ['Look at the row again', '"Cancel & refund" is no longer offered'],
          ['Call cancelVenueFoodOrder again for the same order', 'Refused: "This order can no longer be cancelled" and no second refund'],
          ['Try a SERVED order via GraphQL', 'Refused: "This order can no longer be cancelled"'],
          ['Sign in as ALL_VENUES_ACCESS only and open the same tab', 'The board and its status buttons show, but no "Cancel & refund" button'],
          ['As CITY_ADMIN of another city, call cancelVenueFoodOrder for a paid order of this venue', 'Refused FORBIDDEN "This is outside the city or zone you administer"; the order stays PAID and no refund is made'],
          ['As CITY_ADMIN of the venue\'s city, cancel a paid order', 'Cancelled and refunded as for SUPER_ADMIN'],
        ],
      },
      {
        name: 'Staff manages a venue\'s food coupons',
        description: 'The Food coupons tab mounts the owner\'s VenueFoodCoupons tool; a console editor creates, edits, switches and deletes coupons for that venue only (venue_id pinned server-side).',
        steps: [
          ['Open /venues/<venueId>?selectedtab=foodCoupons on a food-serving venue', 'Table "Food coupons" or "No food coupons yet. Create one to give your guests a discount on food orders."'],
          ['Click "New coupon"', 'Dialog "New food coupon" with Code, Discount (%), Minimum order, Total uses, Uses per person, Valid from, Valid until'],
          ['Save with an empty code and discount 0', '"Enter a coupon code" and "Enter a whole number from 1 to <max>"'],
          ['Enter a valid code and 10% and save', 'Toast "Coupon <CODE> created"; the row shows "10%" and uses "0 · no limit"'],
          ['Edit it and change the discount', '"Coupon <CODE> updated"'],
          ['Switch it off, then on', '"Coupon <CODE> is off. Guests can no longer use it." then "Coupon <CODE> is active. Guests can use it now."'],
          ['Delete it and confirm "Delete coupon <CODE>?"', '"Coupon <CODE> deleted" and the row disappears'],
        ],
      },
      {
        name: 'Staff without venues role cannot call food staff operations',
        description: 'Food board operations take isAdmin from consoleEditors(\'VENUE\') (SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ONBOARDING_MANAGER, ALL_VENUES_ACCESS) — cancelling from consoleGovernors(\'VENUE\'), without ALL_VENUES_ACCESS; any other signed-in staff is treated as an owner and refused for venues they do not own. The console itself requires ALL_VENUES_ACCESS or ONBOARDING_MANAGER.',
        steps: [
          ['Sign in to venues.duncit.com as staff holding only ALL_HOSTS_ACCESS', 'The portal gate refuses the console and no venue data loads'],
          ['With that session call venueFoodOrdersTable(venue_id) for a venue they do not own', 'Refused with "Not your venue" (FORBIDDEN)'],
          ['Call cancelVenueFoodOrder for an order of that venue', 'Refused with "Not your venue" (FORBIDDEN); the order stays PAID'],
          ['Call createVenueFoodCoupon / venueFoodStats for that venue', 'Same "Not your venue" refusal'],
          ['Call venueFoodOrdersTable with no session', '"Not authenticated"'],
          ['Repeat venueFoodOrdersTable as ALL_VENUES_ACCESS', 'Rows return for any venue (editor access)'],
        ],
      },
    ],
  },
  {
    name: 'Venues: Venue Record',
    description:
      'Gap scenarios appended to Venues: Venue Record.',
    sub_flows: [
      {
        name: 'Food Dashboard, Orders and Coupons tabs appear only when the venue serves food',
        description: 'VenueRecordPage always adds the Food menu tab; Food dashboard, Food orders and Food coupons tabs are added only when venue.offers_food is true, each selected through ?selectedtab=.',
        steps: [
          ['Open /venues/<venueId> for a venue with offers_food false', 'Besides the record\'s own tabs only "Food menu" is added'],
          ['Open /venues/<venueId>?selectedtab=foodOrders on that venue', 'No Food orders tab exists, so the record falls back to its default tab'],
          ['Open a venue with offers_food true', 'Tabs "Food menu", "Food dashboard", "Food orders" and "Food coupons" are present'],
          ['Click "Food dashboard"', 'URL gains ?selectedtab=foodDashboard and the dashboard tiles (Orders, Revenue, Average order, ...) render'],
          ['Reload on ?selectedtab=foodCoupons', 'The Food coupons tab is still selected'],
          ['On the food-off venue turn "Does this venue offer food?" on in Food menu and save, then reload', 'The three extra food tabs appear'],
        ],
      },
    ],
  },
  {
    name: 'Venues: Venue Editor',
    description:
      'Gap scenarios appended to Venues: Venue Editor.',
    sub_flows: [
      {
        name: 'Editor Food section: ordering, GST override and admin-editable GSTIN',
        description: 'The editor\'s Food Menu section saves offers_food, menu, QR ordering and the GST settings (tax_mode, own GST %) without touching the owner\'s Razorpay link; the GSTIN sits in Venue Documents and a console editor can change it. Each new food order snapshots venue_gstin, so new invoices show the new number; changes appear in Change Logs.',
        steps: [
          ['Open /venues/<venueId>/edit and scroll to "Food Menu"', 'Shared food fields render; the Razorpay account shows status only'],
          ['Turn on "Set this venue\'s own GST", choose "GST added to prices" and enter "GST %" out of range', '"GST must be a whole number from <min> to <max>."'],
          ['Enter a valid GST % and turn on "Accept food orders from the venue QR"', 'Accepted only when a connected account is linked and a menu item is available; otherwise "Pick a connected Razorpay account and keep at least one menu item available first."'],
          ['In "Venue Documents" change GSTIN to an invalid value', '"GSTIN looks like 22ABCDE1234F1Z5"'],
          ['Enter a valid new GSTIN and click "Save venue"', '"Venue saved"; the record shows the new GSTIN and tax mode'],
          ['Place and pay a new QR food order, then download its invoice', 'The invoice prints "GSTIN: <new value>" and is titled "TAX INVOICE" when GST % > 0; older orders keep the GSTIN they were placed with'],
          ['Open the Change Logs tab', 'Updated rows for gstin and the food fields with source Portal or Admin Portal'],
        ],
      },
    ],
  },
  {
    name: 'Products: Catalogue Deletion',
    description:
      'Products portal Deletion Requests (/deletion-requests/brands, /products, /refunds, /settings): the Products team (SUPER_ADMIN, PRODUCTS_MANAGER) reviews partners\' requests to delete live brands and products, follows the refunds of orders a deletion cancelled, and sets the notice window.',
    sub_flows: [
      {
        name: 'Review a brand or product deletion request',
        description: 'reviewCatalogDeletion approves or rejects a PENDING top-level request (rejection needs a note and puts the item back on sale); a brand approval approves its child product requests and, under CANCEL_AND_REFUND, cancels running orders made only of those items with full refunds in the background; the partner is notified. The item already left the shop when the partner asked.',
        steps: [
          ['As PRODUCTS_MANAGER open /deletion-requests/brands', '"Brand deletion requests" table with Request, Brand, Status, Running orders, Delete on, Orders when asked, Requested by, Raised'],
          ['Click a pending brand row', '/deletion-requests/products filtered to that brand ("Showing the products of <brand>") with a "Review brand request" chip'],
          ['Click "Review brand request"', 'Dialog "Deletion request <no>" with Brand, Running orders mode, Delete on, Partner’s reason, the impact and History'],
          ['Click "Reject" with an empty note', '"Tell the partner why it is rejected." and nothing is sent'],
          ['On a CANCEL_AND_REFUND request read the warning and click "Approve"', 'Warning "Approving cancels every running order made up only of these items..."; toast "Approved — the partner has been told." and status Approved for the brand and its products'],
          ['Open a child product request directly', '"This product is part of a brand deletion — review the brand request instead." and no Approve/Reject'],
          ['Call reviewCatalogDeletion again on the approved request', '"Only a pending request can be reviewed"'],
          ['Call reviewCatalogDeletion as ECOMM_MANAGER', '"Access Denied"'],
        ],
      },
      {
        name: 'Deletion refunds desk',
        description: 'deletionRefundsTable (SUPER_ADMIN, PRODUCTS_MANAGER, FINANCE_MANAGER) lists every order a deletion request cancelled; a row opens the order, where Retry refund is offered only for a FAILED refund and retryProductOrderRefund re-sends only FAILED/PENDING refunds.',
        steps: [
          ['Open /deletion-requests/refunds', '"Deletion Refunds" with Order, Deletion request, Buyer, Brand, Items, Order total, Refund status, Refund to payment, Coins returned, Cancelled on, Refunded on, Razorpay refund ref'],
          ['From a request dialog click "View these orders and their refunds"', 'The table is filtered with "Showing the orders cancelled by deletion request <no>." and a "Show all" chip'],
          ['Click a row whose refund is "Refund failed — manual payout needed"', '/orders/<id> shows "Cancel & refund" with "Razorpay refused the refund: <error>..." and a "Retry refund" button'],
          ['Click "Retry refund"', 'Toast "Refund sent to Razorpay again."; the status updates'],
          ['Open a row whose refund is "Refunded"', 'No "Retry refund" button'],
          ['Call deletionRefundsTable as ECOMM_MANAGER', '"Access Denied"'],
        ],
      },
      {
        name: 'Set the deletion window',
        description: 'updateCatalogDeletionWindow stores whole-day min/max (1–365, min ≤ max); the partner\'s deletion dialog then offers only dates inside the new window and the server refuses any other date.',
        steps: [
          ['Open /deletion-requests/settings', '"Deletion settings" with "Minimum days" and "Maximum days" and "A request raised today can be scheduled from <earliest> to <latest>."'],
          ['Enter 0 in Minimum days', '"Enter a whole number from 1 to 365."'],
          ['Enter 40 minimum and 20 maximum', '"The maximum cannot be less than the minimum."'],
          ['Enter 7 and 14 and click "Save"', 'Toast "Deletion settings saved." and the today line updates'],
          ['As a partner open a brand deletion dialog', '"Pick a day between <today+7> and <today+14>."'],
          ['Call requestCatalogDeletion with a date outside the window', '"Pick a deletion date between <earliest> and <latest>"'],
          ['Call updateCatalogDeletionWindow as ECOMM_MANAGER', '"Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Products: Pod Shop Returns',
    description:
      'Products portal /returns: every Pod Shop return across brands, decided by staff (SUPER_ADMIN, PRODUCTS_MANAGER, FINANCE_MANAGER act as STAFF) through the same podShopReturn mutations the brand uses.',
    sub_flows: [
      {
        name: 'Approve, receive, refund and retry Pod Shop returns',
        description: 'Staff can act on any brand\'s return: approve/reject a REQUESTED return (reject needs a note), retry a failed pickup, mark received, refund once (atomic claim) and retry a FAILED refund; ECOMM_MANAGER sees only own brands and other users get Access Denied.',
        steps: [
          ['Open /returns as PRODUCTS_MANAGER', '"Product returns" table with Return, Order, Buyer, Items, Status, Value, Pickup, Raised'],
          ['Open a Requested return and click "Reject" with an empty note', '"Tell the buyer why the return is not accepted."'],
          ['Open another Requested return and click "Approve"', '"Return approved."; a ShipRocket reverse pickup is booked for a shipped order'],
          ['On an Approved return with a pickup error click "Retry pickup"', '"Pickup booking retried."'],
          ['Click "Mark received", then "Refund buyer" and confirm "Refund this return?"', '"Marked received." then "Refund sent."; status Refunded'],
          ['Call refundPodShopReturn again', '"Refund once the goods are back at the pickup address" and no second refund'],
          ['On a return whose refund failed click "Retry refund"', '"Refund retried." (button shown only for a FAILED refund)'],
          ['Call podShopReturnsTable as a USER with no staff or brand role', '"Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Products: Orders & Fulfilment',
    description:
      'Gap scenarios appended to Products: Orders & Fulfilment.',
    sub_flows: [
      {
        name: 'Force cancel an order and retry a failed refund',
        description: 'forceCancelProductOrder (SUPER_ADMIN, PRODUCTS_MANAGER, FINANCE_MANAGER) cancels a Pod Shop order at any open stage, stops the courier, restocks and refunds once; retryProductOrderRefund only works on a cancelled order and re-sends only a FAILED or PENDING refund.',
        steps: [
          ['Open /orders/<id> of a paid Pod Shop order', 'Card "Cancel & refund" with "Cancels the order, stops the courier, puts the stock back and refunds the buyer <amount> in full through Razorpay..."'],
          ['Click "Cancel order & refund" and confirm with an empty reason', '"Write the reason — the buyer is told it."'],
          ['For an order already with the courier', 'The dialog warns "This parcel is already with the courier (AWB <awb>)..."'],
          ['Enter a reason and confirm', 'Toast "Order cancelled — the refund is on its way."; card shows "Cancelled <when> by <email>." and "<amount> back to the original payment · <coins> coins"'],
          ['Call forceCancelProductOrder again', '"This order is already delivered or cancelled"; no second refund'],
          ['Open an order whose refund FAILED and click "Retry refund"', 'The card showed "Razorpay refused the refund: <error>..."; toast "Refund sent to Razorpay again." and the refund status updates'],
          ['Call retryProductOrderRefund on an order that is not cancelled', '"Only a cancelled order has a refund to retry"'],
        ],
      },
    ],
  },
  {
    name: 'Products: Cart Settings',
    description:
      'Products portal /cart/settings: the Pod Shop cart reminder settings (in-app nudge and reminder email) read by productCartSettings and saved by updateProductCartSettings (SUPER_ADMIN, PRODUCTS_MANAGER, TECH_MANAGER).',
    sub_flows: [
      {
        name: 'Cart reminder settings',
        description: 'The form edits nudge_enabled, nudge_delay_minutes (1–1440), nudge_auto_hide_seconds (3–60), email_enabled, email_first_delay_hours (1–720), email_repeat_hours (1–720) and email_max_count (1–20); a save persists and the next read returns the new values.',
        steps: [
          ['Open /cart/settings as PRODUCTS_MANAGER', '"Cart Settings" with sections "In-app nudge" and "Reminder email"'],
          ['Clear "Show after (minutes)"', '"Enter a whole number between 1 and 1440." and Save is blocked'],
          ['Enter 2 in "Hide after (seconds)"', '"Enter a whole number between 3 and 60."'],
          ['Set nudge to 30 minutes, turn off "Send the "Your cart is calling" email" and click "Save"', 'Toast "Cart settings saved"'],
          ['Reload the page', 'The saved values and switch states are shown (productCartSettings returns them)'],
          ['Call updateProductCartSettings as ECOMM_MANAGER', '"Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded Venues',
    description:
      'Gap scenarios appended to Onboarding: Onboarded Venues.',
    sub_flows: [
      {
        name: 'Set host and venue pod-request limits',
        description: 'The limits are not on /settings: they are per-partner overrides in the Review/Edit dialogs on /venues ("Maximum Host Requests / Month", setVenueHostRequestLimit) and /hosts ("Maximum Venue Requests / Month", setHostVenueRequestLimit), governor-only, 0–1000 or empty for the default of 10; the partner\'s quota line follows them.',
        steps: [
          ['In the Onboarding portal open /venues and Review an approved venue', 'A "Maximum Host Requests / Month" field with hint "Leave empty to use the default of 10 per month."'],
          ['Enter 1001 and save', '"Enter a whole number from 0 to 1000, or leave it empty."'],
          ['Enter 3 and click "Save"', 'The field confirms "Saved"; venue host_requests_limit_override is 3'],
          ['On /hosts Review an approved host, set "Maximum Venue Requests / Month" to 2 and save', 'host venue_requests_limit_override is 2'],
          ['As that VENUE_OWNER open /venues/nearby-hosts in partners-app', 'The quota line reads "<remaining> of 3 requests left this month"'],
          ['Clear the venue field and save', 'The override is null and the quota falls back to 10'],
          ['Call setVenueHostRequestLimit as ALL_VENUES_ACCESS only', '"Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Settings',
    description:
      'Onboarding portal /settings ("Onboarding Intro"): the per-role rich-text intro screens shown before the category picker on the Host, Venue, Product and Club Admin onboarding flows, plus Duncit\'s social media handles, saved by updateOnboardingIntro (SUPER_ADMIN, ONBOARDING_MANAGER).',
    sub_flows: [
      {
        name: 'Edit the onboarding intro screen',
        description: 'updateOnboardingIntro saves the four intro HTML blocks and the social handles; the Product intro is drawn only while is_product_visible is on but its stored copy is preserved; a blank section skips the intro in that flow.',
        steps: [
          ['As ONBOARDING_MANAGER open /settings', 'Heading "Onboarding Intro", the info hint, rich-text editors "Host intro", "Venue intro", "Product intro" (only with the product flag on), "Club Admin intro" and "Social Media Handles"'],
          ['Without changing anything look at "Save"', 'Disabled until the form is dirty'],
          ['Enter an Instagram link without https://', '"Enter a full link starting with https://"'],
          ['Edit "Host intro" with an image and new text and click "Save"', 'Toast "Onboarding intro saved."'],
          ['As a non-host open the Become a Host / Earn host flow in mWeb', 'The intro screen shows the new Host intro before the Super/Category/Sub picker'],
          ['Clear "Club Admin intro" and save, then start Be a Club Admin', 'The flow skips straight to the category picker'],
          ['Call updateOnboardingIntro as ALL_HOSTS_ACCESS', '"Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Clubs: Requests for Club Admins',
    description:
      'Clubs console /club-admin-requests ("Requests for Club Admins"): hosts\' requests asking a club\'s admins to get venue slots opened, listed by clubSlotRequestsTable (consoleReaders CLUB) and closed with resolveClubSlotRequest (consoleEditors CLUB).',
    sub_flows: [
      {
        name: 'Resolve a club admin request for open slots',
        description: 'The table lists each request with club, host, contact, how many admins were messaged and status; Mark resolved sets status RESOLVED with resolver and time. The club admins are messaged when the host raises the request, not when staff resolve it (row premise corrected).',
        steps: [
          ['As ALL_CLUBS_ACCESS open /club-admin-requests', 'Title "Requests for Club Admins" and a table with Club, Host, Host contact, Admins messaged, Status, Requested; or "No requests yet."'],
          ['Search "Search by club, host or contact" for the club', 'Only that club\'s rows remain'],
          ['Click the club name', 'Navigates to /clubs/<clubId>'],
          ['On an "Open" row click "Mark resolved"', 'Toast "Request marked resolved."; the status chip reads "Resolved" and the button disappears'],
          ['Check the data and notifications', 'status RESOLVED, resolved_at and resolved_by_id set; no new message is sent to the club admins'],
          ['Call resolveClubSlotRequest as ONBOARDING_MANAGER', '"Access Denied"'],
          ['Call it with a bad id', '"Invalid request id" (unknown id: "Request not found")'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Store: Browsing & Search',
    description:
      'Public browsing of the Duncit Pet Store at ecomm.duncit.com (guest or signed in): home sections, shelves by category, collection, brand and pet type, search with type-ahead, and the product page with variants and delivery checks. Only PUBLISHED StoreProducts are ever listed.',
    sub_flows: [
      {
        name: 'Browse home, shop, category, collection, brand and pet-type pages',
        description: 'The home page (storeHome active sections) and the /shop, /c/:slug, /collections/:slug, /brand/:slug and /pet/:slug shelves list only PUBLISHED products with prices, and an unknown or inactive slug renders the store\'s "Page not found" content instead of an empty shelf.',
        steps: [
          ['As a guest, open https://ecomm.duncit.com/', 'The home page renders its active sections (hero offers, "Shop by category", "Top brands", "Best selling items" etc. as configured) with product cards showing a price'],
          ['Open /shop', 'Heading "Shop all products" with a "{count} products" result count; every card is a published product with a price, and an unstocked one shows "Out of stock"'],
          ['Open /c/<active category slug>', 'The category shelf renders with its breadcrumb and "More in this aisle" sub-categories when it has children; only that category\'s published products are listed'],
          ['Open /collections/<active collection slug> and then /brand/<brand slug>', 'Each shelf renders its name as the heading and only products in that collection / brand'],
          ['Open /pet/<active pet-type slug>', 'The pet-type page renders "Categories for {pet}" chips and the products for that pet'],
          ['Set a product to draft/unpublished in the Ecomm Portal and reload /shop', 'That product no longer appears on any shelf (storeSearch filters status PUBLISHED)'],
          ['Open /c/no-such-slug, /collections/no-such-slug, /brand/no-such-slug and /pet/no-such-slug', 'Each shows "Page not found" with "This page has wandered off. Let us take you back to the shop." and a "Back to home" button'],
        ],
      },
      {
        name: 'Search with suggestions',
        description: 'The header search box debounces typing and, from 2 characters, asks storeSuggest for up to 6 published products plus matching categories and brands, always offering a "Search for ..." row; submitting opens /search?q= which runs storeSearch, and a query with no matches shows the empty state.',
        steps: [
          ['Type a single character into the "Search food, toys, brands…" box', 'No suggestion request is made (minimum 2 characters); only the "Search for “{q}”" row is offered'],
          ['Type at least 2 characters matching a published product name', 'After a short pause the dropdown lists matching products (with image), matching categories and brands, and a final "Search for “{q}”" row'],
          ['Pick a product suggestion', 'The browser navigates to /p/<slug> and the search box is cleared'],
          ['Type the query again and press Enter', 'Navigates to /search?q=<query>; heading "Results for “{q}”" with only matching published products'],
          ['Search for a nonsense term such as zzqqxx', 'The shelf shows "No products match" and "Try removing a filter or searching for something else."'],
        ],
      },
      {
        name: 'Product page variants and pincode delivery check',
        description: 'On /p/:slug choosing a variant switches price, MRP, discount and stock to that variant, and the delivery check (storeDeliveryCheck) first consults the operator\'s serviceable-pincode list and then ShipRocket, answering with an ETD and COD availability or a not-serviceable warning.',
        steps: [
          ['Open /p/<slug of a published product with variants>', 'The product page renders the gallery, title, price block and variant picker; until an option is chosen "Choose an option to continue." is shown'],
          ['Pick a variant value', 'Price, MRP and discount update to that variant; a variant with low stock shows "Hurry — only {count} left."; a sold-out value is announced as "{value}, sold out"'],
          ['Pick a sold-out variant', 'The "Tell me when it is back" stock-alert form appears instead of a purchasable state'],
          ['Type an invalid pincode like 12 in "Check delivery pincode" and press "Check"', 'Validation "Enter a 6-digit pincode" is shown and no request is sent'],
          ['Enter a serviceable 6-digit pincode and press "Check"', 'A success alert shows "Delivery by {etd}" (or "We deliver here.") and "Cash on Delivery available" or "Cash on Delivery not available here"'],
          ['Enter a pincode not on the store\'s serviceable list and press "Check"', 'A warning shows "Sorry, we do not deliver to {pincode} yet."'],
          ['Open /p/no-such-product', '"Page not found" content is rendered'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Store: Cart & Checkout',
    description:
      'The pet store cart and four-step checkout at ecomm.duncit.com (Contact, Delivery address, Delivery & payment, Review & place order) for guests (browser cart token) and signed-in shoppers: server re-pricing, coupons, Duncit Coins and gift cards, Razorpay or Cash on Delivery with phone OTP, and the order confirmation.',
    sub_flows: [
      {
        name: 'Add to cart and change quantity (guest)',
        description: 'A guest\'s cart is keyed by a random cart token kept in the browser; storeAddToCart refuses out-of-stock products, storeSetCartQty changes or removes a line, and quantities above available stock are flagged on the line and must be fixed before checkout.',
        steps: [
          ['As a guest (fresh browser), open an in-stock product and press "Add to Cart"', 'Toast "Added to your cart"; the header cart badge reads "Cart, 1 item"'],
          ['Open /cart', 'Heading "Your cart" lists the line with "{price} each", the quantity stepper, "Items", "Subtotal" and "Delivery charges are worked out at checkout."'],
          ['Press the "One more {name}" control', 'The quantity rises by one and the subtotal recomputes ("Cart updated")'],
          ['Raise the quantity above the product\'s available stock', 'The line shows "Only {qty} available — we lowered it from {requested}." and the summary shows "Some items need your attention before you can check out."'],
          ['Reload the page', 'The same cart is returned for the stored guest token'],
          ['Press "Remove {name}"', 'The line disappears; with no lines "Your cart is empty" and "Start shopping" are shown'],
          ['Call storeAddToCart for an out-of-stock product with the guest cart_token', 'Refused with "This product is out of stock"'],
        ],
      },
      {
        name: 'Guest checkout paid online with Razorpay',
        description: 'With guest checkout enabled, a guest completes the four steps; storePlaceOrder re-prices the cart server-side and opens a Razorpay order, storeVerifyPayment checks the signature and settles exactly once (a replayed verify of a SUCCESS payment returns it unchanged), and /order/success shows the confirmed order with a keyed tracking link.',
        steps: [
          ['As a guest with items in the cart, open /checkout', 'Heading "Checkout" with steps "Contact", "Delivery address", "Delivery & payment", "Review & place order"; the Contact step offers "Sign in" and "Continue as a guest"'],
          ['Fill "Full name", "Email", "Mobile number" as a guest and press "Continue"; enter a serviceable address and continue', 'The "Delivery & payment" step shows the live order summary ("Items", "Delivery", "Total", "Includes {amount} GST")'],
          ['Choose "Pay online (UPI, cards, net banking)" and press "Review order"', 'The review step shows Contact, "Delivering to" and Payment cards and a "Place order · {total}" button whose total equals the summary'],
          ['Press "Place order · {total}"', 'The Razorpay test sheet opens for exactly the quoted total (storePlaceOrder returned PENDING_PAYMENT)'],
          ['Complete the payment with a Razorpay test card', 'The browser lands on /order/success showing "Thank you! Your order is confirmed.", "Order {orderNo}" with payment "Paid", and "Keep this link — it is how you track your order without an account." with a "Track order {orderNo}" button; the cart is now empty'],
          ['Replay storeVerifyPayment with the same payment_doc_id and signature', 'It returns status PAID again without creating a second order or payment'],
          ['Send storeVerifyPayment with a tampered razorpay_signature on a fresh pending payment', 'Refused with "Payment signature verification failed"; the payment stays PENDING for the reconciler'],
          ['Open the "Track order" link and press "Download invoice"', 'The order detail opens via order no + key and a PDF named after the invoice number downloads'],
        ],
      },
      {
        name: 'Cash on delivery with OTP',
        description: 'When the store requires COD OTP, choosing Cash on Delivery asks for a code sent by SMS/WhatsApp (storeRequestCodOtp, STORE_COD purpose) to the checkout phone; storeVerifyCodOtp refuses wrong or expired codes, Review is blocked until verified, and COD limits (disabled, product, blocked pincode, min/max order) disable the option with a reason.',
        steps: [
          ['At the "Delivery & payment" step choose "Cash on Delivery"', 'Text "Cash on Delivery needs a quick check of {phone}." with a "Send code" button; "Review order" is disabled'],
          ['Press "Send code"', 'A 6-digit code is sent (in test mode "Test code: {code}" is shown) and the code field with "Verify" and "Send again" appears'],
          ['Enter a wrong code and press "Verify"', 'An error such as "Incorrect code — {n} attempts left" is shown and Review stays disabled'],
          ['Enter the correct code and press "Verify"', '"{phone} is verified for Cash on Delivery." and "Review order" becomes enabled'],
          ['Place the order', '/order/success shows "Order confirmed — pay on delivery." with payment "Pay on delivery"'],
          ['Call storePlaceOrder with payment_method COD and no cod_challenge_id', 'Refused with "Verify your phone number to place a Cash on Delivery order"'],
          ['Build a cart above the COD maximum set in Ecomm Portal settings', 'The COD option shows "This order is above the Cash on Delivery limit."; a direct storePlaceOrder COD call is refused with "Cash on Delivery is not available for this order"'],
        ],
      },
      {
        name: 'Apply a store coupon at checkout',
        description: 'storeApplyCoupon stores the code on the cart only when couponService accepts it for the STORE channel (product-scoped codes discount only their lines); invalid, expired, pod-scoped or out-of-scope codes are refused with the server\'s reason, and the discount is recomputed by the server quote and again at storePlaceOrder.',
        steps: [
          ['In the coupon field ("Coupon code") type a valid store-scoped code and press "Apply"', 'Toast "Coupon applied", a "Coupon {code}" chip and a "Coupon discount" line in the summary; Total drops accordingly'],
          ['Press "Remove coupon"', '"Coupon removed" and the discount line disappears'],
          ['Apply a code that does not exist', 'Error "Invalid or inactive coupon code"'],
          ['Apply an expired store code', 'Error "Coupon has expired"'],
          ['Apply a code limited to products not in the cart', 'Error "This coupon applies to products that are not in your cart"'],
          ['Apply a code below its minimum order amount', 'Error "Minimum order of ₹{min} required"'],
          ['Place the order with the valid code', 'The order\'s discount equals the quoted "Coupon discount" (the server re-prices; a tampered client total has no effect)'],
        ],
      },
      {
        name: 'Redeem a gift card or coins at checkout',
        description: 'Signed-in shoppers only: a gift card is redeemed into Duncit Coins (redeemGiftCard, refused when invalid, expired or already redeemed), and the "Use my Duncit Coins" switch applies the coin balance to the server quote; the coins are debited once when the order is finalized. Guests do not see either control.',
        steps: [
          ['As a guest reach the "Delivery & payment" step', 'No Duncit Coins switch and no "Gift card code" field are shown'],
          ['Sign in, reach "Delivery & payment", enter an unredeemed code in "Gift card code" and press "Redeem"', '"{coins} Duncit Coins added to your balance." and the switch label updates to "Use my Duncit Coins ({coins} available)"'],
          ['Redeem the same code again', 'Error "This gift card has already been redeemed"'],
          ['Redeem an expired gift card', 'Error "This gift card has expired"'],
          ['Turn on "Use my Duncit Coins"', 'The summary shows a "Duncit Coins" deduction and a lower Total'],
          ['Place and pay the order, then check the coin balance', 'The balance is reduced by exactly the "Duncit Coins" amount once; reloading /order/success does not debit again'],
        ],
      },
      {
        name: 'Unserviceable pincode or out-of-stock blocks checkout',
        description: 'The checkout quote flags an unserviceable pincode, a below-minimum basket or a line whose stock changed and disables "Review order"; storePlaceOrder independently refuses with the server reason, so no order is created.',
        steps: [
          ['Enter a delivery address whose pincode is not serviceable and continue to "Delivery & payment"', 'The summary shows "We cannot deliver to this pincode yet." and "Review order" is disabled'],
          ['Call storePlaceOrder with that address', 'Refused with "We cannot deliver to this pincode yet"'],
          ['Use a serviceable address, then in the Ecomm Portal set a cart product\'s stock to 0 and return to checkout', 'The summary shows "Some items in your cart changed." with a "Review cart" link and "Review order" is disabled'],
          ['Call storePlaceOrder for that cart', 'Refused with "{name} is out of stock" (or "Only {n} of {name} can be ordered right now" when stock only dropped)'],
          ['Reduce the cart below the store minimum order value', '"Your order is below the minimum order value." and the server refuses with "The minimum order value is {amount}"'],
        ],
      },
      {
        name: 'Payment cancelled or failed',
        description: 'Dismissing or failing the Razorpay sheet leaves the payment PENDING with no order created, the shopper stays on the review step with the matching message and the cart intact, and pressing Place order again opens a fresh payment; stock only moves when a payment is finalized.',
        steps: [
          ['On the review step press "Place order · {total}" and close the Razorpay sheet', 'The review step shows "Payment was cancelled. Nothing was charged — you can try again." and the cart is unchanged'],
          ['Check the products\' stock in the Ecomm Portal', 'Stock is unchanged (no order was finalized)'],
          ['Press "Place order" again and fail the payment with a Razorpay test failure card', '"The payment was declined. Please try again or use another method." is shown'],
          ['Open the Ecomm Portal orders list', 'No pet-store order exists for the abandoned attempts'],
          ['Press "Place order" once more and complete the payment', 'The browser reaches /order/success with "Thank you! Your order is confirmed." and exactly one order'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Store: Account',
    description:
      'Shopper account on ecomm.duncit.com: sign-in dialog (password, one-time code, Google) using the main Duncit auth, guest cart and wishlist merge, the account pages, address book and pet profile. Account pages show a sign-in prompt to guests.',
    sub_flows: [
      {
        name: 'Sign in by password, OTP or Google and merge the guest cart',
        description: 'The "Sign in" dialog uses login, requestLoginOtp/loginWithOtp or loginWithGoogle; after sign-in storeMergeGuest folds the guest cart (max quantity per line), its coupon and the guest wishlist into the account. Note: guest orders are NOT merged into the account, contrary to the row premise.',
        steps: [
          ['As a guest add a product to the cart and save another to the wishlist, then open /account', '"Sign in to see your account" with "Your orders, addresses and saved products are waiting." and a "Sign in" button'],
          ['Press "Sign in", keep "Password", enter a valid email and a wrong password, press "Sign in"', 'An error is shown (server message or "We could not sign you in. Please check your details.")'],
          ['Switch to "One-time code", choose "Email", enter an email with no Duncit account and press "Send code"', '"There is no Duncit account with these details."'],
          ['Enter a registered email, press "Send code", type the code and press "Verify and sign in"', '"We sent a 6-digit code to {contact}." then the dialog closes and the account page renders'],
          ['Open /cart and /wishlist', 'The guest\'s cart line and saved product now belong to the account (storeMergeGuest ran)'],
          ['Sign out and sign in with Google', 'The Google button signs in to the same account; a failure shows "Google sign-in did not work. Please try another way."'],
        ],
      },
      {
        name: 'Addresses and pet profile',
        description: 'Signed-in shoppers manage their address book on /account/addresses (saveMyAddress, setDefaultMyAddress, deleteMyAddress after a confirm dialog) and their pet on /account/pet (updateMyPetProfile); both persist across reloads and guests see the sign-in prompt instead.',
        steps: [
          ['As a guest open /account/addresses', '"Sign in to see your account" is shown instead of the address book'],
          ['Sign in, open /account/addresses with no addresses', 'Heading "Addresses" and the empty state "No saved addresses yet"'],
          ['Press "Add address", leave fields empty and press "Save address"', 'Validation errors such as "Enter the house number and street", "Enter the city" and "Enter a 6-digit pincode"'],
          ['Fill the form and save', 'Toast "Address saved" and the address card appears in the list (with the "Default" chip when "Use as my default address" was ticked)'],
          ['Add a second address and press "Make default" on it', 'The "Default" chip moves to the second address'],
          ['Press "Delete" on an address and confirm in "Delete this address?"', 'The address is removed and stays removed after reload'],
          ['Open /account/pet, fill "Pet’s name", "Pet type", "Breed", "Age (years)" and press "Save pet profile"', 'Toast "Pet profile saved"; the values persist after reload'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Store: Orders & Returns',
    description:
      'Post-purchase on ecomm.duncit.com: my orders and order detail, invoice download, cancelling before the courier has the parcel, return requests within the return window, and guest order tracking. Buyers reach only their own orders (account match or the order\'s access key).',
    sub_flows: [
      {
        name: 'My orders, order detail and invoice',
        description: 'storeMyOrders lists only the signed-in buyer\'s pet-store orders; storeOrder and storeInvoicePdf open an order only for its own account or a valid guest access key, refusing others with "Sign in with the account that placed this order" / "This order link is not valid".',
        steps: [
          ['Sign in as a shopper with a paid order and open /account/orders', 'Heading "My orders" listing the shopper\'s orders newest first (or "No orders yet")'],
          ['Open an order', '/account/orders/<orderNo> shows "Order {orderNo}", "Placed on {date}", "Payment: Paid", items with "Qty {qty}", the money breakdown and "Delivery address"'],
          ['Press "Download invoice"', 'A PDF named <invoice no>.pdf downloads'],
          ['Sign in as a different shopper and open the first shopper\'s /account/orders/<orderNo>', 'The order does not render; the error "Sign in with the account that placed this order" is shown'],
          ['Call storeInvoicePdf for a guest order with a wrong access_key', 'Refused with "This order link is not valid"'],
        ],
      },
      {
        name: 'Cancel an order',
        description: '"Cancel order" is offered only while the order is PENDING, AWAITING_SHIPMENT, AWB_ASSIGNED or PICKUP_SCHEDULED; storeCancelOrder cancels any ShipRocket booking first, marks the order CANCELLED, restocks (when enabled) and records the refund once, and a repeat or post-pickup cancel is refused.',
        steps: [
          ['Open a paid, unshipped order in /account/orders/<orderNo>', '"Cancel order" button is shown'],
          ['Press "Cancel order" and submit without a reason', 'Dialog "Cancel order {orderNo}?" shows "Choose a reason"'],
          ['Choose a reason and press "Cancel order"', '"Your order has been cancelled."; the status reads "Cancelled" with "Cancelled: {reason}" and the cancel button disappears'],
          ['Call storeCancelOrder again for the same order', 'Refused with "This order can no longer be cancelled — it is already with the courier" and no second refund record'],
          ['Open an order that is already Shipped', 'No "Cancel order" button; a direct storeCancelOrder call is refused with the same message'],
        ],
      },
      {
        name: 'Request a return',
        description: 'Returns are requested from the order detail\'s "Return items" dialog (not from /account/returns, which lists them): storeRequestReturn creates a REQUESTED return for returnable delivered lines within the return window, it appears in the Ecomm Portal /returns, and closed windows, non-returnable items and over-quantities are refused.',
        steps: [
          ['Open a delivered order within the return window', '"Return items" button and "Returns accepted until {date}" are shown'],
          ['Press "Return items" and submit with nothing selected', 'Dialog "Return items from {orderNo}" shows "Choose at least one item to return"'],
          ['Select an item, pick a reason and press "Request return"', '"Return requested. We will be in touch about pickup." and "Returns for this order" lists it with status "Requested"'],
          ['Open /account/returns', 'The return appears as "Return {returnNo} · Order {orderNo}" with "Reason: {reason}"'],
          ['Open the Ecomm Portal Returns page', 'The new return is listed with status Requested'],
          ['Call storeRequestReturn for an order whose window has passed', 'Refused with "The return window for this order has closed" (and the button is hidden on that order)'],
          ['Call storeRequestReturn for another buyer\'s order', 'Refused with "This order is not yours to return"'],
        ],
      },
      {
        name: 'Track an order without signing in',
        description: '/track looks an order up by order number plus the checkout email or phone (storeTrackOrder) - not by key - while the checkout\'s "Track order" link (/track?order=&key=) opens it via storeOrder with the access key; a wrong contact or key returns no order data.',
        steps: [
          ['As a guest open /track', '"Track your order" with "Order number", "Email or phone" and "Find my order"'],
          ['Enter the order number and the email used at checkout and press "Find my order"', 'The order detail renders with its status (e.g. "Shipped"), "Tracking" timeline and "{courier} · AWB {awb}" with "Track with courier"'],
          ['Enter the order number with a different email', '"We could not find an order with those details" and no order data is shown'],
          ['Open /track?order=<orderNo>&key=<access key from the success page>', 'The order opens directly with cancel/return actions available to the guest'],
          ['Open /track?order=<orderNo>&key=wrongkey', 'An error "This order link is not valid" and no order data'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Store: Autoship',
    description:
      'Signed-in Autoship subscriptions on ecomm.duncit.com: subscribe from a product, then pause/resume, skip, order now, edit and cancel on /autoship. The page is hidden when Autoship is switched off in store settings.',
    sub_flows: [
      {
        name: 'Create, pause, skip, order now and cancel an autoship subscription',
        description: '"Subscribe & save" creates a subscription (storeCreateSubscription, sign-in required); /autoship lists it and Pause/Resume, Skip next, Order now and Cancel update it. Note: Order now does not create an order itself - it adds the subscription quantity to the cart and opens /checkout?autoship=<id>, so one order is created only when the shopper places it.',
        steps: [
          ['Signed in, open an autoship-eligible product and press "Subscribe & save {pct}%"', 'A dialog shows "{qty} × {name}, delivered on a schedule, {pct}% off every time.", "Deliver every" and the delivery mode options'],
          ['Choose "Every 2 weeks" with "Remind me when it is due — I order in one tap" and press "Start Autoship"', 'Toast "Autoship started"; /autoship lists the card with "Active" and "Next delivery {date}"'],
          ['Press "Pause"', '"Autoship paused", status "Paused", "Skip next" becomes disabled and the button reads "Resume"'],
          ['Press "Resume" then "Skip next"', '"Autoship resumed" then "Next delivery skipped"; the next date moves forward by the frequency'],
          ['Press "Order now"', 'The product is added to the cart and the browser opens /checkout?autoship=<id>; placing it creates one order with an "Autoship discount" line'],
          ['Press "Cancel" and confirm "Cancel Autoship" in "Cancel this Autoship?"', '"Autoship cancelled", status "Cancelled" and no action buttons remain'],
          ['Call storeSkipSubscription or storeSubscriptionOrderNow on the cancelled subscription', 'Refused with "Only an active subscription can skip a delivery" / "This subscription has been cancelled"'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Store: Engagement & Support',
    description:
      'Shopper engagement and help on ecomm.duncit.com: wishlist, product reviews, back-in-stock alerts, newsletter sign-up and the contact page\'s support ticket.',
    sub_flows: [
      {
        name: 'Wishlist toggle',
        description: 'The heart on product cards and pages calls storeToggleWishlist for the guest token or the account (so guests can save too, contrary to the USER-only premise); storeWishlistIds drives the filled hearts and the header count, and /wishlist lists the saved published products.',
        steps: [
          ['On /shop press "Save {name} to wishlist" on a card', 'Toast "Saved to your wishlist"; the heart is filled and the header shows "Wishlist, 1 saved product"'],
          ['Open /wishlist', 'Heading "Wishlist" lists the saved product card'],
          ['Press the heart again', '"Removed from your wishlist"; the card leaves /wishlist and it shows "Nothing saved yet"'],
          ['Save a product as a guest, then sign in', 'The saved product is still on /wishlist (merged into the account)'],
        ],
      },
      {
        name: 'Write a product review',
        description: 'Only signed-in buyers with a DELIVERED pet-store order containing the product can review it (storeSubmitReview); a review saves immediately without moderation, one per user per product (resubmitting updates it), and appears in "Ratings & reviews".',
        steps: [
          ['As a guest open a product page', '"Ratings & reviews" shows "Sign in to write a review" instead of the form'],
          ['Sign in as a shopper who never received this product and submit a rating', 'Error "You can review a product once it has been delivered to you"'],
          ['Sign in as a shopper with a delivered order of the product and press "Submit review" without stars', '"Choose a star rating"'],
          ['Choose 4 stars, write a comment and press "Submit review"', '"Thank you — your review is in."; after reload the review appears in the list and the count shows "{count} reviews"'],
          ['Submit again with 5 stars', 'The same review is updated to 5 stars rather than a second review being added'],
        ],
      },
      {
        name: 'Back-in-stock alert and newsletter',
        description: 'On an out-of-stock product "Tell me when it is back" upserts one alert per email + product + variant (storeSubscribeStockAlert, repeats are idempotent), and the footer "Stay in touch" form subscribes via subscribeNewsletter behind the captcha, answering an existing subscriber with "You are subscribed.".',
        steps: [
          ['Open an out-of-stock product, enter an email in "Tell me when it is back" and press "Notify me"', '"Done — we will email you when it is back in stock."'],
          ['Submit the same email again for the same product', 'The same success message; the Ecomm Portal Stock Alerts list still holds one row for that email and product'],
          ['Call storeSubscribeStockAlert with email not-an-email', 'Refused with "Enter a valid email address"'],
          ['In the footer "Stay in touch" enter an email without solving the captcha and press "Subscribe"', 'The captcha is required ("Type the code shown in the picture")'],
          ['Solve the captcha and press "Subscribe" with a new email', 'Success alert "Subscribed! Check your inbox."'],
          ['Subscribe the same email again', 'Success alert "You are subscribed." with no duplicate subscriber'],
        ],
      },
      {
        name: 'Contact form creates a store ticket',
        description: 'The /contact "Raise a support ticket" form calls storeCreateSupportTicket, which creates an OPEN Support ticket with source STORE (linked to the account when signed in or the email matches) and returns an ST ticket number; the Ecomm Portal Support page links to the Support portal\'s tickets?source=STORE list.',
        steps: [
          ['Open /contact as a guest', '"Contact us" with the store\'s Email/Phone/WhatsApp and the "Raise a support ticket" form'],
          ['Press "Send ticket" with empty subject and message', '"Enter a subject" and "Tell us what happened"'],
          ['Fill "Your name", "Email", "Order number (optional)", "Subject", "What is it about?" and "Message" and press "Send ticket"', '"Thanks — ticket {ticketNo} is with our team. We will reply to {email}."'],
          ['In the Ecomm Portal open Support and follow the tickets link', 'The Support portal lists the ticket under source STORE with subject "[<orderNo>] <subject>"'],
          ['Call storeCreateSupportTicket with an invalid email', 'Refused with "Enter a valid email address"'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Store: Content & Settings',
    description:
      'Store-wide content and operator settings as seen on ecomm.duncit.com: the store-closed gate, the store\'s own info/policy pages and the dark-mode preference.',
    sub_flows: [
      {
        name: 'Store closed page',
        description: 'When "Store open" is switched off in Ecomm Portal Settings, every storefront route renders the "Opening soon" page (StoreGate), and storePlaceOrder / storeRequestCodOtp are refused server-side with code STORE_CLOSED.',
        steps: [
          ['In the Ecomm Portal Settings switch off "Store open" and save', 'The setting saves (hint "Switched off, shoppers see a closed notice instead of the store")'],
          ['Open https://ecomm.duncit.com/, /shop and /p/<slug>', 'Each shows "Opening soon" with "{name} is getting its shelves ready. Please check back shortly." and the support email link; no shelf, cart or header renders'],
          ['Call storePlaceOrder with a valid cart token', 'Refused with "The store is not taking orders right now" (extensions.code STORE_CLOSED)'],
          ['Switch "Store open" back on and reload', 'The normal storefront returns'],
        ],
      },
      {
        name: 'Info pages and dark mode',
        description: '/pages/:slug renders an active store page from storePage (an inactive or unknown slug shows not-found, an empty body shows a placeholder), and the header\'s "Dark mode" toggle switches the theme and remembers it in local storage; pages fit a phone width without horizontal scroll.',
        steps: [
          ['Open /pages/<active page slug> from the footer "Policies" links', 'The page title and its HTML content render'],
          ['Open /pages/no-such-page or a deactivated page\'s slug', '"Page not found" content'],
          ['Open an active page with empty content', '"This page is being written. Please check back soon."'],
          ['Press the header "Dark mode" button', 'The theme switches to dark and the button reports pressed (aria-pressed=true)'],
          ['Reload the page', 'Dark mode is still applied'],
          ['Set the viewport to 360px wide and open /, /shop, a product page and /pages/<slug>', 'No horizontal page scroll on any of them'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Portal: Catalogue',
    description:
      'The Duncit Pet Store\'s own catalogue in the E-commerce console (portals/ecomm-portal, SUPER_ADMIN or ECOMM_STORE_MANAGER): products, pet types, categories, brands, filters, collections and the store home page, all served by the store* admin resolvers gated by requireStoreAdmin.',
    sub_flows: [
      {
        name: 'Create, draft and publish a store product',
        description: 'A new product is saved as a draft or published through StoreSaveProduct (the status rides on the same save; StoreSetProductStatus is only the Products table\'s bulk action), and once PUBLISHED with a URL key it is live on ecomm.duncit.com/p/<slug>.',
        steps: [
          ['Sign in to the E-commerce console as ECOMM_STORE_MANAGER, open Catalogue > Products and click "Add product"', '/products/new opens with the heading "New product" and an action bar offering "Save as draft" and "Publish"'],
          ['Type only a Name and click "Save as draft"', 'Toast "Saved as a draft"; the URL is replaced with /products/<id> and the status chip reads "Draft"'],
          ['Fill price, a photo, a category, the brand, the "Pickup address", weight, length, breadth, height and the HSN code, then click "Publish"', 'Toast "Published — the product is on the store"; the chip reads "Published" and the bar now shows "Archive", "Move to draft" and "Save"'],
          ['Click "View on store" in the header', 'ecomm.duncit.com/p/<slug> opens in a new tab and shows the product with its price'],
          ['Click "Move to draft"', 'Toast "Saved as a draft"; "View on store" disappears and the store product page no longer lists it'],
          ['Back on Products, tick the draft and run the bulk "Publish" action', 'Message "1 of 1 products published. A product still missing a price, photo, category, pickup address or weight is skipped."'],
        ],
      },
      {
        name: 'Product form validation (MRP, packaging, brand required)',
        description: 'Only the name is checked in the browser (plus the HSN format); a draft saves without brand or packaging. The server refuses an MRP below the price on any save, and refuses a publish that lacks brand, packaging, price, photo, category or pickup address with one "Before publishing, add ..." message.',
        steps: [
          ['On /products/new leave Name empty and click "Save as draft"', 'The Name field shows "This field is required" and no request is sent'],
          ['Type an HSN code of "12"', 'The field shows "An HSN code is 4 to 8 digits (pet food 2309, toys 9503)"'],
          ['Enter Name, Price 500 and MRP 400, then click "Save as draft"', 'Error toast "MRP (₹400) cannot be below the price (₹500)"; nothing is saved'],
          ['Set MRP to 600, leave brand, pickup address and packaging empty, click "Save as draft"', 'Toast "Saved as a draft" — a draft is allowed without them'],
          ['Click "Publish" on that draft', 'Error toast starting "Before publishing, add" and naming the gaps, e.g. "... the pickup address it ships from, a brand, the packaging (HSN code, ...)"; the chip stays "Draft"'],
          ['Call StoreSaveProduct directly with status PUBLISHED and the same incomplete input', 'BAD_USER_INPUT with the same "Before publishing, add ..." message; the product is not published'],
        ],
      },
      {
        name: 'Categories, collections, brands, pet types, filters and home sections',
        description: 'Each taxonomy page saves, deletes and moves rows through its storeSave*/storeDelete*/storeReorder* mutation; deletes of a type still in use are refused by the server, and the order set here is the order ecomm.duncit.com shows.',
        steps: [
          ['Open Catalogue > Pet types and click "Add pet type"; save a new pet type', 'The dialog "New pet type" closes and the row appears in the list'],
          ['Open Catalogue > Categories, add a category and try to save one with its own parent', 'Server error "A category cannot sit inside itself"'],
          ['Delete a category that has products filed in it', 'Error "<n> product(s) are filed in this category — move them first, or switch it off"; the row stays'],
          ['On Brands, move a brand up one place', 'The list re-orders; ecomm.duncit.com/brands shows the brands in the new order'],
          ['On Filters, add a filter with no options and save', 'Server error "Add at least one option"'],
          ['On Collections click "Add collection", give it a name and products and save', 'The collection is listed; ecomm.duncit.com/collections/<slug> shows those products'],
          ['Open Storefront > Home page, click "Add section", choose a flash sale without an end time and save', 'Server error "A flash sale needs an end time to count down to"'],
          ['Add a valid section and move it to the top', 'The store home page renders that section first'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Portal: Marketing',
    description:
      'The pet store\'s marketing tools in the E-commerce console: store-scoped coupons, abandoned-cart reminders and back-in-stock emails, each gated server-side by requireStoreAdmin (SUPER_ADMIN or ECOMM_STORE_MANAGER).',
    sub_flows: [
      {
        name: 'Create a scoped coupon',
        description: 'StoreSaveCoupon always saves scope STORE with a percentage discount, optional dates, use limits, minimum order and an optional product list (no collection scope or tiers exist); a product-limited code is refused at checkout when none of its products is in the cart.',
        steps: [
          ['Open Marketing > Coupons and click "Add coupon"', 'Dialog "New coupon" with Code, Discount, Valid from, Valid until, Total uses, Uses per buyer, Minimum order and Products'],
          ['Enter code "ab" and discount 0, then save', 'Code shows "Use 3–30 letters, digits, - or _" and Discount shows "Enter a discount above 0"'],
          ['Set Valid until before Valid from', 'Valid until shows "The end must come after the start"'],
          ['Enter code pet10, 10% off, an end date and pick two products, then save', 'The row lists code PET10 (saved in capitals) and "Applies to" reads "2 products"'],
          ['On ecomm.duncit.com put only an unrelated product in the cart and apply PET10', 'The store refuses it with "This coupon applies to products that are not in your cart"'],
          ['Add one of the two products and apply PET10', 'The discount is 10% of that product\'s line only'],
        ],
      },
      {
        name: 'Send an abandoned-cart reminder',
        description: 'StoreRemindCart emails the shopper their cart items and stamps reminded_at. The code has no cooldown: a second click sends another email (the row premise of once per cart is not enforced).',
        steps: [
          ['Open Marketing > Abandoned carts', 'The "Abandoned" tab lists carts idle for over an hour with Shopper, Items, Units, Value, Last active and Reminded'],
          ['Find a cart without an email', 'Its "Send reminder" button is disabled'],
          ['Click "Send reminder" on a cart with an email', 'Toast "Reminder sent to <email>"; the Reminded column fills in and the shopper gets the cart email'],
          ['Call StoreRemindCart for an emptied cart', 'BAD_USER_INPUT "This cart is empty"'],
          ['Click "Send reminder" again on the same cart', 'A second email is sent and Reminded updates (no cooldown)'],
        ],
      },
      {
        name: 'Send back-in-stock notifications',
        description: 'StoreSendBackInStock emails each waiting alert whose product is published and has stock again, then stamps notified_at so it is never sent twice; alerts are kept, not deleted.',
        steps: [
          ['Open Marketing > Stock alerts with shoppers waiting on a sold-out product', 'Rows show email, product, variant and "Asked on"; not yet notified'],
          ['Restock the product, then click "Send back-in-stock emails now"', 'Toast "<n> back-in-stock emails sent"; those rows show "Notified on" with a date'],
          ['Click the button again', 'Toast reports 0 sent; nobody is emailed twice'],
          ['Leave another product out of stock and send', 'Its alerts stay unsent'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Portal: Orders & Shipping',
    description:
      'Pet-store orders in the E-commerce console: order detail actions, ShipRocket booking and documents, the needs-action queue, COD reconciliation, pickup addresses, serviceable pincodes and the payment log. Every query and mutation is gated by requireStoreAdmin (SUPER_ADMIN or ECOMM_STORE_MANAGER).',
    sub_flows: [
      {
        name: 'Move an order through status and add notes',
        description: 'StoreUpdateOrderStatus moves an order forward only (the courier status order; DELIVERED, PICKED_UP, RTO_DELIVERED and LOST are final, a backwards move is refused "An order that is X cannot be moved to Y"; CANCELLED must go through Cancel order) and adds a tracking event; StoreAddOrderNote stores a private team note with the author.',
        steps: [
          ['Open Orders and click a paid order', '/orders/<id> shows the Actions card with "Set status to", "Note" and "Update status"'],
          ['Choose SHIPPED, type a note and click "Update status"', 'Toast "Status updated"; the status chip changes and a tracking update with the note is listed'],
          ['Call StoreUpdateOrderStatus directly with status CANCELLED', 'BAD_USER_INPUT "Use Cancel order — it also handles the stock and the refund"'],
          ['In "Team notes" type a note in "New note" and click "Add note"', 'Toast "Note added"; the note shows with the operator name and time'],
          ['Click "Add note" with an empty note', 'No note is added (server refuses with "Write the note first")'],
        ],
      },
      {
        name: 'Admin cancels a store order with refund',
        description: 'StoreAdminCancelOrder cancels an order still in PENDING, AWAITING_SHIPMENT, AWB_ASSIGNED or PICKUP_SCHEDULED, calls off the ShipRocket booking, restocks only when Settings has Restock on cancel on, and records the refund once (original payment into the refund log, or Duncit Coins); a second cancel is refused.',
        steps: [
          ['On a paid, not-yet-shipped order click "Cancel order"', 'Dialog "Cancel <order no>" with "Reason" and "Refund to" ("Original payment" / "Duncit Coins (instant)")'],
          ['Pick a reason, choose "Original payment" and submit', 'Confirm "Cancel <order no>?" with buttons "Cancel order" and "Keep order"'],
          ['Click "Cancel order"', 'Toast "Order cancelled"; the Actions card shows "Cancelled — <reason> (ADMIN:<email>)" and the cancel button is gone'],
          ['Check the product stock', 'Units are back in stock when "Restock on cancel" is on in Settings; unchanged when it is off'],
          ['Call StoreAdminCancelOrder again for the same order', 'BAD_USER_INPUT "This order can no longer be cancelled — it is already with the courier"; no second refund is recorded'],
          ['Open a guest order\'s cancel dialog', 'Helper text "A guest has no Duncit account, so the refund can only go back to the original payment."'],
        ],
      },
      {
        name: 'Book a shipment, pick courier, print label',
        description: 'StoreShipmentCouriers lists ShipRocket\'s couriers for the order, StoreBookShipment books with the chosen one (or the recommended one) and assigns an AWB, and StoreShipmentFile returns the label PDF; a refused booking shows ShipRocket\'s reason on the order.',
        steps: [
          ['Open an unbooked paid order and click "Choose courier"', 'Dialog "Choose courier" lists couriers with ETA, "COD" and "Recommended" tags; Label is disabled with "The label and the manifest are ready once a courier is assigned (AWB)."'],
          ['Submit without picking', '"Pick a courier" validation message'],
          ['Pick a courier and click "Assign courier"', 'Toast "Shipment booking updated"; the shipment card shows the courier and the AWB'],
          ['Under "Documents" click "Label"', 'Toast "Document downloaded" and a label PDF is saved'],
          ['On the Orders list use the print-label action for that order', 'Toast "Opening the print dialog"; a row without AWB shows the tooltip "The label is ready once a courier is assigned (AWB)."'],
          ['Open an order whose pincode no courier serves and click "Choose courier"', '"No courier can carry this shipment right now — check the pincode and parcel."'],
          ['Book an order ShipRocket refuses', 'The order shows "Last booking attempt (<time>): <ShipRocket reason>" and the button reads "Retry booking"'],
        ],
      },
      {
        name: 'Needs-action (NDR) queue and COD ledger',
        description: 'StoreShipmentAlerts lists live orders with a failed booking, an NDR or a ShipRocket alert; StoreCodLedger lists COD orders for the period and totals only DELIVERED ones into due, marked-collected and outstanding.',
        steps: [
          ['Open Shipping > Needs action with no problem orders', '"Nothing is waiting — every shipment is moving."'],
          ['With an order in NDR, open Needs action', 'The order is listed; its detail shows "Delivery failed: <reason>. Ask the courier to try again, or to return it."'],
          ['Click "Answer failed delivery", choose "Try delivering again" and click "Send to courier"', 'Toast "Answer sent to the courier"'],
          ['With failed bookings listed, click "Retry failed bookings" and confirm', 'Message "<booked> of <attempted> now with a courier; <failed> still failing — open each for the reason"'],
          ['Open Shipping > COD remittance (Last 30 days)', '"Totals" shows "Due on delivered orders", "Marked collected" and "Outstanding" summed from delivered COD orders only'],
          ['On a delivered COD order click "Mark cash collected" and confirm', 'Toast "Cash marked as collected"; back on COD remittance the outstanding total drops by that order\'s COD amount'],
        ],
      },
      {
        name: 'Warehouses and ShipRocket reconnect',
        description: 'The ShipRocket page shows StoreShiprocketStatus and the Duncit pickup addresses (synced from ShipRocket on open); StoreSaveWarehouse creates one on ShipRocket first, StoreRegisterWarehouse pushes an unregistered one, StoreDeleteWarehouse refuses a registered or in-use address, and StoreShiprocketReconnect retries a refused login.',
        steps: [
          ['Open Shipping > ShipRocket', '"ShipRocket account" card with Connection, Wallet balance and Webhook URL, and the "Pickup addresses" table'],
          ['When the connection shows "Login refused", click "Retry login"', 'Toast "ShipRocket accepted the login" when the saved API user works; otherwise the refusal reason stays'],
          ['Click "Add pickup address" and enter a street under 10 characters', '"Enter the building number and street — at least 10 characters"'],
          ['Fill a valid address and click "Add to ShipRocket"', 'The address is listed and also exists in the ShipRocket account under the same nickname'],
          ['Delete an address ShipRocket holds', 'Refused: "ShipRocket holds this pickup address — remove it in ShipRocket, then sync"'],
          ['Delete an unregistered address that products ship from', 'Refused: "<n> product(s) ship from this pickup address — move them to another one first"'],
        ],
      },
      {
        name: 'Serviceable pincodes with AI fill',
        description: 'StoreSaveServiceablePincode/StoreDeleteServiceablePincode keep the delivery list; "Fill with AI" (aiFillLocationAreas) takes the chosen country, state and city and suggests areas with pincodes (not the other way round). Once the list holds any pincode, only active ones pass the store\'s pincode check.',
        steps: [
          ['Open Shipping > Serviceable pincodes and click "Add pincode"', 'Dialog "New serviceable pincode" with Country, State, City, Area, Pincode and "Fill with AI"'],
          ['Click "Fill with AI" before choosing state and city', '"Choose country, state and city before using AI fill."'],
          ['Choose a country, state and city and click "Fill with AI"', 'Area and Pincode are filled; other results appear under "Other areas AI found"'],
          ['Save, then add the same pincode again', 'Error "Pincode <pincode> is already in the list"'],
          ['On ecomm.duncit.com check a listed pincode and an unlisted one', '"Good news — we deliver to <pincode>." and "Sorry, we do not deliver to <pincode> yet."'],
          ['Delete every pincode and check the unlisted one again', 'Delivery is no longer limited to the list (every pincode the courier reaches is served)'],
        ],
      },
      {
        name: 'Payment logs',
        description: 'StorePaymentsTable lists every pet-store payment (online, COD, refunds) newest first with its status, so failed and pending attempts can be reconciled.',
        steps: [
          ['Open Logs > Payment logs', 'Subtitle "Every payment the pet store took — online, cash on delivery, refunds — newest first."'],
          ['Look at a completed online payment', 'Status "Paid" with Gateway, "Payment / invoice" ids, Buyer and Total'],
          ['Filter or find a failed attempt', 'It is listed with status "Failed"'],
          ['Search by a payment ID', 'Only the matching payment remains'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Portal: Returns, Reviews & Customers',
    description:
      'After-sale work in the E-commerce console: store returns (pickup, restock, refund), product reviews and the customer list, all gated by requireStoreAdmin (SUPER_ADMIN or ECOMM_STORE_MANAGER).',
    sub_flows: [
      {
        name: 'Process a store return: pickup, restock, refund',
        description: 'StoreUpdateReturn follows REQUESTED > APPROVED (books the reverse pickup) > PICKUP_SCHEDULED > RECEIVED (optional restock) > REFUNDED > CLOSED; the refund is recorded once (refund log for Finance, or Coins) and any other move is refused.',
        steps: [
          ['Open Returns and a REQUESTED return', '"Move to" offers Approved and Rejected; the pickup panel says "The courier pickup is booked when you approve the return."'],
          ['Move to Approved and click "Update return"', 'Toast "Return updated"; the "Return pickup" panel shows courier and AWB, or a "Book pickup"/"Retry booking" button if ShipRocket failed'],
          ['Move to Received with "Put the returned units back into stock" ticked', 'Status reads Received; product stock rises by the returned units exactly once (a later restock via the pickup panel changes nothing)'],
          ['Move to Refunded with refund amount 0', 'Error "Set the refund amount first"'],
          ['Set an amount, pick "Original payment" and update', 'Confirm "Refund <amount>?" — "The refund goes to: Original payment. This cannot be undone."; "Refund now" sets Refunded with a "Refunded on" date'],
          ['Call StoreUpdateReturn again with status REFUNDED', 'BAD_USER_INPUT "A refunded return cannot move to refunded"; no second refund'],
        ],
      },
      {
        name: 'Reply to or delete a review',
        description: 'StoreReplyReview saves a seller reply that the store shows under the review as "Reply from the seller"; StoreDeleteReview removes the review from the store.',
        steps: [
          ['Open Storefront > Reviews', 'Reviews of listed products with Product, Reviewer, Rating, Comment and Reply columns'],
          ['Use the reply action on a review', 'Dialog "Reply to <name>" with "Send reply"'],
          ['Send an empty reply via the API', 'BAD_USER_INPUT "Write the reply first"'],
          ['Type a reply and click "Send reply"', 'Toast "Reply saved"; on ecomm.duncit.com the review shows "Reply from the seller" with the text'],
          ['Use the delete action on a review and confirm', 'Confirm title "Delete the review by <name>?"; the row disappears and the store product page no longer shows it'],
        ],
      },
      {
        name: 'Customer list and detail',
        description: 'StoreCustomersTable lists everyone who ordered from the pet store (account holders and guests); /customers/:email loads StoreCustomerOrders for that email, PET_STORE channel only.',
        steps: [
          ['Open Customers', 'Subtitle "Everyone who has ordered from the store — account holders and guests."; columns include First order, Last order and Spent'],
          ['Search a customer\'s email and open the row', '/customers/<email> with tiles Orders, Cancelled, Spent and Last order'],
          ['Check "Order history"', 'Only that email\'s pet-store orders appear; Pod Shop orders of the same person are not listed'],
          ['Open /customers/nobody@example.com', 'The order history is empty ("No orders yet.")'],
        ],
      },
    ],
  },
  {
    name: 'Ecomm Portal: Settings & Access',
    description:
      'Who can open the E-commerce console (SUPER_ADMIN or ECOMM_STORE_MANAGER, never the Partner Brand ECOMM_MANAGER), its dashboard, the store\'s own settings and autoship plans, policy pages and where store tickets go.',
    sub_flows: [
      {
        name: 'Store settings (incl. closing the store) and autoship terms',
        description: 'StoreSaveSettings saves one tab at a time; turning "Store open" off makes ecomm.duncit.com show its "Opening soon" page. Autoship terms are the Autoship tab of Settings (discount up to 50%, rhythms in weeks); /autoship lists plans (no StoreAutoshipTerms operation exists). Restore the settings after the run.',
        steps: [
          ['Open Settings', 'Tabs General, Checkout, Shipping, Returns, Pages, Occasions, Autoship'],
          ['On General switch "Store open" off and save', 'Toast "Saved"; ecomm.duncit.com shows "Opening soon"'],
          ['Switch it back on and save', 'The store front loads normally'],
          ['On Autoship set the discount to 60 and save', 'Error "The autoship discount can be at most 50%"'],
          ['Set a valid discount and rhythms "2, 4", save', 'Toast "Saved"; the store offers 2- and 4-week autoship'],
          ['Open Marketing > Autoship and pause a plan', 'Toast "Plan paused"; its status reads "Paused" and "Resume" appears'],
        ],
      },
      {
        name: 'Store portal access and dashboard',
        description: 'The console admits SUPER_ADMIN or ECOMM_STORE_MANAGER (portal requiredRoles plus SUPER_ADMIN bypass) and every store* operation calls requireStoreAdmin with the same roles; ECOMM_MANAGER (Partner Brand), PRODUCTS_MANAGER and USER are refused.',
        steps: [
          ['Sign in as ECOMM_STORE_MANAGER', 'The Dashboard loads with To ship, Revenue, Average order and "Needs attention"'],
          ['Change the period', 'Tiles and charts reload for "Last <days> days"'],
          ['Sign in as an ECOMM_MANAGER-only Partner Brand user', 'Login refused: "You do not have access to Duncit E-commerce. Please contact your administrator."'],
          ['Repeat as PRODUCTS_MANAGER and as a plain USER', 'Same refusal; no console page renders'],
          ['Call storeDashboard with the ECOMM_MANAGER token', 'FORBIDDEN "Access Denied"'],
          ['Call storeDashboard without a token', 'UNAUTHENTICATED "Not authenticated"'],
        ],
      },
      {
        name: 'Content pages and FAQs',
        description: 'Storefront > Policies & pages saves extra pages through StoreSavePage, StoreDeletePage and StoreReorderPages, served at /pages/:slug and listed in the footer in that order. Built-in policies are edited under Settings > Pages; there is no FAQ editor here (product FAQs live on the product form).',
        steps: [
          ['Open Storefront > Policies & pages and click "Add page"', 'Dialog "New page" with title, page content, "Show in the footer" and active switch'],
          ['Save with no title via the API', 'BAD_USER_INPUT "Give the page a title"'],
          ['Save a page titled Size guide with footer on', 'It is listed; ecomm.duncit.com/pages/<slug> shows the content and the footer links it'],
          ['Move it above another page', 'The store footer lists the pages in the new order'],
          ['Delete it and confirm', 'Confirm mentions "Links to this page stop working."; /pages/<slug> no longer shows it'],
        ],
      },
      {
        name: 'Store support tickets',
        description: 'The console has no ticket inbox: Support > Store tickets explains that store Contact-page tickets land in the Support console tagged as Pet Store and links there and to the store\'s Contact page.',
        steps: [
          ['Open Support > Store tickets', 'Heading "Store support" with sections "How they are tagged" and "Where shoppers write in"'],
          ['Click "Open store tickets in the Support console"', 'A new tab opens support.duncit.com/tickets?source=STORE'],
          ['Click "Open the store’s Contact page"', 'A new tab opens ecomm.duncit.com/contact'],
          ['Submit a ticket on the store Contact page, then open the Support console link', 'The ticket is listed with source Pet Store and can be answered there'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Owner Access',
    description:
      'Gap scenarios appended to Partners: Venue Owner Access.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Venue registration (/register-venue)',
        description: 'SectionGate sends anyone without VENUE_OWNER from /register-venue* to /. The server does not gate by role: any signed-in user may create their own venue draft. Another owner\'s venue is refused with FORBIDDEN "Not your venue", and no token gets "Authentication required".',
        steps: [
          ['Signed out, open /register-venue', 'Redirected to /login'],
          ['Sign in as USER, HOST, CLUB_ADMIN or ECOMM_MANAGER (no VENUE_OWNER) and type /register-venue, then /register-venue/new', 'No registration page renders; the user is sent to / and on to /earn or their first partner area. The sidebar has no Venue studio entries'],
          ['As owner B, open /register-venue/<owner A\'s venueId>', 'Owner A\'s data does not load'],
          ['As owner B, call submitVenueStep1 with venue_id = owner A\'s venue', 'FORBIDDEN "Not your venue"; owner A\'s venue is unchanged'],
          ['As owner B, call updateApprovedVenue on owner A\'s approved venue', 'FORBIDDEN "Not your venue"'],
          ['Call myVenuesTable without a token', 'UNAUTHENTICATED "Authentication required"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Venue dashboard (/venues/dashboard)',
        description: 'SectionGate redirects non-VENUE_OWNER users away from /venues/dashboard. venueOwnerStats has no role gate but is scoped to the caller: naming another owner\'s venue gets NOT_FOUND "Venue not found or not yours", and no token gets UNAUTHENTICATED.',
        steps: [
          ['Signed out, open /venues/dashboard', 'Redirected to /login'],
          ['As USER, HOST, CLUB_ADMIN or ECOMM_MANAGER type /venues/dashboard', 'The dashboard never renders; the user lands on / and then /earn or their first partner area'],
          ['As owner B, call venueOwnerStats with venue_id = owner A\'s venue', 'NOT_FOUND "Venue not found or not yours"'],
          ['As a USER with no venues, call venueOwnerStats without venue_id', 'Only the caller\'s own (empty) stats come back; no other owner\'s numbers'],
          ['Call venueOwnerStats without a token', 'UNAUTHENTICATED "Not authenticated"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Venue pods (/venues/pods)',
        description: 'SectionGate keeps /venues/pods to VENUE_OWNER. venuePods returns only pods at the caller\'s own venues (an empty list for anyone else), and venueCancelPod refuses a pod not booked at the caller\'s venue with FORBIDDEN.',
        steps: [
          ['Signed out, open /venues/pods', 'Redirected to /login'],
          ['As HOST or USER (no VENUE_OWNER) type /venues/pods', 'The pods table never renders; redirected to / and onward'],
          ['As owner B, call venuePods with venue_id = owner A\'s venue', 'No pods of owner A come back'],
          ['As owner B, call venueCancelPod for a pod at owner A\'s venue with a reason', 'FORBIDDEN "This pod is not booked at a venue you own"; the pod is not cancelled'],
          ['Call venuePods without a token', 'UNAUTHENTICATED "Authentication required"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Venue cancellation policy (/venues/settings)',
        description: 'SectionGate keeps /venues/settings to VENUE_OWNER. updateVenueSettings lets only the venue\'s owner or a VENUE_EDIT admin save; another owner gets FORBIDDEN "Not your venue" and the policy is unchanged.',
        steps: [
          ['Signed out, open /venues/settings', 'Redirected to /login'],
          ['As USER, HOST, CLUB_ADMIN or ECOMM_MANAGER type /venues/settings', 'The settings tab never renders; redirected to / and onward'],
          ['As owner B, call updateVenueSettings with owner A\'s venue_doc_id and a new cancellation policy', 'FORBIDDEN "Not your venue"'],
          ['As owner A, reload /venues/settings', 'Owner A\'s cancellation policy is unchanged'],
          ['Call updateVenueSettings without a token', 'UNAUTHENTICATED "Authentication required"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Host Access',
    description:
      'Gap scenarios appended to Partners: Host Access.',
    sub_flows: [
      {
        name: 'Denied roles cannot open or call Host dashboard (/host/dashboard)',
        description: 'Not open to every signed-in user: SectionGate requires HOST for /host/*, so USER, VENUE_OWNER, CLUB_ADMIN or ECOMM_MANAGER without HOST are redirected. The data (myWallet, myHostEarningsSummary, hostInsights, myAccountHealth) only needs auth and is scoped to the caller, so no one can read another\'s numbers.',
        steps: [
          ['Signed out, open /host/dashboard', 'Redirected to /login with a redirect back to /host/dashboard'],
          ['Sign in without HOST and type /host/dashboard', 'The dashboard never renders; redirected to / and then /earn or the first partner area held'],
          ['As host B, call myWallet and myHostEarningsSummary', 'Only host B\'s own wallet and earnings come back; there is no argument to name another user'],
          ['Call myHostEarningsSummary without a token', 'UNAUTHENTICATED "Not authenticated"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Host pods (/host/pods)',
        description: 'SectionGate requires HOST for /host/pods. myHostPodsTable is scoped to the caller, and createPartnerPod needs an active HOST role or approved host profile, refusing others with FORBIDDEN "Host access is required before creating pods".',
        steps: [
          ['Signed out, open /host/pods', 'Redirected to /login'],
          ['Sign in without HOST and type /host/pods', 'The Pods tab never renders; redirected to / and onward'],
          ['As host B, call myHostPodsTable', 'Only pods host B hosts are returned'],
          ['As a USER without HOST or approved host profile, call createPartnerPod', 'FORBIDDEN "Host access is required before creating pods"; no pod is created'],
          ['As a deactivated host, call createPartnerPod', 'FORBIDDEN "Your host account has been deactivated"'],
        ],
      },
      {
        name: 'Denied roles cannot open or call Host onboarding (/become-host)',
        description: '/become-host is deliberately not role-gated: any signed-in user can open it, and only guests are sent to /login. The host application mutations only touch the caller\'s own application; without a token they fail with "Authentication required".',
        steps: [
          ['Signed out, open /become-host', 'Redirected to /login'],
          ['Sign in as a plain USER and open /become-host', 'The host application page renders (not redirected)'],
          ['Call myHost as user B', 'Only user B\'s own application (or null) comes back'],
          ['Call submitHostStep1 or withdrawHostApplication without a token', 'UNAUTHENTICATED "Authentication required"'],
          ['As an approved host, call withdrawHostApplication', 'BAD_USER_INPUT "Approved host applications cannot be withdrawn"'],
        ],
      },
    ],
  },
];

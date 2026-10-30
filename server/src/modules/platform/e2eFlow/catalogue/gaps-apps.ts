import type { CatalogueFlow } from './catalogue.types';

/** Gap scenarios for the member app (mWeb + native), the in-app studios and Duncit Lite that the catalogue did not cover yet. Flows sharing a name with another catalogue file are merged into it. */
export const APP_GAP_FLOWS: readonly CatalogueFlow[] = [
  {
    name: 'App: Venue Food Ordering',
    description:
      'A guest scans a venue QR, orders from its menu without an account and pays the venue\'s own Razorpay. The public order page /venue/:venueId/food-order/:orderId (native VenueFoodOrderScreen) is opened by the order access_key (link ?key= or device memory) or by the account that placed it, and carries the kitchen progress, refund state, invoice PDF, the food rating and the events opt-in.',
    sub_flows: [
      {
        name: 'Order page tracks status for the guest',
        description:
          'Opened with the access key, the page re-reads venueFoodOrder on its own (every 8 s while payment is pending, every 20 s while the kitchen works) and shows PLACED, ACCEPTED, PREPARING, READY, SERVED as the owner moves the order; polling stops once it is served or cancelled.',
        steps: [
          ['As a guest place and pay a food order, then open /venue/<venueId>/food-order/<orderId>?key=<access_key>', 'Header "Your order", heading "Order <order_no>", the venue name and "Order status: Placed"; an "Order progress" timeline and the "Items" / "Order details" summary with Payment "Paid"'],
          ['As the venue owner open Studio > "Food Orders" (/venues/food-orders) and tap "Accept" on the order', 'Owner toast "Order <no> is now Accepted"; within about 20 s the guest page reads "Order status: Accepted" without a reload'],
          ['As the owner tap "Start preparing", then "Mark ready"', 'The guest page follows: "Order status: Preparing", then "Order status: Ready", and the timeline marks each step'],
          ['As the owner tap "Mark served"', 'The guest page reads "Order status: Served" and the "How was the food?" rating card appears; the page stops re-reading'],
          ['Call setVenueFoodOrderStatus with a status behind the current one', 'BAD_REQUEST "An order can only move forward"'],
          ['Close the tab and reopen /venue/<venueId>/food-order/<orderId> on the same device without ?key=', 'The order still opens: the key was remembered on the device'],
        ],
      },
      {
        name: 'Order page opened without or with a wrong access key',
        description:
          'venueFoodOrder, venueFoodOrderInvoicePdfBase64, venueFoodFeedbackUploadPass and submitVenueFoodFeedback with no or a wrong access_key, from anyone but the account that placed the order, answer FORBIDDEN "This order link is not valid"; the page shows its not-found state and no name or phone leaks.',
        steps: [
          ['In a second browser (no stored key, signed out or another account) open /venue/<venueId>/food-order/<orderId>', 'Empty state "We could not find this order. The link may be incomplete or no longer valid." and a "Back to menu" button; no order number, name or phone is shown'],
          ['Open the same URL with ?key=<wrong key>', 'The same not-found state'],
          ['Call venueFoodOrder(order_id, access_key: "wrong") as another account', 'FORBIDDEN "This order link is not valid"; no data is returned'],
          ['Call venueFoodOrderInvoicePdfBase64 and venueFoodFeedbackUploadPass with no access_key as a guest', 'Both FORBIDDEN "This order link is not valid"'],
          ['Call venueFoodOrder with an id that does not exist or is not an ObjectId', 'Answers null (no error), so the page shows the same not-found state'],
          ['Sign in as the account that placed the order and open the URL without ?key=', 'The order opens: the placing account needs no key'],
        ],
      },
      {
        name: 'Cancelled order shows refund status',
        description:
          'Owner cancel stamps CANCELLED + REFUND_PENDING and tries the Razorpay refund at once, so the guest usually sees "Refunded" straight away; a refund that failed to send stays "Refund in progress" until the 5-minute sweep settles it, and because the page stops polling at CANCELLED that later REFUNDED only shows after a reload.',
        steps: [
          ['As the owner tap "Cancel & refund order <no>" on a paid order, enter a reason shorter than 3 characters', 'The form refuses it ("Tell the guest why, in at least <min> characters"); the server equivalent is BAD_USER_INPUT "Tell the guest why the order is cancelled"'],
          ['Enter a reason and confirm "Cancel & refund"', 'Toast "Order <no> cancelled. The guest has been refunded." (or "... The refund is on its way to the guest." when Razorpay did not settle yet)'],
          ['As the guest view the order page', 'Warning "This order was cancelled" with "Reason: <reason>" and "Your payment has been refunded." (REFUNDED) or "Your refund is on its way." (REFUND_PENDING); Payment reads "Refunded" or "Refund in progress"'],
          ['With the order still REFUND_PENDING, wait for the reconcile sweep to refund it', 'The DB moves to REFUNDED with razorpay_refund_id, but the open page keeps "Your refund is on its way." until reloaded (polling stopped at CANCELLED)'],
          ['Reload the page', '"Your payment has been refunded." and Payment "Refunded"'],
          ['Call cancelVenueFoodOrder again, or on a SERVED order', 'BAD_REQUEST "This order can no longer be cancelled"'],
        ],
      },
      {
        name: 'Guest downloads the food invoice PDF',
        description:
          'venueFoodOrderInvoicePdfBase64 returns a PDF for any order whose money arrived (PAID, REFUND_PENDING or REFUNDED) with the venue name, the GSTIN and address snapshotted on the order, the lines, GST split per tax mode and a refund note when refunded; each download increments invoice_downloads.',
        steps: [
          ['Open a paid order page at a venue that has a GSTIN', 'An "Invoice" card: "Issued by <venue> for this order.", "Venue GSTIN: <gstin>" and a "Download invoice" button'],
          ['Tap "Download invoice"', 'The button reads "Preparing invoice…", then invoice-<order_no>.pdf is saved'],
          ['Open the PDF', 'Venue name, the order\'s venue_gstin and venue_address, each line with qty and price, subtotal, discounts, taxable value with CGST/SGST, total and the Razorpay payment reference'],
          ['Check the owner Food Dashboard', 'The invoice download count goes up by one (invoice_downloads + 1 on the order, venueFoodStats.invoice_downloads)'],
          ['Download again for a cancelled and refunded order', 'The PDF carries "This order was cancelled and refunded in full."'],
          ['Make the invoice query fail (e.g. block the network) and tap download', 'Error "We could not prepare your invoice. Please try again."'],
        ],
      },
      {
        name: 'Invoice before payment is refused',
        description:
          'An unpaid (PENDING or FAILED) order has invoice_available false, so the page shows no Invoice card, and venueFoodOrderInvoicePdfBase64 answers BAD_REQUEST "An invoice is ready once the order is paid".',
        steps: [
          ['Place an order and close the Razorpay sheet without paying; open its order page', '"Waiting for payment confirmation" with "Pay now"; no "Invoice" card'],
          ['Call venueFoodOrderInvoicePdfBase64 with the right access_key', 'BAD_REQUEST "An invoice is ready once the order is paid"; invoice_downloads unchanged'],
          ['Call it with an order_id that is not an ObjectId', 'BAD_USER_INPUT "Invalid order id"'],
          ['Pay the order and reload', 'invoice_available is true and the "Invoice" card appears'],
        ],
      },
      {
        name: 'Guest rates a served order with up to 3 photos',
        description:
          'On a SERVED unrated order each photo gets its own venueFoodFeedbackUploadPass (ImageKit, folder venue-food-feedback), then submitVenueFoodFeedback (rating 1-5, comment up to 500, up to 3 own-media photos) is saved once, the owner gets the VENUE_FOOD_FEEDBACK_RECEIVED WhatsApp, and the Food Dashboard average rating and recent feedback update.',
        steps: [
          ['Open a SERVED order page (or the rating link with ?feedback=1)', 'Card "How was the food?" with "Your rating goes to <venue>. It takes a few seconds.", "Your rating", "Tell the venue more", "Photos" and "Add photo"'],
          ['Tap "Add photo" and pick an image, three times', 'Each shows "Uploading photo…" then a thumbnail; after the third, "Add photo" disappears'],
          ['Pick 4 stars, type a comment and tap "Send feedback"', 'The card turns into "Thanks for your feedback" with "You rated this order 4 out of 5.", the comment and the 3 photos'],
          ['As the owner open the Food Dashboard', 'venueFoodStats average_rating and recent_feedback include the new rating; the owner receives the feedback WhatsApp'],
          ['Make an upload fail', '"We could not upload that photo. Please try again."'],
          ['Call submitVenueFoodFeedback with an image URL not on the ImageKit host', 'BAD_USER_INPUT "A photo could not be read — remove it and add it again"'],
        ],
      },
      {
        name: 'Rating before served or a second time',
        description:
          'Before SERVED the page shows no rating card and the server answers BAD_REQUEST "You can rate an order once it has been served"; a second rating is CONFLICT "This order has already been rated"; rating 0 or 6 and 4 photos are refused as BAD_USER_INPUT.',
        steps: [
          ['Open a PLACED order page', 'No "How was the food?" card'],
          ['Call submitVenueFoodFeedback (rating 4) and venueFoodFeedbackUploadPass on the PLACED order', 'BAD_REQUEST "You can rate an order once it has been served"'],
          ['On a SERVED order call submitVenueFoodFeedback with rating 0', 'BAD_USER_INPUT "Choose a rating from 1 to 5"'],
          ['Call it with 4 images', 'BAD_USER_INPUT "You can add at most 3 photos"'],
          ['Call it with a 501-character comment', 'BAD_USER_INPUT "Keep your feedback under 500 characters"'],
          ['Rate once, then submit again from a second tab that still shows the form', 'CONFLICT; the tab shows "This order has already been rated." and re-reads to the saved rating'],
          ['Call venueFoodFeedbackUploadPass on the rated order', 'CONFLICT "This order has already been rated"'],
        ],
      },
      {
        name: 'Guest opts in to venue events at checkout',
        description:
          'The checkout box "Tell me about events at <venue>" is unticked by default; ticking it sends subscribe_events true, but a VenueSubscriber (source FOOD_ORDER, unique per venue + phone) is written only when the order turns PAID, with one VENUE_EVENTS_SUBSCRIBED WhatsApp; subscribe_opt_ins counts paid orders that ticked it. No unsubscribe path exists in code although the hint promises one.',
        steps: [
          ['Open a food venue page, add dishes and open checkout', '"Your details" form with the checkbox "Tell me about events at <venue>" unticked and hint "We will send you a WhatsApp message when a new pod is announced here. You can stop it at any time."'],
          ['Tick the box, fill name and mobile number, tap "Pay <total>" and close Razorpay without paying', 'The order is saved with subscribe_events true but no VenueSubscriber row exists for that phone'],
          ['Pay a new order with the box ticked', 'One VenueSubscriber row (venue, phone, source FOOD_ORDER) and one VENUE_EVENTS_SUBSCRIBED WhatsApp; the order page shows "You will hear about new events at this venue on WhatsApp."'],
          ['Pay another ticked order from the same phone', 'Still one subscriber row and no second confirmation message'],
          ['Pay an order with the box left unticked', 'No subscriber row and no "You will hear about…" alert'],
          ['As the owner open the Food Dashboard', 'The subscribers tile shows the active subscriber count and its hint the opt-ins (venueFoodStats.subscribers and subscribe_opt_ins, paid orders only)'],
        ],
      },
      {
        name: 'New pod at the venue notifies subscribers',
        description:
          'When the venue owner approves a slot request (approveVenueSlotRequest > whatsappSlotDecision), notifyVenueSubscribers sends every active subscriber one VENUE_NEW_EVENT WhatsApp keyed on the pod, bumps notified_count, and drops an in-app "New at <venue>" note for subscribers with an account; the queued count is only logged, not returned to the approver.',
        steps: [
          ['Give a venue two active subscribers (paid food orders with the events box ticked), one with an account', 'Two VenueSubscriber rows with is_active true'],
          ['As a host book one of the venue\'s slots; as the owner tap "Approve" in Slot Requests and confirm', 'Alert "Booking approved — the pod is now live."; the approval returns without waiting for the sends'],
          ['Check the WhatsApp log', 'One VENUE_NEW_EVENT per subscriber phone carrying the venue name, pod title, date, time and the pod share link; each row\'s notified_count is 1'],
          ['Check the subscriber with an account', 'In-app notification "New at <venue>" with "<pod title> · <date>, <time>"'],
          ['Decline a different slot request', 'No VENUE_NEW_EVENT is sent'],
          ['Approve at a venue with no active subscribers', 'Nothing is sent (queued 0)'],
        ],
      },
    ],
  },
  {
    name: 'App: Public Venue Page',
    description:
      'The public venue page /venue/:venueId (VenueDetailsPage, native VenueDetailsScreen) opens without sign-in from the venue link or poster QR; a venue with offers_food shows Menu and Events tabs (tab in the URL), others show the venue pods and reels directly.',
    sub_flows: [
      {
        name: 'Events tab lists the venue pods and carries the pod through sign-in',
        description:
          'The Events tab lists the venue\'s live pods (pods filter venue_id, is_active) in "Happening soon", "Upcoming" and "Previous" rails; tapping one signed-out goes to the pod URL, RequireAuth parks the visitor on /login?redirect=/club/<club>/pod/<pod>, the AuthPodBanner names the pod, and after sign-in the visitor lands on that pod.',
        steps: [
          ['Signed out, open /venue/<venueId> of a food venue that has upcoming pods', 'Tabs "Menu" and "Events", with "Menu" selected'],
          ['Tap "Events"', 'The URL carries the events tab; "Pods at this venue" with rails "Happening soon", "Upcoming", "Previous" listing the venue pods, then the venue reels'],
          ['Tap an upcoming pod card', 'Redirected to /login?redirect=%2Fclub%2F<club>%2Fpod%2F<pod>; a card "You picked this pod" shows the pod title, date and place with "Log in or sign up to see the details and book your spot."'],
          ['Sign in (or complete sign-up)', 'Lands on /club/<club>/pod/<pod>, the pod that was tapped'],
          ['Signed in, open the venue page, "Events" tab, and tap a pod', 'Goes straight to the pod page, no login step'],
          ['Open /venue/<venueId> of a venue without offers_food', 'No tabs: "Pods at this venue" and the reels show directly under the venue details'],
        ],
      },
    ],
  },
  {
    name: 'App: Public Host Page',
    description:
      'The public host page at /hosts/:handle (mWeb HostPage, no sign-in): publicUserProfile resolves the @username or user id, and only an account with is_host renders - name, photo, bio, "Pods by <name>" rails and reels, with a copy-link button. A pod tap sends a signed-out visitor to login carrying the pod (AuthPodBanner). Native has no public host screen.',
    sub_flows: [
      {
        name: 'Signed-out visitor opens /hosts/:handle',
        description: 'HostPage renders the approved host and their pods without sign-in; tapping a pod parks a signed-out visitor on login with the pod as ?redirect and AuthPodBanner shows it.',
        steps: [
          ['Signed out, open /hosts/<username> of an approved HOST with upcoming pods', 'The page loads without a login redirect (route has no RequireAuth); a skeleton shows while publicUserProfile(user_id: handle) loads'],
          ['Read the page', 'Header shows the host\'s full name with a back button, the eyebrow "Host on Duncit", and a section "Pods by <name>" with Happening soon / Upcoming / Previous rails'],
          ['Open /hosts/<userId> for the same host', 'The same page renders - publicUserProfile resolves a handle first, then a user id'],
          ['Tap the copy-link button ("Copy link")', 'The current page URL is copied and a toast "Link copied" appears'],
          ['Tap an upcoming pod card', 'The app navigates to /club/<clubSlug>/pod/<podSlug>; that route is sign-in only, so the visitor lands on login with the pod in ?redirect'],
          ['Look at the login screen', 'AuthPodBanner shows "You picked this pod" with the pod photo and "Log in or sign up to see the details and book your spot."'],
          ['Sign in', 'The visitor is returned to the pod details page they tapped'],
          ['Open the page for a host with no pods', 'The pods section shows "No pods yet. Check back soon."'],
        ],
      },
      {
        name: 'Unknown handle or non-host account',
        description: 'An unknown handle, a USER without the HOST role, or a host who blocked the viewer all render the not-found state (HostPageNotFound); a network failure shows the retry state instead.',
        steps: [
          ['Open /hosts/no-such-handle-xyz', 'publicUserProfile returns null and the page shows "This host page is not available." (data-testid host-page-not-found)'],
          ['Open /hosts/<username> of a USER who is not a HOST', 'The profile resolves but is_host is false, so the same "This host page is not available." state shows - no name, pods or reels'],
          ['Signed in as a user the host has blocked, open the host\'s page', 'publicUserProfile returns null for a blocker, so "This host page is not available." shows'],
          ['Open a valid host page while the profile query fails (offline)', 'The error state "We couldn\'t load this page. Please try again." shows with a "Retry" button'],
          ['Restore the network and tap "Retry"', 'The query refetches and the host page renders'],
        ],
      },
    ],
  },
  {
    name: 'App: Publish Public Pages',
    description:
      'Venue owners publish their venue page (/venues/publish, Venue Studio card; native PublishPageScreens) and hosts their host page (/host/publish): publishPublicPage mints one tracked share link (VENUE_PAGE / HOST_PAGE), myPublicPage returns the link, QR and stats/funnel, and the A4 poster and venue table label download as PDFs. Strictly owner-scoped on the server; roles read from the DB, not the token.',
    sub_flows: [
      {
        name: 'Venue owner publishes the venue page and gets link + QR + stats',
        description: 'publishPublicPage(VENUE, ref_id) mints one VENUE_PAGE share link and repeating it returns the same link; myPublicPage then shows the QR, link actions and the "Page tracking" stats for the selected venue.',
        steps: [
          ['Sign in as a VENUE_OWNER with an APPROVED, active venue and open /venues/publish', 'Page "Publish Your Venue" with the venue switcher and the card "Publish your venue" ("Get a Duncit link and QR for your venue page...") and a "Publish" button'],
          ['Tap "Publish"', 'The button reads "Publishing…", then the card shows the "Published" chip, the QR image, the "Your page link" field, and buttons "Copy link", "Open page", "Download QR", "Download A4 poster" and "Download table label"'],
          ['Tap "Copy link"', 'Snackbar "Link copied"; the clipboard holds the duncit.com short link'],
          ['Call publishPublicPage(kind: VENUE, ref_id: <venueId>) again as the same owner', 'It returns the same url and code (one link per page) with a PNG qr_data_url'],
          ['Read the "Page tracking" section with no visits yet', 'It shows "No visits yet. Share your link or put the poster up to get started." and a "Period" picker (All time / Last 7 days / Last 30 days / Last 90 days)'],
          ['Open the link signed out, then reload the card and change "Period"', 'Tiles such as "Link opens" and "Unique visitors" count the visit; myPublicPage is re-queried with the chosen days'],
          ['Switch the venue in the switcher to a second approved venue not yet published', 'The card shows the unpublished state with "Publish" for that venue only'],
        ],
      },
      {
        name: 'Publishing an unapproved venue is refused',
        description: 'The server refuses a venue that is not APPROVED or is inactive with FAILED_PRECONDITION "A venue can be published once it is approved and active"; mWeb does not even render the card for a non-APPROVED venue.',
        steps: [
          ['Call publishPublicPage(kind: VENUE, ref_id: <draftVenueId>) as its owner', 'GraphQLError "A venue can be published once it is approved and active" with extensions.code FAILED_PRECONDITION; no link is minted'],
          ['Call myPublicPage(kind: VENUE, ref_id: <draftVenueId>) as its owner', 'The same FAILED_PRECONDITION error'],
          ['Call publishPublicPage for an APPROVED venue whose is_active is false', 'The same FAILED_PRECONDITION error'],
          ['Open /venues/publish and select the draft venue', 'No publish card; an info alert "Your venue can be published once it is approved."'],
          ['Select the APPROVED but inactive venue', 'The card loads, myPublicPage fails and a warning shows "Your venue can be published once it is approved and active." with a "Retry" button'],
        ],
      },
      {
        name: 'Download the A4 poster and the table label PDF',
        description: 'myPublicPagePosterPdfBase64 and myVenueTableLabelPdfBase64 return base64 PDFs printed with the client-translated headline; an empty headline/footer is refused with "Poster text is required" / "Label text is required".',
        steps: [
          ['On a published venue card tap "Download A4 poster"', 'The button reads "Preparing poster…", then <venue-slug>-poster.pdf downloads; the scan panel says "Scan to see the pods happening here" ("Scan to see the Menu & pods happening here" when the venue offers food) and the footer "Find your people on Duncit"'],
          ['Tap "Download table label"', 'The button reads "Preparing table label…", then <venue-slug>-table-label.pdf downloads with the same headline and the venue name under the QR'],
          ['For a venue with offers_food, scan the table label QR', 'It opens a separate VENUE_MENU share link (the menu), counted apart from the poster\'s VENUE_PAGE link'],
          ['Call myPublicPagePosterPdfBase64(kind: VENUE, ref_id, copy: { headline: "  ", footer: "x" })', 'GraphQLError "Poster text is required" with code BAD_USER_INPUT'],
          ['Call myVenueTableLabelPdfBase64(venue_id, headline: "")', 'GraphQLError "Label text is required" with code BAD_USER_INPUT'],
          ['Make the poster request fail (offline) and tap "Download A4 poster"', 'Snackbar "We couldn\'t make the poster. Please try again."'],
        ],
      },
      {
        name: 'Host publishes their host page',
        description: 'publishPublicPage(HOST) mints the HOST_PAGE share link that opens /hosts/:handle; myPublicPage returns its QR and stats, and the host poster can be downloaded (no table label for hosts).',
        steps: [
          ['Sign in as an approved HOST and open /host/publish', 'Page "Publish Your Host Page" with the card "Publish your host page" ("Get a Duncit link and QR for your host page...") and a "Publish" button'],
          ['Tap "Publish"', 'The "Published" chip, QR and "Your page link" appear with "Copy link", "Open page", "Download QR" and "Download A4 poster" - no "Download table label"'],
          ['Tap "Open page"', 'The short link resolves to /hosts/<handle> showing the host\'s public page'],
          ['Tap "Download A4 poster"', 'A PDF downloads with the headline "Scan to join my next pod"'],
          ['Call publishPublicPage(kind: HOST, ref_id: <anything>) again', 'The same url and code return; ref_id is ignored for HOST'],
        ],
      },
      {
        name: 'USER without HOST cannot publish a host page',
        description: 'The server reads metadata.role_keys from the database, so a USER, a VENUE_OWNER-only account, or a host whose role was removed after login is refused with FORBIDDEN "Only an approved host can publish a host page"; mWeb redirects non-hosts away from /host/publish.',
        steps: [
          ['Call publishPublicPage(kind: HOST) as a USER without HOST', 'GraphQLError "Only an approved host can publish a host page" with extensions.code FORBIDDEN'],
          ['Call myPublicPage(kind: HOST) and myPublicPagePosterPdfBase64(kind: HOST, ...) as the same USER', 'Both refused with the same FORBIDDEN error'],
          ['Remove HOST from a signed-in host\'s role_keys, then call publishPublicPage(kind: HOST) with the old token', 'Still refused with "Only an approved host can publish a host page" - the stale JWT is not trusted'],
          ['Open /host/publish in mWeb as a USER without HOST', 'The page redirects to /'],
          ['Call publishPublicPage(kind: HOST) without a token', 'GraphQLError "Not authenticated" with code UNAUTHENTICATED'],
        ],
      },
      {
        name: 'Owner cannot publish or print another owner\'s venue',
        description: 'Every call is scoped to venues whose owner_user_id is the caller; another owner\'s venue answers exactly like a missing one, NOT_FOUND "Venue not found", and no link is minted. Staff roles get the same refusal - there is no admin bypass here.',
        steps: [
          ['As VENUE_OWNER B call publishPublicPage(kind: VENUE, ref_id: <owner A\'s venueId>)', 'GraphQLError "Venue not found" with extensions.code NOT_FOUND; no share link is created'],
          ['As B call myVenueTableLabelPdfBase64(venue_id: <A\'s venueId>, headline: "Scan")', 'The same "Venue not found" NOT_FOUND error'],
          ['As B call myPublicPage and myPublicPagePosterPdfBase64 for A\'s venue', 'Both refused with "Venue not found"'],
          ['As B call publishPublicPage(kind: VENUE, ref_id: "not-an-id")', 'The same "Venue not found" error (invalid ids answer like foreign ones)'],
          ['As a SUPER_ADMIN who does not own the venue call publishPublicPage for it', 'Also "Venue not found" - the service checks ownership only'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Food Desk',
    description:
      'The venue owner\'s food desk in the customer app (mWeb /venues/food-dashboard, /venues/food-menu, /venues/food-orders, /venues/food-coupons; native VenueFoodDashboard, VenueFoodMenu, VenueFoodOrders, VenueFoodCoupons) built on @duncit/venue-food: the menu and GST, the stats, the paid-order board with cancel and full refund on the venue Razorpay, and food coupons. The server scopes every operation to the venue owner or a Venues console editor.',
    sub_flows: [
      {
        name: 'Owner edits the Food Menu (items, availability, prices, diet/spice)',
        description: 'UpdateVenueFoodMenu (updateApprovedVenue) saves the dishes with the shared food-menu Zod schema, the public venue page shows the new menu, and the Razorpay picker lists only the owner\'s saved, connected accounts.',
        steps: [
          ['Sign in as a VENUE_OWNER of an APPROVED venue, switch role to Venue Studio and open "Food Menu" (/venues/food-menu)', 'Page titled "Food Menu" with the venue switcher (only the owner\'s own venues from myVenues), the "Does this venue offer food?" switch and the "Menu" section'],
          ['Turn on "Does this venue offer food?", click "Add menu item" and fill "Item name", "Menu section", "Price", "Food type" (e.g. "Vegetarian") and "Spice level" (e.g. "Medium"), leaving "Available to order" on', 'A new dish card is shown with the typed values'],
          ['Click "Save"', 'UpdateVenueFoodMenu (updateApprovedVenue) runs and the toast "Food menu saved" appears; the form resets to the saved menu with the dish keeping its id'],
          ['Turn "Available to order" off on one dish, change its price and click "Save"', '"Food menu saved"; the stored dish has is_available false and the new price'],
          ['Open the public /venue/:id page as a guest', 'The menu lists the saved dishes under their menu sections with diet and spice marks; the dish turned off cannot be added to the cart'],
          ['Turn on "Accept food orders from the venue QR" and open the "Razorpay account" picker', 'Only the owner\'s saved Razorpay connections are listed; "Add Razorpay account" opens the Partner console /venues/food-menu in a new tab'],
          ['Call updateApprovedVenue as the owner with food_ordering.razorpay_integration_id of another owner\'s connection', 'BAD_USER_INPUT "That Razorpay account does not belong to the owner of this venue"'],
          ['Call updateApprovedVenue as a different VENUE_OWNER for this venue_id', 'FORBIDDEN "Not your venue"; a venue that is not APPROVED returns BAD_REQUEST "Only approved venues can be edited here"'],
        ],
      },
      {
        name: 'Food Menu validation and GST settings',
        description: 'Empty names, prices under 1 and GST outside 0-28 are refused by the form and the server; the GSTIN is saved once by the owner and then shown read-only, and only a Venues console editor can change it.',
        steps: [
          ['On /venues/food-menu with food on, clear a dish\'s "Item name" and click "Save"', 'Field error "Give this menu item a name"; nothing is sent'],
          ['Enter 0 (or a negative number) as "Price" and click "Save"', 'Field error "Enter a price of at least 1"; the server refuses the same with BAD_USER_INPUT "Enter a price between 1 and 100000 for "<name>""'],
          ['Turn on "Set this venue\'s own GST", type 30 in "GST %" and click "Save"', 'Field error "GST must be a whole number from 0 to 28."; the server answers BAD_USER_INPUT "GST must be a whole number from 0 to 28" for gst_pct 30'],
          ['Type an invalid value in "GST number (GSTIN)" and click "Save"', 'Field error "Enter a valid 15-character GSTIN, like 22ABCDE1234F1Z5."'],
          ['Enter a valid GSTIN and click "Save"', '"Food menu saved"; after the reload the GSTIN field is read-only with the hint "Printed on every food invoice. It is locked once saved — ask Duncit support to change it."'],
          ['Call updateApprovedVenue as the owner with a different valid gstin', 'FORBIDDEN "The GST number cannot be changed once saved — ask Duncit support to change it"; re-sending the saved number is a no-op'],
          ['Call updateApprovedVenue with the new gstin as an ALL_VENUES_ACCESS user', 'The GSTIN is changed'],
        ],
      },
      {
        name: 'Food Dashboard stats for a window',
        description: 'venueFoodStats(venue_id, days) returns revenue (cancelled left out), tax_collected, discount_given, coupon_orders, served/cancelled, page and table scans, top items, the daily series and recent feedback; days 0 is all time and the window is capped at 366.',
        steps: [
          ['Open "Food Dashboard" (/venues/food-dashboard) as the owner of a food venue with paid, served, cancelled and coupon orders', 'The "Period" selector defaults to "Last 30 days" and venueFoodStats runs with days 30'],
          ['Read the tiles', '"Orders", "Revenue" ("Cancelled orders left out"), "Average order", "Discounts given", "Coupon orders", "Served", "Cancelled" ("<amount> refunded"), "Poster scans", "Table label scans", "Event subscribers" and "Average rating" match the seeded orders'],
          ['Read the breakdowns', '"Orders by status", "Top dishes", "Daily orders and revenue" and "Recent feedback" reflect the same orders'],
          ['Switch "Period" to "All time"', 'venueFoodStats runs with days 0 and older orders are counted'],
          ['Pick a window with no orders', '"No food orders in this period yet. Paid orders from your venue QR are counted here."'],
          ['Call venueFoodStats with days 1000', 'The response carries days 366'],
        ],
      },
      {
        name: 'Food Orders board moves an order forward',
        description: 'setVenueFoodOrderStatus moves a PAID order only forward along PLACED, ACCEPTED, PREPARING, READY, SERVED; backwards, unpaid and stale writes are refused, and the guest gets a WhatsApp on READY and SERVED.',
        steps: [
          ['Open "Food Orders" (/venues/food-orders) as the owner of a venue with a paid order', 'The board lists only orders whose payment is Paid, Refund pending or Refunded; a PLACED order shows "Accept"'],
          ['Click "Accept", then "Start preparing", then "Mark ready"', 'Each click calls setVenueFoodOrderStatus and shows "Order <no> is now Accepted", "... Preparing", "... Ready"; on READY the guest gets the VENUE_FOOD_ORDER_READY WhatsApp'],
          ['Click "Mark served"', '"Order <no> is now Served"; served_at is stamped, the VENUE_FOOD_ORDER_SERVED WhatsApp is sent and no next step or cancel is offered'],
          ['Call setVenueFoodOrderStatus with status ACCEPTED on a PREPARING order', 'BAD_REQUEST "An order can only move forward"'],
          ['Call setVenueFoodOrderStatus on an order whose payment_status is not PAID', 'BAD_REQUEST "Only a paid order can be moved"'],
          ['Call it with status CANCELLED or an unknown status', 'BAD_USER_INPUT "Choose a valid order status"'],
          ['Move the same order from two sessions at once', 'One succeeds; the other gets CONFLICT "This order was just updated — refresh and try again" and the board refetches'],
          ['Leave the board open while a new paid order arrives', 'It appears within 20 seconds (the board polls); no owner notification is sent'],
        ],
      },
      {
        name: 'Owner cancels a paid food order with full refund',
        description: 'cancelVenueFoodOrder with a reason of 3-300 characters sets CANCELLED and REFUND_PENDING, frees the coupon use and refunds the full total on the venue Razorpay (settleFoodRefund, reusing a refund with the same receipt on retry); a second cancel is refused.',
        steps: [
          ['On /venues/food-orders click "Cancel & refund" on a paid, not yet served order', 'Dialog "Cancel order <no>?" with "<guest> is refunded <amount> in full, from your Razorpay account. This cannot be undone." and the "Reason for cancelling" field'],
          ['Type "ab" and click "Cancel & refund"', 'Field error "Tell the guest why, in at least 3 characters"'],
          ['Type a real reason and click "Cancel & refund"', 'Toast "Order <no> cancelled. The guest has been refunded." (or "... The refund is on its way to the guest." while Razorpay is pending); the row shows Cancelled and Refunded'],
          ['Check the order and Razorpay', 'status CANCELLED, cancel_reason saved, payment_status REFUNDED with razorpay_refund_id for the full total_paise; a coupon use is given back; the guest gets the cancelled WhatsApp'],
          ['Call cancelVenueFoodOrder again on the same order', 'BAD_REQUEST "This order can no longer be cancelled"; no second refund is created'],
          ['Call cancelVenueFoodOrder with a 2-character reason', 'BAD_USER_INPUT "Tell the guest why the order is cancelled"'],
          ['Make the refund call fail (Razorpay down)', 'The cancel still succeeds with payment_status REFUND_PENDING; the sweep finishes the refund later, finding any refund already sent by its receipt'],
        ],
      },
      {
        name: 'Food Coupons create, edit, toggle, delete',
        description: 'create/update/setActive/deleteVenueFoodCoupon manage percent-only codes unique per venue; deleting is a real delete while orders keep their own copy of the code and discount.',
        steps: [
          ['Open "Food Coupons" (/venues/food-coupons) for a food venue with no coupons', '"No food coupons yet. Create one to give your guests a discount on food orders."'],
          ['Click "New coupon", fill "Code" SAVE10 and "Discount (%)" 10 and click "Save"', 'Dialog "New food coupon" closes with "Coupon SAVE10 created"; the row shows 10% and Active'],
          ['Click "New coupon" again with "Discount (%)" 95', 'Field error "Enter a whole number from 1 to 90"'],
          ['Create another coupon with code SAVE10', 'The server refuses with "This venue already has a coupon with this code"'],
          ['Click "Edit" on SAVE10, change "Discount (%)" to 15 and click "Save"', '"Coupon SAVE10 updated"; used_count is unchanged'],
          ['Turn the row\'s active switch off', '"Coupon SAVE10 is off. Guests can no longer use it."; turning it on shows "Coupon SAVE10 is active. Guests can use it now."'],
          ['Click "Delete" and confirm "Delete" in "Delete coupon SAVE10?"', '"Coupon SAVE10 deleted"; the coupon is gone and a past order that used it still shows "Coupon SAVE10 (10%)" with its discount'],
        ],
      },
      {
        name: 'Food tools while food is off',
        description: 'For a venue without offers_food the Food Dashboard, Food Orders and Food Coupons show their noFood message with an "Edit venue" link to the Partner venue form Food section, while Food Menu stays usable.',
        steps: [
          ['Open /venues/food-dashboard for a venue with offers_food false', 'Info alert "This venue does not offer food. Turn food on in its Food Menu section to see its food numbers." with an "Edit venue" button; no stats are loaded'],
          ['Click "Edit venue"', 'Opens the Partner console /register-venue/<venueId>?selectedtab=food'],
          ['Open /venues/food-orders and /venues/food-coupons', '"This venue does not offer food. Turn food on in its Food Menu section to take orders." and "... to give guests food coupons." respectively'],
          ['Open /venues/food-menu for the same venue', 'The menu editor loads with "Does this venue offer food?" off; turning it on and saving lets the other tools load'],
          ['Repeat on the native app (VenueFoodDashboard, VenueFoodOrders, VenueFoodCoupons)', 'The same noFood messages are shown; VenueFoodMenu opens the editor'],
        ],
      },
      {
        name: 'Owner cannot read or act on another venue\'s food orders',
        description: 'managedVenue refuses FORBIDDEN "Not your venue" for every board operation on a venue or order the caller does not own; the app switcher lists only the caller\'s own venues and a signed-out call gets UNAUTHENTICATED.',
        steps: [
          ['As VENUE_OWNER A call venueFoodOrdersTable with venue B\'s venue_id', 'FORBIDDEN "Not your venue"'],
          ['As A call venueFoodStats with venue B\'s venue_id', 'FORBIDDEN "Not your venue"'],
          ['As A call setVenueFoodOrderStatus and cancelVenueFoodOrder with an order_id of venue B', 'FORBIDDEN "Not your venue"; the order\'s status and payment are unchanged'],
          ['Call any of these with an unknown id', 'NOT_FOUND "Venue not found" or "Order not found"; a malformed id gives BAD_USER_INPUT "Invalid venue id" / "Invalid order id"'],
          ['Call venueFoodOrdersTable without a session', 'UNAUTHENTICATED "Not authenticated"'],
          ['Open /venues/food-orders as a USER or HOST with no venues', 'The page shows "You have no venues yet." and no order of any venue'],
          ['Open the venue switcher as A', 'Only A\'s own venues are listed'],
        ],
      },
      {
        name: 'Owner cannot manage another venue\'s food coupons',
        description: 'A foreign venue_id or coupon_id is refused with FORBIDDEN "Not your venue" (or NOT_FOUND "Coupon not found") and the coupon stays unchanged.',
        steps: [
          ['As VENUE_OWNER A call venueFoodCouponsTable with venue B\'s venue_id', 'FORBIDDEN "Not your venue"'],
          ['As A call createVenueFoodCoupon with venue_id of venue B', 'FORBIDDEN "Not your venue"; no coupon is created'],
          ['As A call updateVenueFoodCoupon, setVenueFoodCouponActive and deleteVenueFoodCoupon with a coupon_id of venue B', 'Each returns FORBIDDEN "Not your venue"; B\'s coupon keeps its terms, active state and record'],
          ['Call deleteVenueFoodCoupon with an unknown valid id', 'NOT_FOUND "Coupon not found"'],
        ],
      },
      {
        name: 'Venues-console editor can act on any venue\'s food board',
        description: 'hasRole(consoleEditors(VENUE)) lets SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, ONBOARDING_MANAGER and ALL_VENUES_ACCESS read and move any venue\'s orders by API; roles outside that list are refused. In the app the switcher still lists only venues the staff member owns, so they reach other boards through the API or the Venues console.',
        steps: [
          ['As an ALL_VENUES_ACCESS user (not the owner) call venueFoodOrdersTable for a food venue', 'The venue\'s paid orders are returned'],
          ['As the same user call setVenueFoodOrderStatus to move a PAID PLACED order to ACCEPTED', 'The order moves to ACCEPTED'],
          ['Repeat the read as SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN and ONBOARDING_MANAGER', 'Each succeeds'],
          ['Call venueFoodOrdersTable as a FINANCE_MANAGER and as a SUPPORT_USER who own no venue', 'FORBIDDEN "Not your venue"'],
          ['Open /venues/food-orders in the app as the ALL_VENUES_ACCESS user who owns no venue', '"You have no venues yet." — the app does not list other venues'],
        ],
      },
    ],
  },
  {
    name: 'App: Duncit Lite - Discovery',
    description:
      'Duncit Lite (lite.duncit.com, the lite/ workspace with its own API and duncit-lite database): Discover at / and /discover, city pages at /:citySlug, /category/:slug, /search and event pages at /e/:slug. Only PUBLISHED, PUBLIC, not hidden events are listed; UNLISTED opens by link and PRIVATE only for hosts and people already registered.',
    sub_flows: [
      {
        name: 'Browse Discover, city, category and search',
        description: 'liteDiscover and liteEvents list only PUBLISHED, PUBLIC, not hidden, not yet ended events; UNLISTED and PRIVATE events never appear in any list.',
        steps: [
          ['Open lite.duncit.com/ signed out', 'Header "Discover events" with "Find something to do near you, or host your own.", a search box ("Search events"), a City select and the sections "Browse by category", "Featured calendars", "Explore local events", "Popular events" and "Upcoming events"'],
          ['Pick a city in the City select', 'The URL gets ?city=<slug> and Popular / Upcoming re-query liteDiscover for that city only; "Everywhere" clears it'],
          ['Open /<citySlug> for an active city', 'Title "Events in <name>" with "<n> upcoming events"; an unknown slug renders "We could not find that" with "Go to Discover"'],
          ['Open /category/<slug> for a category with no upcoming events', 'The category name heads the page and the empty state reads "Nothing coming up in <name>"'],
          ['Search "yoga" from the search box', 'Navigates to /search?q=yoga titled "Results for “yoga”"; title, description, venue and address are matched; no match shows "No events match"'],
          ['Create one PUBLIC, one UNLISTED and one PRIVATE published event in the same city, then reload Discover and the city page', 'Only the PUBLIC event is listed in Discover, the city page, the category page and search'],
          ['Open an event that has already ended in search', 'It is not listed; past events only appear under the "Past" tabs (host, calendar and user pages)'],
        ],
      },
      {
        name: 'Private and unlisted event visibility',
        description: 'liteEvent returns UNLISTED by link to anyone, but PRIVATE (and DRAFT/hidden) only to hosts, Lite admins and accounts that already hold a registration; there is no invite list, so the row\'s "invited guests" are only people already registered.',
        steps: [
          ['Open /e/<slug> of a published UNLISTED event signed out', 'The full event page renders with "Register" (registration asks to sign in first) even though the event is in no list'],
          ['Open /e/<slug> of a published PRIVATE event signed out, or as a signed-in account with no registration', 'liteEvent returns null and the page shows "We could not find that" / "The link may be wrong, or the page was removed."'],
          ['Open the same PRIVATE event as its host or co-host', 'The page renders with the host bar "You are hosting this event." and "Manage event"'],
          ['Open a DRAFT event link as anyone but a host', 'The not-found page renders; the host sees "This is a draft. Publish it when you are ready for guests."'],
          ['Request /ics/event/<slug>.ics for a PRIVATE event', 'The server answers 404 "Not found"; a PUBLIC or UNLISTED event returns its .ics file'],
          ['Call liteRegister with the PRIVATE event id as a signed-in account that cannot see it', 'NOT_FOUND "Event could not be found", the same answer liteEvent gives, and no registration is created'],
        ],
      },
    ],
  },
  {
    name: 'App: Duncit Lite - Sign In',
    description:
      'The single sign-in door on lite.duncit.com (/signin page and the sign-in dialog any gated action opens): an email code that is the main Duncit account\'s own OTP when the email belongs to a Duncit member (via DUNCIT) or a Lite code otherwise (via LITE), plus Google when a Google client id is configured.',
    sub_flows: [
      {
        name: 'Sign in with an email code (Duncit-bridged or Lite-only)',
        description: 'liteRequestSignInCode asks the main API\'s requestLoginOtp first and returns via DUNCIT for a Duncit email, else sends a Lite code (via LITE); liteVerifySignInCode checks it and returns a 90-day token, refusing a wrong, expired or over-tried code.',
        steps: [
          ['Open /signin?next=/tickets signed out', 'Card "Sign in" with "Enter your email. Duncit members get their usual code; everyone else gets one from us.", the Email field and "Send me a code"'],
          ['Type "abc" and tap "Send me a code"', 'Field error "Enter a valid email address" and nothing is sent'],
          ['Enter the email of an existing Duncit account and send', 'The code step reads "Your Duncit account emailed you a 6-digit code for <email>. It works for <n> minutes." and has no name field'],
          ['Enter a new email that has no Duncit account', 'The code step reads "We emailed a 6-digit code to <email>. It works for 10 minutes." with a "Your name" field; with no mailbox configured an info alert shows "No mailbox is configured yet, so use this code: <code>"'],
          ['Tap "Send a new code" straight away', 'The button is disabled as "Send a new code in <n>s"; calling liteRequestSignInCode inside 45s returns "Please wait <n>s before asking for another code"'],
          ['Type a wrong 6-digit code and tap "Continue"', 'Error alert "That code is not right"; after 5 tries "Too many tries. Ask for a new code"; an old code gives "That code has expired. Ask for a new one"'],
          ['Type the right code and tap "Continue"', 'The account is created or found (a Duncit sign-in links duncit_user_id), the token is stored and /signin sends the reader to ?next (/tickets)'],
          ['Sign in with an account a Lite admin has blocked', 'Error "This account has been blocked"'],
        ],
      },
      {
        name: 'Sign in with Google',
        description: 'The Google button shows only when the GOOGLE_OAUTH env entry has a client id; liteSignInWithGoogle checks the ID token with Google\'s tokeninfo (audience and verified email) and creates or signs in the Lite user by email.',
        steps: [
          ['Open /signin with a Google client id configured', 'Below the code form an "or" divider and Google\'s "Continue with Google" button'],
          ['Remove the client id in the Lite console and reload', 'The Google button and divider are not rendered'],
          ['Complete Google sign-in with an account whose email is new to Lite', 'A Lite account is created with the Google name and a free handle, google_sub is saved and the reader is signed in'],
          ['Sign in with Google using an email that already has a Lite account', 'The same account signs in and the Google id is attached to it; no duplicate account'],
          ['Call liteSignInWithGoogle with a token issued for a different client id', 'Error "Google did not accept that sign-in. Please try again", shown as an alert under the button'],
          ['Call liteSignInWithGoogle while no client id is configured', 'Error code CONFIG_ERROR "Google sign-in is not configured"'],
        ],
      },
    ],
  },
  {
    name: 'App: Duncit Lite - Registration',
    description:
      'A guest\'s registration on lite.duncit.com: the Register / Request to join card on /e/:slug, the register dialog (ticket, quantity, host questions), the waitlist, paid tickets settled to the host\'s UPI with a transaction reference the host confirms, the ticket page /tickets/:id with its check-in code, and cancelling.',
    sub_flows: [
      {
        name: 'Register for a free event with questions',
        description: 'liteRegister checks the ticket and every required answer and lands the registration CONFIRMED (or PENDING_APPROVAL when the host approves each guest); the ticket page /tickets/:id shows the check-in code.',
        steps: [
          ['Open a published free event signed out and tap "Register"', 'The sign-in dialog opens first; the register dialog opens only after signing in'],
          ['In the register dialog keep the ticket and quantity 1 and tap "Next"', 'The step "A few questions from the host" lists each question'],
          ['Leave a required question blank and tap "Register"', 'Field error "This is required"; via the API liteRegister answers "Please answer: <question label>"'],
          ['Answer the questions and tap "Register"', 'Dialog "All done" with the "Going" chip and "You are registered for <title>." plus "View ticket"'],
          ['Tap "View ticket"', '/tickets/<id> shows "Check-in code" in large type with "Show this at the door. The host types it in.", the status timeline and "Your answers"'],
          ['Repeat on an event with "Approve each guest before their seat is held" on', 'The button reads "Request to join", the dialog submits "Send request" and ends with "Your request for <title> is with the host." and the "Pending approval" chip'],
          ['Call liteRegister again for the same event', 'Error "You are already registered for this event"'],
          ['Call liteRegister for an event that has ended', 'Error "This event has already ended"'],
        ],
      },
      {
        name: 'Full event puts the guest on the waitlist',
        description: 'When held seats plus the quantity exceed capacity the registration is WAITLISTED; when a seat frees (a guest cancels, or a host declines/removes) the earliest waitlisted guest is promoted. Unlike the row, the host cannot approve a waitlisted guest: the guest menu only offers Decline and Remove.',
        steps: [
          ['Fill an event with capacity 1, then register as a second guest', 'Dialog "All done" with the "Waitlisted" chip and "The event is full, so you are on the waitlist for <title>."'],
          ['Reload the event page as the waitlisted guest', 'The card shows "Waitlisted", "Position 1" and "You are on the waitlist. We will tell you when a spot opens."'],
          ['As the host open Manage > Guests and the waitlisted guest\'s action menu', 'Only "Decline" and "Remove" are offered'],
          ['As the confirmed guest cancel the registration', 'The seat is released and the waitlisted guest moves to Going (or Pending approval / Payment pending when the event needs approval or the ticket is paid) and is emailed'],
          ['Look at the Overview tab as the host', 'The "Waitlisted" tile drops by one and "Going" rises'],
        ],
      },
      {
        name: 'Paid ticket by host UPI and payment reference',
        description: 'A paid ticket lands PAYMENT_PENDING with the host\'s UPI QR from liteUpiQr; liteSubmitPaymentReference stores the UTR and the host\'s Confirm payment makes it CONFIRMED/PAID while Reject payment makes it DECLINED with payment REJECTED. No money passes through Duncit.',
        steps: [
          ['Register for a ₹200 ticket', 'The dialog closes and the app opens /tickets/<id> with "Payment pending" and the card "Pay ₹200 over UPI"'],
          ['Read the payment card', 'A UPI QR, the amount, "Pay to <payee>", the UPI ID with a copy button and, on a phone, "Open in UPI app"; with no host UPI the warning "The host has not added a UPI ID yet. Contact them to pay."'],
          ['Type "123" under "Transaction reference (UTR)" and tap "Send to host"', 'Field error "A transaction reference is 6 to 40 characters"'],
          ['Enter a 12-digit UTR and tap "Send to host"', 'Toast "Sent to the host for confirmation." and the alert "Reference <utr> sent. The host will confirm your payment."; the host is emailed'],
          ['As the host open Manage > Guests, the guest\'s menu and "Confirm payment"', 'Toast "Updated <name>."; the guest becomes "Going" with payment "Paid" and gets the confirmation email'],
          ['On another guest choose "Reject payment" and confirm', 'The guest becomes "Declined" with "Payment rejected" and is emailed "The payment reference could not be matched."'],
          ['Call liteSubmitPaymentReference on a confirmed ticket', 'Error "This ticket is not waiting for a payment"'],
        ],
      },
      {
        name: 'Cancel my registration',
        description: 'liteCancelRegistration (owner only) marks the registration CANCELLED, releases its seat and promotes the first waitlisted guest; cancelling twice is a no-op.',
        steps: [
          ['On /tickets/<id> of a confirmed ticket tap "Cancel registration"', 'Confirm dialog "Cancel your registration?" with "Your place is released to the next person. You can register again while spots remain." and "Keep it"'],
          ['Tap "Keep it"', 'Nothing changes'],
          ['Confirm "Cancel registration"', 'Toast "Your registration was cancelled."; the status becomes "Cancelled" and the cancel button disappears'],
          ['Open My tickets', 'The cancelled registration is no longer listed'],
          ['Register again for the same event', 'Allowed: a CANCELLED or DECLINED registration does not block a new one'],
          ['Call liteCancelRegistration with someone else\'s registration id', 'Error "Ticket could not be found" (NOT_FOUND)'],
        ],
      },
    ],
  },
  {
    name: 'App: Duncit Lite - Hosting',
    description:
      'Hosting on lite.duncit.com: /create and /e/:slug/edit (sections Basics, When, Where, Tickets, Registration questions, Payments, Settings), publishing, duplicating, and the host console /e/:slug/manage with Overview, Guests, Check-in, Updates and Settings tabs. Every host mutation checks the caller is a host or co-host (or a Lite admin) on the server.',
    sub_flows: [
      {
        name: 'Create, publish, edit, duplicate an event',
        description: 'liteCreateEvent saves a DRAFT from the sectioned form, litePublishEvent makes it PUBLISHED (emailing the calendar\'s subscribers the first time a PUBLIC event goes live) and liteDuplicateEvent copies it as a new draft with no guests.',
        steps: [
          ['Open /create signed in', 'Title "Create event" with "Saved as a draft until you publish it." and the sections Basics, When, Where, Tickets, Registration questions, Payments and Settings'],
          ['Set an end before the start and tap "Save draft"', 'Field error "The event must end after it starts" and toast "Fix the highlighted fields to continue."'],
          ['Choose online without a join link, or a priced ticket without a UPI ID', '"Add the join link for an online event" or "Add your UPI ID so guests can pay you for a paid ticket"'],
          ['Fill the form correctly and tap "Save draft"', 'Toast "Draft saved. Publish it when you are ready." and the event page opens with "This is a draft. Publish it when you are ready for guests."'],
          ['Tap "Publish" and confirm "Publish this event?"', 'Toast "Your event is live." and the banner becomes "You are hosting this event."'],
          ['Tap "Edit", change the title and save', 'Toast "Event saved." and the page shows the new title'],
          ['In Manage > Overview tap "Duplicate" and confirm', 'Toast "Draft copied. Edit the dates before publishing." and the edit form of "<title> (copy)" opens as a draft with no guests'],
          ['Call liteUpdateEvent or litePublishEvent on a cancelled event', 'Error "A cancelled event cannot be edited" / "A cancelled event cannot be published"'],
        ],
      },
      {
        name: 'Manage guests: approve, decline, export CSV, check in by code',
        description: 'The Guests tab lists liteEventRegistrations with per-state actions through liteHostRegistrationAction; Export CSV downloads the list; liteHostCheckInByCode checks in a confirmed guest once and refuses unknown, unconfirmed or repeated codes.',
        steps: [
          ['Open /e/<slug>/manage > Guests', 'The table "Guest list" with a "Search by name or email" box, a status filter (All, …) and "Export CSV"'],
          ['Open a pending guest\'s menu, choose "Approve"', 'Toast "Updated <name>."; a free ticket becomes "Going", a paid one "Payment pending", and the guest is emailed'],
          ['Choose "Decline" on another guest', 'A confirm "This applies to <name>. Continue?" first; then the guest is "Declined" and their seat goes to the waitlist'],
          ['Tap "Export CSV"', 'A file <slug>-guests.csv downloads with Name, Email, Ticket, Quantity, Status, Payment, Payment reference, Checked in, Code and Registered'],
          ['Open Check-in and type a confirmed guest\'s code, tap "Check in"', 'A success box with the guest name, ticket × quantity · code and "Checked in at <time>"; the count reads "<x> of <y> checked in"'],
          ['Type the same code again', 'Error "This ticket was already checked in"'],
          ['Type a code that belongs to a pending-payment guest, then a code nobody has', '"This ticket is payment pending, not confirmed" and "A ticket with that code could not be found"'],
        ],
      },
      {
        name: 'Co-hosts, event updates and cancel event',
        description: 'liteAddCoHost adds an existing Lite account by email and liteRemoveCoHost removes it (never the main host); liteSendEventUpdate emails confirmed guests; liteCancelEvent sets CANCELLED and emails every guest.',
        steps: [
          ['In Manage > Settings enter an email nobody has used on Lite and tap "Add co-host"', 'Error "No Lite account uses that email yet. Ask them to sign in once first"'],
          ['Add an email that has signed in once', 'Toast "Co-host added." and the person is listed under "Hosts"; they can now open Manage'],
          ['Remove the co-host and confirm', 'Toast "Co-host removed."; liteRemoveCoHost on the main host answers "The main host cannot be removed"'],
          ['In Updates write a subject and message and tap "Send update"', 'Confirm "Send this update?" "It goes to <n> confirmed guests now."; then "Sent to <n> guests."'],
          ['In Overview tap "Cancel event"', 'Dialog warns "Every guest is told, and registrations close. This cannot be undone." with an optional Reason, "Keep the event" and "Cancel the event"'],
          ['Tap "Cancel the event" with a reason', 'Toast "The event was cancelled and guests were told."; the event page shows "This event was cancelled by the host. Reason: <reason>" and Edit disappears'],
        ],
      },
      {
        name: 'Non-host cannot manage an event',
        description: 'The manage page sends a non-host to the event page, and every host operation (liteUpdateEvent, liteHostRegistrationAction, liteHostCheckInByCode, liteEventRegistrations) answers FORBIDDEN "Only a host of this event can do that", so the guest list is never returned to them.',
        steps: [
          ['Open /e/<slug>/manage signed out', 'The gate "Sign in to continue" with "Sign in to see the events you host." and a "Sign in" button'],
          ['Open it as a signed-in guest of the event', 'The app redirects to /e/<slug>; no host bar is shown'],
          ['Call liteEventRegistrations for the event as that guest', 'FORBIDDEN "Only a host of this event can do that"; no names or emails are returned'],
          ['Call liteUpdateEvent, liteHostRegistrationAction or liteHostCheckInByCode as a non-host', 'Each is refused with "Only a host of this event can do that"'],
          ['Call liteRegistration with another guest\'s registration id as a non-host', 'FORBIDDEN "You do not have access to this"'],
          ['Repeat the calls as a co-host', 'They succeed'],
        ],
      },
    ],
  },
  {
    name: 'App: Duncit Lite - Calendars and Profile',
    description:
      'Calendars (/calendars, /calendars/new, /cal/:slug with subscribe and an .ics feed), the profile page /profile with UPI payee details, the language switch saved to the account, and the public user page /u/:handle on lite.duncit.com.',
    sub_flows: [
      {
        name: 'Create a calendar, subscribe and unsubscribe',
        description: 'liteCreateCalendar/liteUpdateCalendar are owner-only (reserved and taken links refused); liteSubscribeCalendar/liteUnsubscribeCalendar toggle the subscriber count once per account, and the .ics feed lists the calendar\'s PUBLIC published events.',
        steps: [
          ['Open /calendars and tap "New calendar"', 'Form "New calendar" ("A calendar has its own page and a feed people can subscribe to.") with Name, Link, Description, City, Avatar and Cover picture'],
          ['Set the link to "discover" and save', 'Error "That link is reserved; pick another"'],
          ['Save with a name only', 'Toast "Calendar saved."; the link is made from the name and the calendar is listed under "My calendars"'],
          ['As another account open /cal/<slug> and tap "Subscribe"', 'Toast "Subscribed. New events will reach you by email." and the subscriber count rises by one; a signed-out visitor is asked to sign in first'],
          ['Tap "Unsubscribe"', 'Toast "Unsubscribed." and the count drops by one'],
          ['Publish a PUBLIC event filed under the calendar for the first time', 'Each subscriber is emailed (calendar_new_event)'],
          ['Open "Subscribe in your calendar app" (/ics/cal/<slug>.ics)', 'The feed lists only PUBLIC published events of that calendar'],
          ['Call liteUpdateCalendar as a non-owner', 'FORBIDDEN "Only the calendar owner can edit it"'],
        ],
      },
      {
        name: 'Edit profile and language; public user page',
        description: 'liteUpdateProfile saves name, handle (unique, 3-30 lowercase letters, numbers or underscores), bio, picture and UPI payee details; switching language while signed in calls liteSetMyLocale; /u/:handle lists only the person\'s PUBLIC published events.',
        steps: [
          ['Open /profile signed out', 'The gate "Sign in to continue" with "Sign in to edit your profile."'],
          ['Signed in, set the handle to "AB" and tap "Save"', 'Field error "A handle is 3 to 30 lowercase letters, numbers or underscores"'],
          ['Set a handle another account already uses', 'Error "That handle is already taken"'],
          ['Change name, bio and UPI ID and tap "Save"', 'Toast "Profile saved."; new paid events start with these UPI details'],
          ['Pick another language in the header (or footer on a phone) and reload', 'The interface stays in that language because liteSetMyLocale saved it to the account'],
          ['Open /u/<handle> signed out', 'The public page shows the name, bio and "<n> events hosted" with Upcoming and Past lists of PUBLIC events only (no email or UPI)'],
          ['Open /u/<handle> of a blocked account', 'liteUserProfile returns null and the page shows the not-found state'],
        ],
      },
    ],
  },
  {
    name: 'App: Public Venue Page',
    description:
      'The public venue page at /venue/:venueId (mWeb VenueDetailsPage, native VenueDetails). It reads publicVenue, which is public and returns null unless the venue is APPROVED and active. A venue that serves food opens on Menu and Events tabs. The table label QR (short link target VENUE_MENU) lands on the Menu tab and is counted apart from the poster QR (VENUE_PAGE).',
    sub_flows: [
      {
        name: 'Signed-out guest opens a venue page',
        description: 'mWeb renders the page without sign-in (the route has no auth guard) from the public PublicVenueDetails query. The Menu and Events tabs appear only when offers_food is on. Native registers VenueDetails only in the signed-in stack, so a signed-out app user cannot open it.',
        steps: [
          ['Signed out, open /venue/<approvedVenueId> on mWeb for a venue with offers_food off', 'No redirect to /login. A spinner shows, then the header with the venue name and the copy-link button, the hero, the name heading, chips for the venue type, "<capacity> capacity" and its tags, the description and the location card'],
          ['Scroll the same page', 'No tab strip. The pods section and the reels section show straight under the location card, followed by the Amenities, Facilities and Security chips and the photo grid'],
          ['Open /venue/<foodVenueId> for an approved venue with offers_food on', 'A full-width tab strip labelled "Venue sections" shows "Menu" and "Events". Menu is selected by default and shows the "Menu" section with the dishes grouped by category'],
          ['Tap "Events"', 'The URL gains selectedtab=events and the pods and reels sections show in place of the menu. Reloading keeps the Events tab selected'],
          ['Call publicVenue(venue_id) with no session for the food venue', 'It returns the venue with food_menu filled and food_ordering.razorpay_integration_id null. gstin, pan, owner_phone, owner_email and the bank details come back empty'],
          ['In the native app, signed out, open the link https://<mweb>/venue/<foodVenueId>', 'The app shows the sign-in screens. VenueDetails is only registered in the signed-in stack, so the venue page does not open until the user signs in'],
        ],
      },
      {
        name: 'Venue not found, unapproved or inactive',
        description: 'publicVenue returns null for an unknown id, a non-APPROVED venue or an inactive one. The page shows its not-found state and never the menu. placeVenueFoodOrder for such a venue fails with NOT_FOUND "Venue not found".',
        steps: [
          ['Open /venue/<draftVenueId> for a venue whose status is not APPROVED', 'The header title reads "Venue not found" with a back button, above an empty state: "This venue link may be unavailable or the venue may not be approved yet." No tabs, menu or cart'],
          ['Open /venue/<inactiveVenueId> for an APPROVED venue with is_active false', 'The same "Venue not found" state shows'],
          ['Open /venue/not-an-id and /venue/<unknownObjectId>', 'publicVenue returns null for both and the same not-found state shows'],
          ['Call placeVenueFoodOrder as a guest for the draft venue with a valid 36-character client_key, one item, name and phone', 'GraphQL error code NOT_FOUND with the message "Venue not found". No VenueFoodOrder is written'],
          ['Make the publicVenue request fail (offline) and open any venue page', 'An error empty state shows "We couldn’t load this page. Please try again." with a "Retry" button that refetches the venue'],
        ],
      },
      {
        name: 'Table QR / VENUE_MENU link opens the menu tab',
        description: 'For a venue that serves food, the owner’s table label carries a VENUE_MENU short link that resolves to /venue/<id>?selectedtab=menu. Its clicks come back from venueFoodStats as table_scans ("Table label scans"). Poster scans of the VENUE_PAGE link come back as page_scans ("Poster scans").',
        steps: [
          ['As the owner of an approved food venue, open its publish page and press "Download table label"', 'The button reads "Preparing table label…" and then a PDF downloads. tableLabelPdfBase64 has minted (or reused) the VENUE_MENU share link for the venue'],
          ['Signed out, open the short link printed on the label', 'It redirects to /venue/<venueId>?selectedtab=menu and the page opens with the "Menu" tab selected'],
          ['As the owner, call venueFoodStats(venue_id) and read table_scans and page_scans', 'table_scans has gone up by one and page_scans has not changed. The food dashboard tiles read "Table label scans" and "Poster scans"'],
          ['Open the poster’s VENUE_PAGE short link instead', 'It lands on the venue page and page_scans goes up while table_scans does not'],
          ['Download the table label for a venue with offers_food off', 'The label carries the venue page link (VENUE_PAGE), not a VENUE_MENU link'],
          ['Turn offers_food off on a venue whose VENUE_MENU link was already printed, then open that link', 'The VENUE_MENU resolver returns no destination, because it needs an APPROVED, active venue with offers_food on'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Food Ordering',
    description:
      'Scan-and-order on a venue’s public menu (/venue/:venueId?selectedtab=menu). A guest, signed in or not, builds a cart with the shared CartQuantityControl, enters their details, can apply a venue-owned food coupon, and pays the venue’s own Razorpay account through placeVenueFoodOrder and verifyVenueFoodOrderPayment. A 5-minute sweep and order-page rechecks pick up abandoned payments. No Duncit Payment row is ever written.',
    sub_flows: [
      {
        name: 'Guest builds a cart with the shared cart control',
        description: 'Each available dish has the shared CartQuantityControl (add, increase, decrease or remove). A floating cart button shows the item count and total. The cart is kept in localStorage per venue, so it survives a reload. A dish marked unavailable shows an "Unavailable" chip and cannot be added.',
        steps: [
          ['On the Menu tab of a venue with ordering enabled, press "+" (aria "Add <dish>") on a dish', 'The "+" turns into a pill with a bin, the count 1 and a "+". The card briefly shows "Item added". A floating button appears reading "1 item" and the total, with the accessible name "View cart, 1 item, <total>"'],
          ['Press "Add one more <dish>" twice, then "Remove one <dish>"', 'The count goes 2, 3, then 2, and the floating button reads "2 items". At 1 the decrease button is a bin labelled "Remove <dish>"'],
          ['Look at a dish with is_available false', 'It is dimmed, shows an "Unavailable" chip and has no cart control'],
          ['Reload the page', 'The cart is restored from localStorage key mweb_food_cart_<venueId> with the same quantities and total'],
          ['Keep pressing "+" on one dish', 'The "+" is disabled at 20, the most of one dish an order can hold'],
          ['With 30 different dishes already in the cart, add a 31st', 'A warning toast says "One order can hold at most 30 different dishes." and the dish is not added'],
          ['Press the floating cart button', 'The "Your order" sheet opens. Each line shows "<qty> × <price>" with its stepper and a "Remove <dish> from your cart" button, followed by the totals and the details form'],
        ],
      },
      {
        name: 'Guest pays a food order (no coupon) with Razorpay',
        description: 'placeVenueFoodOrder prices the cart from the venue’s own menu and opens a Razorpay order on the venue’s linked key. verifyVenueFoodOrderPayment checks the signature with the venue’s secret and flips payment_status to PAID (status stays PLACED). Amounts are in paise and follow tax_mode. Nothing is written to the Duncit Payment collection.',
        steps: [
          ['In the "Your order" sheet, fill "Your name" and "Mobile number" and press "Pay <total>"', 'placeVenueFoodOrder returns order (order_no, status PLACED, payment_status PENDING), an access_key, and a razorpay sheet whose key_id is the venue’s own key, with amount = total_paise and currency INR'],
          ['Check the totals for an INCLUSIVE venue at 5% GST', 'The total equals the subtotal minus the venue discount. The tax line reads "Includes <amount> GST (5%)" and tax_paise is net − round(net×100/105)'],
          ['Check the totals for an EXCLUSIVE venue at 5% GST', 'A "GST (5%)" line is added before the total, and the total is the net plus round(net×5/100)'],
          ['Complete the Razorpay test payment', 'verifyVenueFoodOrderPayment returns payment_status PAID with paid_at set. The browser goes to /venue/<venueId>/food-order/<orderId>?key=<access_key> and the cart is cleared'],
          ['As an API caller, verify with an HMAC-SHA256 signature of "<razorpay_order_id>|<payment_id>" made with the venue’s test secret', 'The order becomes PAID. Calling verify again returns the same paid order without any error'],
          ['Query the Payment collection for the order', 'No Payment row exists. Only VenueFoodOrder carries razorpay_order_id and razorpay_payment_id'],
          ['Back on /venue/<venueId>, look at the menu header', 'A "Track your order <orderNo>" link opens the order page'],
          ['If the WhatsApp templates are approved, check the messages', 'The guest gets VENUE_FOOD_ORDER_PLACED and the owner gets VENUE_FOOD_ORDER_RECEIVED, once each and only after PAID'],
        ],
      },
      {
        name: 'Checkout form validation (name, phone, table label, note)',
        description: 'The shared React Hook Form and Zod food-checkout schema blocks a short name and a mobile that is not 10 digits (PHONE_NUMBER from @duncit/regex). maxLength on the inputs stops over-long table and note text being typed. The server repeats every check with BAD_USER_INPUT and places nothing.',
        steps: [
          ['Leave "Your name" empty (or type one letter) and press "Pay <total>"', '"Enter your name" shows under the field. No request is sent'],
          ['Enter "12345" as the "Mobile number"', '"Enter a valid 10-digit mobile number" shows. The field only accepts digits, up to 10'],
          ['Try to type 21 characters into "Table or seat" and 301 into "Note for the kitchen"', 'The inputs stop at 20 and 300 characters. Their hints read "Optional — helps the venue bring your order to you." and "Optional"'],
          ['Call placeVenueFoodOrder with customer_name "A"', 'BAD_USER_INPUT "Enter your name". No order is written'],
          ['Call it with customer_phone "98765"', 'BAD_USER_INPUT "Enter a valid 10-digit mobile number"'],
          ['Call it with a 21-character table_label and then with a 301-character note', 'BAD_USER_INPUT "Keep the table or seat under 20 characters" and then "Keep the note under 300 characters"'],
          ['Call it with an empty items array, then with quantity 0', 'BAD_USER_INPUT "Your cart is empty" and then "Choose a valid quantity"'],
          ['When the server answers BAD_USER_INPUT in the sheet', 'The sheet’s error alert reads "Please check your order details and try again." and the cart is unchanged'],
        ],
      },
      {
        name: 'Repeat placeVenueFoodOrder with the same client_key is idempotent',
        description: 'A repeat with the same client_key returns the existing order, access key and Razorpay order, because a unique {venue_id, client_key} index backs it. A racing twin whose Razorpay order is not open yet gets CONFLICT "Your order is still being set up — try again in a moment", which the page retries once after 1.5 s.',
        steps: [
          ['Call placeVenueFoodOrder twice in a row with the same input and client_key (a crypto.randomUUID)', 'Both return the same order.id, order_no, access_key and razorpay.order_id. One VenueFoodOrder exists for that key'],
          ['Repeat the same client_key after the order is PAID', 'The paid order comes back with razorpay null. Nothing new is placed and nothing is charged again'],
          ['Fire two placements with the same client_key at the same moment', 'One creates the order. The other either reads it or, while razorpay_order_id is still empty, gets CONFLICT "Your order is still being set up — try again in a moment". There is never a second order'],
          ['In the sheet, double-tap "Pay <total>"', 'Only one placement is sent. On CONFLICT the page waits 1.5 s and repeats with the same key'],
          ['Call placeVenueFoodOrder with client_key "short"', 'BAD_USER_INPUT "Your order session has expired — refresh the page"'],
          ['Change the cart, details or coupon and press Pay again', 'The page mints a new client_key for the new attempt, so a new order is placed'],
        ],
      },
      {
        name: 'Item removed or switched off between cart and pay',
        description: 'Placing re-reads the menu. A dish that is gone fails with FOOD_ITEM_UNAVAILABLE "An item in your cart is no longer on the menu"; one that is switched off fails with "<dish> is not available right now". Unlike the row premise, the page does not keep the cart as it was: it shows the message, re-reads the venue and drops the dish from the cart.',
        steps: [
          ['Add a dish to the cart, then as the owner switch that dish off', 'The guest’s page still shows it in the cart until they pay'],
          ['Press "Pay <total>"', 'placeVenueFoodOrder fails with FOOD_ITEM_UNAVAILABLE "<dish> is not available right now". No order is written'],
          ['Read the sheet', 'The error alert says "A dish in your cart is no longer available. We have updated your cart — please check it and try again."'],
          ['Wait for the venue to be re-read', 'The dish leaves the cart and the menu shows "No longer available and removed from your cart: <dish>." The other dishes stay in the cart'],
          ['Call placeVenueFoodOrder with an item_id that is not on the menu', 'FOOD_ITEM_UNAVAILABLE "An item in your cart is no longer on the menu"'],
        ],
      },
      {
        name: 'Ordering closed or venue Razorpay account missing',
        description: 'offers_food off, food_ordering.enabled off or no linked integration gives FOOD_ORDERING_CLOSED. A linked integration without keys gives the same code with "The payment account of this venue is not available right now". The menu stays readable and only checkout is refused.',
        steps: [
          ['Open the menu of a venue with food_ordering.enabled false', 'The dishes show with prices but without cart controls, and there is no floating cart button'],
          ['Call placeVenueFoodOrder for that venue', 'FOOD_ORDERING_CLOSED "This venue is not taking food orders right now"'],
          ['With items in the cart, the owner turns ordering off, then the guest presses "Pay <total>"', 'The sheet closes, the cart controls disappear and an info alert reads "This venue is not taking food orders right now. You can still browse the menu."'],
          ['Delete the keys of the venue’s linked Razorpay connection, then place an order', 'FOOD_ORDERING_CLOSED "The payment account of this venue is not available right now". No order is kept'],
          ['Make Razorpay refuse to open the order (bad test keys), then place an order', 'The order is deleted and the call fails with FOOD_ORDERING_CLOSED "This venue cannot take online payments right now — please order at the counter"'],
          ['Call availableVenueFoodCoupons for the closed venue', 'It returns an empty list'],
        ],
      },
      {
        name: 'Payment verification with a forged or foreign signature',
        description: 'verifyVenueFoodOrderPayment first checks access with the order’s access_key or the account that placed it, failing with FORBIDDEN "This order link is not valid". A razorpay_order_id from another order gives BAD_REQUEST "This payment does not belong to this order". A bad signature gives BAD_REQUEST "Payment verification failed". The order stays PENDING.',
        steps: [
          ['Call verifyVenueFoodOrderPayment for a PENDING order with its access_key and razorpay_signature "forged"', 'BAD_REQUEST "Payment verification failed". payment_status stays PENDING and paid_at stays null'],
          ['Call it with the razorpay_order_id of a different order', 'BAD_REQUEST "This payment does not belong to this order". The order stays PENDING'],
          ['Call it without an access_key, as a different signed-in user', 'FORBIDDEN "This order link is not valid"'],
          ['Call it without an access_key, as the signed-in user who placed the order', 'Access passes, and the signature and order-id checks run as above'],
          ['Call it with order_id "x"', 'BAD_USER_INPUT "Invalid order id"'],
          ['Send a forged signature for an order that is already PAID', 'No error: the paid order is returned unchanged, because verify only checks PENDING orders'],
        ],
      },
      {
        name: 'Abandoned payment reconciled by the 5-minute sweep',
        description: 'startVenueFoodReconciler runs every 5 minutes, starting 2 minutes after boot, and adopts a captured payment for PENDING orders aged 3 minutes to 24 hours through markFoodOrderPaid. A read of the order page does the same at most every 20 s. A guarded PENDING-to-PAID write makes sure the order is marked paid exactly once.',
        steps: [
          ['Pay in the Razorpay sheet, then close the tab before verify runs', 'The order stays PENDING with razorpay_order_id set'],
          ['Wait for a sweep that runs at least 3 minutes after the order was created', 'Razorpay reports the capture and its amount equals total_paise, so the order becomes PAID with razorpay_payment_id and paid_at. reconcile_checked_at is stamped'],
          ['Open /venue/<venueId>/food-order/<orderId>?key=<key> for a different abandoned PENDING order', '"Waiting for payment confirmation" shows. The page re-reads every 8 s and each read rechecks Razorpay at most every 20 s, until the status shows "Paid"'],
          ['Let a sweep, an order-page read and a late verify all reach the same order', 'Only one write matches PENDING. The coupon used_count goes up once and WhatsApp is sent once'],
          ['Leave a capture whose amount differs from total_paise', 'The order stays PENDING and a warning is logged: "captured amount differs from the order total — left for a human"'],
          ['Leave an order with no capture for more than 24 hours', 'The sweep no longer picks it up and it stays PENDING'],
        ],
      },
      {
        name: 'Guest applies a venue food coupon',
        description: 'availableVenueFoodCoupons lists up to 10 live coupons of the venue, best first. previewVenueFoodCoupon prices the cart with the code and counts nothing. The paid order stores coupon_code. used_count rises only on the PENDING-to-PAID write. These are venue-owned VenueFoodCoupon codes, not Finance coupons.',
        steps: [
          ['Open the "Your order" sheet at a venue with active coupons', '"Available coupons" lists each code as "<CODE> · <pct>% off" with "On orders above <amount>" and "Valid till <date>" where set, ordered by discount from high to low'],
          ['Press "Apply" on an offer (aria "Apply <CODE>")', 'previewVenueFoodCoupon returns ok true. The offers hide, a chip shows the code with a "Remove coupon <CODE>" button and "Coupon <CODE> applied — you save <amount>", and the totals add "Coupon <CODE> (<pct>%)"'],
          ['Check the coupon’s used_count after the preview', 'It has not changed'],
          ['Lower the cart below the coupon’s minimum', 'The message reads "Add <amount> more to use this coupon." and the coupon discount drops out of the total'],
          ['Pay the order', 'The coupon is checked again with the typed mobile. The PAID order stores coupon_code, coupon_pct and coupon_discount_amount, and used_count goes up by exactly 1'],
          ['Press "Remove coupon <CODE>"', '"Coupon removed" shows and the total goes back to the venue-discount price'],
        ],
      },
      {
        name: 'Expired, inactive, exhausted or unknown food coupon',
        description: 'previewVenueFoodCoupon returns ok false with a reason and message, and totals that do not include the coupon. Limits are only checked when an order is placed and are not checked again at payment, so two open checkouts can push used_count one past max_uses. That is the documented behaviour.',
        steps: [
          ['Preview a code whose valid_until has passed', 'ok false, reason EXPIRED, message "Coupon has expired", coupon_discount_amount 0 and an unchanged total. The sheet shows "This coupon has expired."'],
          ['Preview a code that is switched off, one that belongs to another venue, and one that does not exist', 'Each returns reason INVALID with "Invalid or inactive coupon code". The sheet shows "This coupon code is not valid here."'],
          ['Preview a code whose used_count has reached max_uses', 'reason USAGE_LIMIT_REACHED "Coupon usage limit reached". The sheet shows "This coupon has been fully used." The code is not listed in availableVenueFoodCoupons'],
          ['Preview a code whose valid_from is in the future', 'reason NOT_STARTED "Coupon is not active yet". The sheet shows "This coupon is not active yet."'],
          ['Place an order with one of those codes', 'FOOD_COUPON_REJECTED with extensions.reason set. No order is placed and the sheet adds "This coupon can no longer be used. Remove it or try another code."'],
          ['With one use left, have two guests place orders with the code, then both pay', 'Both orders become PAID and used_count ends at max_uses + 1. This is accepted by design because limits are not rechecked at payment'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Create Pod Stepper',
    description: 'The host stepper at /create-pod.',
    sub_flows: [
      {
        name: 'Host creates a FREE physical pod at a free (0) venue slot',
        description: 'Step 4 offers Free for a physical pod; the earnings preview is replaced by the free-pod note, and a FREE pod on a ₹0 slot books the slot instantly and goes live with pod_type FREE and pod_amount 0.',
        steps: [
          ['As an approved, active host open /create-pod, fill steps 1-2 with "Physical" and on step 3 pick a partner venue slot priced ₹0', 'The slot is selected and sets the pod date/time; the stepper moves on to step 4'],
          ['On step 4 tap the "Free" card (caption "No ticket charge")', 'The "Free" card is selected (not disabled for a physical pod); no ticket price field and no "Potential earnings" panel show'],
          ['Read the pricing area', 'Note "This pod is free" with "People join without paying, and Duncit collects and pays nothing for this pod."'],
          ['Tick the Organizer Terms and tap "Create Pod"', 'AI check overlay, then the pod publishes without a "Slot Request Sent" page'],
          ['Check the server', 'Pod has pod_type FREE, pod_amount 0; the ₹0 slot is BOOKED with no venue request (isFreeSlotForFreePod), and the partner venue is told the slot was booked'],
          ['Call createPartnerPod via API with pod_type FREE and pod_amount 50', 'Refused with "Free pods must have amount 0"'],
        ],
      },
      {
        name: 'Free pod at a paid venue slot sends the coordinate-with-host request',
        description: 'A FREE pod on a priced slot at someone else’s venue still raises a slot request; the host is told to settle the venue directly and the venue sees the coordinate-with-host notice instead of a slot price.',
        steps: [
          ['On step 3 pick a slot priced above ₹0 at a venue you do not own, then choose "Free" on step 4', 'Note "Because this pod is free, Duncit will not pay the venue. You will need to settle the venue\'s charges with the venue directly." and "The venue has been asked not to confirm the slot until you have spoken to them or transferred the amount."'],
          ['Tap "Create Pod"', 'Navigates to /host/pod-pending/<podId> "Slot Request Sent"; the pod is offline awaiting venue approval'],
          ['As the venue owner open /venues/slot-requests', 'The request card shows "Please coordinate with the host. The host will contact you about your charges. Please do not confirm the slot until the host has called you to discuss or has transferred the amount." and no "Slot price" row'],
          ['Check the venue owner’s email/WhatsApp slot-request notice', 'It carries the free-pod notice ("This pod is free, so please coordinate with the host directly…")'],
          ['Venue approves the slot', 'The pod goes live; no venue payout is ever created for it'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Booking & Checkout',
    description: 'Booking a spot from the customer app.',
    sub_flows: [
      {
        name: 'Member joins a free physical pod and cancels the spot repeatedly',
        description: 'joinFreePod joins instantly with no checkout or Payment; "Cancel Spot" (cancelFreeSpot) frees the seat with no BackoutRequest, no attempt counted and no refund text; join and cancel can repeat on the same membership row.',
        steps: [
          ['Open a live FREE physical pod and tap "Join"', '"Joined!" shows; the bar reads "You\'re going · Pod Booked" with a "Cancel Spot" button (no "Backout")'],
          ['Tap "Cancel Spot"', 'Dialog "Cancel your spot?" with "Your spot will be released for someone else. This pod is free, so you can join again any time while it is open." and "Cancel My Spot"'],
          ['Tap "Cancel My Spot"', 'Snack "Your spot is cancelled. You can join again any time while the pod is open."; the bar shows "Join" again'],
          ['Check the server', 'PodMember is BACKED_OUT with spot_cancelled_at set, refund_status NONE, spot_cancel_count 1; ticket CANCELLED; seats released; no BackoutRequest row'],
          ['Tap "Join", then cancel again three more times', 'Each join re-activates the same PodMember row (ticket back to VALID) and each cancel succeeds; no backout-limit message appears'],
          ['Call cancelFreeSpot twice in a row via API', 'The second call returns the same cancelled membership; seats are released only once'],
        ],
      },
    ],
  },
  {
    name: 'App: Backout & Refunds',
    description: 'Backing out of a booked pod.',
    sub_flows: [
      {
        name: 'Cancel-spot refusals',
        description: 'cancelFreeSpot refuses a paid pod (NOT_FREE_POD), a started pod (BAD_REQUEST), a checked-in member (ALREADY_CHECKED_IN) and a non-member (NOT_FOUND); the app maps each code to its own sentence.',
        steps: [
          ['Call cancelFreeSpot as a USER on a PAID pod they booked', 'Refused with "Only a free pod’s spot can be cancelled. Use Backout to leave a paid pod." (code NOT_FREE_POD)'],
          ['Call cancelFreeSpot on a FREE pod whose start time has passed', 'Refused with "This pod has already started — your spot can no longer be cancelled." (code BAD_REQUEST); the app shows "This pod has already started, so your spot can no longer be cancelled."'],
          ['Scan the member in, then call cancelFreeSpot', 'Refused with "You have already been checked in at this pod, so your spot can no longer be cancelled." (code ALREADY_CHECKED_IN); seats and ticket unchanged'],
          ['Call cancelFreeSpot as a USER who never joined the FREE pod', 'Refused with "You are not a member of this pod" (code NOT_FOUND); the app shows "You do not have a spot in this pod to cancel."'],
          ['Call backoutPod on a FREE pod (older app builds)', 'Answered as a cancel-spot: no BackoutRequest is created and no attempt is counted'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Complete Pod & Earnings',
    description: 'Completing a past pod and host earnings.',
    sub_flows: [
      {
        name: 'Finance paths stay inert for FREE pods',
        description: 'A FREE physical pod is never auto-cancelled or flagged at risk for money, and completing it creates no PaymentRelease, venue bill or wallet credit (only ECOMM seller releases for products sold on it).',
        steps: [
          ['Enable auto-cancel and let a FREE physical pod on a priced slot enter the venue trigger window', 'The sweep skips it (cancelIfNegative returns false); the pod stays live'],
          ['Read the pod’s cancellation risk in the Pods portal', 'podFinanceNow reports collected 0, venue amount 0, negative false — never at risk'],
          ['After the pod ends with scanned attendees, open ⋮ > "Complete pod" as the host', 'Hint "…It is a free pod, so completing it pays nothing out."; no "Venue bill" section; preview shows "Nobody pays to join a free pod, so there is no payout. The host settles any venue charges directly with the venue."'],
          ['Tap "Complete pod"', 'Toast "Pod completed."; the pod is completed with a COMPLETE audit entry and leaderboard points'],
          ['Check PaymentRelease and wallets', 'No HOST_PAYMENT, VENUE_BILLING or CLUB_ADMIN release (not even ₹0 rows) and no wallet credit'],
          ['Raise a manual payout release for the FREE pod via the Finance API', 'Refused with "This is a free pod — the host settles the venue directly, so there is no platform payout to release." (code FREE_POD_NO_PAYOUT)'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Partner Requests',
    description: 'Hosts and venue owners find each other nearby and send Pod Requests (Host Studio /host/nearby-venues, Venue Studio /venues/nearby-hosts), answer them in the inboxes (/host/pod-requests, /venues/pod-requests), agree a venue slot on /pod-requests/:id and create the prefilled pod. Contact details are shared only once the pod exists; each sender has a monthly request allowance.',
    sub_flows: [
      {
        name: 'Host searches nearby venues and sends a pod request',
        description: 'nearbyVenuesForHost lists approved venues near the selected city; sendPodPartnerRequest (HOST_TO_VENUE) creates a REQUESTED request shown in the host’s sent list and the venue’s inbox, notifies the venue owner in-app and takes one from the monthly quota.',
        steps: [
          ['As an approved host with a city picked open /host/nearby-venues', 'Heading "Search Nearby Venues", "Searching Nearby Venues..." then venue cards with "<km> km away" and the quota line "<remaining> of <limit> requests left this month"'],
          ['Open as a host with no city in the location picker', '"Pick your city in the location picker to search nearby."'],
          ['Narrow the radius until nothing matches', '"No venues found within <km> km." with "Search within <km> km" to widen'],
          ['Tap "Request Pod" on a venue, add a note and send', 'Toast "Pod Request sent."; the card now shows the "Requested" chip instead of the button and the quota drops by one'],
          ['Open /host/pod-requests', 'The request is listed under "Your requests to venues" with "Requested"'],
          ['As the venue owner open /venues/pod-requests', 'It is under "Pod Requests from Hosts" on the "Requests" tab with "Accept" / "Decline"; an inbox notification "New Pod Request" links to /pod-requests/<id>'],
          ['Call nearbyVenuesForHost as a USER without the HOST role', 'Refused with "Host access is required before creating pods"'],
        ],
      },
      {
        name: 'Venue owner searches nearby hosts and sends a request',
        description: 'nearbyHostsForVenue lists approved, active hosts near the selected city for one of the owner’s approved venues; a VENUE_TO_HOST request then appears in the host’s inbox.',
        steps: [
          ['As a venue owner with an approved venue open /venues/nearby-hosts', 'Heading "Search Nearby Hosts", the venue picker and host cards filtered to the venue’s categories, with the venue’s quota line'],
          ['Tap "Request Pod" on a host and send', 'Toast "Pod Request sent."; the card shows "Requested"'],
          ['As that host open /host/pod-requests', 'Under "Pod Requests from Venues" on "Requests" with "Accept" / "Decline"'],
          ['Call nearbyHostsForVenue with another owner’s venue_id', 'Refused with "Not your venue" (FORBIDDEN)'],
          ['Call sendPodPartnerRequest VENUE_TO_HOST for a venue you do not own', 'Refused with "Not your venue"'],
          ['Send a second request to the same host while the first is open', 'Refused with "You already have an open Pod Request with this partner" (CONFLICT)'],
        ],
      },
      {
        name: 'Accept a request, pick a slot and create the prefilled pod',
        description: 'The receiver accepts and picks one of the venue’s open slots (held for the request), the sender confirms it, and the host’s "Create Pod" opens /create-pod?partner_request_id=… prefilled; publishing marks the request POD_CREATED and shares contact.',
        steps: [
          ['As the receiver tap "Accept" on a REQUESTED request', 'It moves to the accepted tab ("Venue Accepted Requests" for a host, "Host Accepted Requests" for a venue) with "Accepted"; the sender is notified "Pod Request accepted"'],
          ['Receiver opens /pod-requests/<id>', '"Pick a slot" with "Choose one of the venue\'s open slots. The other side confirms it before the pod is created." and "Send Slot Request"'],
          ['Pick a slot and tap "Send Slot Request"', 'Status "Slot requested"; the receiver sees "Waiting for the other side to confirm the slot."; the slot is held for this request'],
          ['As the sender tap "Confirm slot"', 'Status "Slot confirmed"; the host sees "The slot is confirmed. Create the pod: the venue and slot are already chosen." and "Create Pod"; the venue sees "The slot is confirmed. The host creates the pod next."'],
          ['Host taps "Create Pod"', '/create-pod?partner_request_id=<id> opens with the venue, space and slot window already set'],
          ['Publish with a different venue_slot_id via API', 'Refused with "Use the slot confirmed on the Pod Request"'],
          ['Publish the prefilled pod', 'Pod is created on the held slot; the request becomes "Pod created", both sides are notified and the contact block (Phone, Email, Address) appears'],
          ['Before publishing, view the request contact block', '"Contact details are shared once the pod is created."'],
        ],
      },
      {
        name: 'Decline or withdraw a request',
        description: 'The receiver declines (REJECTED) or the sender withdraws (CANCELLED) only while REQUESTED; each transition is a conditional write, so a second action is refused with CONFLICT.',
        steps: [
          ['As the receiver tap "Decline" on a REQUESTED request', 'It leaves the "Requests" tab; the sender is notified "Pod Request declined" and sees the "Declined" chip'],
          ['As the sender of another request open it and tap "Withdraw"', 'Status "Withdrawn"; it no longer appears in the receiver’s "Requests" tab'],
          ['Call respondPodPartnerRequest again on the declined request', 'Refused with "This request has moved on — refresh to see where it is." (CONFLICT)'],
          ['Call cancelPodPartnerRequest as the receiver', 'Refused with "Only the sender can withdraw this request" (FORBIDDEN)'],
          ['Call respondPodPartnerRequest as the sender', 'Refused with "Only the receiver can answer this request" (FORBIDDEN)'],
          ['As the sender tap "Decline slot" on a slot request', 'Request returns to "Accepted", the held slot is released and the receiver is notified "Slot declined"'],
        ],
      },
      {
        name: 'Request limit set at onboarding is enforced',
        description: 'Each host (and each venue) has a monthly allowance — the admin override (venue_requests_limit_override / host_requests_limit_override) or 10 by default; once used up the "Request Pod" buttons disable and the server refuses with LIMIT_REACHED.',
        steps: [
          ['Set the host’s venue request limit to 1 and open /host/nearby-venues', 'Quota line "1 of 1 requests left this month"'],
          ['Send one request', 'Quota line turns red: "You have used all 1 Pod Requests for this month."; every "Request Pod" button is disabled'],
          ['Call sendPodPartnerRequest again via API', 'Refused with "You have used all 1 requests for this month." (code LIMIT_REACHED)'],
          ['Fire two sends concurrently with one request left', 'Only one succeeds; the counter never exceeds the limit'],
          ['Send that fails as a duplicate pair (CONFLICT)', 'The reserved quota is given back; podPartnerRequestQuota.used is unchanged'],
        ],
      },
      {
        name: 'Third party cannot open or answer a request',
        description: 'Only the request’s host and venue owner can read or move it; any other account is refused with FORBIDDEN "This request is not yours" (the row expected NOT_FOUND "Pod Request not found", which only the Create Pod prefill path returns).',
        steps: [
          ['As account C (neither party) open /pod-requests/<id> of A and B', 'Error alert "This request is not yours"'],
          ['Call podPartnerRequest(id) as C', 'Refused with "This request is not yours" (FORBIDDEN)'],
          ['Call respondPodPartnerRequest, cancelPodPartnerRequest and requestPodPartnerSlot as C', 'Each refused with "This request is not yours"; status unchanged'],
          ['Call createPartnerPod as another host with partner_request_id of A and B', 'Refused with "Pod Request not found" (NOT_FOUND)'],
          ['Open /pod-requests/<id> signed out', 'Redirected to /login'],
        ],
      },
    ],
  },
  {
    name: 'App: Live Pod Challenges',
    description: 'Hosts run live challenges on their pods from /host/pod/:podId/challenges (templates allowed by the pod’s category), attendees and rostered competitors play in the arena at /pod/:podId/challenges/:challengeId/live with live socket updates, and the host publishes a locked result that is sent to attendees by WhatsApp and email.',
    sub_flows: [
      {
        name: 'Host creates and runs a challenge for a pod',
        description: 'createPodChallenge from a category-allowed template, roster set, transitionPodChallenge through Start/Pause/Resume/End, live tool controls, and publishPodChallengeResult which locks the result and sends the result link.',
        steps: [
          ['As the pod host open /host/pod/<podId>/challenges', '"Challenges" page with "Add a challenge", the "Challenge template" select and "Challenge name" (hint "Optional — the template name is used if left empty.")'],
          ['Open it for a pod whose category maps no tools', '"Challenges are not enabled for this pod’s category." or "No challenge templates are available for this pod’s category yet."'],
          ['Pick a template and tap "Add challenge"', 'Toast "Challenge added." and a challenge panel in Draft'],
          ['Tap "Start" with an empty roster', 'Refused with "Add at least one competitor before starting"'],
          ['Open "Roster (0)", add competitors linked to confirmed attendees, "Save roster", then "Start"', 'Status Live; confirmed attendees get the live link by WhatsApp/email when auto-send is on'],
          ['Use the live controls: "Arm buzzer", "Open question", "Start clock", "Pick someone"', 'Arena updates live for every viewer'],
          ['Tap "End challenge" and confirm "End this challenge?"', 'Status Completed; "Finalize & publish result" appears'],
          ['Publish and confirm "Publish the final result?"', 'Result locked and shown on Pod Details/Pod History; RESULT notice sent; "Notification history" lists "Result link · <n> attendee(s)"'],
        ],
      },
      {
        name: 'Attendee plays: buzz, quiz answer, vote, poll, submit entry, checkpoint',
        description: 'Votes and polls need a confirmed attendee with audience interaction on; buzz, quiz, entries and checkpoints need a rostered competitor; every action is server-ordered and pushed to the arena over the socket.',
        steps: [
          ['As a rostered competitor open the live arena while the host arms the buzzer and tap "Buzz!"', 'Button turns to "You buzzed." and is disabled; buzz order lists "1. <name>" for every viewer'],
          ['Host opens a quiz question; competitor taps an option', '"Your answer is locked in."; a second answer is ignored (first answer stands)'],
          ['With voting open, an attendee taps "Vote for <name>" / a poll option', '"Your vote is in." and the tally updates live'],
          ['Competitor chooses a file and taps "Submit entry"', '"Submission saved."; it appears under "Submissions"; the button becomes "Replace my entry"'],
          ['Competitor scans a checkpoint QR link', '"You are checked in at this checkpoint."; an invalid code shows "This checkpoint code is not valid"'],
          ['An attendee who is not on the roster tries to buzz via API', 'Refused with "Only a competitor in this challenge can do that — ask the host to add you to the roster"'],
          ['Vote via API while the host has voting closed', 'Refused with "Voting is closed"'],
        ],
      },
      {
        name: 'Spectator opens the public arena',
        description: 'The arena route has no sign-in gate: a guest can watch a challenge shown on Pod Details, switch to TV/projector view and full screen, but sees no ballot or judging controls.',
        steps: [
          ['Signed out, open /pod/<podId>/challenges/<challengeId>/live for an enabled challenge shown on Pod Details', 'Arena renders the challenge name, standings and leaderboard without a login redirect'],
          ['Tap "TV / projector view"', 'URL gains ?tv=1 and the projector layout shows; the button becomes "Exit TV view"'],
          ['Tap "Full screen"', 'The arena enters full screen; the button reads "Exit full screen"'],
          ['Look for voting and judging', 'No vote, poll or judge controls render (viewer.can_interact and can_judge are false)'],
          ['Call castPodChallengeVote signed out', 'Refused by requireAuth (UNAUTHENTICATED)'],
          ['Open a challenge that is hidden from Pod Details', 'Server answers "Challenge not found"; the page shows "This challenge could not be loaded. Check your connection and try again."'],
        ],
      },
      {
        name: 'Non-host and non-attendee are refused',
        description: 'Manage actions need the pod host or Challenge staff (SUPER_ADMIN, CHALLENGE_MANAGER), ballots need a confirmed attendee, judge scores need an assigned judge, and hidden challenges answer NOT_FOUND via assertView.',
        steps: [
          ['Call createPodChallenge / transitionPodChallenge as another HOST or USER', 'Refused with "Only the pod host can manage this challenge" (FORBIDDEN)'],
          ['Call castPodChallengeVote / castPodChallengePoll as a USER without a JOINED booking', 'Refused with "Only confirmed attendees of this pod can take part" (FORBIDDEN)'],
          ['Call judgePodChallengeCompetitor as a user not assigned as judge', 'Refused with "Only assigned judges can score this challenge" (FORBIDDEN)'],
          ['Call podChallenge(id) on a disabled or draft challenge as an outsider', 'Refused with "Challenge not found" (NOT_FOUND)'],
          ['Call publishPodChallengeResult again as the host after publishing', 'Refused with "Published results can only be corrected by Challenge staff"'],
        ],
      },
      {
        name: 'Host voids a score and removes an entry',
        description: 'Removing a score voids it in the score log (kept with who and why) and updates standings; a reason is required only after the challenge ends. Removing an entry is a plain confirm with no reason (removePodChallengeEntry takes none), unlike the row’s premise.',
        steps: [
          ['While Live open "Score log" and tap "Remove score" on an entry', 'Dialog "Remove this score?" with "The score is taken off the board. It stays in the audit trail."; reason is optional'],
          ['Confirm', 'The entry is struck through with "Removed: <reason or —>"; standings drop by that value'],
          ['After "End challenge" remove another score with no reason', 'Dialog says "The challenge has ended, so this is a correction: say why it is being removed."; empty reason shows "Give a short reason (at least 3 characters)."; the server also refuses "A correction after the challenge ends needs a reason"'],
          ['Void the same score twice via API', 'Refused with "This score was already removed"'],
          ['In "Submissions" tap "Remove the submission by <name>"', 'Dialog "Remove this submission?" (no reason field); on confirm "Submission removed." and it leaves the gallery'],
          ['Another competitor calls removePodChallengeEntry on someone else’s entry', 'Refused with "You can only remove your own submission"'],
        ],
      },
    ],
  },
  {
    name: 'App: Studio Options & Role Switch',
    description:
      'The Studio Options pages in the customer app (mWeb /venues/options, /host/options, /clubs/options, /products/options; native VenueOptions, HostOptions, ClubOptions, BrandOptions): the role switcher at the top (only partner roles the account holds, Brand only while products are on), the option list from the shared STUDIO_OPTION_LIST catalogue, the remembered venue, and what a plain USER gets on the partner routes.',
    sub_flows: [
      {
        name: 'Switch role and open each studio\'s Options page',
        description: 'StudioRoleSwitcher offers only the roles the account holds (heldStudioModes), each Options page lists that role\'s STUDIO_OPTION_LIST entries with their hints, and the venue picked on Venue Options is remembered for every venue page.',
        steps: [
          ['Sign in as an account holding HOST, VENUE_OWNER, ECOMM_MANAGER and CLUB_ADMIN with products on, and open /venues/options', 'Header "Venue Options"; a tab strip labelled "Choose a role" shows "Host", "Venue", "Brand" and "Club Admin" in that order with "Venue" selected'],
          ['Read the Venue Options list', 'Rows in catalogue order starting "Dashboard" (hint "Bookings, earnings and requests at a glance"), "Your Venues", "Slot Requests", then Availability Calendar, Venue Settings, Venue Earnings, food rows, Pods at Your Venue, Verification and "Withdrawal" last; "Auto Pods" only while auto_pods is on'],
          ['With two venues, pick the second venue in the switcher above the list', 'Caption "Every venue option opens for this venue"; opening "Pods at Your Venue" or "Venue Earnings" afterwards shows the second venue selected'],
          ['Tap the "Host" tab', 'The URL is replaced with /host/options (Back leaves the Studio), the header reads "Host Options" and rows include "Your Pods", "Create a Pod", "Host Share" and "Your Categories"'],
          ['Tap "Brand"', '/products/options lists "Dashboard", "Brand Orders" and "ShipRocket Pickup Addresses"; "Your Brands", "Integrations", "Product Returns" and "Deletion Refunds" show an "Opens in the Partner app" glyph instead of a chevron and open partners-app.duncit.com'],
          ['Tap "Club Admin"', '/clubs/options lists "Dashboard", "Your Clubs", "Pod Monitoring (AI)", "Change Requests", "Verification" and "Withdrawal"'],
          ['Turn the is_product_visible flag off and reload /venues/options', 'The switcher drops "Brand"; opening /products/options sends the browser to /'],
          ['Sign in as an account with only VENUE_OWNER and open /venues/options', 'No role tab strip is rendered (a single role has nothing to switch between); the option list still shows'],
        ],
      },
      {
        name: 'Partner studio routes opened by a plain USER',
        description: 'mWeb guards these routes only with sign-in (withAuth / withProducts); a USER with no partner role sees empty or register states because every query is scoped to the caller, and the Options pages send them home. Native Options screens render an empty list instead of redirecting.',
        steps: [
          ['Signed out, open /venues/manage', 'RequireAuth redirects to /login?redirect=/venues/manage'],
          ['As a USER with no partner role, open /venues/options, /host/options and /clubs/options', 'Each redirects to / because studioOptionsFor returns no options for a role the account does not hold (native opens the screen with an empty option list)'],
          ['Open /venues/manage', '"Your venues" shows "You haven\'t registered a venue yet." with "Register a venue"; no switcher, Slot earnings or other owner\'s data (myVenues and venuePods are scoped to owner_user_id)'],
          ['Open /venues/earnings', 'Cards show ₹0.00 and "Payouts appear here after a pod at your venue completes." (myVenueEarningsSummary returns zeros and myVenuePayouts [] for a user with no venues)'],
          ['Open /host/manage', 'The "Your Pods" page renders with no hosted pods, because myHostPods returns only pods the caller hosts'],
          ['Open /clubs/manage', '"No clubs are assigned to you yet." (myAdminClubs lists only clubs whose admin_user_ids include the caller)'],
          ['Open /products/manage with products on', 'The page loads the platform-wide availablePodProducts stats (requireAuth only, not brand-scoped); no brand orders or buyer data are shown'],
          ['Call venuePods(venue_id: <someone else\'s venue>) as the USER', 'GraphQL error "You do not own this venue" (FORBIDDEN)'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Studio',
    description: 'Venue Studio pages in the customer app.',
    sub_flows: [
      {
        name: 'Venue list and venue pods pages',
        description: 'Your Venues (/venues/list) lists only the caller\'s venues from myVenues; Pods at Your Venue (/venues/pods) shows the selected venue\'s pods from venuePods in Upcoming, Current and Past tabs with the venue row actions.',
        steps: [
          ['As a VENUE_OWNER with two venues open Venue Options > "Your Venues" (/venues/list)', 'Header "Your Venues" with an "Add a venue" button; one row per own venue with its name, city and a status chip (APPROVED green, REJECTED red, otherwise amber) and an "Edit" button'],
          ['Tap the second venue\'s row', 'It becomes the selected venue and the app opens /venues/manage on it'],
          ['Tap "Edit" or "Add a venue"', 'The Partner app opens /register-venue/<venueId> or /register-venue/new'],
          ['Open /venues/list as an account with no venues', 'Info alert "You have no venues yet."'],
          ['Open Venue Options > "Pods at Your Venue" (/venues/pods)', 'Header "Pods at Your Venue", the venue switcher, and tabs "Upcoming", "Current" and "Past" (?selectedtab= in the URL) listing only pods booked at the selected venue'],
          ['Open each tab on a venue with no pods', '"No upcoming pods at this venue.", "No pod is running at this venue right now." and "No past pods at this venue yet."'],
          ['Open a pod row\'s detail', 'The attendee list shows each attendee\'s name and photo (VenueStudioPodAttendees reads publicUsersByIds for the pod\'s attendee ids)'],
        ],
      },
      {
        name: 'Owner cannot cancel or inspect pods at another owner\'s venue',
        description: 'venueCancelPod runs assertOwnedVenue before any refund, and venuePods / venuePodsSummary refuse a venue the caller does not own, so no refund, penalty or attendee list is reached for a foreign pod. publicUsersByIds itself is not owner-scoped and returns only public name and photo.',
        steps: [
          ['As VENUE_OWNER B call venueCancelPod(pod_id: <upcoming pod at owner A\'s venue>, reason: "Venue unavailable")', 'GraphQL error "This pod is not booked at a venue you own" (FORBIDDEN); no refund is created and venue A\'s health score is unchanged'],
          ['Call venueCancelPod with a reason shorter than 5 characters', '"Please describe why you are cancelling this pod" (BAD_USER_INPUT) before any ownership check'],
          ['Call venueCancelPod with a malformed pod id', '"Invalid pod id" (BAD_USER_INPUT)'],
          ['As owner B call venuePods(venue_id: <venue A>) and venuePodsSummary(venue_id: <venue A>)', 'Both return "You do not own this venue" (FORBIDDEN); no attendee ids are returned'],
          ['As owner B call venuePods with no venue_id', 'Only pods at owner B\'s venues are returned'],
          ['As owner A cancel the same upcoming pod from Venue Studio', 'The cancel succeeds and the pod\'s SUCCESS payments are refunded'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Slot Requests',
    description: 'Venue slot request inbox in the customer app.',
    sub_flows: [
      {
        name: 'Owner cannot approve a slot request on another owner\'s venue',
        description: 'approveVenueSlotRequest and declineVenueSlotRequest compare the slot\'s owner_user_id with the caller and refuse with "Not your slot" (not "You do not own this venue"), leaving the slot PENDING and the pod unlisted.',
        steps: [
          ['As VENUE_OWNER B call approveVenueSlotRequest(slot_id: <PENDING slot on owner A\'s venue>)', 'GraphQL error "Not your slot" (FORBIDDEN)'],
          ['Read the slot and its pod', 'The slot is still PENDING with no decision, and the pod\'s venue_approval_status is not APPROVED and is_active is unchanged'],
          ['As owner B call declineVenueSlotRequest on the same slot', '"Not your slot" (FORBIDDEN); the host gets no decline notification'],
          ['As a HOST (the requesting host) call approveVenueSlotRequest on their own pod\'s slot', '"Not your slot" (FORBIDDEN)'],
          ['As owner A approve a slot whose start time has passed', '"This slot has already started and can no longer be approved"'],
          ['As owner A approve the pending slot', 'The slot becomes BOOKED/APPROVED, the pod goes live and a VENUE_APPROVED audit row is written'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Earnings',
    description: 'Venue earnings in the customer app.',
    sub_flows: [
      {
        name: 'Owner sees only own venues\' earnings',
        description: 'myVenueEarningsSummary and myVenuePayouts aggregate VENUE_BILLING releases only for venues whose owner_user_id is the caller; a USER gets zeros and an empty list, and podFinanceBreakdown refuses a pod the caller neither hosts nor owns the venue of.',
        steps: [
          ['As VENUE_OWNER A with an approved venue release open /venues/earnings', 'Lifetime, Pending, This month and Pods completed include venue A\'s releases; "Payout history" lists only venue A\'s pods'],
          ['As VENUE_OWNER B (releases on venue B only) open /venues/earnings', 'Totals and payout rows include only venue B\'s releases; none of venue A\'s pods appear'],
          ['As a USER with no venue call myVenueEarningsSummary and myVenuePayouts', 'lifetime_earnings, pending_amount, pods_completed and this_month_earnings are 0 and the payouts list is empty'],
          ['As owner B call podFinanceBreakdown(pod_id: <pod at venue A>)', 'GraphQL error "Only this pod’s host, venue owner, or an admin can view its breakdown" (FORBIDDEN)'],
          ['As owner A call podFinanceBreakdown for the same pod', 'The breakdown is returned'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Your Pods & Pod Actions',
    description: 'Host pod management in the customer app.',
    sub_flows: [
      {
        name: 'Host cannot edit, cancel or complete another host\'s pod',
        description: 'Every host pod mutation loads the pod through findHostedPod and refuses non-hosts with "Only the pod host can manage this pod"; status media and co-host management have their own refusals, completion says "Only a host of this pod can do that", and admin-only updatePod answers "Access Denied".',
        steps: [
          ['As HOST B call hostUpdatePod(pod_doc_id: <host A\'s pod>, input: {pod_title: "Renamed"})', 'GraphQL error "Only the pod host can manage this pod" (FORBIDDEN); the title is unchanged'],
          ['As HOST B call hostDeletePod on host A\'s pod with a reason', '"Only the pod host can manage this pod"; no refund or cancellation email is sent'],
          ['As HOST B call hostResubmitPod on host A\'s venue-declined pod', '"Only the pod host can manage this pod"'],
          ['As HOST B call completePodSettlement(input: {pod_id: <host A\'s pod>})', '"Only a host of this pod can do that" (FORBIDDEN); no payment release is created'],
          ['As HOST B call addPodStatus on host A\'s pod', '"Only pod hosts can add status media" (FORBIDDEN)'],
          ['As HOST B call inviteCoHost on host A\'s pod', '"Only the pod host can manage co-hosts" (FORBIDDEN)'],
          ['As HOST B call updatePod (the admin mutation)', '"Access Denied" (FORBIDDEN); staff edit pods from the Admin/Pods portal'],
          ['Call hostUpdatePod with a malformed pod id', '"Invalid pod id" (BAD_USER_INPUT)'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Attendance Board & Scanning',
    description: 'Host attendance in the customer app.',
    sub_flows: [
      {
        name: 'Attendee or other host cannot mark attendance',
        description: 'Attendance calls resolve the caller as the pod host or an admin of the pod\'s club; anyone else gets "You do not administer this club". A club admin reaching the host-only by-hand mark gets "Only the pod host can mark attendance here". "Not your ticket" belongs to ticket PDF download, not scanning.',
        steps: [
          ['As an attendee USER call hostMarkPodAttendance(pod_doc_id, membership_id: <another attendee>)', 'GraphQL error "You do not administer this club" (FORBIDDEN); the ticket stays unmarked'],
          ['As another HOST or a VENUE_OWNER call podAttendanceBoard for the pod', '"You do not administer this club" (FORBIDDEN); no roster is returned'],
          ['As another HOST call hostScanPodTicket with a valid ticket token for the pod', '"Only the pod host can manage this pod" (FORBIDDEN); nothing is marked'],
          ['As the CLUB_ADMIN of the pod\'s club call hostMarkPodAttendance', '"Only the pod host can mark attendance here" (FORBIDDEN); the club admin uses the Mark attendance override instead'],
          ['As the CLUB_ADMIN call requestPodCompanionOtp for the pod', '"Only the pod host verifies an attendee here" (FORBIDDEN)'],
          ['As another member call eventTicketPdfBase64 for the attendee\'s ticket', '"Not your ticket" (FORBIDDEN)'],
          ['As the pod host open /host/pod/<podId>/attendance and mark the attendee', 'The attendee is marked present'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Create Pod Stepper',
    description: 'Host create-pod stepper in the customer app.',
    sub_flows: [
      {
        name: 'USER without HOST is refused by the server even with a direct call',
        description: 'createPartnerPod and publishPodDraft run assertActiveHost: no HOST role and no APPROVED host profile gives "Host access is required before creating pods", a deactivated host gives "Your host account has been deactivated". savePodDraft itself has no host check.',
        steps: [
          ['As a USER with no HOST role and no host profile call createPartnerPod with a complete virtual pod input', 'GraphQL error "Host access is required before creating pods" (FORBIDDEN); no pod is created'],
          ['As the same USER call savePodDraft with a draft input', 'The draft is saved (no host check on drafts)'],
          ['Call publishPodDraft on that draft', '"Host access is required before creating pods"; the draft stays a draft'],
          ['As a HOST whose host profile has is_active false call createPartnerPod', '"Your host account has been deactivated" (FORBIDDEN)'],
          ['As a user with an APPROVED host profile but no cached HOST role call createPartnerPod', 'The pod is created (approved profile is accepted as a fallback)'],
          ['Call createPartnerPod signed out', '"Not authenticated" (UNAUTHENTICATED); no pod is created'],
        ],
      },
    ],
  },
  {
    name: 'App: Partner Wallet & Withdrawals',
    description:
      'The partner wallet at /host/wallet (native Wallet), the "Withdrawal" option on every studio\'s Options page: balance and payout cycle, the Withdraw dialog (requestWithdrawal), the Download statement dialog (myWalletStatementFile) and the withdrawal and transaction lists. Every query and mutation reads the caller\'s own wallet only (no user argument).',
    sub_flows: [
      {
        name: 'Withdrawal allowed only to partner roles, own wallet',
        description: 'requestWithdrawal always debits the caller\'s own wallet atomically and refuses more than the balance; it does NOT refuse a plain USER - a user with no partner role is treated as a Host (resolveWithdrawerRole falls back to HOST) and can withdraw a positive balance.',
        steps: [
          ['As a HOST with a ₹500 balance open /host/wallet', '"Available balance" shows ₹500.00; "Withdraw" is enabled when can_withdraw is true'],
          ['Call requestWithdrawal with amount 0', '"Withdrawal amount must be greater than 0" (BAD_USER_INPUT)'],
          ['Call requestWithdrawal with UPI and no upi_id', '"Add the payout account details" (BAD_USER_INPUT)'],
          ['Call requestWithdrawal with amount 600', '"Insufficient wallet balance" (BAD_USER_INPUT); the balance is unchanged'],
          ['With a Host minimum of ₹1000 set and a ₹500 balance call requestWithdrawal', '"A Host can withdraw once the wallet balance reaches ₹1000. Available: ₹500."'],
          ['Request a valid withdrawal', 'The balance drops by the amount, a DEBIT "Withdrawal requested" transaction and a PENDING withdrawal for the caller appear; another partner\'s wallet is untouched'],
          ['As a plain USER with a positive wallet balance call requestWithdrawal', 'The request is accepted as a Host withdrawal (no role refusal exists)'],
        ],
      },
      {
        name: 'Download a wallet statement for a period',
        description: 'The "Download statement" dialog (shared WalletStatementDialog, React Hook Form + Zod) validates a custom range and downloads a PDF or CSV of the caller\'s own ledger from myWalletStatementFile.',
        steps: [
          ['On /host/wallet tap "Download statement"', 'Dialog "Download statement" with "Every earning, withdrawal and reversal in the period, with your opening and closing balance.", a "Period" select defaulting to "This month" and a "Format" select defaulting to PDF (CSV is the other option)'],
          ['Open "Period"', 'Options This month, Last month, Last 3 months, Last 6 months, This financial year, Last financial year and Custom range; a preset shows "<from> to <to>"'],
          ['Pick "Custom range" and tap "Download" with no dates', '"Choose both dates" under the date field and no request is sent'],
          ['Set To before From', '"The end date must be on or after the start date"'],
          ['Set a future To date, then a range over 366 days', '"A statement cannot include future dates", then "A statement can cover at most 366 days"'],
          ['Pick "Last month" and tap "Download"', 'The button reads "Preparing statement…", a file downloads and "Your statement is ready." shows'],
          ['Download a period with no transactions', '"No transactions in this period. Your statement shows the opening and closing balance only."'],
          ['Make the query fail', 'An error alert with the server message (or "We could not prepare your statement. Please try again.") and a "Try again" button'],
        ],
      },
    ],
  },
  {
    name: 'App: Club Admin In-App',
    description: 'Club Admin mode in the customer app.',
    sub_flows: [
      {
        name: 'Club admin cannot manage another club\'s pods',
        description: 'Club-admin reads and writes resolve scope through assertClubAdmin / assertClubAdminForPod, so a club the caller does not administer gives "You do not administer this club"; Regional Club Admin reads are gated separately by assertRegionClub / assertRegionPod with "Access Denied".',
        steps: [
          ['As CLUB_ADMIN of club A open /clubs/<club B id>/pods', 'clubAdminPodsTable(club_id: B) fails with "You do not administer this club" and no club B pods are listed'],
          ['Call clubAdminUpdatePod and clubAdminDeletePod for a club B pod', 'Both return "You do not administer this club" (FORBIDDEN); the pod is unchanged'],
          ['Call clubAdminUpdatePod on a club A pod with input.club_id set to club B', '"You do not administer this club"'],
          ['Call clubAdminForceAttendance for a club B pod', '"You do not administer this club"; nothing is marked'],
          ['Call clubAdminPodsTable with no club_id', 'Only pods of clubs whose admin_user_ids include the caller are returned'],
          ['As a REGIONAL_CLUB_ADMIN call regionClubPods for a club whose admin is outside their region', '"Access Denied" (FORBIDDEN)'],
          ['As a USER or HOST call clubAdminHostSearch', '"You do not administer this club"'],
        ],
      },
      {
        name: 'Edit club details from the app',
        description: 'Edit club (/clubs/:clubId/edit, native ClubEdit) mounts the shared @duncit/club-form editor without governance sections and saves through clubAdminUpdateClub; a half-filled FAQ is a validation error and admins, verified and active cannot be changed.',
        steps: [
          ['As CLUB_ADMIN open /clubs/manage and tap "Edit club" on a club row', '/clubs/<clubId>/edit shows eyebrow "Club Admin · Edit", the club name heading, "Back to pods" and sections Basic Information, Media & Moments, Venues & Community Links, Page Content and FAQs (no Club Admin section)'],
          ['Open "FAQs" and tap "Add FAQ", fill only "Question 1" and tap "Save"', '"Each FAQ needs both a question and an answer" and nothing is saved'],
          ['Clear the club name', 'The "Save" button is disabled'],
          ['Enter a WhatsApp community link without https', '"Enter a valid link (https://…)"'],
          ['Fill the answer, change the description and tap "Save"', 'Toast "Club details updated." and the app returns to /clubs/<clubId>/pods'],
          ['Open /clubs/<unknown id>/edit', '"Club not found."'],
          ['Open /clubs/<club B id>/edit as club A\'s admin and save', 'The public club loads, but saving shows "You do not administer this club" and nothing changes'],
        ],
      },
    ],
  },
  {
    name: 'App: Product Studio',
    description: 'Product Studio in the customer app.',
    sub_flows: [
      {
        name: 'Brand orders list, detail and ShipRocket shipment booking',
        description: 'Brand Orders (/products/orders, native BrandOrders) lists the partner\'s brands\' POD_SHOP orders from brandProductOrdersTable; the detail page books a SHIP order through brandBookProductOrderShipment and fetches label, invoice or manifest from brandProductOrderShipmentFile once an AWB exists.',
        steps: [
          ['As ECOMM_MANAGER with products on open Brand Options > "Brand Orders"', 'Header "Brand Orders", a search box "Search order no., buyer or AWB", a status filter and one card per own-brand order; no orders gives "No Pod Shop orders for your brands yet."'],
          ['Open a paid SHIP order not yet booked', '"Order details" with "Order #<no>", buyer, the Ship to address, Shipment "Not booked with ShipRocket yet." and actions "Book shipment" and "Fix address"'],
          ['Tap "Book shipment" with the brand\'s pickup registered in ShipRocket', 'Toast "Shipment booked with ShipRocket."; ShipRocket order ID, Shipment ID, AWB and Courier fill in and "Fix address" disappears'],
          ['Book when ShipRocket refuses (e.g. pickup not registered)', 'Toast and Shipment section "Booking stopped: <error>" and the button becomes "Retry booking"'],
          ['After the AWB exists open "Documents"', '"Print label", "Download label", "Print invoice", "Download invoice", "Print manifest" and "Download manifest" fetch the PDF; "Refresh tracking" updates the tracking status'],
          ['Open a PICKUP order', '"The buyer collects this order at a pickup point, so there is nothing to ship." with no booking action'],
          ['Call brandBookProductOrderShipment on an own PICKUP order', '"Only SHIP orders can create a shipment" (BAD_REQUEST)'],
          ['Call it on a cancelled own order', '"This order was cancelled" (BAD_USER_INPUT)'],
        ],
      },
      {
        name: 'Sync ShipRocket warehouses',
        description: 'ShipRocket Pickup Addresses (/products/warehouses) lists the picked brand\'s pickup addresses (myBrandPickupLocations) and "Sync with ShipRocket" runs syncMyBrandPickupLocations for that brand; a ShipRocket failure is shown, not swallowed.',
        steps: [
          ['Open Brand Options > "ShipRocket Pickup Addresses"', 'One row per pickup address with review chip (Awaiting approval, Approved, Rejected) and ShipRocket state (Registered with ShipRocket, Awaiting verification in ShipRocket, Not in ShipRocket); a "Brand" select appears with more than one brand'],
          ['Tap "Sync with ShipRocket"', 'The button reads "Syncing with ShipRocket…", then "Synced with ShipRocket." and, when pickups were adopted, "<n> pickup addresses taken in from your ShipRocket account." with the list updated'],
          ['Sync while the brand\'s ShipRocket account cannot be read', 'Error alert "ShipRocket could not be read: <error>"'],
          ['Call syncMyBrandPickupLocations(brand_doc_id: <another partner\'s brand>)', '"Brand not found" (NOT_FOUND); nothing is synced'],
          ['Open the page as an account with no brands', '"You have no brands yet. Create one in the Partner app."'],
          ['Tap "Add / edit in Partner app"', 'The Partner app opens /ecomm-brand/warehouses'],
        ],
      },
      {
        name: 'Brand cannot read or ship another brand\'s order',
        description: 'brandProductOrderService scopes every order call to POD_SHOP orders whose line items belong to the caller\'s brands and answers NOT_FOUND "Order not found" otherwise, so ids cannot be probed and no buyer address leaks.',
        steps: [
          ['As ECOMM_MANAGER of brand B call brandProductOrder(id: <brand A order>)', 'GraphQL error "Order not found" (NOT_FOUND); no buyer name or shipping address is returned'],
          ['Open /products/orders/<brand A order id> in the app', 'An error alert "Order not found" with "Try again"'],
          ['Call brandBookProductOrderShipment, brandRefreshProductOrderTracking and brandUpdateProductOrderAddress on brand A\'s order', 'Each returns "Order not found"; nothing is booked with ShipRocket and the address is unchanged'],
          ['Call brandProductOrderShipmentFile with one own and one brand A order id', '"Order not found"; no PDF is produced'],
          ['As a USER with no brands call brandProductOrdersTable', 'An empty table'],
          ['Turn is_product_visible off and open /products/orders', 'The app redirects to /'],
        ],
      },
    ],
  },
  {
    name: 'App: Sign Up',
    description: 'Creating a Duncit account on mWeb and native.',
    sub_flows: [
      {
        name: 'Sign up and sign in with Apple',
        description:
          'The Apple door mirrors Google: signupWithApple creates the account only after the policy dialog, a WhatsApp number, the age tick (date of birth optional) and the WhatsApp code; loginWithApple signs in an already-linked account. The Apple button renders only once Tech holds a Services ID and Return URL.',
        steps: [
          ['Clear the Apple Services ID or Return URL in the Tech portal and open /register', 'No Apple button is drawn at all (the round row shows Google only)'],
          ['Restore the Apple keys, open /register and press the round Apple button (accessible name "Sign up with Apple", caption "Apple") with an Apple ID Duncit has never seen', 'While the id_token is spent the button reads "Connecting to Apple…", then the "Policies you need to accept" dialog opens'],
          ['Press "Accept all"', 'The step "A few details" shows "Apple doesn’t share your WhatsApp number, so tell us here — your sign-up code goes to that number. Confirm your age too; your date of birth is optional." with WhatsApp number, "This is also my mobile number", Date of birth (optional), "I confirm I’m 18 or older" and "Send code"'],
          ['Enter an unused WhatsApp number, tick "I confirm I’m 18 or older", tap "Send code", type the test code and tap "Verify number"', 'signupWithApple creates the account with the Apple email verified and apple_id linked, and the app lands on /signup-referral'],
          ['Close the Apple popup without choosing an Apple ID', 'Nothing is shown — a cancel is silent; any other Apple failure shows "Apple sign-in failed. Please try again."'],
          ['Press the Apple button on /register with an Apple ID that already has a Duncit account', 'The dialog "You’re already on Duncit" says "<email> already has a Duncit account. Shall we log you in instead?" with "Log me in" and "Cancel"'],
          ['Sign out, open /login and press the Apple button ("Sign in with Apple") with the linked Apple ID', 'loginWithApple returns a session, the app opens Home and last_login_provider is APPLE'],
          ['On /login use an Apple ID that is linked to nobody and whose email holds no account', 'Server answers "User is not in our system. Please sign up first." (APPLE_ACCOUNT_NOT_FOUND) and the "No Duncit account yet" dialog shows "We will carry this Apple sign-in into the next steps — you only need to add your WhatsApp number and confirm your age. Nothing is created until you finish."'],
        ],
      },
    ],
  },
  {
    name: 'App: Sign In',
    description: 'Signing in to the customer app on mWeb and native.',
    sub_flows: [
      {
        name: 'Link Apple to an existing email account',
        description:
          'An Apple ID whose verified email matches an email/password account gets EMAIL_LOGIN_REQUIRED and a consent dialog; "Allow and continue" calls linkAppleAccount so both doors open the same account. Actual behaviour differs from the premise: an Apple ID already linked to some account is not refused — linkAppleAccount signs in to that linked account; only an account already holding a DIFFERENT Apple ID is refused.',
        steps: [
          ['On /login press the Apple button with an Apple ID whose email equals an existing email/password account', 'Server answers "Please login with email. You registered using email and password." (EMAIL_LOGIN_REQUIRED) and the dialog "Also sign in with Apple?" asks "You registered <email> with an email and password. Allow Apple to sign you in to this same account?"'],
          ['Press "Not now"', 'The dialog closes with "Apple was not connected. Sign in with your email and password, or try Apple again to allow it." and the account is unchanged'],
          ['Repeat and press "Allow and continue"', 'linkAppleAccount stores apple_id, apple_email and apple_linked_at, marks the email verified and the app opens Home'],
          ['Sign out and sign in with the email and password', 'Password sign-in still succeeds into the same account'],
          ['Sign out and use the Apple button again', 'loginWithApple signs straight in to the same account with no consent dialog'],
          ['Call linkAppleAccount with a second Apple ID whose verified email is that same account', 'CONFLICT "This account is already linked to a different Apple ID."'],
          ['Call linkAppleAccount with an Apple ID already linked to another account', 'No error: it is treated as a plain login and returns a session for the account that already holds that Apple ID'],
          ['Open Manage Account > Connected accounts', 'Only "Email and password" and "Google" rows exist — there is no Apple row to connect or disconnect from the profile'],
        ],
      },
    ],
  },
  {
    name: 'App: Follow & public profiles',
    description: 'Public profiles and following on mWeb and native.',
    sub_flows: [
      {
        name: 'Block and unblock a profile',
        description:
          'blockUser cuts every follow edge and open follow request between the two both ways and hides each one\'s posts, stories and comments from the other in every feed at once; unblockUser lifts the block but does not restore the follows. The blocker gets a confirmation, Legal is alerted to review the account, and the blocked member is never told.',
        steps: [
          ['As USER A who follows and is followed by USER B, open /u/<B handle> and tap the 3-dot "Profile options" button', 'The menu shows "Block" (in red) and "Report profile"; the button is absent on your own profile'],
          ['Tap "Block"', 'A confirm "Block <name>?" says "They will not be able to follow you or see your posts and stories, and you will not see theirs. Any follow between you is removed. They will not be told."'],
          ['Confirm with "Block"', 'Toast "<name> is blocked"; the profile shows "You blocked this account. Their posts and stories are hidden from you, and they cannot see yours." and the follow buttons disappear; both follow edges are gone'],
          ['Go back to the Following feed, the story rail and a club story rail without refreshing', 'None of B\'s posts or stories show, B\'s comments are gone from every post, and a link to one of B\'s posts opens as not found'],
          ['Check the Legal desk', 'Legal managers get the "A member blocked an account" email and the Slack legal channel a message naming both account ids'],
          ['As USER B open /u/<A handle> and tap Follow', 'Server refuses "You cannot follow this account" (FORBIDDEN) and A\'s posts are hidden'],
          ['Call blockUser with your own user id, then with a malformed id', '"You cannot block yourself" and "Invalid user" (BAD_USER_INPUT)'],
          ['As A open the menu again and tap "Unblock", then confirm', 'The confirm reads "Unblock <name>?" / "They will be able to see your public posts and follow you again. Follows removed by the block do not come back." and the toast reads "<name> is unblocked"'],
          ['Look at both profiles after unblocking', 'Posts are visible again but neither follows the other; Legal > UGC Monitoring > Blocked accounts keeps the row as "Unblocked"'],
        ],
      },
    ],
  },
  {
    name: 'App: Report Content',
    description: 'Reporting user-generated content to the Legal team.',
    sub_flows: [
      {
        name: 'Report a profile',
        description:
          'reportProfile files a PROFILE report against the reason categories managed in Legal > UGC Monitoring > Settings; a category that requires details (e.g. "Something else") refuses an empty description, and a repeat report updates the same row.',
        steps: [
          ['Open /u/<other member handle>, tap "Profile options" and choose "Report profile"', 'The "Report this profile" dialog shows "Tell us what is wrong with it. Our Legal team reviews every report.", the categories from Legal settings, "Anything else we should know?", "Cancel" and "Submit report"'],
          ['Tap "Submit report" without picking a reason', '"Pick a reason first" shows'],
          ['Pick "Something else", leave the details empty and submit', '"Tell us what is wrong with this content" shows (the server refuses the same)'],
          ['Pick a reason and submit', 'Toast "Thanks — our Legal team will review this. Your reference is <ref>." and an acknowledgement is sent to the reporter'],
          ['Open Legal > UGC Monitoring > Reported content', 'A row with target Profile, the reason and status Received is listed'],
          ['Report the same profile again with another reason', 'The existing report is updated with the same reference, not a second row'],
          ['Call reportProfile with your own user_id', '"You cannot report your own content" (BAD_USER_INPUT)'],
        ],
      },
    ],
  },
  {
    name: 'App: Privacy and Tracking Consent',
    description:
      'Profile Settings > Privacy & data (/account/privacy, native PrivacyScreen): the optional tracking choices (Analytics, Marketing attribution) recorded on the device and on the server through setMyTrackingConsent, and "Download my data" — the GDPR export built by myDataExport from records where the member is the subject, with credentials stripped.',
    sub_flows: [
      {
        name: 'Download my data export',
        description:
          'myDataExport returns a JSON of the caller\'s own account and subject records (secret-like keys dropped), saved as duncit-my-data-<date>.json; a failure shows an error toast and is logged.',
        steps: [
          ['Open Manage Account and tap the "Privacy & data" row ("Tracking choices and a copy of your data")', '/account/privacy shows "Privacy & data" with the "Tracking choices" and "Your data" cards'],
          ['Read the "Your data" card', '"Download a copy of everything Duncit holds about you, as a JSON file.", a "Download my data" button and "To delete your account and its data, use Delete account under Security."'],
          ['Tap "Download my data"', 'The button reads "Preparing your file…", then a file duncit-my-data-<yyyy-mm-dd>.json downloads and a toast says "Your data file is ready" (native opens the share sheet)'],
          ['Open the file', 'It has generated_at, account and records grouped by collection and field; no password, hash, secret, token or salt keys appear'],
          ['Check the records for another member who commented on your post', 'Only records where you are the subject (user_id, author_id, buyer_id …) are present — nobody else\'s profile data'],
          ['Make the myDataExport request fail (offline) and tap again', 'Toast "Could not prepare your file. Please try again." and an mWeb error log entry "privacy / DataExportCard"'],
          ['Call myDataExport without a session', 'The server refuses with an authentication error'],
        ],
      },
      {
        name: 'Change tracking consent choices',
        description:
          'The switches save on this device at once, clear storage of a withdrawn category and are recorded on the server (setMyTrackingConsent, surface MWEB) for a signed-in member. Actual behaviour: no analytics scripts are loaded or reloaded — consent gates the in-app clickstream tracking and active ping immediately, and the choice travels on every GraphQL request header.',
        steps: [
          ['Open /account/privacy', '"Tracking choices" says "Optional. Both stay off unless you turn them on." with "Essential · Always on" (disabled), "Analytics" and "Marketing attribution"'],
          ['Turn "Analytics" on', 'Toast "Privacy choices saved"; myTrackingConsent on the server now reads analytics true with a new decided_at'],
          ['Navigate a few pages', 'Clickstream and active-ping events are now sent (they were not while Analytics was off)'],
          ['Turn "Analytics" off again', 'Toast "Privacy choices saved"; analytics storage keys are cleared from this device and tracking stops without a reload'],
          ['Sign in on a fresh browser that has never answered the banner', 'The server\'s saved choice is adopted and the switches match it instead of asking again'],
          ['Call setMyTrackingConsent while signed out', 'The server refuses with an authentication error'],
        ],
      },
    ],
  },
  {
    name: 'App: Error Boundaries',
    description:
      'The shared DuncitErrorBoundary (@duncit/ui on mWeb, Tamagui twin per screen on native via screenLayout): a render crash is contained to the page, offers Retry and Report an issue, logs a scrubbed crash report and is listed in Tech > Error Boundaries.',
    sub_flows: [
      {
        name: 'A failing page shows Duncit Error Boundary with Retry and Report an Issue',
        description:
          'A thrown render error is contained to the routed page (header and bottom navigation keep working); Retry re-renders the page; Report an issue writes a REPORTED log row and, when signed in, files an app feedback; Tech > Error Boundaries lists both events without sensitive data.',
        steps: [
          ['With a fault-injection build, open a page that throws during render', 'The page area shows "Something went wrong" / "This part of Duncit ran into a problem. Try again, or tell us about it so we can fix it." with "Retry", "Report an issue" and "Reference: <id>"'],
          ['Use the header and bottom navigation', 'They still work; navigating to another page clears the crash because the page boundary remounts per path'],
          ['Tap "Retry" after removing the fault', 'Only the page re-renders (the root boundary reloads the whole document instead)'],
          ['Tap "Report an issue" while signed in', 'Button reads "Sending report…", then "Thanks — the report reached our team."; a submitAppFeedback issue report with the crash reference is filed'],
          ['Tap "Report an issue" again on the same crash', 'No second REPORTED log row is written for that reference'],
          ['Repeat while signed out', 'Only the REPORTED log row is written (no feedback mutation)'],
          ['Open Tech > Error Boundaries and search the reference', 'Rows with Event "Crash" and "Reported", Boundary "Page / screen", the surface and route; tokens and personal data are scrubbed'],
          ['Native: make a screen throw', 'The same fallback renders inside that screen only and the tab bar still works'],
        ],
      },
    ],
  },
  {
    name: 'App: Cart',
    description: 'The product cart on mWeb and native.',
    sub_flows: [
      {
        name: 'Wishlist tab: save and move products',
        description:
          'A cart line moved to the Wishlist tab is saved on this device without its quantity; "Move to cart" puts one unit back (never past the product\'s max quantity) and removes it from the wishlist.',
        steps: [
          ['Open /cart with a product line and tap "Move to wishlist" on it', 'The line leaves the "Cart" tab and appears under the "Wishlist" tab with its image, name — variant, pod title and "<price> each"'],
          ['Open the "Wishlist" tab', 'Each saved product shows "Move to cart" and a remove button named "Remove <name> from wishlist"'],
          ['Tap "Move to cart"', 'The product returns to the cart with quantity 1 and leaves the wishlist'],
          ['Move a product that is already in the cart at its max quantity back from the wishlist', 'The cart quantity stays at the product\'s max quantity'],
          ['Tap the remove button on a wishlist item', 'It disappears; with nothing left "Your wishlist is empty" shows with "Explore Pod Shop" opening /shop'],
          ['Reload the app', 'The wishlist is unchanged (kept on the device, like the cart); native shows the same tab'],
        ],
      },
      {
        name: 'Cart reminder nudge and reminder email',
        description:
          'The signed-in cart is mirrored to the server (syncMyProductCart); the reminder sweep (every 15 minutes) mails "Your cart is calling" once the first delay from Products > Cart Settings has passed, repeating up to the configured max count; the in-app nudge appears after its own delay; emptying the cart (checkout or Clear cart) deletes the mirror and stops the reminders. Actual behaviour: more than one email can be sent (email_max_count).',
        steps: [
          ['As a USER add a product to the cart and stay on a non-cart page past the nudge delay', 'The nudge "Your cart is calling" says "1 item is waiting for you. Check out before it sells out." with "Checkout now", "Remind me next time" and "Don\'t remind me again"'],
          ['Tap "Checkout now"', 'The nudge hides and /cart opens; the nudge never shows on the cart or checkout routes'],
          ['Tap "Remind me next time", then reload', 'No nudge for the rest of this browser session'],
          ['Tap "Don\'t remind me again"', 'The nudge is muted on this device'],
          ['Leave the cart unchanged past email_first_delay_hours and let the sweep run', 'One "Your cart is calling" email (template product-cart-reminder) listing "<product> × <qty>" and a link to /cart is sent; mails_sent becomes 1'],
          ['Let further sweeps run', 'Further emails follow every email_repeat_hours until email_max_count; a changed cart restarts the schedule'],
          ['Pay for the cart (or tap "Clear cart")', 'The empty cart syncs, the server mirror is deleted and no further reminder is sent'],
          ['Switch email reminders off in Cart Settings, or turn products off', 'The sweep sends nothing'],
        ],
      },
    ],
  },
  {
    name: 'App: Orders & shipment tracking',
    description: 'Product orders, their detail page and returns on mWeb and native.',
    sub_flows: [
      {
        name: 'Request and withdraw a return on a delivered pod-shop order',
        description:
          'Within a line\'s return window a delivered (or picked-up) pod-shop order offers "Return items"; requestPodShopReturn creates one return per brand, cancelMyPodShopReturn withdraws a REQUESTED one, and the Returns section shows each return\'s status. This contradicts the existing "Cancelled, returned or failed order" step that says no return action is offered.',
        steps: [
          ['Open /orders/<orderId> for a delivered pod-shop order with items from two brands', 'The Returns section shows "Return items" and "Return by <date>"'],
          ['Tap "Return items"', 'The dialog says "Order #<orderNo> — pick what you are sending back." with "Items to return" ("<qty> of <max>"), "Why are you returning it?" and "Request return"'],
          ['Submit with no item or no reason', '"Pick at least one item to return" or "Pick a reason"'],
          ['Pick one unit from each brand, reason "Arrived damaged or defective", and submit', 'Toast "Return requested. We will let you know once the brand reviews it." and two rows "Return #<returnNo>" with status "Requested" (one per brand)'],
          ['Call requestPodShopReturn for more units than remain returnable', '"The return window for this item has closed, or it is already being returned"'],
          ['Tap "Cancel return" on one, then "Keep return"', 'The confirm "Cancel this return?" closes and nothing changes'],
          ['Tap "Cancel return" and confirm', 'Toast "Return cancelled"; the row reads "Cancelled" and that item becomes returnable again'],
          ['Call cancelMyPodShopReturn on a return the brand already approved, or on another buyer\'s return', '"This return is already being processed — contact support to stop it" or NOT_FOUND "Return not found"'],
        ],
      },
      {
        name: 'Order detail timeline, shipment card and downloads',
        description:
          'The order detail page renders the summary, tracking timeline, Shipment, Items, Returns and Invoices cards; the buyer can download Duncit\'s invoice and (once booked) the seller\'s tax invoice — no shipping label is offered; another member\'s order id resolves to null and shows the not-found state.',
        steps: [
          ['From /orders tap "View details" on a shipped order', '/orders/<orderId> titled "Order details" shows "Order #<orderNo>", the status chip and "Placed on <date> · <fulfilment>"'],
          ['Read the "Tracking" timeline', 'Each step is marked "Completed", "Current status" or "Upcoming"'],
          ['Read the "Shipment" card', 'Courier, "Tracking number (AWB)", "Estimated delivery", "Courier status", "Copy tracking number" and "Track shipment"; before booking it says "Courier details appear here once the seller books your shipment."'],
          ['Tap "Copy tracking number"', 'Toast "Tracking number copied"'],
          ['In "Invoices" tap "Download invoice"', 'invoice-<orderNo>.pdf downloads'],
          ['Tap "Download seller invoice" on a booked SHIP order', 'The seller\'s tax invoice downloads as seller-<filename>; before booking the card says "The seller’s tax invoice becomes available once your order is booked with the courier."'],
          ['Make a download fail', 'Toast "We could not download this document. Please try again."'],
          ['Open /orders/<another member\'s orderId>', '"We could not find this order" with "It may belong to another account, or the link may be out of date." and "Back to my orders"'],
        ],
      },
    ],
  },
  {
    name: 'App: Product checkout & payment',
    description: 'The combined product checkout on mWeb and native.',
    sub_flows: [
      {
        name: 'Delivery-charge pay gate and round-off',
        description:
          'The pay button stays disabled until the live delivery quote for the cart and the pincode on screen is READY; the submit handler applies the same rule. The bill is rounded up to the whole rupee (roundUpBill, server twin payment.roundoff.ts) and the round-off is shown as its own line.',
        steps: [
          ['Open /product-checkout with SHIP products and no pincode', 'The pay button is disabled and the notice reads "Add a delivery address with a valid pincode to see the delivery charge."'],
          ['Enter a valid pincode', 'While the quote loads the notice reads "Calculating the delivery charge…" and pay stays disabled'],
          ['Let the quote resolve', 'Delivery rows and the total include delivery and the pay button enables'],
          ['Edit the pincode after the quote resolved', 'Pay disables again until the quote for the new pincode arrives — never paid against the previous charge'],
          ['Make productShippingQuote fail', '"We could not calculate the delivery charge. Please try again before you pay." with "Try again", which re-asks'],
          ['Check a bill with paise (e.g. ₹359.10)', 'A "Round off" line adds ₹0.90 and the pay button shows ₹360; the server charges the same whole-rupee amount'],
          ['Apply coins that cover the full rounded bill', 'Payable becomes ₹0 and the round-off line is not shown'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod History & Tickets',
    description: 'Joined pods, bookings and tickets on mWeb and native.',
    sub_flows: [
      {
        name: 'A member cannot open another member\'s booking, ticket or backout',
        description:
          'Ownership is enforced server-side: bookingDetail refuses a foreign booking id, eventTicketPdfBase64 refuses a foreign ticket, cancelBackoutPod refuses a foreign backout id, and Pod History detail only finds the caller\'s own memberships — no ticket QR or invoice is returned.',
        steps: [
          ['As USER B open /booking/<USER A booking id>', 'An error alert shows "You are not authorized to view this booking." (bookingDetail, FORBIDDEN) and no pod or ticket is shown'],
          ['Open /booking/<unknown id>', '"Booking not found"'],
          ['Open /pod-history/<USER A membership id>', '"Pod history record not found." with a "Back to pod history" button — myPodMemberships only lists B\'s own'],
          ['Call eventTicketPdfBase64 with A\'s ticket_doc_id as B', 'FORBIDDEN "Not your ticket"; no PDF is returned'],
          ['Call cancelBackoutPod with A\'s pod and A\'s backout_id as B', 'NOT_FOUND "That backout is not yours" and A\'s backout is untouched'],
          ['Sign in as A and open the same links', 'Booking, ticket and backout all open normally'],
        ],
      },
    ],
  },
  {
    name: 'App: Clubs and Venues Directory',
    description:
      'The customer-app directories: the Clubs list (/clubs, native Clubs tab) grouped by city then locality, the Venues list (/venues, native VenuesScreen) for the header\'s selected location, and a club\'s page (/club/:clubSlug) with its hero, locality chip, stories, members, rating, meetup venues and tabbed segments.',
    sub_flows: [
      {
        name: 'Club details page',
        description:
          'The club page shows the hero with follow/save/share, the summary with the locality chip, the Stories rail (an add tile only for the club\'s admins), members, rating, meetup venues and segments starting on "Pods Schedule"; an unknown slug shows "Club not found."',
        steps: [
          ['Open /club/<clubSlug> for a club with upcoming pods', 'The hero, the summary header with the locality chip, "Stories", members, rating, meetup venues and segment chips ("Pods Schedule" selected; "Club Moments", "Who We Are", "What We Do", "Perks", "Values", "FAQs", "Club Hosts", "Club Admins" only when they have content)'],
          ['Tap an upcoming pod in "Pods Schedule"', '/club/<clubSlug>/pod/<podSlug> opens'],
          ['Tap follow in the hero', 'A toast "Following <club name>" (then "Unfollowed <club name>" on the second tap)'],
          ['Open the page as one of the club\'s admins', 'The Stories rail starts with an add tile named "Add a story to this club"; for other members it is absent'],
          ['Open /club/<unknown-slug>', 'A warning "Club not found."'],
          ['Open a club in another city than the header', 'The location mismatch dialog opens with the club intro sentence'],
          ['Open /club/<clubSlug> while signed out', 'The app redirects to /login?redirect=… and returns after sign-in'],
        ],
      },
      {
        name: 'Clubs list and Venues list',
        description:
          'Clubs are grouped by city cards and, inside a city, by locality sections; the Venues list shows each venue\'s cover and gallery photos and is scoped to the header\'s selected location.',
        steps: [
          ['Clear the header location and open /clubs', 'City cards show each city with "<n> clubs"'],
          ['Open a city card', 'The city heading with "All cities", then one section per locality ("Other areas" for clubs without one), each card with "<n> pods" and "Open Club"'],
          ['Pick a city and locality in the header and reopen /clubs', 'Only that location\'s clubs, grouped by locality'],
          ['Pick a locality with no clubs', '"No Clubs operating at the selected location," with "Reset Location" that opens the location picker'],
          ['Search "zzz" in "Search clubs"', '"No clubs found."'],
          ['Open /venues with a city selected', 'Only venues of that location are listed (publicVenues location_id), each card with the cover then gallery photos and previous/next image buttons'],
          ['Type in "Search venues by name, type or area"', 'The list re-queries the server after a short pause'],
          ['Search something that matches nothing', '"No venues found here yet — try another search or category."'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Discovery - Location',
    description: 'Choosing the browsing location and the location-mismatch dialog.',
    sub_flows: [
      {
        name: 'Location mismatch on a public venue link',
        description:
          'Opening /venue/:venueId of a venue in another city than the header shows the location-mismatch dialog with the venue intro; Switch applies the venue\'s city and locality to the header.',
        steps: [
          ['With Mumbai selected open a shared /venue/<id> link of a venue in Pune', 'The venue page loads and "This link is for a different location" opens'],
          ['Read the dialog', '"The venue you are opening is in <Pune, locality>, but your Duncit location is currently set to <Mumbai…>." with "Your current location" and "Location of this link"'],
          ['Tap "Switch to Pune"', 'The header changes to Pune and the venue\'s locality, the choice persists and the dialog does not return'],
          ['Reopen the link with Mumbai and tap "Continue in Mumbai"', 'The dialog closes, the header stays Mumbai and does not ask again on this page'],
          ['Open a venue link of the same city', 'No dialog opens'],
        ],
      },
    ],
  },
  {
    name: 'App: Route Guards',
    description:
      'mWeb route protection in app/mweb/src/app/AppRoutes: withAuth (RequireAuth) sends a signed-out visitor to /login?redirect=<path> before the page renders; withProducts adds the is_product_visible flag; redirectIfAuthed (RedirectIfAuthed) keeps a signed-in member off /login, /register and /forgot-password. A handful of public routes render without a session.',
    sub_flows: [
      {
        name: 'Signed-out GUEST on every withAuth route is sent to sign-in and back',
        description:
          'Table-driven over AppRoutes: each withAuth/withProducts path redirects to /login?redirect=<encoded path> without rendering the page (so no page query runs), and opens after sign-in; the public exceptions render without a session.',
        steps: [
          ['Signed out, open each withAuth path (e.g. /, /menu, /profile, /account, /clubs, /venues, /club/<slug>, /u/<handle>, /booking/<id>, /pod-history, /support/tickets, /tickets/<id>, /live-chat, /account/privacy, /venues/manage, /host/auto-pods, /clubs/manage)', 'Each lands on /login?redirect=<encoded path> and the network shows no data query for that page'],
          ['Signed out, open each withProducts path (/cart, /shop, /product-checkout, /orders, /orders/<id>, /product/<id>)', 'Each also lands on /login?redirect=<encoded path>'],
          ['Sign in from one of those redirects', 'The app opens the original path (after /signup-survey when the survey is unfinished)'],
          ['Signed in with is_product_visible off, open /cart', 'The app sends the member to / instead of a 404'],
          ['Signed out, open the public routes /venue/<id>, /venue/<id>/food-order/<orderId>, /hosts/<handle>, /city-launch/<locationId>, /pod/<podId>/challenges/<challengeId>/live and /unsubscribe', 'Each renders without a session'],
          ['Signed out, open /tickets and /support/chat', 'They forward to /support/live, which then redirects to /login?redirect=%2Fsupport%2Flive'],
          ['Open an unknown path signed out', 'The Not Found page renders (no redirect)'],
        ],
      },
      {
        name: 'Signed-in USER on /login, /register, /forgot-password',
        description:
          'RedirectIfAuthed sends a signed-in member away from all three auth pages: to a safe ?redirect path when given, otherwise to /.',
        steps: [
          ['Signed in, open /login', 'The app replaces the URL with / (Home)'],
          ['Signed in, open /register', 'The app replaces the URL with /'],
          ['Signed in, open /forgot-password', 'The app replaces the URL with /'],
          ['Signed in, open /login?redirect=%2Fsupport', 'The app opens /support'],
          ['Signed in, open /login?redirect=//evil.example', 'The unsafe redirect is ignored and / opens'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Studio',
    description: 'Venue Studio and its pages for a VENUE_OWNER.',
    sub_flows: [
      {
        name: 'Owner cannot edit availability, settings or Auto Pods of another venue',
        description:
          'Every venue write checks ownership on the server; the messages differ per module (there is no single "You do not own this venue" guard): slots use ensureOwnedVenue / slot owner checks, settings use "Not your venue", and Auto Pod accept reuses ensureOwnedVenue. The venue switcher only lists the caller\'s own venues.',
        steps: [
          ['As VENUE_OWNER A open /venues/availability and the "Switch your venue" list', 'Only A\'s venues are offered'],
          ['Call venueSlots with venue B\'s venue_id', 'FORBIDDEN "Only the venue owner can view all slots"'],
          ['Call createVenueSlots with venue_id of venue B', 'NOT_FOUND "Venue not found or not yours"; no slot is created'],
          ['Call updateVenueSlot (block: true) and deleteVenueSlot with a slot_id of venue B', 'Each returns FORBIDDEN "Not your slot" and B\'s slot is unchanged'],
          ['Call updateVenueSettings with venue B\'s venue_doc_id and new cancellation tiers', 'FORBIDDEN "Not your venue"; B\'s cancellation policy is unchanged'],
          ['Call venueAcceptAutoPod with venue B\'s venue_id', 'NOT_FOUND "Venue not found or not yours"; the offer stays open'],
          ['Call venueAcceptAutoPod with A\'s venue but a slot of venue B', 'FORBIDDEN "That slot does not belong to this venue"'],
          ['Sign in as a HOST without VENUE_OWNER and open the menu', 'Switch role does not offer "Venue Studio"; the same calls return the same refusals'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Auto Pods',
    description: 'Host Studio > Auto Pods.',
    sub_flows: [
      {
        name: 'USER or VENUE_OWNER without HOST cannot claim a host Auto Pod',
        description:
          'Switch role offers Host Studio only to HOST; hostAutoPods lists nothing to a member with no approved host categories; hostAssignAutoPod refuses a caller who is not an active host ("Host access is required before creating pods") after the offer-state checks.',
        steps: [
          ['As a USER (or VENUE_OWNER) without HOST open the menu and "Switch role"', '"Host Studio" is not offered'],
          ['Open /host/auto-pods directly', 'The page shows no offers ("You are not an approved host in any category yet.")'],
          ['Call hostAssignAutoPod as that USER on a physical offer a venue already accepted', 'FORBIDDEN "Host access is required before creating pods"; host_claim stays empty'],
          ['Call it as a host whose host account is deactivated', 'FORBIDDEN "Your host account has been deactivated"'],
          ['Call it as the USER on an offer no venue has accepted', 'CONFLICT "A venue has to accept this Auto Pod before a host can take it." (offer order is checked first)'],
        ],
      },
    ],
  },
  {
    name: 'App: Club Admin In-App',
    description: 'Club Admin mode in the customer app.',
    sub_flows: [
      {
        name: 'USER without CLUB_ADMIN on /clubs/* routes',
        description:
          'Switch role offers Club Admin only to CLUB_ADMIN; the club pages render their empty or error states for a member who administers no club, and every club-scoped query or mutation is refused server-side with "You do not administer this club".',
        steps: [
          ['As a USER (or HOST) open the menu and "Switch role"', '"Club Admin" is not offered'],
          ['Open /clubs/manage', '"No clubs are assigned to you yet." and no pods'],
          ['Open /clubs/dashboard', 'Zero figures and "No clubs are assigned to you yet." in the breakdown'],
          ['Open /clubs/monitoring', 'An error "Access Denied" (clubAdminPodAuditLogsTable requires CLUB_ADMIN)'],
          ['Open /clubs/auto-pods', 'No offers are listed (clubAdminAutoPods returns an empty queue)'],
          ['Call myClubPods with club A\'s id, clubAdminCreatePod with club_id A and clubAdminDeletePod on a pod of club A', 'Each returns FORBIDDEN "You do not administer this club"; nothing is created or cancelled'],
          ['Call clubClaimAutoPod with club A', 'FORBIDDEN "You do not administer this club"'],
        ],
      },
    ],
  },
  {
    name: 'App: Support Tickets',
    description: 'Support tickets and live chat in the customer app.',
    sub_flows: [
      {
        name: 'A member cannot open another member\'s ticket or chat',
        description:
          'ticket(id) returns null to anyone but the owner or a support agent, so the page shows the not-found text; reply, resolve, reopen, read, feedback and transcript calls are refused; support chat sessions are scoped the same way and no message bodies leak.',
        steps: [
          ['As USER B open /tickets/<USER A ticket id>', '"This ticket could not be found." and no messages'],
          ['Call replyToTicket on A\'s ticket as B', 'FORBIDDEN "Cannot reply to another user’s ticket"'],
          ['Call resolveTicket and reopenTicket on A\'s ticket as B', 'FORBIDDEN "Cannot resolve another user’s ticket" / "Cannot reopen another user’s ticket"'],
          ['Call markTicketRead and submitTicketFeedback on A\'s ticket as B', 'FORBIDDEN "Cannot read another user’s ticket" / "Not your ticket"'],
          ['Call ticketTranscript and emailTicketTranscript for A\'s ticket as B', 'NOT_FOUND "Ticket not found"; no transcript is produced or emailed'],
          ['Call supportChatMessages with A\'s chat session_id as B', 'An empty list — no message bodies'],
          ['Call sendSupportChatMessage, resolveSupportChat and supportChatTranscript with A\'s session_id as B', '"Cannot post to another user’s chat" (FORBIDDEN) and "Chat session not found" (NOT_FOUND)'],
          ['Open /live-chat as B', 'Only B\'s own chat (mySupportChat) is loaded'],
        ],
      },
    ],
  },
  {
    name: 'App: Posts',
    description: 'Photo posts on mWeb and native.',
    sub_flows: [
      {
        name: 'A member cannot delete another member\'s post, story or comment',
        description:
          'The delete controls are drawn only for the author (and, for comments, the post author; for club stories, the club\'s admins); a direct deletePost or deletePostComment by anyone else returns FORBIDDEN "Not allowed" and the content stays.',
        steps: [
          ['As USER B open USER A\'s post', 'The menu offers "Report post" — no "Delete post"'],
          ['Open A\'s story', 'The story menu offers "Report story" — no "Delete story"'],
          ['Look at A\'s comment on a post by a third member', 'No delete icon is shown on it'],
          ['Call deletePost with A\'s post_doc_id (post or story) as B', 'FORBIDDEN "Not allowed"; the post is still listed on A\'s profile'],
          ['Call deletePostComment with A\'s comment on a third member\'s post as B', 'FORBIDDEN "Not allowed"; the comment remains'],
          ['As the author of the post, delete B\'s comment on it', 'It succeeds — the post author may remove any comment on their post'],
          ['Call deletePost with an expired story id', 'NOT_FOUND "Post not found"'],
        ],
      },
    ],
  },
];

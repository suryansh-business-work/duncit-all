import type { CatalogueFlow } from './catalogue.types';

/** Customer-app partner studios and account utilities (mWeb + native app): Venue Studio and its pages, Product Studio, Pod Plans, the legacy /bouncers link, Tour Guide, Saved Items and Verification. */
export const APP_STUDIO_FLOWS: readonly CatalogueFlow[] = [
  {
    name: 'App: Venue Studio',
    description:
      'Venue Studio at /venues/manage (native VenueManage), reached by switching role to Venue Studio (VENUE_OWNER). One venue at a time via the switcher: stat tiles, Slot earnings, quick actions, the earnings card, pods booked at the venue with detail/cancel/Request Change Venue, Change Requests, health and the application.',
    sub_flows: [
      {
        name: 'Open Venue Studio as a venue owner',
        description: 'Switching role lands on the studio; everything below the switcher belongs to the selected venue.',
        steps: [
          ['Sign in as a VENUE_OWNER with two venues, open the menu and switch role to "Venue Studio"', 'The app lands on /venues/manage (or /venues/auto-pods when an Auto Pod is waiting) and the drawer shows "Venue Menu" with Venue Studio, Workshop & Event Requests, Venue Earnings, Venue Pricing Module, Venue Settings and Withdrawal'],
          ['Look at the header', 'Title "Venue Studio" with a "New venue" button that opens /register-venue (mWeb forwards to partners-app.duncit.com/register-venue)'],
          ['Open "Switch your venue" and pick the second venue', 'Each option shows the venue name and a sub line; the Capacity and Status tiles, Slot earnings, pods, health and application all change to that venue while "Listed" still counts both'],
          ['Sign in as an owner with a single venue', 'The "Switch your venue" dropdown is not shown'],
          ['Read the "Slot earnings" card', 'Tiles Potential earning, Booked earning (INR), Upcoming slots, Booked slots, Pending requests and Total capacity for the selected venue'],
          ['Read the quick actions and Upcoming bookings on an APPROVED venue', 'Quick actions open /venues/pricing, /venues/settings and /venues/event-requests; Upcoming bookings lists each confirmed booking with its pod, time and what the venue receives'],
          ['Select a venue that is not yet approved', '"Availability calendar" is disabled with "The availability calendar opens once this venue is approved."'],
          ['Tap the "Earnings" card', 'It reads "Lifetime ₹<x> · Pending ₹<y>" and opens /venues/earnings'],
          ['Scroll to "Your venues"', 'The chip reads "Live" for an approved venue (with an "Edit" and a "Public link" button) or "Draft" otherwise (Edit only)'],
          ['Tap the Venue Health meter', 'Headline "Venue is in great shape.", "A few things to polish." or "Needs attention." and tapping opens /venues/<venueId>/health'],
        ],
      },
      {
        name: 'Venue Studio without a venue',
        description: 'A signed-in account with no venue sees the register prompt rather than empty figures.',
        steps: [
          ['Open /venues/manage as an account with no venues', 'No switcher, Slot earnings or quick actions; "Your venues" shows "You haven\'t registered a venue yet." with "Register a venue"'],
          ['Tap "Register a venue"', 'Navigates to /register-venue'],
          ['Open the menu as a user without VENUE_OWNER', 'Switch role does not offer "Venue Studio"'],
        ],
      },
      {
        name: 'Browse pods hosted at the venue',
        description: 'The figures come from the server over every approved booking; the list is capped.',
        steps: [
          ['Scroll to "Pods hosted on your Venue"', 'Subtitle "Every pod booked at your venues — newest first." with Total pods, Upcoming, Live now, Past, Cancelled, Spots filled ("<n>% full"), Attendees and Next pod tiles (no Collected tile)'],
          ['Open the studio for a venue nobody has booked', '"No pods have been booked at your venue yet." and Next pod reads "None scheduled"'],
          ['Tap a pod row', 'Dialog "Pod details" with the state chip, Venue, Hosts (or "No host assigned"), When, Spots <booked>/<total>, Price (or Free), Attendees and "Ask the club admin for help"'],
          ['Open a pod with no bookings', 'Attendees reads "No attendees yet."'],
          ['Tap "Close"', 'The dialog closes'],
          ['Make the pods query fail (offline) and reload', '"Could not load these pods. Please try again." with "Try again" that refetches'],
        ],
      },
      {
        name: 'Cancel a pod from Venue Studio',
        description: 'The owner cancels an upcoming pod: every payment is refunded and the venue loses Account Health.',
        steps: [
          ['Open a row\'s ⋮ menu on an upcoming pod and tap "Cancel pod"', 'Dialog "Cancel this pod?" with the pod title, date · venue, a warning "Cancelling this pod will reduce this venue\'s Account Health by <n> points." and the refunds note'],
          ['Tap "Cancel pod" with Reason (shared with attendees) "Rain"', 'Field error "Give a reason of at least 5 characters" and nothing is sent'],
          ['Enter a reason of 5+ characters and tap "Cancel pod"', 'Button reads "Cancelling…", then toast "Pod cancelled — <n> payments refunded. This venue\'s Account Health is now <score>."'],
          ['Look at the list and Slot earnings', 'The pod moves to Cancelled and the strip refetches; attendees are emailed that the pod is cancelled'],
          ['Open ⋮ on a pod that is live, finished or already cancelled', '"Cancel pod" is disabled with "This pod has already started, so it can no longer be cancelled.", "This pod has already finished." or "This pod is already cancelled."'],
          ['Set the admin venue cancel penalty to 0 and reopen the dialog', 'The warning headline reads "Cancelling this pod cannot be undone."'],
          ['Call venueCancelPod for a pod that has started', 'Server refuses "Only an upcoming pod can be cancelled"'],
          ['Tap "Keep pod"', 'The dialog closes and the pod is untouched'],
        ],
      },
      {
        name: 'Request a venue change for a pod',
        description: 'Instead of cancelling, the owner asks Duncit to move the pod to another venue.',
        steps: [
          ['Open ⋮ on an upcoming pod and tap "Request Change Venue"', 'Dialog "Ask Duncit for a change?" with "Duncit will look for a different venue for this pod. Nothing moves until a new venue accepts it."'],
          ['Confirm "Yes, request a change" without a reason', 'Error "Please tell us why you need this change"'],
          ['Enter a reason and confirm', 'Toast "Duncit has your request. We will find a replacement." and it is listed under "Change Requests" as "Looking for a replacement"'],
          ['Open ⋮ on a finished or cancelled pod', '"Request Change Venue" is disabled with "This pod has already finished or been cancelled."'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Pricing Module',
    description:
      'Venue Pricing Module at /venues/pricing (native VenuePricingScreen; /venues/availability redirects here). The venue sets its pricing once — model, rate, limits, fees and price rules — and hosts book it instantly at that price; there is no approval step. The calendar shows the model and each day\'s price, and a date can be repriced, blocked or marked a holiday.',
    sub_flows: [
      {
        name: 'Set the pricing model and see the live preview',
        description: 'The form is validated by the same rules the server saves with; the preview is priced by the server.',
        steps: [
          ['Open Venue Menu > "Venue Pricing Module"', 'The pricing form (model, rate, limits, fees, opening hours, price rules), a live preview and the calendar for the selected venue'],
          ['Pick "Per person", rate 300, minimum guests 1 and save', 'The pricing saves and the calendar header shows the per-person model'],
          ['Add a Saturday +20% weekday surcharge and preview 20 guests on a Saturday', 'The preview reads 20 × ₹300 = ₹6,000, +20% = ₹7,200; the venue receives ₹7,200 and Duncit\'s fee is shown on top'],
          ['Set maximum guests below the minimum and save', 'The server refuses with the guests message and nothing is saved'],
          ['Switch to "Per slot" and add two overlapping slots on one day', 'Save is refused because two slots overlap on the same day'],
        ],
      },
      {
        name: 'Change one date from the calendar',
        description: 'A date override replaces the other rules for that day; booked days are read-only.',
        steps: [
          ['Tap a future date', 'A drawer with that day\'s price (from the server quote), its status and the date actions'],
          ['Set a price override for the date and save', 'The calendar shows the new price on that date only'],
          ['Block the date', 'The date shows as blocked and hosts can no longer pick it in Create Pod'],
          ['Mark the date as a holiday', 'The date shows as leave/holiday'],
          ['Tap a date with an instant booking', 'The booking is shown read-only'],
        ],
      },
    ],
  },
  {
    name: 'App: Workshop & Event Requests',
    description:
      'Workshop & Event Requests at /venues/event-requests (native VenueEventRequestsScreen; /venues/slot-requests opens it too). Pods no longer ask the venue; this page answers members\' workshop/event requests with Accept, Reject or Counter offer (priced by the pricing module) and keeps the old slot requests as read-only history.',
    sub_flows: [
      {
        name: 'Answer an event request',
        description: 'Every answer notifies the member; a counter offer carries the server\'s price.',
        steps: [
          ['As a member, request an event at the venue', 'The request appears for the owner as OPEN'],
          ['As the owner tap "Accept" with a note', 'The request moves to ACCEPTED and the member is notified'],
          ['On another request tap "Counter offer", pick a date, time and guests', 'The dialog shows the live quote from the venue\'s pricing; sending it moves the request to COUNTERED with the offer and price shown on the row'],
          ['Reject a request', 'The request moves to REJECTED and closes'],
          ['Publish a pod at the venue', 'Open, accepted and countered requests close as FULFILLED'],
        ],
      },
      {
        name: 'Read old slot requests',
        description: 'History from before instant booking.',
        steps: [
          ['Open the "Past slot requests" tab', 'Answered requests are listed read-only with their decision and date'],
          ['A request still pending from before the change', 'It can still be approved or declined until its slot starts'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Earnings',
    description:
      'Venue Earnings at /venues/earnings (native VenueEarningsScreen): myVenueEarningsSummary totals across every venue the owner has, and the payout history from venue payment releases.',
    sub_flows: [
      {
        name: 'Read venue earnings and payouts',
        description: 'Summary cards and expandable payout rows.',
        steps: [
          ['Open Venue Menu > "Venue Earnings"', 'Title "Earnings" with cards Lifetime, Pending, This month (currency amounts) and Pods completed'],
          ['Read "Payout history"', 'A count chip and one row per payout: pod title, a PENDING (amber), APPROVED (green) or REJECTED (red) chip, the date and the payable amount'],
          ['Tap "Show payout breakdown" on a v2 payout', 'Caption "Slot price ₹<a> − commission (<pct>%) ₹<b> = ₹<c>"'],
          ['Tap the same control again', 'The breakdown collapses'],
          ['Approve the venue release in Finance > Payment Release', 'After reload the row is APPROVED and Lifetime / This month increase'],
        ],
      },
      {
        name: 'Venue earnings before any payout',
        description: 'A new owner sees zeros and a hint.',
        steps: [
          ['Open /venues/earnings as an owner with no completed pods', 'Cards show ₹0.00 and "Payouts appear here after a pod at your venue completes." with a 0 count chip'],
          ['Make the earnings query fail and reload', 'An error alert with the server message replaces the page'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Settings - Cancellation Policy',
    description:
      'Venue settings at /venues/settings (native VenueSettingsScreen): one venue\'s cancellation policy as charge bands, plus a reschedule-only switch. RHF + Zod rules shared from @duncit/forms/schemas with the Partners console; saving sends only the cancellation key.',
    sub_flows: [
      {
        name: 'Add cancellation charge bands',
        description: 'A band charges for cancelling within that many hours of the start.',
        steps: [
          ['Open Venue Menu > "Venue Settings"', 'Title "Venue settings", card "Cancellation policy" with "Reschedule only — no cancellations", "Cancellation charges" and the hint that a cancellation outside every row is free'],
          ['Open a venue with no bands', 'Success note "No charges yet — cancelling is free at any time."'],
          ['Tap "Add a charge"', 'A band appears with Cancel within (hours) 24, Charge "Percent of slot price" and Amount 50'],
          ['Add a second band with 6 hours and Charge "Flat amount" 300, then tap "Save policy"', 'Button reads "Saving…", toast "Cancellation policy saved." and both bands reload from the server'],
          ['Switch to another venue', 'The form shows that venue\'s own policy'],
          ['Tap "Remove this charge" on a band and save', 'The band is gone after reload'],
        ],
      },
      {
        name: 'Cancellation band validation',
        description: 'Zod refuses a band before it is sent.',
        steps: [
          ['Enter -1 in Cancel within (hours) and save', 'Error "Hours cannot be negative"'],
          ['Enter 2.5 hours', 'Error "Use whole hours"'],
          ['Enter 9000 hours', 'Error "Use 8760 hours (a year) or less"'],
          ['Set Charge "Percent of slot price" with Amount 150', 'Error "A percentage cannot go above 100"'],
          ['Enter Amount -5', 'Error "The charge cannot be negative"'],
          ['Tap "Add a charge" twice and save', 'The second band shows "Another band already covers this window"'],
          ['Open /venues/settings as an account with no venues', 'Info "Register a venue first — settings apply to a venue you own." with "New venue"'],
        ],
      },
      {
        name: 'Make a venue reschedule-only',
        description: 'The switch greys the bands out without deleting them.',
        steps: [
          ['Turn on "Reschedule only — no cancellations"', 'Info "Cancellation charges are off because this venue is reschedule-only."; the bands, "Add a charge" and remove buttons are disabled'],
          ['Save', 'Toast "Cancellation policy saved."'],
          ['Turn the switch off again', 'The earlier bands are editable again with their values intact'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Auto Pods',
    description:
      'Venue Studio > Auto Pods at /venues/auto-pods (native VenueAutoPodsScreen), behind the auto_pods flag. The venue enrols first: accepting an offer books one of its free slots in the next few days, priced as the venue is paid. Offers are scoped to the picked venue\'s category and city.',
    sub_flows: [
      {
        name: 'Browse the venue Auto Pod queue',
        description: 'The venue picked at the top decides which offers are shown.',
        steps: [
          ['With auto_pods on, open Venue Menu > "Auto Pods for your venue"', 'Title "Auto Pods for your venue" with a Venue picker (approved, active venues only; the first is preselected), "Category: <super › category › sub>" and the location bar'],
          ['Look at an offer card', 'Ticks "Venue Enroll", "Host Enroll", "Club Admin Enroll" (amber "Pending"), mode tag, "Expires in <h>h <m>m <s>s" ticking, and "Accept & pick a slot"'],
          ['Pick a venue with no category', '"This venue has no category yet — set one under Manage venue to be offered Auto Pods."'],
          ['Open the page as an owner with no approved venue', '"Add an approved venue to be offered Auto Pods."'],
          ['With nothing waiting', '"No Auto Pods are waiting for a venue right now."'],
          ['Tap an Auto Pod notification on native', 'The app opens the VenueAutoPods screen'],
        ],
      },
      {
        name: 'Accept an Auto Pod and pick a slot',
        description: 'Accepting and committing a slot are one step.',
        steps: [
          ['Tap "Accept & pick a slot"', 'Dialog "Accept this Auto Pod?" with "Accepting with <venue>" and a "Pick a slot" select captioned "Free slots in the next <n> days, nearest first."'],
          ['Pick a slot the pod can cover', 'Success note "You earn ₹<amount> from this slot, after Duncit’s deductions." and the accept button enables'],
          ['Pick a slot whose price the pod cannot cover', 'Warning "The pod cannot cover this slot’s price." and accept stays disabled'],
          ['Accept a viable slot', 'The dialog closes; the offer moves under "Assigned slot" with "You enrolled" and the slot is BOOKED on the calendar'],
          ['Check the offer as a host', 'It now offers "Assign Myself" to hosts'],
        ],
      },
      {
        name: 'Accept blocked by slots, city or a race',
        description: 'Guards in the dialog and on the server.',
        steps: [
          ['Accept with a venue that has no free slot in the window', 'Info "This venue has no free slots. Add availability first." with "Add availability" opening /venues/pricing'],
          ['Accept an offer pinned to another city', 'Warning "None of your venues is in <city>." and no slots are listed'],
          ['Two owners accept the same offer; the second confirms after the first', 'The second dialog shows "This Auto Pod has already been accepted by another venue." and the slot it booked is released'],
          ['Accept an offer the admin paused', 'Error "This Auto Pod is paused — try again once the admin resumes it"'],
          ['Call venueAcceptAutoPod on a virtual offer', 'Error "A virtual Auto Pod has no venue — it needs only a host and a club"'],
          ['Call it with a venue outside the offer\'s category', 'Error "This Auto Pod\'s category does not match that venue"'],
        ],
      },
      {
        name: 'Cancel an accepted Auto Pod',
        description: 'Withdrawing releases the slot and costs Account Health points.',
        steps: [
          ['On an assigned offer tap "Cancel Auto Pod"', 'Dialog "Cancel this Auto Pod?" with the dependency warning and "Cancelling deducts <n> Account Health points."'],
          ['Tap "Yes, cancel"', '"You have cancelled this Auto Pod. It is back on the list for others."; the slot is AVAILABLE again and the venue and owner lose the points'],
          ['Let the offer go live after every partner enrols', 'The card shows "Live" with "View pod"'],
        ],
      },
      {
        name: 'Venue potential earnings calculator',
        description: 'Price each of the venue\'s spaces to see what the pod could take.',
        steps: [
          ['Tap "View Potential Earnings" on a card', 'Dialog "Potential Earnings" — "Enter a ticket price for a space to see what this pod could take there." with one row per named space ("Capacity: <n>"), or one "Whole venue" row'],
          ['Leave a space\'s Ticket price empty or 0', 'The row reads "Enter a ticket price to see what you could earn."'],
          ['Enter 200 for a space of capacity 20', '"Potential Earnings (Ticket Price × Slots): ₹200 × 20 = ₹4,000"'],
          ['Open it for a venue with no spaces and no capacity', '"Add a space with a capacity to this venue to see its potential earnings."'],
          ['Price two spaces and close the dialog', 'The card reads "You could earn <highest space total>"'],
        ],
      },
    ],
  },
  {
    name: 'App: Product Studio',
    description:
      'Product Studio ("ecomm Studio") at /products/manage (native ProductsManage): catalogue size, stock and average price with a stock-by-product chart. Needs the ECOMM_MANAGER role for the studio switch and the is_product_visible system flag.',
    sub_flows: [
      {
        name: 'Open Product Studio',
        description: 'Figures come from availablePodProducts.',
        steps: [
          ['Sign in as an ECOMM_MANAGER with products on and switch role to "ecomm"', 'The app lands on /products/manage and the drawer shows "E-commerce Menu" with Product Studio and Withdrawal'],
          ['Read the header and tiles', 'Title "ecomm Studio" with tiles Products (count), In stock (sum of available units) and Avg price (₹, rounded)'],
          ['Read "Stock by product"', 'A bar chart of the six products with the most stock, labels cut to 8 characters'],
          ['Empty the catalogue (no available products)', '"No products in the catalogue yet." with Products 0 and Avg price ₹0'],
          ['Complete the ECOMM survey gate', 'The app lands on /products/manage'],
        ],
      },
      {
        name: 'Product Studio with products switched off',
        description: 'The system flag removes the studio.',
        steps: [
          ['Turn is_product_visible off and open /products/manage on mWeb', 'The route redirects to Home (/) instead of a Not Found page'],
          ['Open the menu', 'The "ecomm" studio is not offered and a saved ecomm mode falls back to User'],
          ['Open ProductsManage on native with the flag off', 'Title "ecomm Studio" and "Product features are not available right now."'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Plans',
    description:
      'Pod Plans at /pod-plans: the active plans an admin publishes under Admin > Pod Plans (publicPodPlans, sorted by sort order then name). The menu row is gated by the pod_plans_section flag. Native PodPlans is still a placeholder screen.',
    sub_flows: [
      {
        name: 'Browse pod plans',
        description: 'Plan cards with price label, description and features.',
        steps: [
          ['Turn pod_plans_section on, open the menu > Manage Account', 'A "Pod Plans" row sits just before FAQs'],
          ['Tap "Pod Plans"', '/pod-plans opens with header "Pod Plans" and a back button'],
          ['Read a plan card', 'Image, name, price label, description and each feature with a check icon'],
          ['Mark a plan "coming soon" in Admin and reload', 'Its card shows an amber "Coming soon" chip'],
          ['Deactivate a plan in Admin and reload', 'The plan is no longer listed'],
          ['Tap back', 'Returns to the previous screen'],
        ],
      },
      {
        name: 'Pod Plans flag off and native',
        description: 'Gating and the native difference.',
        steps: [
          ['Turn pod_plans_section off and open the menu', 'The "Pod Plans" row is gone'],
          ['Open /pod-plans directly on mWeb with the flag off', 'The page still loads the published plans (only the menu row is gated)'],
          ['Open PodPlans on native', 'Placeholder titled "Pod Plans" with "This space is coming soon." (no plan cards yet)'],
        ],
      },
    ],
  },
  {
    name: 'App: Bouncers Legacy Link',
    description:
      '/bouncers is a retired route kept so old links still land somewhere: mWeb replaces it with /support. Host SOS and feedback notifications still carry /bouncers?sos=<id> and /bouncers?feedback=<id>. Native has no /bouncers screen.',
    sub_flows: [
      {
        name: 'Open a legacy /bouncers link',
        description: 'The redirect and the notification links that still use it.',
        steps: [
          ['Signed in on mWeb, open /bouncers', 'The URL is replaced by /support and the Support hub renders (Back does not return to /bouncers)'],
          ['Open /bouncers?sos=<id>', 'Lands on /support; the query string is dropped'],
          ['As an attendee raise an SOS on a pod, then as its host open the in-app notification "SOS <ticket> from <name>"', 'mWeb navigates via /bouncers to /support'],
          ['Tap the same SOS or "New <n>★ feedback" notification on native', 'Nothing opens (the link does not map to a native screen)'],
          ['Open /bouncers while signed out', 'Redirects to /support, which sends the visitor to sign in'],
        ],
      },
    ],
  },
  {
    name: 'App: Tour Guide',
    description:
      'Tour Guide at /tour-guide (native TourGuideScreen), behind the tour_guide flag: every guided walkthrough from @duncit/tours (Home, Club Page, Pod Details, Create Pod, Profile, Booking Flow), restartable at any time. mWeb runs Joyride; completion is stored per user on the device.',
    sub_flows: [
      {
        name: 'Start and finish a tour',
        description: 'Starting navigates to the tour\'s screen and arms it.',
        steps: [
          ['With tour_guide on, open menu > Manage Account > "Tour Guide"', 'Header "Tour Guide" with a back button and rows Home, Club Page, Pod Details, Create Pod (hosts only), Profile and Booking Flow, each with a caption and play icon'],
          ['Tap "Home"', 'Navigates to / and a tooltip "What are Pods?" opens with Previous, Skip and Next'],
          ['Tap Next through every step and tap "Finish" on the last', 'The overlay closes after steps such as "What are Clubs?", "Search", "Categories", "Filters", "Notifications" and "Your profile"'],
          ['Reopen Tour Guide', 'Home shows a "Completed" pill, a replay icon and the aria label "Restart the Home tour"'],
          ['Start "Profile" and tap "Skip" on the first step', '/menu opens, the overlay closes and Profile is marked Completed'],
          ['Sign up a brand-new account', 'The Home tour starts on its own once after signup'],
        ],
      },
      {
        name: 'Tours that wait for a detail screen',
        description: 'Pod Details, Club Page and Booking Flow run once their screen is opened.',
        steps: [
          ['Start "Pod Details" ("Reading a pod and booking a spot — open any pod to start")', 'Home opens with no overlay yet'],
          ['Open any pod', 'The tour runs over the pod summary, spots and book button'],
          ['Start "Booking Flow" and open a booking from /pod-history', 'The tour runs on the booking detail with "Your booking", "Your ticket" and "Changed your mind?"'],
          ['Start "Club Page" and open a club from /clubs', 'The tour covers the club header, follow and its pods'],
        ],
      },
      {
        name: 'Tour Guide gating',
        description: 'Role and flag rules.',
        steps: [
          ['Open Tour Guide as a user without the HOST role', '"Create Pod" is not listed'],
          ['Turn tour_guide off and open the menu', 'The "Tour Guide" row is gone'],
          ['With the flag off open /tour-guide and start a tour on mWeb', 'The target screen opens but no tour overlay is shown'],
        ],
      },
    ],
  },
  {
    name: 'App: Saved Items',
    description:
      'Saved Items at /saved (native SavedScreen): pods bookmarked from pod cards, with server-side search over title and description, a Super → Category → Sub filter and seven sorts (mySavedPods).',
    sub_flows: [
      {
        name: 'Search and open saved pods',
        description: 'The list starts with the most recently saved pod.',
        steps: [
          ['Save three pods with the bookmark, then open menu > Manage Account > "Saved Items"', 'Header "Saved Items" with a back button, "Search saved pods", a filter button and a sort button; cards show media, title, description, date (or "Date pending"), zone and ₹ price chips'],
          ['Type part of one pod\'s description', 'After a short debounce only matching pods remain'],
          ['Search for text no saved pod contains', '"No saved pods yet. Tap the bookmark on a pod to save it."'],
          ['Clear the search and tap a card', 'Opens /club/<clubSlug>/pod/<podId>'],
          ['Unsave that pod from its card and return to /saved', 'It is no longer listed'],
        ],
      },
      {
        name: 'Filter saved pods by category',
        description: 'A cascade whose deepest pick is sent to the server.',
        steps: [
          ['Tap the filter button', 'Popover "Filter by category" with Super Category, Category ("Select a super category first") and Sub category ("Select a category first") and a disabled "Reset"'],
          ['Pick a super category', 'Category enables, the badge shows 1 and only pods in that super category remain'],
          ['Pick a category and a sub category', 'Badge shows 3 and only pods in that sub category remain'],
          ['Change the super category', 'Category and Sub category reset to All'],
          ['Tap "Reset"', 'The badge clears and every saved pod is back'],
        ],
      },
      {
        name: 'Sort saved pods',
        description: 'Sorting happens on the server.',
        steps: [
          ['Tap the sort button', 'Menu "Recently saved" (selected), "Pod date · Soonest", "Pod date · Latest", "Price · Low to High", "Price · High to Low", "Name · A to Z", "Name · Z to A"'],
          ['Pick "Price · Low to High"', 'The menu closes and the cheapest pod is first'],
          ['Pick "Name · Z to A"', 'Pods are ordered by title descending'],
          ['Open /saved as an account with nothing saved', 'The empty state "No saved pods yet. Tap the bookmark on a pod to save it."'],
        ],
      },
    ],
  },
  {
    name: 'App: Verification',
    description:
      'Verification at /verification (native VerificationScreen), from menu > Manage Account and the Host Dashboard: Identity (one image or PDF up to 4 MB), Address (manual form) and Email (verified by the app). Admins approve or reject Identity and Address; a row under review or approved cannot be resubmitted.',
    sub_flows: [
      {
        name: 'Upload an identity document',
        description: 'The file is uploaded to ImageKit and submitted for review.',
        steps: [
          ['Open menu > Manage Account > "Verification"', 'Title "Verification" with cards Identity, Address and Email, each with a status chip ("Not Verified" for new accounts)'],
          ['On Identity tap "Upload document" and choose a 5 MB image', 'Message "Please upload a document under 4 MB." and nothing is uploaded'],
          ['Choose a 1 MB PDF', 'The button reads "Uploading…", then "Submitted for review." and the chip turns amber "Under review" with the upload button hidden'],
          ['On native open Identity', 'Two buttons "Upload photo" and "Upload PDF" instead of one; errors show under the card'],
          ['Submit IDENTITY again through the API while it is under review', 'Error "This is already under review. You can submit again once it has been approved or rejected."'],
        ],
      },
      {
        name: 'Submit address verification',
        description: 'Line 1, city, state and pincode are required.',
        steps: [
          ['On Address tap "Submit address" with Pincode empty', 'Message "Address line, city, state and pincode are required." (native shows "Enter your pincode" under the field)'],
          ['Fill Address line 1, State, City, Pincode (Address line 2 and Country optional) and submit', 'Button reads "Submitting…", then "Submitted for review." and Address shows "Under review" with the form hidden'],
          ['Admin rejects the address with a reason', 'Address shows red "Rejected", the reason in red and the form prefilled with the last address'],
          ['Correct it and submit again', 'The chip returns to "Under review" (native button reads "Update address")'],
        ],
      },
      {
        name: 'Approved and email verification',
        description: 'Settled rows lock and show a green tick.',
        steps: [
          ['Admin approves Identity', 'Identity shows green "Verified", a filled tick and no upload control'],
          ['Read the Email card after signing in with an OTP-verified email', '"Verified by the App" with "Your email is verified when you sign in — no action needed here."'],
          ['Open the page for an account whose email is not verified', 'Email shows "Not Verified" and still has no action'],
          ['Tap back', 'Returns to the previous screen'],
        ],
      },
    ],
  },
];

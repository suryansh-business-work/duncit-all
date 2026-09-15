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
          ['Sign in as a VENUE_OWNER with two venues, open the menu and switch role to "Venue Studio"', 'The app lands on /venues/manage (or /venues/auto-pods when an Auto Pod is waiting) and the drawer shows "Venue Menu" with Venue Studio, Slot Requests, Venue Earnings, Availability Calendar, Venue Settings and Withdrawal'],
          ['Look at the header', 'Title "Venue Studio" with a "New venue" button that opens /register-venue (mWeb forwards to partners-app.duncit.com/register-venue)'],
          ['Open "Switch your venue" and pick the second venue', 'Each option shows the venue name and a sub line; the Capacity and Status tiles, Slot earnings, pods, health and application all change to that venue while "Listed" still counts both'],
          ['Sign in as an owner with a single venue', 'The "Switch your venue" dropdown is not shown'],
          ['Read the "Slot earnings" card', 'Tiles Potential earning, Booked earning (INR), Upcoming slots, Booked slots, Pending requests and Total capacity for the selected venue'],
          ['Read the quick actions on an APPROVED venue with 2 pending requests', 'Rows "Availability calendar", "Venue settings" and "Slot requests" with a "2 pending" badge, opening /venues/availability, /venues/settings and /venues/slot-requests'],
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
    name: 'App: Venue Availability Calendar',
    description:
      'Slot availability at /venues/availability (native VenueAvailabilityScreen). The same @duncit/availability-calendar editor the Partners console mounts on mWeb; native draws the same rules in Tamagui. Only an APPROVED venue can publish slots, up to 60 days ahead.',
    sub_flows: [
      {
        name: 'Open the calendar and navigate periods',
        description: 'The page frame picks the venue; the calendar only opens for an approved venue.',
        steps: [
          ['Open Venue Menu > "Availability Calendar"', 'Title "Slot availability", the venue switcher (for 2+ venues) and a Month calendar with Day / Week / Month, Previous / Next, Today and "Recurring availability"'],
          ['Read the legend', '"A — Available", "P — Pending approval", "B — Booked", "× — Blocked" and "Leave / Holiday"'],
          ['Tap Next repeatedly', 'Next stops once the visible period reaches 60 days from today'],
          ['Switch to a venue whose status is PENDING', 'Warning "Availability is only editable once your venue is approved (current status: PENDING)." and no calendar'],
          ['Open /venues/availability as an account with no venues', 'Info "Register a venue first — availability belongs to a venue you own." with a "New venue" button to /register-venue'],
          ['Look at a date marked as a venue holiday', 'The cell is tagged LEAVE / "Venue on leave — not bookable"'],
        ],
      },
      {
        name: 'Add a single slot from the day drawer',
        description: 'The add form judges the draft against a live clock before it is sent.',
        steps: [
          ['Tap a future date', 'Drawer "Availability" titled with the date, "Existing slots" ("No slots for this date yet.") and "Add availability" with Whole day, Space, Start/End date and time, Price (₹) ("Leave 0 for a free slot") and Notes (optional)'],
          ['Pick a start time earlier than now today', 'Warning "Start time must be in the future." and "Add slot" is disabled'],
          ['Set the same start and end time', 'Warning "Start and end time cannot be the same."'],
          ['Pick a space, 6:00 PM – 8:00 PM, price 500 and tap "Add slot"', 'Button reads "Adding…"; the slot is listed with "₹500", status AVAILABLE and "<space> · holds <capacity>"; the calendar cell shows A'],
          ['Add another slot for the same space and overlapping time', 'Error "Overlaps with existing slot <start> – <end>" with an "Overwrite" action'],
          ['Tap "Overwrite", then "Delete and overwrite"', 'Confirm "Overwrite the existing slot?" explains booked or pending slots are never touched; the old slot is replaced by the new one'],
          ['Turn on "Whole day" and pick an end date two days later', '"This creates one continuous multi-day booking (e.g. a multi-day activity or event)." and the slot is created as "Whole day · <from> – <to>"'],
          ['Tap a holiday date', 'Error "This date is marked as a venue leave/holiday — slots cannot be added or booked." and the add form is hidden'],
        ],
      },
      {
        name: 'Block, unblock and delete a slot',
        description: 'Booked and pending slots are locked.',
        steps: [
          ['In the drawer tap "Block" on an AVAILABLE slot', 'Status chip turns BLOCKED, the button reads "Unblock" and hosts no longer see the slot when creating a pod'],
          ['Tap "Unblock"', 'Status returns to AVAILABLE'],
          ['Tap "Delete" and confirm', 'Dialog "Delete this slot?" — "This permanently removes the time slot. Booked slots cannot be deleted."; the slot disappears'],
          ['Open a date with a PENDING slot', 'It shows "Requested by pod: <title>" and "Awaiting your decision — approve or decline it under Slot Requests." with no Block or Delete'],
          ['Open a BOOKED slot', 'It shows "Booked by pod: <title>" with no Block or Delete'],
        ],
      },
      {
        name: 'Create recurring availability',
        description: 'A date range, weekdays, time windows and a price per space generate many slots at once.',
        steps: [
          ['Tap "Recurring availability"', 'Dialog "Recurring availability" — "Create slots with custom timing, pricing and venue settings." with Repeat on (All / Weekdays / Weekends), Time slots, Pricing by space and "When a slot already exists"'],
          ['Untick every weekday', '"Select at least one day to repeat on." and the create button is disabled'],
          ['Add two time slots that overlap', '"Time slots must not overlap."'],
          ['Pick Weekdays, one 7–9 AM window and a price for one space', 'The preview shows "Slots to be created", "<n> Slots", "Total revenue (est.)" and any "Auto-skipped" counts; the button reads "Create <n> slots"'],
          ['Keep "Keep the existing slot" and create', 'Slots are created, clashing ones are skipped, the dialog closes and the calendar refetches'],
          ['Run the same range again', 'Error "Every matching slot already exists — nothing to add."'],
          ['Choose "Overwrite the existing slot"', 'The destructive warning about deleting published slots is shown before creating'],
          ['Open Advanced settings > Venue rules, change the buffer and tap "Save rules"', '"Venue rules saved."'],
        ],
      },
    ],
  },
  {
    name: 'App: Venue Slot Requests',
    description:
      'Slot Requests at /venues/slot-requests (native VenueSlotRequestsScreen): hosts who booked one of the owner\'s slots wait here, and the pod stays unlisted until the owner approves. Same approveVenueSlotRequest / declineVenueSlotRequest the Partners console uses.',
    sub_flows: [
      {
        name: 'Approve a slot request',
        description: 'Approving asks once, then the pod goes live.',
        steps: [
          ['As a host, create a pod on one of the venue\'s AVAILABLE slots', 'The slot turns PENDING and the owner\'s Venue Studio shows "1 pending" on Slot requests'],
          ['As the owner open Venue Menu > "Slot Requests"', 'Title "Slot Requests" with a card: pod title, description (or "No description provided."), chip "Awaiting decision", Venue, Slot, Slot price (or "Free"), Requested, Host and Contact (mailto / tel links)'],
          ['Tap "Approve"', 'Dialog "Approve this booking?" — "<pod> goes live at <venue> for <slot window>. The host and everyone who joins will be told."'],
          ['Tap "Cancel" in the dialog', 'Nothing changes'],
          ['Tap "Approve" and confirm', 'Alert "Booking approved — the pod is now live."; the card leaves the list and the slot shows BOOKED on the calendar'],
        ],
      },
      {
        name: 'Decline a slot request',
        description: 'Declining takes an optional reason and reopens the slot.',
        steps: [
          ['Tap "Decline" on a request', 'Dialog "Decline this booking?" — "The slot opens again and the host is told. A reason helps them ask better next time." with Reason (optional)'],
          ['Enter a reason and tap "Decline"', 'Alert "Booking declined — the slot is open again."; the card leaves the list and the slot is AVAILABLE again'],
          ['Check the host side', 'The host is told the venue declined, with the reason'],
        ],
      },
      {
        name: 'Filter, empty queue and stale requests',
        description: 'Venue chips for multi-venue owners and the server guards.',
        steps: [
          ['As an owner with two venues look above the list', 'Venue chips "All venues", <venue 1>, <venue 2>; picking one shows only its requests'],
          ['Open the page with nothing pending', '"No pending slot requests right now. New ones appear here the moment a host books one of your slots."'],
          ['Approve a request whose slot start time has already passed', 'Error alert "This slot has already started and can no longer be approved"'],
          ['Approve a request another session already declined', 'Error alert "This slot has no pending booking request"'],
          ['Call approveVenueSlotRequest for another owner\'s slot', 'Server refuses "Not your slot"'],
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
          ['Accept with a venue that has no free slot in the window', 'Info "This venue has no free slots. Add availability first." with "Add availability" opening /venues/availability'],
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

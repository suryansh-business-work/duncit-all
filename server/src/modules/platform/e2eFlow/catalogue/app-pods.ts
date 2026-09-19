import type { CatalogueFlow } from './catalogue.types';

/** Customer-app pod journeys (mWeb + native app): discovery, booking, attendee lifecycle and in-app hosting / club admin. */
export const APP_POD_FLOWS: readonly CatalogueFlow[] = [
  {
    name: 'App: Pod Discovery - Home Feed',
    description:
      'The signed-in Home tab on mWeb (/) and the native app HomeTab: rails, vibe chips, the filter sheet and the full pod lists behind "See all". Both surfaces render the same rails from the same rules.',
    sub_flows: [
      {
        name: 'Browse the home feed',
        description: 'A signed-in user in a city with live pods sees every Home section in order.',
        steps: [
          ['Sign in and open Home (/) with a city selected in the header', 'Skeleton shows first, then the page renders with no error alert'],
          ['Look at the top row', 'A "Search pods…" pill and a round filter button sit side by side'],
          ['Scroll past the status rail to the vibe chips', 'Heading "What\'s your vibe today?" with an "All" chip selected first, followed by one chip per category'],
          ['Look at the "Happening nearby" section', 'Title "Happening nearby" with a "See all" action and a horizontal rail of upcoming pod cards (image, title, price/Free, spots left)'],
          ['Scroll to the "Ongoing Pods" rail (only when a pod has started but not ended)', 'Cards for running pods; the rail explains joining is closed'],
          ['Scroll further', 'Host CTA banner, club recommendation row, one section per club with its pods, then "Previous Pods" and "We\'ve got something for you"'],
          ['Tap any upcoming pod card', 'Navigates to /club/<clubSlug>/pod/<podSlug> and the pod details page loads'],
        ],
      },
      {
        name: 'Filter and sort home pods',
        description: 'The filter sheet narrows the Home rails by category, price and date and changes the sort order.',
        steps: [
          ['Tap the round filter button beside the search pill', 'A "Filters" sheet opens with Category chips, Price (All / Free / Paid), When (Any time / Today / Tomorrow / This Week / This Month) and "Sort by"'],
          ['Pick the "Free" price chip', 'The chip turns filled; rails keep only free pods'],
          ['Pick "Today" under When', 'Only pods starting today remain'],
          ['Open "Sort by" and choose "Price · High to Low"', 'The rails re-order by price descending'],
          ['Close the sheet with "Done"', 'The filter button\'s accessible name reads "Open filters (3 active)"'],
          ['Check the "See all" card at the end of a rail', 'While a filter is active the See-all card drops its "+N more" count'],
          ['Reopen the sheet and tap "Reset"', 'All filters return to All / Any time / Date · Earliest first and the rails show every pod again'],
        ],
      },
      {
        name: 'Pick a vibe category chip',
        description: 'Tapping a vibe chip narrows the Home rails to that category.',
        steps: [
          ['Tap a category chip under "What\'s your vibe today?"', 'The chip becomes selected and the rails show only pods of that category'],
          ['Tap "All"', 'Every pod returns to the rails'],
          ['Switch the header city to one where that category has no pods', 'The selected chip is cleared automatically back to All'],
        ],
      },
      {
        name: 'See all happening nearby pods',
        description: 'The /happening-nearby list (native: HappeningNearby screen) shows every upcoming pod in the city with search and filters.',
        steps: [
          ['On Home tap "See all" beside "Happening nearby"', 'Navigates to /happening-nearby titled "Happening nearby"'],
          ['Scroll the list', 'Cards load in a windowed infinite list; sponsored ad cards appear between rows when ads are active'],
          ['Type part of a pod title in the search pill', 'Only pods whose title, place or host name match stay; ads are hidden while searching'],
          ['Open the "Filter" pill', 'Category, Price and When rows show but there is no Sort row (the list order is fixed)'],
          ['Choose filters that match nothing', 'Empty text "No live pods around you right now." or the no-search-results state shows'],
          ['Tap the "+N more" See-all card on Home instead', 'The list opens scrolled to the pod where the Home rail stopped (?from=N)'],
        ],
      },
      {
        name: 'Browse previous pods',
        description: 'The /previous-pods list shows pods that have already taken place; they cannot be booked.',
        steps: [
          ['Scroll to "Previous Pods" on Home and tap "See all"', 'Navigates to /previous-pods listing past pods'],
          ['Open a previous pod', 'Pod details show the booking bar notice "This pod has already taken place — booking is closed." and no Book button'],
          ['Open /previous-pods in a city with no past pods', 'Empty text "No previous pods to show yet."'],
        ],
      },
      {
        name: 'Home in a city with no pods or clubs',
        description: 'When the selected city has nothing live, search and filters are disabled.',
        steps: [
          ['Select a city with no clubs and no pods in the header', 'Home reloads for that city'],
          ['Look at the search pill and filter button', 'Both are disabled (dimmed); tapping the pill does not open /search'],
          ['Scroll to the clubs area', 'Empty state "No pods here yet. Pull to refresh or pick a different vibe."'],
        ],
      },
      {
        name: 'Host CTA and create-pod shortcut',
        description: 'The banner and floating button differ for hosts and non-hosts.',
        steps: [
          ['As a user without the HOST role, find the host banner on Home', 'Banner reads "Become a host" with a "Get started" button; no floating + button'],
          ['Tap "Get started"', 'Navigates to /earn'],
          ['Sign in as an approved host and open Home', 'Banner reads "Host your own pod" with a "Create Pod" button and a floating + button appears bottom-right'],
          ['Tap the floating + button', 'Navigates to /create-pod'],
        ],
      },
      {
        name: 'Save a pod from a card',
        description: 'The bookmark on a pod card toggles the pod in the user\'s saved list.',
        steps: [
          ['On a Home pod card tap the save (bookmark) icon', 'Icon fills immediately (optimistic) with label "Remove from saved"'],
          ['Open the account menu and go to Saved Items (/saved)', 'The pod is listed under "Saved Items"'],
          ['Tap the bookmark again on the card', 'Icon clears and the pod disappears from /saved after refresh'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Discovery - Location',
    description:
      'Choosing the browsing city/locality from the app header and the location-mismatch dialog shown when a pod, club or venue link belongs to another city. mWeb dispatches the header apply event; native persists the pick through its locations store. Same copy on both.',
    sub_flows: [
      {
        name: 'Change city and locality from the header',
        description: 'The header location picker drills Country > State > City > Locality and persists a real pick to the profile.',
        steps: [
          ['Tap the location button in the app header', 'A "Choose your location" sheet opens with the current city selected'],
          ['Change the state', 'The city list switches to that state and its first city is selected; the locality selection is cleared'],
          ['Tap a city card', 'The Apply button reads "Apply · N areas" when the city has localities'],
          ['Search a locality or PIN in "Search locality or PIN code" and pick it', 'Apply button reads "Apply · <locality>"'],
          ['Tap Apply', 'Sheet closes, header shows the new city/locality, Home refetches pods for it, and selected_location_id is saved on the user'],
          ['Reload the app', 'The same city is still selected (persisted choice wins over GPS/default)'],
          ['Open the sheet and tap "Cancel"', 'Nothing changes'],
        ],
      },
      {
        name: 'Detect location with GPS',
        description: '"Use my location" geocodes the device position and matches it to a Duncit city.',
        steps: [
          ['Open the location sheet and tap "Use my location"', 'Button shows "Locating…" and the browser/OS asks for location permission'],
          ['Allow permission in a covered city', '"Detected: <city> · <pincode>" shows and the matching city/locality is pre-selected'],
          ['Repeat from a city Duncit does not serve', 'Info alert "Duncit isn\'t in <city> yet. Pick a city below."'],
          ['Deny the permission', 'A warning alert with the geolocation error shows; manual selection still works'],
        ],
      },
      {
        name: 'Location mismatch - switch to the link city',
        description: 'Opening a physical pod link from another city prompts the user to switch.',
        steps: [
          ['With Mumbai selected, open a shared link to a physical pod in Pune (/club/<slug>/pod/<slug>)', 'Pod details load and a dialog "This link is for a different location" opens'],
          ['Read the dialog', 'Intro "The pod you are opening is in Pune…, but your Duncit location is currently set to Mumbai…" with rows "Your current location" and "Location of this link"'],
          ['Tap "Switch to Pune"', 'Header switches to Pune (and the link\'s locality), the choice is persisted, the page remounts and the dialog does not return'],
        ],
      },
      {
        name: 'Location mismatch - continue in current city',
        description: 'Keeping the current city dismisses the dialog for that target only.',
        steps: [
          ['Open a pod link from another city', 'Mismatch dialog opens'],
          ['Tap "Continue in <current city>"', 'Dialog closes; header location is unchanged and the pod page stays usable'],
          ['Stay on the page (no navigation)', 'Dialog does not reappear for the same pod'],
          ['Open a club link (/club/<slug>) or venue link (/venue/<id>) from another city', 'The same dialog opens with the club/venue intro sentence'],
        ],
      },
      {
        name: 'Virtual pod links never prompt',
        description: 'A virtual pod has no place, so no mismatch dialog is shown.',
        steps: [
          ['With any city selected, open a link to a VIRTUAL pod listed in another city', 'Pod details load with the "Virtual" chip'],
          ['Wait for the page to settle', 'No location mismatch dialog opens'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Search & Explore',
    description:
      'Full search at /search (native Search screen) and the Explore reels feed. mWeb Explore has a filter sheet (presets, sort, vibe, price, date); the native Explore tab is a reels feed without that sheet.',
    sub_flows: [
      {
        name: 'Search pods and clubs',
        description: 'Typing in /search shows club-grouped results with the pods happening soon.',
        steps: [
          ['On Home tap the "Search pods…" pill', 'Navigates to /search with a sticky search bar and category quick-action buttons'],
          ['Type a keyword that matches a pod title', 'After a short debounce the URL becomes /search?q=<keyword> and results show "Explore Experiences Happening Soon" and "More Clubs Worth Exploring" sections'],
          ['Tap a pod in the results', 'Navigates to that pod\'s details page'],
          ['Go back and tap a club result', 'Navigates to /club/<clubSlug>'],
          ['Tap Follow on a club result', 'Follow state toggles and results refetch'],
          ['Clear the text', 'URL drops ?q and the category quick actions return'],
        ],
      },
      {
        name: 'Search by category quick action',
        description: 'Picking a category button runs a category-scoped search.',
        steps: [
          ['Open /search without typing', 'Category quick-action buttons are listed'],
          ['Tap a category button', 'The text is cleared and results for that category show'],
          ['Pick a category that has no pods', 'Empty state "Nothing Here Yet" with "Share a Pod Idea" and "Explore More Categories" cards'],
          ['Tap "Explore More Categories"', 'Category selection returns to the quick actions'],
        ],
      },
      {
        name: 'Sort and filter search results',
        description: 'The results can be re-ordered and narrowed by category.',
        steps: [
          ['With results showing, open the sort control', 'Dialog "Sort Results" lists Most Relevant, Nearest Date First, Latest Date First, Most Popular, Most Participants'],
          ['Pick "Most Participants"', 'Dialog closes and clubs re-order by participant count'],
          ['Open the category filter', 'Dialog "Filter by Category" with an "All" chip and one chip per category'],
          ['Pick a category', 'Results keep only that category; picking "All" restores them'],
        ],
      },
      {
        name: 'Search with no results',
        description: 'A keyword that matches nothing shows discovery CTAs.',
        steps: [
          ['Type a random keyword with no matches', 'Empty state "No Pods Match Your Search"'],
          ['Look below it', 'Cards "Didn\'t Find What You Were Looking For?" (button "Share a Pod Idea") and "Turn Your Passion Into Something Bigger" (button "Earn With Duncit")'],
          ['Tap "Share a Pod Idea"', 'Navigates to /pod-ideas'],
          ['Go back and tap "Earn With Duncit"', 'Navigates to /earn'],
        ],
      },
      {
        name: 'Explore reels feed',
        description: 'Scrolling pod reels on /explore (native Explore tab) and opening a pod from a reel.',
        steps: [
          ['Tap the Explore tab in the bottom navigation', 'A full-screen vertical reel feed plays the first pod reel'],
          ['Swipe to the next reel', 'Next pod reel plays; the join bar shows the price line and a Go button'],
          ['Tap the sound toggle on a reel without audio', 'Button stays dimmed and "This video has no audio" is shown'],
          ['Tap Like on the action rail', 'Like count increments and the icon fills'],
          ['Tap the Go button (or double-tap the reel)', 'Navigates to the pod details page'],
          ['Scroll to a reel for a pod that has already happened', 'Join bar reads "This pod is expired" / "You can still view the pod details." with no Go button'],
        ],
      },
      {
        name: 'Filter the Explore feed (mWeb)',
        description: 'mWeb-only filter sheet over the reels; the native Explore tab has no sheet.',
        steps: [
          ['On mWeb /explore tap "Open filters"', 'Sheet "Filters" with Quick presets (All, Tonight, Trending, Near me), Sort by, Vibe, Price and When chips'],
          ['Pick "Tonight" and "Price low"', 'Summary line shows "<n> active - <m> pods match" and the button reads "Show <m> pods"'],
          ['Pick filters matching nothing', '"No pods match these filters." is shown'],
          ['Tap "Reset"', 'All chips return to defaults'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Details Page',
    description:
      'The pod page at /club/:clubSlug/pod/:podSlug (native PodDetails, same URL grammar for deep links): slug resolution, not-found and error states, content sections, sharing, likes/comments and the booking bar states that are not purchases.',
    sub_flows: [
      {
        name: 'Open a pod and read its details',
        description: 'The slug is resolved to a pod id, then the page renders every section.',
        steps: [
          ['Open /club/<clubSlug>/pod/<podSlug> for a live physical paid pod', 'Skeleton shows, then the hero carousel with Back, Save and Share buttons'],
          ['Read the overview card', 'Title, "Hosted by <names>", category breadcrumb, "Physical" chip, countdown chip ("<n> days remaining" / "Starting soon"), "People in" and "Spots left" stats'],
          ['Scroll to "Time & Venue"', '"When" shows the date/time in the admin-configured format; "Where" shows the venue with a map preview and "Open in Maps"'],
          ['Tap "Expand all"', 'Accordions open: About this pod, Club details, Club Admin Details, What this pod offers, Hosts, Attendees, Available perks, Payment details, Payment terms, Place charges'],
          ['Open "Attendees"', 'Shows "<count> / <total> going" with one avatar per person; multi-seat bookers carry "+N other members"; replaced seats show "Spot filled by <name>"'],
          ['Open "Payment details" on a paid pod', '"Price per seat" and "Price is inclusive of GST."'],
          ['Open "Multi-ticket offer" on a pod with tiers', 'Rows "1 ticket · Full price" then "<n>+ tickets · <pct>% off · <price> per ticket"'],
        ],
      },
      {
        name: 'Pod not found',
        description: 'A slug that resolves to no pod (typo, deleted or cancelled pod) shows the not-found alert.',
        steps: [
          ['Open /club/<validClub>/pod/does-not-exist', 'After loading, a warning alert "Pod not found." shows (data-testid pod-details-not-found)'],
          ['Open the URL of a pod that has been cancelled', 'Same "Pod not found." alert (cancelled pods are soft-deleted and hidden)'],
          ['Open /club/unknown-club/pod/any', 'Same "Pod not found." alert, no crash'],
        ],
      },
      {
        name: 'Slug lookup failure shows the real error',
        description: 'A failed slug request must not be reported as a missing pod.',
        steps: [
          ['Block or rate-limit the podBySlugs request (e.g. 429 from the rate limiter) and open a valid pod URL', 'An error alert (pod-details-error) shows the server\'s message'],
          ['Check the alert text', 'It is NOT "Pod not found."'],
          ['Restore the network and reload', 'The pod renders normally'],
        ],
      },
      {
        name: 'Open a booking from the receipt link',
        description: '/booking/:bookingId (native Booking screen) resolves the booking and forwards to its pod.',
        steps: [
          ['Signed in as the booking owner, open /booking/<bookingId> from the payment receipt email', 'A spinner shows, then the app replaces the URL with the pod details page'],
          ['Open the same link signed in as a different user', 'Error alert "You are not authorized to view this booking."'],
          ['Open /booking/<randomId>', 'Error alert "Booking not found"'],
          ['Open the link while signed out on mWeb', 'Redirected to /login?redirect=/booking/<id>; after sign-in the booking opens'],
          ['Open the link while signed out on the native app', 'Login screen opens; after sign-in the parked booking id is replayed and the pod screen opens'],
        ],
      },
      {
        name: 'Share a pod',
        description: 'Share sends a tracked message with title, time, venue, map link and pod link.',
        steps: [
          ['On pod details tap the Share button in the hero', 'The OS share sheet opens (native share / Web Share API)'],
          ['Pick a target such as WhatsApp', 'The message contains the pod title, formatted date/time, venue with a map link and a tracked short link to the pod as the last line'],
          ['On a desktop browser without Web Share, tap Share', 'The message is copied and a "Link copied" notice shows'],
          ['Dismiss the share sheet without sharing', 'No error is shown'],
        ],
      },
      {
        name: 'Like and comment on a pod',
        description: 'The social bar under the map toggles likes and opens the comments sheet.',
        steps: [
          ['Tap "Like · <n>"', 'Label changes to "Liked · <n+1>"'],
          ['Tap "Comment · <n>"', 'Comments sheet opens; empty pod shows "No comments yet. Be the first to comment."'],
          ['Submit an empty comment', 'Validation "Required" and nothing is posted'],
          ['Type a comment and send', 'Comment appears at the top with the author avatar and count increments'],
          ['Paste more than 1000 characters', 'Validation "Max 1000 chars"'],
          ['Delete your own comment and confirm "Delete comment?"', 'Comment is removed permanently'],
        ],
      },
      {
        name: 'Booking bar for the pod host',
        description: 'Hosts are auto-enrolled and never book their own pod.',
        steps: [
          ['Sign in as the pod host and open the pod', 'Booking bar shows "You\'re hosting · Your Pod" and a "Go to Dashboard" button; no seat picker or Book button'],
          ['Tap "Go to Dashboard"', 'Studio mode switches to Host Studio and navigates to /host/manage'],
        ],
      },
      {
        name: 'Booking closed once the pod starts',
        description: 'Non-members cannot book a running or past pod.',
        steps: [
          ['As a non-member open a pod that is currently running', 'Bar shows "This pod is happening right now — joining is closed." with no CTA'],
          ['Open a pod whose end time has passed', 'Bar shows "This pod has already taken place — booking is closed."'],
          ['Force the join mutation on a started pod (API call)', 'Server refuses with "This pod has already taken place — booking is closed."'],
        ],
      },
      {
        name: 'Sold-out pod',
        description: 'A pod with every spot taken disables booking.',
        steps: [
          ['Open a pod where seats taken equals no_of_spots', 'The Book button reads "Pod is full" and is disabled; the seat stepper is disabled'],
          ['Call the free join / order creation API for it anyway', 'Server refuses with "Pod is full" (code POD_FULL)'],
        ],
      },
      {
        name: 'Contact support about a pod',
        description: 'The support link pre-fills a booking ticket for this pod.',
        steps: [
          ['Scroll to the bottom of pod details and tap "Contact support about this pod"', 'Navigates to /support/tickets?category=BOOKING with podId, podTitle and subject "Support - <pod title>" pre-filled'],
        ],
      },
      {
        name: 'Virtual pod details before joining',
        description: 'Meeting details are hidden until the viewer has joined.',
        steps: [
          ['As a non-member open a virtual pod', 'Overview shows the "Virtual" chip; Time & Venue shows "Meeting" with the platform name'],
          ['Look for the meeting link', 'Text "Meeting link will be visible after joining this pod." and no "Join meeting" button'],
          ['Check the page for a map', 'No venue map is rendered for a virtual pod'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Booking & Checkout',
    description:
      'Booking a spot from the customer app: free joins on the pod page, and paid bookings through /checkout/:podId (native Checkout screen, Razorpay in a WebView). Pricing order is ticket gross, multi-ticket tier, coupon, Duncit Coins, then GST extracted from what is left; the server re-prices every order.',
    sub_flows: [
      {
        name: 'Join a free pod',
        description: 'A free pod is joined directly from the booking bar; no payment is taken.',
        steps: [
          ['Open an upcoming free pod with spots left', 'Bar shows "Entry · Free", a seat stepper at 1 and a "Join" button'],
          ['Tap "Join"', 'Button disables while joining, confetti plays and a "Joined!" notice shows'],
          ['Look at the bar after refetch', 'Bar shows "You\'re going · Pod Booked" with a "Backout" button'],
          ['Check the database', 'A PodMember row with status JOINED, source FREE and seats 1 exists and a ticket is issued'],
          ['Open Pod History (/pod-history)', 'The pod is listed with "Joined <date>"'],
        ],
      },
      {
        name: 'Join a free pod with several seats',
        description: 'The seat stepper books multiple seats in one free booking.',
        steps: [
          ['On a free pod tap "One seat more" twice', 'Stepper shows 3; "One seat more" disables at the pod\'s remaining seats'],
          ['Tap "Join"', 'Joined notice shows; the attendee list shows your avatar with "+2 other members"'],
          ['Try to join again via API while already JOINED', 'Server returns the existing membership, no duplicate row'],
        ],
      },
      {
        name: 'Book a paid pod',
        description: 'Book now carries the seat count to checkout; the order summary previews the bill.',
        steps: [
          ['Open a paid pod with spots left', 'Bar shows "Price <amount>", a seat stepper and "Book now"'],
          ['Tap "Book now"', 'Navigates to /checkout/<podId>?title=…&amount=<ticket×seats>&seats=1 and "Checkout" loads with a gateway chip'],
          ['Read the order summary', 'Pod title, "Ticket price", "Inclusive of:" "GST (<pct>%)" extracted from the gross, and "Total payable" equal to the ticket price'],
          ['Read "Contact details"', 'Name, email and phone come from the profile, read-only, with "To change these, edit your profile."'],
          ['Look at the pay button', 'Reads "Pay <amount>" with "Receipt and invoice will be sent after successful payment." below'],
          ['Tap the back button', 'Returns to the pod page'],
        ],
      },
      {
        name: 'Multi-seat paid booking with multi-ticket discount',
        description: 'The tier discount comes off the ticket money before coupons and coins.',
        steps: [
          ['Open a paid pod with a tier "3+ tickets · 10% off" and set seats to 3', 'Bar caption reads "10% off for 3 tickets"'],
          ['Tap "Book now"', 'Checkout order summary shows the ticket line for 3 seats'],
          ['Read the discount rows', 'A row "Multi-ticket discount (10% on 3 tickets)" is subtracted from the gross and GST is recomputed on the discounted total'],
          ['Pay successfully', 'Server charges the discounted amount and the membership holds 3 seats'],
        ],
      },
      {
        name: 'Seats run out between pod page and payment',
        description: 'The server clamps seats to what is left at order time.',
        steps: [
          ['Pick 4 seats on a pod with 4 seats left and open checkout', 'Checkout shows the 4-seat bill'],
          ['From another account book 2 of those seats', 'That booking succeeds'],
          ['Back on the first account tap Pay', 'Order creation fails with "Only 2 seats left on this pod" shown in the error notice; no charge'],
          ['Repeat when 0 seats are left', 'Error "Pod is full"'],
        ],
      },
      {
        name: 'Apply a coupon',
        description: 'A valid coupon is previewed against the post-tier bill and applied at payment.',
        steps: [
          ['On checkout type a valid percentage coupon in "Coupon code"', '"Apply" enables once text is entered'],
          ['Tap "Apply"', 'Button shows "Applying…", then "<CODE> applied" with a "Remove" button'],
          ['Read the summary', 'A row "Coupon <CODE>" shows the whole-rupee discount (rounded down) and "Total payable" drops; the pay card shows the struck old total and "you save <amount>"'],
          ['Tap "Remove"', 'Coupon row disappears and the total returns'],
          ['Tap "View <n> available coupons"', 'Sheet "Available coupons" lists codes with "<pct>% off", "For this pod" / "All pods" and "Min <amount>"'],
          ['Tap a coupon in the sheet', 'It is applied exactly like a typed code'],
        ],
      },
      {
        name: 'Coupon rejected',
        description: 'Each coupon rule returns its own message and nothing is applied.',
        steps: [
          ['Apply an unknown or inactive code', 'Inline error "Invalid or inactive coupon code"'],
          ['Apply a pod-scoped coupon on a different pod', 'Error "This coupon is not valid for this pod"'],
          ['Apply a coupon before its start date / after its end date', 'Errors "Coupon is not active yet" / "Coupon has expired"'],
          ['Apply a coupon with a minimum above the bill', 'Error "Minimum order of ₹<min> required"'],
          ['Apply a coupon at its max uses / already used by this user', 'Errors "Coupon usage limit reached" / "You have already used this coupon"'],
        ],
      },
      {
        name: 'Redeem Duncit Coins at checkout',
        description: 'Coins are 1:1 with rupees, clamped to the balance and to the bill after coupon. Gift card redemptions arrive as coins, so a gift card balance is spent here too (there is no separate gift card field).',
        steps: [
          ['Open checkout with a coin balance', 'The "Duncit Coins" row shows "<n> coins available" and a "Use coins" button'],
          ['Tap "Use coins"', 'Row shows "<n> coins applied" with "Remove"; summary gains "Duncit Coins", "Coins used", "Coins remaining" and "Coins you will earn" (earned on the amount actually charged)'],
          ['Apply a coupon after coins', 'Applied coins re-clamp so they never exceed the new payable'],
          ['Hold more coins than the bill', 'Coins applied equal the payable; if it would leave under ₹1 to charge, one coin is handed back'],
          ['Open checkout with 0 coins', 'Row reads "You have no Duncit Coins to redeem yet." and "Use coins" is disabled'],
          ['Pay successfully', 'Coins are debited only after payment success; the menu balance refreshes'],
        ],
      },
      {
        name: 'Bill fully covered by coupon or coins',
        description: 'A zero payable skips the gateway and settles immediately.',
        steps: [
          ['Apply a 100% coupon (or coins equal to the whole bill)', 'Total payable shows ₹0.00'],
          ['Tap Pay', 'No Razorpay sheet opens; the success screen shows directly'],
          ['Check the payment record', 'Payment is SUCCESS settled via "Coupon (100% off)" or "Duncit Coins"; membership and ticket are created'],
        ],
      },
      {
        name: 'Account not ready to pay',
        description: 'Checkout refuses accounts without a phone or verified email before any card is entered.',
        steps: [
          ['Sign in with an account that has no phone number and an unverified email; open checkout', 'Card "Finish setting up your account" / "We need these before you can pay:" lists "A phone number on your profile" and "A verified email address"'],
          ['Look at the pay button', 'It is disabled'],
          ['Tap "Go to profile"', 'Navigates to the profile to fix them'],
          ['Call order creation via API anyway', 'Server refuses with "Add a phone number to your profile before checking out." / "Verify your email address before checking out."'],
        ],
      },
      {
        name: 'Billing address and GST validation',
        description: 'The React Hook Form + Zod checkout form validates the invoice address before paying.',
        steps: [
          ['Clear "Address line 1", "City", "State" and tap Pay', 'Errors "Address line 1 is required", "City is required", "State is required"; no order is created'],
          ['Enter a 3-digit pincode', 'Error "Enter a valid pincode"'],
          ['Enter an invalid billing email', 'Error "Enter a valid billing email"'],
          ['Tick "I have a GSTIN (for business invoice)" and enter 10 characters', 'Error "Enter a valid 15-character GSTIN"'],
          ['Pick a saved address from "Deliver to a saved address"', 'Address fields are filled from the address book entry'],
          ['Tick "Save this as my main address" and pay', 'Profile main address is updated (best effort; payment proceeds even if the save fails)'],
        ],
      },
      {
        name: 'Pay with Razorpay - success',
        description: 'Live gateway flow: create order, hosted sheet, verify, success screen.',
        steps: [
          ['With Razorpay enabled in Finance settings tap "Pay <amount>"', 'Processing overlay "Processing your payment…" with "Please don\'t close this tab." (app: "this screen"), then the Razorpay sheet opens'],
          ['Complete payment with a Razorpay test method', 'Verification runs and the success screen "Payment successful" / "You are in" shows'],
          ['Read the success screen', '"Your slot is booked. A receipt with the tax invoice has been emailed to you." with Payment ID, Amount paid, Paid on and Invoice'],
          ['Tap "Ticket & invoice"', 'A PDF with the ticket QR (and invoice for paid) downloads; "Ticket not ready yet — check your email shortly." if the ticket is still being issued'],
          ['Tap "Home" / "My Profile"', 'Navigates to / and /profile'],
          ['Check the server', 'Payment SUCCESS, membership JOINED (source PAID) with the paid seats, ticket issued, receipt email sent'],
        ],
      },
      {
        name: 'Razorpay payment cancelled, failed or timed out',
        description: 'Each gateway outcome gets its own dialog; only a timeout raises a support ticket.',
        steps: [
          ['Open the Razorpay sheet and close it without paying', 'Dialog "Payment cancelled" / "You closed the payment before it went through. Nothing has been charged."'],
          ['Pay with a test method the bank declines', 'Dialog "Payment did not go through" plus "The gateway said: <reason>"'],
          ['Simulate a gateway timeout', 'Dialog "We did not hear back in time" with "Your money is safe…" and "Opening a support ticket…", then "Your support ticket is <ticket no>"'],
          ['Tap "Retry payment"', 'Dialog closes, the error clears and the pay button is usable again'],
          ['Tap "Close"', 'Dialog closes; no membership exists for the pod and the pay button is usable again'],
        ],
      },
      {
        name: 'Verification request drops after payment',
        description: 'A transport failure on verify polls the server instead of reporting failure.',
        steps: [
          ['Complete a Razorpay payment and cut the network just before verifyRazorpayPayment returns', 'Overlay stays up and shows "Your payment went through — we\'re confirming it with the bank. Please don\'t pay again; this can take a minute."'],
          ['Restore the network while polling', 'Success screen shows once the server reports SUCCESS'],
          ['Keep the payment unresolved until polling gives up', 'Error "Your payment is being confirmed — please don\'t pay again…" (never "timeout")'],
          ['Let the server settle it as FAILED / REFUNDED', 'Error "Your payment did not go through, so nothing has been booked…" / "This payment was refunded, so nothing has been booked…"'],
        ],
      },
      {
        name: 'Dummy gateway success and failure',
        description: 'With Finance dummy mode on (and Razorpay off) the form offers a simulator.',
        steps: [
          ['Enable dummy mode, disable Razorpay and open checkout', 'Gateway chip reads Dummy and a "Simulate" select (helper "Dummy gateway only") shows'],
          ['Choose "Successful Payment" and pay', 'Success screen shows and the booking is created'],
          ['On another pod choose "Failed Payment" and pay', 'Error alert "Payment failed. Please try again." and no membership is created'],
        ],
      },
      {
        name: 'Already booked or backout in process',
        description: 'One booking per person per pod; duplicates are refused at order creation.',
        steps: [
          ['As a JOINED member open /checkout/<podId> directly and pay', 'Dialog "Pod already booked" / "You have already booked this pod. You can find your booking in Pod History."'],
          ['Tap "Go to Pod History"', 'Navigates to /pod-history'],
          ['Repeat with "Stay here"', 'Dialog closes, user stays on checkout'],
          ['Try to pay on that pod while your own backout on it is in process', 'Server refuses with code ALREADY_BOOKED (message tells you to use Keep My Spot), so the same "Pod already booked" dialog opens and nothing is charged'],
        ],
      },
      {
        name: 'Checkout edge states',
        description: 'Missing pod, gateway not configured and a pod that started meanwhile.',
        steps: [
          ['Open /checkout with no pod id and no amount', '"Nothing to checkout" with a "Back to Home" button'],
          ['Disable both Razorpay and dummy mode, then pay', 'Error "Online payments are not configured yet. Please try again later."'],
          ['Keep checkout open past the pod start time and pay', 'Server refuses with "This pod has already taken place — booking is closed."'],
          ['Call createRazorpayOrder with amount 0 for a non-pod order', 'Server refuses with "Amount must be greater than 0"'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod History & Tickets',
    description:
      'The member\'s own bookings at /pod-history and /pod-history/:membershipId (native PodHistory / PodHistoryDetails): list search, filter and sort, booking detail with timeline, ticket (QR PDF) and invoice downloads, and removed pods.',
    sub_flows: [
      {
        name: 'Browse joined pods',
        description: 'The list shows every membership with client-side search, category filter and sort.',
        steps: [
          ['Open the account menu and go to Pod History (/pod-history)', 'Title "Pod History" with a "Search joined pods…" field, "Filter" and "Sort" controls'],
          ['With no bookings', '"Pods you have joined will appear here."'],
          ['Type part of a pod title, pod id or club slug', 'Only matching rows stay; no match shows "No Pods Found"'],
          ['Open Filter, pick a Super Category then a Category', 'Filter label reads "Filter (n)" and the list narrows (a Category matches its sub-categories too)'],
          ['Pick a Category before a Super Category', 'Hint "Please select a Super Category first."'],
          ['Open Sort and choose "Price · Low to High"', 'Rows re-order by pod price ascending; default is "Date · Newest first"'],
          ['Tap a row', 'Navigates to /pod-history/<membershipId>'],
        ],
      },
      {
        name: 'Booking detail and timeline',
        description: 'The detail shows the pod summary, status chip, actions and the participation timeline.',
        steps: [
          ['Open a JOINED booking for an upcoming paid pod', 'Summary "Pod details" with date, "Paid pod <amount>", "<n> seats" chip and status chip "Joined"'],
          ['Read the actions row', '"Go to Pod Details", "Backout Pod", "Ticket & invoice", "Invoice", "Contact Support"'],
          ['Read the timeline', '"Pod Joined" / "You have successfully joined the pod." followed by "Pod Date Arrives"'],
          ['Tap "Go to Pod Details"', 'Navigates to the pod page'],
          ['Tap "Contact Support"', 'Opens the support ticket form pre-filled for this booking'],
        ],
      },
      {
        name: 'Download ticket and invoice',
        description: 'The ticket PDF carries the QR the host scans; the invoice exists only for paid bookings.',
        steps: [
          ['On a JOINED paid booking tap "Ticket & invoice"', 'Button shows "Downloading…", then a PDF with the ticket QR code and the invoice downloads'],
          ['Tap "Invoice"', 'Invoice PDF downloads'],
          ['Open a FREE booking', '"Invoice" is disabled (no payment)'],
          ['Open a backed-out booking', 'The ticket button is disabled (status is not JOINED)'],
          ['Request a ticket for a booking whose ticket was never issued', 'Notice "Ticket not available for this booking"'],
        ],
      },
      {
        name: 'Booking on a removed pod',
        description: 'A cancelled pod keeps its booking record with only invoice and support.',
        steps: [
          ['Open Pod History after the host cancelled a pod you booked', 'The booking is still listed'],
          ['Open its detail', 'Notice "This pod was removed. Your booking record stays here — download your invoice or contact support."'],
          ['Read the actions', 'Only "Invoice" and "Contact Support" remain; no Go to Pod Details, Backout or Ticket'],
          ['Read the timeline', 'A "Pod Cancelled" / "Cancelled By" node names who cancelled'],
        ],
      },
    ],
  },
  {
    name: 'App: Backout & Refunds',
    description:
      'Giving a seat back from pod details or Pod History (mWeb + native): full and partial backouts, Keep My Spot, spot fill by a replacement, refunds after the Backouts deduction, rejoin and the attempt limit. A refund is only owed once someone fills the released seat.',
    sub_flows: [
      {
        name: 'Back out of a paid single-seat booking',
        description: 'Confirm Backout releases the seat to public sale; the refund waits for a replacement.',
        steps: [
          ['As a JOINED member of an upcoming paid pod tap "Backout" on the booking bar', 'Dialog "Backout from Pod?" with "You will get the refund only if someone fills your spot."'],
          ['Read the estimate', '"If the refund is done, you will get <amount> for 1 seat (after the <pct>% backout deduction)." plus "+<n> Duncit Coins back…" when coins paid part of it'],
          ['Tap the "Backout Terms & Conditions" link', 'Opens /policies/backout-terms'],
          ['Tap "Confirm Backout"', 'Button shows "Backing out…", dialog closes and notice "Backout in process — your seat is now open for booking."'],
          ['Look at the booking bar', '"Searching for a replacement · Backout in process" with a "Keep My Spot" button'],
          ['Check the server', 'A BackoutRequest DUN-BKO-… is IN_PROCESS with the refund snapshot; membership is BACKOUT_IN_PROCESS, refund_status PENDING; the pod\'s seat count drops'],
        ],
      },
      {
        name: 'Partial backout of a multi-seat booking',
        description: 'Releasing some seats keeps the member JOINED with fewer seats.',
        steps: [
          ['Hold a 4-seat booking and tap "Backout"', 'Dialog shows a "Seats to release" select with "<n> of 4" options'],
          ['Choose 2', 'Hint "You keep 2 seats and stay in this pod." and the refund estimate is for 2 seats'],
          ['Choose 4', 'Hint "Releasing your whole booking — you leave the pod."'],
          ['Choose 2 and confirm', 'Bar still shows "You\'re going · Pod Booked" and adds "You released 2 seats — we are finding someone to fill them." with "Take Seats Back"'],
          ['Check the ticket', 'The ticket now admits 2 seats and Pod History timeline shows "Partial Backout Requested" / "You released 2 of 4 seats and kept 2."'],
        ],
      },
      {
        name: 'Keep My Spot restores the booking',
        description: 'Cancelling an in-process backout before anyone fills the seat.',
        steps: [
          ['With a backout in process tap "Keep My Spot"', 'Dialog "Change of plans?" says you can back out up to <n> more times'],
          ['Tap "Keep My Spot" in the dialog', 'Button shows "Restoring…", dialog closes, notice "Your booking is restored."'],
          ['Look at the bar', '"You\'re going · Pod Booked" with Backout available again'],
          ['Check the server', 'BackoutRequest CANCELLED, membership JOINED, seats claimed back; timeline shows "Spot Kept"'],
          ['After a partial release tap "Take Seats Back"', 'The released seats are added back to the booking and the ticket'],
        ],
      },
      {
        name: 'Keep My Spot after a replacement booked the seat',
        description: 'Once the seat is filled the backout is terminal.',
        steps: [
          ['Back out, then have another user book the released seat', 'Your request flips to SPOT_FILLED'],
          ['Open the pod and tap "Keep My Spot" (if still visible from a stale page)', 'Dialog shows the error "A replacement has been confirmed — this Backout request can no longer be cancelled."'],
          ['Reload the pod page', 'Bar shows the lock notice "A replacement has been confirmed — this Backout request can no longer be cancelled. Your refund will be processed as per the backout policy."'],
        ],
      },
      {
        name: 'Seat filled by a replacement',
        description: 'Any join path fills the oldest in-process backout when the pod would otherwise overflow.',
        steps: [
          ['User A backs out of a full pod', 'Seat is back on sale; A is BACKOUT_IN_PROCESS'],
          ['User B books the pod (free join or paid checkout)', 'B joins successfully'],
          ['Check A\'s records', 'BackoutRequest SPOT_FILLED, membership BACKED_OUT and refund eligible for Finance to process'],
          ['Check A\'s notifications and email', 'In-app/push "Your spot was filled" — "A replacement booked your spot in <pod title>. Your refund of ₹<amount> will be processed by our team shortly." plus the spot-filled email'],
          ['Open A\'s Pod History detail', 'Status "Backed out", refund chip "Refund: Criteria pending" or "Refund initiated", timeline "Spot Filled"'],
          ['Open the pod page as another viewer', 'Attendees list shows A struck through with "Spot filled by <B>"'],
        ],
      },
      {
        name: 'Backout from Pod History',
        description: 'The same backout dialog is reachable from the booking detail.',
        steps: [
          ['Open an upcoming JOINED booking in /pod-history/<id> and tap "Backout Pod"', 'The "Backout from Pod?" dialog opens'],
          ['Confirm', 'Toast "Backout request recorded"; status chip "Backout in process" and the replacement notice "We are finding your replacement. If someone fills your spot, the refund will be initiated with <pct>% deduction."'],
          ['Open a booking for a pod that has already started', 'No Backout Pod button is shown'],
        ],
      },
      {
        name: 'Rejoin a backed-out pod for free',
        description: 'A BACKED_OUT booking on an upcoming pod can be restored without paying, unless the spot was filled.',
        steps: [
          ['Open a BACKED_OUT booking on an upcoming pod whose request was not filled', '"Rejoin Pod" button is shown'],
          ['Tap "Rejoin Pod"', 'Dialog "Rejoin this pod?" — "You\'ll rejoin this pod for free — no payment is required…"'],
          ['Tap "Rejoin for free"', 'Toast "Rejoined pod successfully", status "Joined", ticket available again'],
          ['Try rejoin when the latest request is SPOT_FILLED (API)', 'Error "A replacement took your spot — please book the pod again."'],
          ['Try rejoin after the pod started or completed', 'Errors "This pod has already taken place — rejoin is closed." / "This pod is already complete — rejoin is closed."'],
        ],
      },
      {
        name: 'Backout attempt limit reached',
        description: 'Attempts per user per pod are capped by Admin > Pods > Pod Settings (default 3).',
        steps: [
          ['Set max backout attempts to 2 and back out + Keep My Spot twice on one pod', 'Each attempt creates a new BackoutRequest'],
          ['Open the pod page', 'No Backout button; note "You have reached the maximum number of Backout attempts allowed for this Pod."'],
          ['Open the booking in Pod History', '"Backout Pod" is shown disabled with that sentence as a tooltip'],
          ['Call backoutPod via API', 'Server refuses with the same message (code BACKOUT_LIMIT_REACHED)'],
        ],
      },
      {
        name: 'Backout closed once the pod starts',
        description: 'A pod that has started cannot be backed out of.',
        steps: [
          ['As a member open a pod after its start time', 'Bar shows "You went · Pod Visited" with no Backout button and note "This pod has already taken place."'],
          ['Call backoutPod via API', 'Server refuses with "This pod has already taken place — backout is closed."'],
        ],
      },
      {
        name: 'Joining is blocked during your own backout',
        description: 'A member with a backout in process must use Keep My Spot instead of booking again.',
        steps: [
          ['With a backout in process call joinFreePod on the same free pod', 'Error "Your backout for this pod is still in process — use Keep My Spot to restore your booking." (code BACKOUT_IN_PROCESS)'],
          ['Back out again while already in process (API)', 'Error "Your backout for this pod is already in process."'],
        ],
      },
      {
        name: 'Refill a released spot by referral link (mWeb)',
        description: 'mWeb only: a backed-out member can share a referral link that joins a friend into the pod.',
        steps: [
          ['As a BACKED_OUT member with a referral token open the pod on mWeb', 'Bar shows "You have backed out. Refund status:" and "Refer a friend to refill your spot…" with "Copy referral link" and Share'],
          ['Tap "Copy referral link"', 'Notice "Referral link copied"; the URL ends with ?ref=<token>'],
          ['Open the link as a friend who is not a member', 'Friend joins, confetti plays and "Joined via referral" shows'],
          ['Open your own referral link', 'Error "You cannot redeem your own referral"'],
          ['Open a link with an unknown token', 'Error "Invalid referral link"'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Cancellation - Attendee View',
    description:
      'What a booked attendee experiences when a pod is cancelled by its host, a venue owner, Duncit staff or the auto-cancel sweep (finance-negative pods). Refunds and notices go through one shared cancellation path.',
    sub_flows: [
      {
        name: 'Host cancels a pod you booked',
        description: 'All SUCCESS payments are refunded and every attendee is emailed.',
        steps: [
          ['Book a paid pod as an attendee', 'Booking is JOINED'],
          ['As the host cancel the pod with reason "Venue unavailable" and a note', 'Host sees the pod leave Your Pods'],
          ['Check the attendee inbox', 'A cancellation email carrying the host\'s note and a refund email for the payment arrive'],
          ['Open the pod link as the attendee', '"Pod not found."'],
          ['Open Pod History detail', 'Removed-pod notice, only Invoice and Contact Support, timeline "Pod Cancelled" / "The pod was cancelled by the host."'],
          ['Check the payment in Finance', 'Payment is marked refunded with metadata.refunded_amount set; any in-process backout requests on the pod are CANCELLED'],
        ],
      },
      {
        name: 'Duncit auto-cancels a finance-negative pod',
        description: 'With auto-cancel enabled, a pod that cannot cover its venue slot inside the venue trigger window is cancelled by the system.',
        steps: [
          ['Enable Admin > Pods > Pod Settings auto-cancel and book a pod whose collection cannot cover its venue slot price', 'Pod is live and under-sold'],
          ['Wait until inside the venue\'s trigger hours before start (sweep runs every 10 minutes)', 'Pod is soft-deleted with reason "Cancelled automatically — the pod could not cover its venue cost"'],
          ['Check the attendee', 'Receives the "pod cancelled by Duncit" WhatsApp + email and a refund of the percentage set by the venue\'s refund ladder (100% when the venue has no ladder); product money is returned in full'],
          ['Check Pod History', 'Timeline shows the cancellation by the system'],
          ['Repeat for a venue marked reschedule-only', 'The pod is NOT cancelled by the sweep'],
        ],
      },
    ],
  },
  {
    name: 'App: Attendance & Visited - Attendee View',
    description:
      'How a booked attendee is marked present (door scan, host manual mark, Club Admin override, or opening a virtual pod\'s meeting link) and how "Visited" is shown. Pod History "Visited" requires a CHECKED_IN ticket; the pod page bar switches to "You went · Pod Visited" once the pod has started.',
    sub_flows: [
      {
        name: 'Checked in at the door',
        description: 'After the host scans the ticket QR the attendee is recorded as attended.',
        steps: [
          ['Book a pod and show the ticket QR from the downloaded ticket PDF to the host', 'Host scans it within the scan window'],
          ['Check the attendee notifications', 'An attendance-marked notification arrives'],
          ['After the pod ends open Pod History detail', 'Status chip reads "Visited" and the timeline shows "Pod Attended" / "You attended the pod. Experience recorded."'],
          ['Open the pod page', 'Bar shows "You went · Pod Visited"'],
        ],
      },
      {
        name: 'Past pod with no attendance recorded',
        description: 'A member who was never checked in stays "Joined".',
        steps: [
          ['Book a pod where the host never scans anyone', 'Pod ends'],
          ['Open Pod History detail', 'Status chip still reads "Joined" (not Visited)'],
          ['Read the timeline', '"Attendance Not Recorded" / "Nobody scanned tickets at this pod, so attendance was never taken."'],
          ['Book a pod where others were scanned but you were not', 'Timeline shows "Pod Not Attended" / "You did not attend the pod."'],
        ],
      },
      {
        name: 'Join a virtual pod meeting',
        description: 'Opening the meeting link from the pod page inside the window marks a member present (VIRTUAL_JOIN).',
        steps: [
          ['Join a virtual pod and open its page', 'Time & Venue shows the meeting platform and a "Join meeting" button'],
          ['Within 1 hour before start to 1 hour after end tap "Join meeting"', 'Button shows "Opening…", the meeting URL opens in a new tab / browser and the page refetches'],
          ['Check the ticket', 'Ticket is CHECKED_IN with method VIRTUAL_JOIN; the host board row reads "Joined the meeting"'],
          ['Tap "Join meeting" a day before the pod', 'The link still opens but no attendance is recorded'],
          ['Call joinPodMeeting as a non-member', 'Error "Join this pod to get the meeting link"'],
          ['If the link cannot be opened', 'Message "Could not open the meeting link"'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Ratings & Feedback',
    description:
      'Per-aspect pod ratings from the in-app prompt and the shared link /pod/:podId/feedback (native PodFeedback, same URL). Only attendees the host marked present may rate; Overall is the only required aspect; the server decides which aspects a pod has and may pay Duncit Coins for feedback.',
    sub_flows: [
      {
        name: 'Rate a pod from the prompt',
        description: 'After a pod the user was marked present at, the app asks how it went.',
        steps: [
          ['Get marked present at a pod, let it end, then open the app', 'Dialog "How was “<pod title>”?" with "Rate whichever parts you have an opinion on. Only the first is needed."'],
          ['Read the aspects', 'Overall pod experience, Host, and — only when applicable — Venue, Food (physical pods), Club admin (when not also the host), Safety, Anything else; plus a Comments field'],
          ['Look at "Submit" before rating Overall', 'Submit is disabled'],
          ['Rate Overall 4 stars and Venue 2 stars, add a comment, tap "Submit"', 'Button shows "Sending…", dialog closes'],
          ['Check the coin balance', 'When Finance pays pod_feedback_coins > 0 the balance increases once for this feedback'],
          ['Force the submit to fail (network off)', 'Error "That could not be sent. Please try again." and the dialog stays open with the answers'],
        ],
      },
      {
        name: 'Dismiss the rating prompt',
        description: 'Closing the prompt asks whether to come back.',
        steps: [
          ['Tap "Close" on the rating dialog', 'Dialog "Should we ask you again?" explains who reads the rating'],
          ['Tap "Remind me next time"', 'Dialog closes; the prompt stays quiet for 24 hours'],
          ['Close it again and choose "Do not remind me again"', 'The prompt never returns for that pod'],
        ],
      },
      {
        name: 'Rate from the host\'s shared link',
        description: 'The standalone rating page opens filled in if the guest already rated.',
        steps: [
          ['Open /pod/<podId>/feedback as a marked-present attendee', 'Page "Rate this pod" shows the aspect form'],
          ['Rate and submit', 'Message "Thanks — your rating has been saved."'],
          ['Open the link again', 'Message "You already rated this pod. Change anything you like and send it again." with the stored stars and the "Update rating" button'],
          ['Change a score and tap "Update rating"', 'Button shows "Saving…" and the same feedback record is updated (no second coin credit)'],
          ['Open the link signed out', 'Redirected to login and returned to the page after sign-in'],
        ],
      },
      {
        name: 'Rating link opened without access',
        description: 'Only attendees the host marked present may rate.',
        steps: [
          ['Open /pod/<podId>/feedback as a user who never joined', 'Warning "You do not have access to this link because you have not joined this pod, or your attendance has not been marked by the host."'],
          ['Open it as a member who was not marked present', 'Same warning'],
          ['Submit feedback via API as that user', 'Server refuses with "Only an attendee the host has marked present can rate this pod"'],
          ['Open a feedback link with a bad pod id', 'Error "That pod could not be opened. Check the link and try again."'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Media Uploads',
    description:
      'The Upload Pod Media page /pod/:podId/media (native PodMedia screen, opened from Your Pods): the host and attendees marked present add photos and videos to the pod; the Complete Pod screen uses this media. The shared link is an mWeb route.',
    sub_flows: [
      {
        name: 'Host uploads pod media and shares the link',
        description: 'The host opens the page from Your Pods and asks guests for photos.',
        steps: [
          ['In Your Pods open a pod\'s ⋮ menu and tap the "Upload Pod Media" row', 'Page "Upload Pod Media" with the host intro and "Nothing has been added to this pod yet."'],
          ['Tap "Add photos or videos" and pick two images', '"Saving to this pod…", then "2 added" and "2 on this pod" with each item tagged "Host"'],
          ['Tap "Copy upload link"', 'Toast "Upload link copied"'],
          ['Tap "Share upload link"', 'Share sheet opens with "Add your photos from “<title>” here:" and the link'],
          ['Remove one of the items', 'Item disappears and "Removed" shows'],
        ],
      },
      {
        name: 'Guest adds photos from the link',
        description: 'An attendee who was marked present adds media and can remove only their own.',
        steps: [
          ['Open /pod/<podId>/media as a marked-present attendee', 'Guest intro "Add your photos and videos from this pod…" and the add button'],
          ['Upload a video', 'Item shows "Added by <name>" tagged "Guest"'],
          ['Look at the host\'s items', 'No Remove control on items uploaded by others'],
          ['Remove your own item', 'It is removed'],
          ['Upload past 200 items in total (API)', 'Error "A pod holds at most 200 photos and videos"'],
        ],
      },
      {
        name: 'Media link opened by someone not marked present',
        description: 'Non-attendees are told why instead of being given a picker.',
        steps: [
          ['Open /pod/<podId>/media as a member who was not marked present', 'Message "Only the host and the people whose attendance was marked can add media to this pod. Ask the host to mark you present."'],
          ['Call addPodPartyMedia via API as that user', 'Server refuses with "Only the host and the people marked present can add media to this pod"'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod Ideas',
    description:
      'The community idea board at /pod-ideas (native PodIdeas): browse and filter ideas, submit an idea with a full category path, like, comment, share and delete your own. New ideas wait for admin approval.',
    sub_flows: [
      {
        name: 'Browse and filter ideas',
        description: 'Public ideas list with search and a category cascade filter.',
        steps: [
          ['Open /pod-ideas', 'Header "Pod Ideas" with "Search ideas…" and a "Filter by category" cascade'],
          ['With no approved ideas', '"No ideas yet — be the first to share one!"'],
          ['Type in the search box', 'Ideas list narrows to matching titles/descriptions'],
          ['Pick a Super Category and Category in the filter', 'Only ideas in that category remain'],
          ['Tap an idea card', 'Idea details dialog opens with description, likes and comments'],
        ],
      },
      {
        name: 'Submit a pod idea',
        description: 'An idea needs a title, a description and a Super Category > Category > Sub Category.',
        steps: [
          ['Tap "Share an idea"', 'Dialog "Share a pod idea" with Title, Description and the category cascade'],
          ['Tap "Submit idea" with the title empty', 'Error "Title and description are both required"'],
          ['Fill title and description but only the Super Category', 'Error "Please select a Super Category, Category and Sub Category"'],
          ['Complete the category path and submit', 'Dialog closes and toast "Idea submitted! It will appear publicly once approved."'],
          ['Look at your ideas', 'The new idea shows with a PENDING status chip and its idea number'],
        ],
      },
      {
        name: 'Like, comment and share an idea',
        description: 'Engaging with an idea from its card or detail dialog.',
        steps: [
          ['Tap "Like idea" on an idea', 'Like count increments'],
          ['Open the idea and post a comment in "Add a comment"', 'Comment appears in the list'],
          ['Tap share on an idea', 'Share sheet opens with a tracked link to /pod-ideas?id=<id>; without Web Share "Link copied to clipboard"'],
        ],
      },
      {
        name: 'Delete your own idea',
        description: 'The author can permanently delete an idea with its likes and comments.',
        steps: [
          ['On your own idea card tap the delete icon', 'Confirm dialog "Delete this idea?" — "This will permanently remove the idea, its likes, and all comments."'],
          ['Tap "Delete"', 'Toast "Deleted" and the idea disappears'],
          ['Look at an idea by another user', 'No delete icon is shown'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Create Pod Stepper',
    description:
      'The host 4-step stepper at /create-pod and /create-pod/:draftId (native CreatePod): Pod Basics, Location/Category/Club, Venue & Slot (or Meeting Time & Medium for virtual), Pricing & Publish. React Hook Form + Zod per step, autosaved drafts, AI content check, and server re-validation.',
    sub_flows: [
      {
        name: 'Non-host cannot create pods',
        description: 'Only an approved, active host may use the stepper.',
        steps: [
          ['Sign in as a user without the HOST role or approved host profile and open /create-pod', 'Info alert "An approved host profile is required before creating pods." with a "Become a host" button'],
          ['Tap "Become a host"', 'Navigates to /become-host (partner redirect)'],
          ['Call createPartnerPod via API as that user', 'Server refuses with "Host access is required before creating pods"'],
          ['Repeat as a deactivated host', 'Server refuses with "Your host account has been deactivated"'],
        ],
      },
      {
        name: 'Step 1 - Pod Basics validation',
        description: 'Category, title, description, cover image and offers gate the first step.',
        steps: [
          ['Open /create-pod as a host with several host categories', 'Hero "Step 1 of 4 · Pod Basics" and the "AI monitoring" chip'],
          ['Tap "Next" with everything empty', 'Errors "Select a category", "Title is too short", "Add a longer description", "Add at least one thing this pod offers"; stays on step 1'],
          ['Enter a 2-character title / 121-character title', 'Errors "Title is too short" / "Title is too long"'],
          ['Enter a description under 10 characters', 'Error "Add a longer description"'],
          ['Upload only a video as media', 'Publishing later fails with "Add at least one image URL" (at least one image required)'],
          ['Fill all fields validly and tap "Next"', 'Moves to "Step 2 of 4 · Location, Category & Club"'],
          ['Sign in as a host with exactly one category', 'The category is pre-selected'],
        ],
      },
      {
        name: 'Step 2 - Location, category and club',
        description: 'Clubs are filtered by the host category and, for physical pods, by city and locality.',
        steps: [
          ['On step 2 read "Pod location"', 'Shows the header-selected city (or "No location selected") with a "Change" button'],
          ['Choose "Physical" under "Pod mode"', 'The Club field lists only clubs in that city/locality matching the host category'],
          ['Switch to "Virtual"', 'The Club field lists every club in the host category regardless of city'],
          ['Tap "Next" without a club', 'Error "Select a club"'],
          ['Select a club and tap "Next"', 'Step 3 opens ("Venue & Slot" for physical, "Meeting Time & Medium" for virtual)'],
        ],
      },
      {
        name: 'Step 3 - Book a venue slot (physical)',
        description: 'The host picks one of the club\'s matched partner venues, a space and an available slot.',
        steps: [
          ['On step 3 look at "Select venue"', 'Only the selected club\'s matched, active venues are listed with "Up to <capacity>"'],
          ['Pick a club with no matched venues', 'Info "No venues match this club yet — pick another club or go virtual."'],
          ['Tap "Next" without choosing a venue and slot', 'The stepper stays on step 3 (the slot sets the pod date/time, so nothing can advance without one)'],
          ['Select a venue', '"Total capacity: <n>" and a "Space & capacity" select with helper "Pick a space — its capacity sets No. of spots. Slots show after this."'],
          ['Pick a space, then a date with no slots', '"No slots on this day. Pick another date."'],
          ['Publish via API with a slot id that belongs to another venue', 'Server refuses with "Slot does not belong to the selected venue"'],
          ['Pick an available slot', '"Pod window from slot: <duration>" shows and the slot sets the pod date/time'],
          ['Pick a slot at a venue you do not own', 'Note "The pod goes live only after the venue approves this slot…" and the venue contact card with "Call Venue" / "Get Directions"'],
          ['Pick a slot at your own venue', 'Note "This is your venue — the slot books instantly and the pod goes live on publish."'],
        ],
      },
      {
        name: 'Step 3 - Schedule a virtual pod',
        description: 'Virtual pods need a listed platform, a valid link and a start/end at least 30 minutes apart.',
        steps: [
          ['On a virtual pod tap "Next" with the step empty', 'Error "Start date/time required" under "Start date & time"; the stepper stays on step 3'],
          ['Set a future start only, leave platform, link and end empty, tap "Next"', 'Errors "Choose where the meeting happens", "Meeting link is required" and "A virtual pod needs an end date and time"'],
          ['Enter meeting link "zoom.us/abc"', 'Error "Meeting link must be valid" (must start with http/https)'],
          ['Pick a start date/time in the past', 'Error "Start date/time must be in the future"'],
          ['Set the end equal to the start', 'Error "End must be after start"'],
          ['Set the end 20 minutes after the start', 'Error "End must be at least 30 minutes after the start"'],
          ['Set a valid platform, https link, future start and end 1 hour later', '"Total duration: 1h" shows and "Next" opens step 4'],
        ],
      },
      {
        name: 'Step 4 - Pricing and earnings preview',
        description: 'Pod type, ticket price, spots, charges, multi-ticket tiers and the server earnings waterfall.',
        steps: [
          ['On a physical pod look at the pod type cards', '"Free" is disabled with caption "Physical pods are always paid"; "Paid" is selected'],
          ['Leave ticket price blank and publish', 'Error "Enter a ticket price to continue"; entering 0 shows "Ticket price must be more than ₹0"'],
          ['Enter 2500 and publish', 'Validation fails on the price (max 1999, hint "Gross ticket price, max 1999."); the server also refuses "pod_amount must be between 0 and 1999"'],
          ['Tap "Suggested Price"', 'Dialog "Suggested Ticket Prices" lists five tiers with "What You Get"; with no spots set it says to set the number of spots first'],
          ['Set spots below the category minimum', 'Hint "This activity needs at least <min>, and the space you booked holds <max>." and the stepper stops at the bounds'],
          ['Enter a price and spots', '"Potential earnings" shows Total collection (price × spots), deductions and "You will receive" with the host free-spot note'],
          ['On a virtual pod choose "Free"', 'Ticket price is locked to 0 ("Free pods are ₹0.")'],
          ['Add a place charge without a label', 'Error "Label required"'],
        ],
      },
      {
        name: 'Step 4 - Blocked by earnings rules',
        description: 'Create Pod stays disabled when the host would earn nothing or the pod cannot cover its venue slot.',
        steps: [
          ['Set a ticket price so low that projected earnings are ₹0', 'Notice "No Earnings Generated" and "Create Pod" is disabled'],
          ['Pick a slot whose venue price exceeds total pod value', 'Warning "Your venue price is greater than the total Pod value…" and "Create Pod" is disabled'],
          ['Bypass the UI and call the create API with those values', 'Server refuses via the viable-economics guard'],
        ],
      },
      {
        name: 'Step 4 - Multi-ticket discount tiers',
        description: 'Optional tiers validated against the admin maximum discount.',
        steps: [
          ['Turn on "Offer a discount when one person books multiple tickets" with no tiers', 'Error "Add at least one discount tier"'],
          ['Add a tier with tickets 1', 'Error "Tickets must be a whole number of at least 2"'],
          ['Add a second tier with fewer tickets than the first', 'Error "Needs more tickets than the row above"'],
          ['Set a discount above the admin maximum', 'Error "Discount can’t be more than <max>%"'],
          ['Add a valid tier (3 tickets, 10%)', 'Row shows "<price> per ticket" and no errors'],
        ],
      },
      {
        name: 'Publish a pod that goes live',
        description: 'Own-venue or virtual pods go live immediately after the AI content check.',
        steps: [
          ['Leave "I agree to the Organizer Terms of Service…" unticked and tap "Create Pod"', 'Error "Accept the Organizer Terms to publish"'],
          ['Tick the terms and tap "Create Pod"', 'Blocking overlay "AI is monitoring…" with "Please stay on this screen."'],
          ['Wait for the result on a virtual or own-venue pod', 'Navigates to /host/manage and the pod is listed under Your Pods'],
          ['Check the server', 'Pod created with the host as attendee, is_active true, venue_approval_status NONE (virtual) or slot BOOKED (own venue); a CREATE audit row exists; the draft is removed'],
          ['Open the new pod URL', 'Pod details page renders the published content'],
        ],
      },
      {
        name: 'Publish with a partner venue slot request',
        description: 'A slot at someone else\'s venue holds the slot and waits for approval.',
        steps: [
          ['Publish a physical pod with a partner venue slot', 'Navigates to /host/pod-pending/<podId> titled "Slot Request Sent"'],
          ['Read the page', 'Amber banner "Your Pod will go live once the venue accepts your slot request.", summary with "Current status: Awaiting venue approval" and the venue card "Pending Approval"'],
          ['Open the pod URL as another user', 'The pod is offline (not bookable) until approved'],
          ['Have the venue approve and tap "Refresh"', 'Banner turns green "Your slot is confirmed — this Pod is live." and status "Live"'],
        ],
      },
      {
        name: 'AI content check blocks publishing',
        description: 'Guideline violations stop creation and jump the host to the offending step.',
        steps: [
          ['Put a phone number in the description and tap "Create Pod"', 'Dialog "Fix these before publishing" lists each violation with "Fix in Pod Basics"'],
          ['Tap the fix action', 'Stepper jumps to step 1 and the description field shows the moderation message'],
          ['Tap the "AI monitoring" chip', 'Dialog "What AI monitors" lists the six rules and the account-health warning; "Got it" closes it'],
          ['Remove the phone number and publish', 'Pod is created'],
        ],
      },
      {
        name: 'Server rejects the publish',
        description: 'Races and rules the client cannot see are reported as the server wrote them.',
        steps: [
          ['Pick a slot, let another host book it, then publish', 'Error alert "Selected slot is no longer available"; stepper stays on step 4'],
          ['Pick a slot on a date the venue marked as leave', 'Error "The venue is on leave on this date. Pick another slot."'],
          ['Publish fewer spots than the sub-category minimum via API', 'Error "This activity needs at least <n> people — increase the number of spots"'],
          ['Publish a physical FREE pod via API', 'Error "Physical pods must be paid — free pods are only available for virtual pods"'],
        ],
      },
      {
        name: 'Save, resume and delete drafts',
        description: 'The stepper autosaves; drafts are listed in Your Pods and deleted after the retention period.',
        steps: [
          ['Fill step 1 and wait 4 seconds', 'A draft is saved (savePodDraft) without leaving the page'],
          ['Tap "Next"', 'The draft is saved again with the new step'],
          ['Close the stepper and open Your Pods (/host/manage)', '"Draft pods" lists the draft by title (or "Untitled pod") with its step and a retention note "Draft Pods are automatically deleted <days> days after they are created…"'],
          ['Tap "Continue" on the draft', 'Navigates to /create-pod/<draftId> on the saved step with the values restored'],
          ['Let a draft come within 24 hours of deletion', 'It moves under "Deleted in the next 24 hours" with "Deleted in <n>h"'],
          ['Tap the delete icon and confirm "Delete draft?"', 'Draft is permanently removed from the list'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Your Pods & Pod Actions',
    description:
      'Host Studio > Your Pods at /host/manage (native HostManage + PodActionsSheet): Requested / Your / Rejected sections, the per-pod ⋮ menu from @duncit/host-pod-actions, editing, flexible spot count, resubmitting a venue-rejected pod, Add status, the club admin card and Request Change.',
    sub_flows: [
      {
        name: 'Review hosted pods by section',
        description: 'myHostPods splits pods by venue approval state.',
        steps: [
          ['Switch to Host Studio (menu > "Switch role" > Host Studio) and open /host/manage', 'Page "Your Pods" with "Insights" and "Create" buttons, Draft pods, Requested Pods, Your Pods and Rejected Pods'],
          ['Look at a pod awaiting venue approval', 'Listed under "Requested Pods" with "Requested on" and chip "Venue Approval Pending"'],
          ['Look at a venue-declined pod', 'Listed under "Rejected Pods" ("The venue turned these slots down…") with chip "Venue Rejected"'],
          ['Open the Your Pods filter and choose Virtual / Upcoming / Paid', 'Label "Filter (3)" and only matching pods remain; no match shows "No pods match these filters. Try adjusting or resetting them."'],
          ['Tap "Insights"', 'Navigates to /host/dashboard'],
        ],
      },
      {
        name: 'Pod menu follows the pod\'s phase',
        description: 'Scan opens 15 minutes before start; Complete appears only after the end; Edit/Request Change/Cancel close after the end.',
        steps: [
          ['Open ⋮ on a pod starting tomorrow', '"Scan attendee event tickets" is greyed with "Scanning opens 15 minutes before the pod starts."; "Complete pod" is absent; Edit and Cancel are enabled'],
          ['Open ⋮ 10 minutes before start', 'The scan row is enabled'],
          ['Open ⋮ after the pod ended', 'Scan row greyed "This pod has ended — tickets can no longer be scanned."; "Complete pod" is shown; Edit, Request Change Host and Cancel are greyed with "This pod has ended — it can no longer be edited, re-hosted or cancelled."'],
          ['Open ⋮ on a venue-rejected pod', 'Scan, See Marked Attendance, Complete, media and feedback rows are hidden; Edit and Cancel remain'],
          ['Check the other rows', '"See Marked Attendance", "Slot Request Status", "Upload Pod Media" (share/copy icons), "Feedback link" (share/copy icons), "Pod Club Admin", "Request Change Host"'],
        ],
      },
      {
        name: 'Edit a live pod',
        description: 'Hosts may change title, description, media, reel, multi-ticket tiers and raise spots.',
        steps: [
          ['Open ⋮ > "Edit pod" on an upcoming pod', 'Dialog "Edit pod" with Title, Description, Media, spots and the multi-ticket discount'],
          ['Clear the title to 2 characters and save', 'Error "Title is too short"'],
          ['Remove every image', 'Error "Add at least one image URL"'],
          ['Change the title and description and tap "Save changes"', 'Button shows "Saving…", dialog closes, the row updates'],
          ['Check attendees', 'Each booked attendee receives a pod-updated email; an UPDATE audit entry is recorded'],
        ],
      },
      {
        name: 'Edit blocked by the content check',
        description: 'Every host edit is screened; a refused edit is recorded.',
        steps: [
          ['In "Edit pod" change the title to include a banned word glued to another word', 'Alert "Content check" lists the violation and nothing is saved'],
          ['Check Club Admin > Pod Monitoring (AI)', 'A "Content Blocked" entry with the attempted change and risk HIGH exists'],
          ['Fix the title and save', 'Edit saves'],
        ],
      },
      {
        name: 'Raise spots on a live pod',
        description: 'Flexible pod count: the host may only increase, up to the booked space capacity.',
        steps: [
          ['Open "Edit pod" on a live venue pod', 'Spots hint "The space this pod booked holds <capacity> people. <taken> seats are already taken." and "A live pod’s spots can only be increased — ask your Club Admin to reduce them."'],
          ['Increase spots within capacity and save', 'Pod saves with the new no_of_spots and more seats become bookable'],
          ['Try to lower spots (API)', 'Error "A live pod’s spots can only be increased — ask your Club Admin to reduce them"'],
          ['Try above the space capacity (API)', 'Error "The booked space holds <n> people — the pod cannot have more spots than that"'],
        ],
      },
      {
        name: 'Resubmit a venue-rejected pod',
        description: 'The same pod row is edited and its booking request sent again.',
        steps: [
          ['On a pod under Rejected Pods open ⋮ > "Edit pod"', 'Dialog "Edit & resubmit pod" with the hint about picking a different venue or slot'],
          ['Keep the same partner venue without a new slot and resubmit', 'Server refuses; the pod stays rejected'],
          ['Pick a different venue and an available slot, tap "Resubmit request"', 'Button shows "Resubmitting…", the pod moves to Requested Pods with "Venue Approval Pending" and the venue is notified again'],
          ['Pick your own venue\'s slot instead', 'Pod goes live immediately and moves to Your Pods'],
          ['Call hostResubmitPod on a pod that was not rejected', 'Error "Only a pod whose venue request was rejected can be edited and resubmitted"'],
        ],
      },
      {
        name: 'Slot request expires unanswered',
        description: 'A pending venue request lapses at the slot start time.',
        steps: [
          ['Request a partner slot and let the venue ignore it until the slot start passes', 'The 10-minute sweep declines it with reason "Missed View Deadline by the Venue"'],
          ['Open Your Pods', 'The pod is under Rejected Pods with "Venue Rejected"; the host was notified'],
          ['Open ⋮ > "Slot Request Status"', 'Red banner "The venue declined your slot request." with the edit-and-resend instruction'],
        ],
      },
      {
        name: 'Add status media to your pod',
        description: 'Host-only "Add status" on pod details appends a photo or clip to the pod gallery.',
        steps: [
          ['As the pod host open the pod details page', 'Overview shows "Add status" with an eye note "Only visible to you" and an info icon'],
          ['Tap the info icon', 'Dialog "About adding a status" explains the option is host-only and the media is public'],
          ['Tap "Add status" and pick a photo', '"Adding status…", then the photo appears in the hero gallery for everyone'],
          ['Open the same pod as a co-host or attendee', 'No "Add status" option is shown'],
          ['Call addPodStatus via API as a non-host', 'Error "Only pod hosts can add status media"'],
        ],
      },
      {
        name: 'Contact the pod\'s club admin',
        description: 'The "Pod Club Admin" dialog shows contacts and can alert every club admin.',
        steps: [
          ['Open ⋮ > "Pod Club Admin"', 'Dialog "Pod Club Admin" / "Contact the Club Admin" with the admin card (call, message, email)'],
          ['Open it on a pod whose club has no admin', 'Info "This pod’s club has no admin assigned yet."'],
          ['Tap "Ask for help"', 'Button shows "Asking…", then "The club admin has your request, with this pod’s details. They will reach out soon."'],
          ['Tap "Ask for help" again the same day', '"You already asked about this pod today — the club admin has your request."'],
          ['Tap "Raise a support ticket"', 'Opens the support form carrying the pod'],
        ],
      },
      {
        name: 'Request a change of host',
        description: 'Instead of cancelling, the host asks Duncit to hand the pod to another host.',
        steps: [
          ['Open ⋮ > "Request Change Host" on an upcoming pod', 'Dialog "Ask Duncit for a change?" with the host sentence, the health-point deduction and "<n> people have already booked seats on this pod."'],
          ['Tap "Yes, request a change" without a reason', 'Error "Please tell us why you need this change"'],
          ['Enter a reason and confirm', 'Toast "Duncit has your request. We will find a replacement." and the Change Requests section lists it as "Looking for a replacement"'],
          ['Request again on the same pod', 'Row blocked with "Duncit is already working on your change request for this pod."'],
          ['Withdraw the request and confirm "Withdraw this request?"', '"Request withdrawn." (health points are not returned)'],
        ],
      },
      {
        name: 'Answer a change request offer',
        description: 'A host offered someone else\'s pod approves or passes at /change-requests.',
        steps: [
          ['As a host Duncit offered a pod to, open /change-requests (from the notification)', '"Waiting on you" lists the pod with Approve and Pass'],
          ['Tap "Approve"', '"Done — the pod is yours." and the pod appears in your Your Pods'],
          ['On another offer tap "Pass" and confirm "Pass on this pod?"', '"Passed. Duncit will ask somebody else." and the pod keeps its current host'],
          ['Open an offer that went to someone else (API)', 'Error "This offer was not made to you"'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Cancel Pod',
    description:
      'Host self-service cancellation from Your Pods (⋮ > Cancel pod) on mWeb and native: impact preview, mandatory reason, refunds of every successful payment and attendee emails.',
    sub_flows: [
      {
        name: 'Cancel a pod nobody else joined',
        description: 'A pod with only the host is cancelled without refunds.',
        steps: [
          ['Open ⋮ > "Cancel pod" on an upcoming pod with no bookings', 'Dialog "You are cancelling <title>. This cannot be undone." and "No one else has joined this pod — it will be cancelled immediately."'],
          ['Tap confirm without choosing a reason', 'Error "Select a reason"'],
          ['Choose "Rescheduling" and confirm', 'Button shows "Cancelling…", dialog closes and the pod leaves Your Pods'],
          ['Tap "Keep pod" instead', 'Dialog closes and nothing changes'],
        ],
      },
      {
        name: 'Cancel a pod with paid attendees',
        description: 'All successful payments are refunded and every attendee is emailed.',
        steps: [
          ['Open ⋮ > "Cancel pod" on a pod with 3 paid seats', 'Dialog shows "3 other attendees joined this pod." and "Cancelling initiates a refund of <total> across <n> payments (logged in the Finance portal). All attendees will be emailed."'],
          ['Choose "Other" and leave "Note" empty', 'Error "Please describe the reason"'],
          ['Enter a note over 500 characters', 'Error "Keep the note under 500 characters"'],
          ['Enter a valid note and tap "Initiate refunds & cancel"', 'Pod is soft-deleted, payments are refunded, attendees receive the cancellation email with the note'],
          ['Check the audit log', 'DELETE entry with source HOST and the reason'],
        ],
      },
      {
        name: 'Cancel refused for ended pods and non-hosts',
        description: 'Only the host of a pod that has not ended may cancel.',
        steps: [
          ['Open ⋮ on a pod that has ended', '"Cancel pod" is greyed with "This pod has ended — it can no longer be edited, re-hosted or cancelled."'],
          ['Call hostRemovePod via API as a user who does not host the pod', 'Error "Only the pod host can manage this pod"'],
          ['Call it with an unknown reason subject', 'Error "Select a valid delete reason"'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Attendance Board & Scanning',
    description:
      'The attendance page /host/pod/:podId/attendance (native PodAttendance) and the ticket scanner. podAttendanceBoard is the one roster read; every mark goes through markTicketPresent (HOST_SCAN, HOST_MANUAL, CLUB_ADMIN_FORCE, VIRTUAL_JOIN). OTP delivery is stubbed and the test code is shown on screen.',
    sub_flows: [
      {
        name: 'Open the attendance board',
        description: 'The host sees the roster, the earnings note and the completion deadline.',
        steps: [
          ['Open ⋮ > "See Marked Attendance" on a physical pod', 'Page "Mark Attendance" with "<marked> of <total> attendees marked"'],
          ['Read the note above the roster', '"Marking attendance is how you get paid" / "Your earnings are calculated only from the attendees you mark…"'],
          ['After the pod ends read the deadline banner', '"Complete this pod before <when>" with the timeout hours from Pod Settings'],
          ['Look at the roster', 'Sections "Not marked yet" and "Attendance marked"; multi-seat rows carry "Admits <n>"'],
          ['Open the board for a pod nobody booked', '"Nobody has booked this pod yet."'],
          ['Open /host/pod/<id>/attendance as a user who is neither host nor club admin', 'Error alert (FORBIDDEN) with a "Try again" button'],
        ],
      },
      {
        name: 'Scan a single-seat ticket',
        description: 'The door scan marks the attendee present in one step.',
        steps: [
          ['Inside the scan window tap "Scan Attendee Event Tickets" (or ⋮ > "Scan attendee event tickets")', 'Scanner dialog opens with "Hold the attendee’s ticket QR inside the frame."'],
          ['Scan a valid ticket QR for this pod', 'Attendee card shows "1 person on this ticket" and confirmation "Attendance marked" / "<name> is checked in."'],
          ['Tap "Done"', 'Board shows the row under "Attendance marked" with "Ticket scanned", "Marked by <host>" and the time'],
          ['Scan the same ticket again', 'Result "Already checked in"'],
          ['Type the ticket code in "Or paste the ticket code" and tap "Check"', 'Same result as scanning the QR'],
        ],
      },
      {
        name: 'Scan a multi-seat ticket with companions',
        description: 'A group ticket checks in only once every companion is named.',
        steps: [
          ['Scan a ticket that admits 3', 'Card "3 people on this ticket", chip "Not checked in yet" and form "Who else is coming in?" / "This ticket admits 3. Add the other 2 to mark attendance."'],
          ['Tap "Mark attendance" with a blank row', 'Field errors "Required"; nothing is marked'],
          ['Enter a companion number already on the ticket', 'Row says "Someone on this ticket already has this number. Every person needs their own." and verify/submit are disabled'],
          ['Enter 6 digits and look at "Verify on WhatsApp"', 'Disabled with "Enter the name and all 10 digits of the number to send a code."'],
          ['Verify one companion with the displayed test code', 'Row shows "Verified" and its fields become read-only ("Verified — this number cannot be changed.")'],
          ['Fill both companions and tap "Mark attendance"', 'Confirmation "<name> and 2 more are checked in." with the "Checked in on this ticket" list'],
        ],
      },
      {
        name: 'Scan an invalid ticket',
        description: 'Tickets that cannot be accepted return a reason instead of marking.',
        steps: [
          ['Scan a QR that is not a Duncit ticket or was tampered with', 'Result "Invalid or tampered QR code"'],
          ['Scan a ticket for a different pod', 'Result "This ticket is for another pod…"'],
          ['Scan a ticket whose booking was cancelled', 'Result "Ticket cancelled"'],
          ['Scan after the pod was completed', 'Result "Attendance is closed for this pod"'],
        ],
      },
      {
        name: 'Mark attendance by hand with OTP',
        description: 'With Admin > Pods > Pod Settings attendance OTP required (default), the attendee\'s number must answer a code.',
        steps: [
          ['On an unmarked single-seat row tap "Mark Attendance"', 'Dialog "Verify the attendee" — "Send <name> a one-time code…" with Attendee name, Country code, Phone number and "Send the code by" (WhatsApp / SMS)'],
          ['Untick both mediums and tap "Send code"', 'Error "Choose at least one way to send the code."'],
          ['Enter a 4-digit phone and send', 'Error "Enter a phone number — digits only, 6 to 15"'],
          ['Enter valid details and tap "Send code"', '"Sending…", then info "Codes are not being delivered yet. Enter the test code <code>." and the "Send again" button'],
          ['Enter the displayed test code and tap "Verify"', '"Verifying…", then the row is marked: "Marked by host" with "Verified <phone>"'],
        ],
      },
      {
        name: 'Wrong or expired attendance OTP',
        description: 'Code checks are single-use, attempt-limited and time-limited.',
        steps: [
          ['Enter 12345 (5 digits) and tap "Verify"', 'Error "Enter the 6-digit code"'],
          ['Enter a wrong 6-digit code', 'Error "Incorrect code — <n> attempts left"'],
          ['Keep entering wrong codes until the limit', 'Error "Too many wrong codes — send a new one"'],
          ['Tap "Send again" immediately after sending', 'Error "Wait <n>s before asking for another code"'],
          ['Verify a code after it expires', 'Error "That code has expired — send a new one"'],
          ['Call hostMarkPodAttendance without a verified challenge while OTP is required', 'Error "Verify the attendee’s phone number first"'],
        ],
      },
      {
        name: 'Mark attendance by hand without OTP',
        description: 'When the admin turns the OTP requirement off, the host marks directly.',
        steps: [
          ['Turn off attendance OTP in Admin > Pods > Pod Settings', 'Setting saved'],
          ['On the board tap "Mark Attendance" on an unmarked row', 'Button shows "Marking…" and the row moves to "Attendance marked" with "Marked by host" — no code dialog'],
          ['Try the same on a multi-seat row with no companions recorded', 'Button is disabled with "Add the other <n> on this booking at the door first."'],
          ['Call hostMarkPodAttendance for that booking via API', 'Error "This booking admits <n> — add the other <m> people first" (code COMPANIONS_REQUIRED)'],
        ],
      },
      {
        name: 'Attendance locked after completion',
        description: 'Once the pod is completed its payout is split and nobody can change attendance.',
        steps: [
          ['Complete a pod, then open its attendance board', 'Notice "Attendance is closed for this pod" / "This pod is completed and its payout is already split…" and no mark or scan buttons'],
          ['Read the bottom of the page', 'Club admin card "Need help? Contact your Club Admin" with Email / Call / WhatsApp, or "This pod has no Club Admin assigned yet. Reach out to Duncit support."'],
          ['Call hostMarkPodAttendance via API', 'Error "Attendance is closed for this pod — ask your Club Admin to mark it"'],
        ],
      },
      {
        name: 'Completion window expired',
        description: 'After pod end + the Pod Settings timeout, the host side locks but the club admin can still mark.',
        steps: [
          ['Let a pod pass its end time plus the completion timeout without completing it', 'Host board shows "The time to complete this pod has passed" / "…no earnings are paid for it. Your Club Admin can still record who came…"'],
          ['As host call hostMarkPodAttendance', 'Error "The <n>-hour window to complete this pod has passed, so attendance can no longer be marked here — ask your Club Admin to mark it"'],
          ['As host scan a ticket', 'Result "The <n>-hour window to complete this pod has passed — ask your Club Admin to mark attendance"'],
          ['Open the same board as the pod\'s club admin', 'Mark controls are still available'],
        ],
      },
      {
        name: 'Virtual pod attendance board',
        description: 'Virtual pods have no door, so there is no scanner.',
        steps: [
          ['Open the attendance board of a virtual pod', 'No "Scan Attendee Event Tickets" button'],
          ['Read the earnings note', '"This pod is online, so there is no door to scan at. A member is marked present the moment they open the meeting link from the pod page during the pod…"'],
          ['Have a member tap "Join meeting" during the pod and refresh', 'Their row is marked with "Joined the meeting"'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Complete Pod & Earnings',
    description:
      'Completing a past pod from Your Pods (⋮ > Complete pod), which settles the payout on attended seats and credits wallets immediately, plus the Host Studio dashboard (/host/dashboard) and wallet (/host/wallet). mWeb and native render the same settlement lines.',
    sub_flows: [
      {
        name: 'Complete a pod held at a venue',
        description: 'The host enters the venue bill; the settlement preview uses attended seats.',
        steps: [
          ['Scan at least one attendee, let the pod end, then open ⋮ > "Complete pod"', 'Dialog "Complete pod" with the media hint, "Venue Bill Amount" and a settlement preview ("Customer Paid", "Pool", "Venue receives", "You receive")'],
          ['Tap "Complete pod" with the bill empty or 0', 'Error "Enter the venue bill amount"'],
          ['Enter the bill amount', 'Preview recalculates with the entered bill'],
          ['Tap "Complete pod"', 'Button shows "Completing…", dialog closes and the pod shows as completed'],
          ['Check the server', 'HOST_PAYMENT, VENUE_BILLING and CLUB_ADMIN releases are created and auto-approved; host, venue owner and club admin wallets are credited; evidence is the pod\'s uploaded media'],
          ['Open /host/wallet', '"Available balance" increased and the payout is listed under "Transactions"'],
        ],
      },
      {
        name: 'Complete a virtual pod',
        description: 'A pod without a venue needs no bill amount.',
        steps: [
          ['Open ⋮ > "Complete pod" on an ended virtual pod with joined-meeting attendance', 'No venue bill is required'],
          ['Tap "Complete pod"', 'Pod completes and the host share is credited'],
        ],
      },
      {
        name: 'Complete refused without attendance',
        description: 'A pod that had bookings cannot be settled with nobody marked present.',
        steps: [
          ['On an ended pod with bookings but zero marked attendees tap "Complete pod"', 'Error in the dialog: "No attendance has been recorded for this pod. Scan each guest’s ticket before completing it — the payout is calculated from who attended."'],
          ['Open the pod on a pod nobody booked', 'Completion is allowed'],
          ['Complete a pod twice (API)', 'Error "This pod has already been submitted for completion"'],
          ['Complete as a user who does not host the pod (API)', 'Error "Only a host of this pod can complete it"'],
        ],
      },
      {
        name: 'Complete after the completion window expired',
        description: 'Completing late still pays others but the host share is nil.',
        steps: [
          ['Open "Complete pod" on a pod past its completion deadline', 'Settlement notice "The window to complete this pod has closed, so your share of it is nil. Completing it still pays the venue, the club admin and any product sellers as usual."'],
          ['Complete it with zero attendance', 'Completion is allowed (the attendance gate is skipped when expired)'],
          ['Check the host release', 'HOST_PAYMENT amount is 0 with a forfeit note'],
        ],
      },
      {
        name: 'Host dashboard and insights',
        description: 'Host Studio figures and charts at /host/dashboard.',
        steps: [
          ['Open /host/dashboard', 'Title "Dashboard" with stat cards Pods, Upcoming and Paid, and "Profile health"'],
          ['Read the earnings card', 'Lifetime earnings, Pending approval, This month and Pods completed'],
          ['Open the Host Insights filter and pick "Past 3 Months"', 'Charts retitle to "Pods Hosted in Past 3 Months" and show monthly host earnings, pod status distribution and participant trend'],
          ['Use the quick actions', 'Create Pod, Your Pods, Verification and Wallet navigate to /create-pod, /host/manage, /verification and /host/wallet'],
        ],
      },
      {
        name: 'Withdraw host earnings',
        description: 'The wallet withdraw form validates amount and payout details.',
        steps: [
          ['Open /host/wallet with a balance and tap "Withdraw"', 'Dialog "Withdraw from wallet" with "Amount (max <balance>)" and "Payout method"'],
          ['Tap "Request withdrawal" with no amount', 'Error "Enter an amount"'],
          ['Enter more than the balance / less than the minimum', 'Errors "Max <max>" / "Minimum <min>"'],
          ['Choose UPI with an empty UPI ID', 'Error "Enter your UPI ID"'],
          ['Choose IMPS with no account number or IFSC', 'Errors "Enter account number" / "Enter IFSC code"'],
          ['Submit valid details', '"Requesting…", then the request is listed under "Withdrawals"'],
          ['Open the wallet with a balance below the minimum', '"You need at least <amount> in your wallet to withdraw."'],
        ],
      },
    ],
  },
  {
    name: 'App: Host - Auto Pods',
    description:
      'Host Studio > Auto Pods at /host/auto-pods (native HostAutoPods), behind the auto_pods feature flag. Enrolment is sequential (venue, then host, then club admin; virtual offers skip the venue). The host prices the pod and picks spots when assigning.',
    sub_flows: [
      {
        name: 'Browse the host Auto Pod queue',
        description: 'Offers are scoped to the header city and the host\'s approved sub-categories.',
        steps: [
          ['With auto_pods on, switch to Host Studio and open the "Auto Pods to host" menu row (/host/auto-pods)', 'Title "Auto Pods to host" with a location bar and "All my categories" filter'],
          ['Look at an offer card', 'Ticks "Venue Enroll" (green "Enrolled" for physical offers), "Host Enroll" and "Club Admin Enroll" (amber "Pending"), mode tag, "Ticket price and spots are set by the host who takes it." and "Expires in <h>h <m>m <s>s" ticking every second'],
          ['Pick a sub-category in the filter', 'Only offers of that sub-category remain'],
          ['Sign in as a host with no approved categories', '"You are not an approved host in any category yet."'],
          ['With nothing waiting', '"No Auto Pods need a host right now."'],
          ['Switch role into Host Studio while an offer waits', 'The switch lands on /host/auto-pods instead of /host/manage'],
        ],
      },
      {
        name: 'Preview potential earnings for an offer',
        description: 'The calculator runs the Create Pod waterfall for a price and spot count.',
        steps: [
          ['Tap "View Potential Earnings" on a card', 'Dialog "Potential Earnings" asks for a ticket price'],
          ['Enter 0', 'Message "Enter a ticket price above zero."'],
          ['Enter a price and spots', 'Lines "You earn <amount>", "Venue: <amount>", "Club admin: <amount>", "Duncit fee and GST: <amount>"'],
          ['Enter values where the host earns nothing', '"At this price you would earn nothing — raise the ticket price or the number of spots."'],
        ],
      },
      {
        name: 'Assign yourself to a physical Auto Pod',
        description: 'After a venue accepted, the host prices and takes the offer.',
        steps: [
          ['Tap "Assign Myself" on a physical offer with a venue slot', 'Dialog "Host this Auto Pod?" with "Ticket price", "Number of spots" ("Between <min> and <max> spots.") and the projection'],
          ['Enter a ticket price of 2000', 'Server refuses with "Ticket price must be between 1 and 1999"'],
          ['Enter viable values and confirm "Assign Myself"', 'The offer moves under "Assigned Auto Pods" with "You enrolled"; the countdown pauses'],
          ['Check the offer as a club admin', 'It is now waiting for a club admin'],
        ],
      },
      {
        name: 'Assign yourself to a virtual Auto Pod',
        description: 'The host brings the meeting details and pins the city.',
        steps: [
          ['Clear the header city and tap "Assign Myself" on an unpinned virtual offer', 'Warning "Select your city at the top first — this pod takes its city from you." and confirm is unavailable'],
          ['Select a city in the header and reopen', 'Info "This pod will be set to <city>." and meeting fields (platform, link, start, end)'],
          ['Confirm without a meeting link', 'Error "Set the meeting link and when the pod happens to host this virtual pod"'],
          ['Fill valid meeting details and confirm', 'Offer is assigned and pinned to that city'],
        ],
      },
      {
        name: 'Lose the race or claim out of turn',
        description: 'The first host wins; hosts cannot enrol before the venue on physical offers.',
        steps: [
          ['Two hosts open the same offer; host A assigns first', 'Host A succeeds'],
          ['Host B confirms', 'Dialog shows "Someone else took this Auto Pod first." (server: "Another host has already taken this Auto Pod.")'],
          ['Call hostAssignAutoPod on a physical offer no venue accepted', 'Error "A venue has to accept this Auto Pod before a host can take it."'],
          ['Call it as a host outside the offer\'s category', 'Error "You are not an approved host in this category"'],
          ['Try an offer the admin paused', 'Error "This Auto Pod is paused — try again once the admin resumes it"'],
        ],
      },
      {
        name: 'Cancel an assigned Auto Pod',
        description: 'Withdrawing costs Account Health points and returns the offer to the queue.',
        steps: [
          ['On an assigned offer (before a club admin claims it) tap "Cancel Auto Pod"', 'Dialog "Cancel this Auto Pod?" with the dependency warning and "Cancelling deducts <n> Account Health points."'],
          ['Tap "Yes, cancel"', '"You have cancelled this Auto Pod. It is back on the list for others."; price/spots/meeting are reset and health points are deducted'],
          ['Let the offer materialize into a live pod', 'The pod appears in Your Pods and the Auto Pod card shows "Live" with "View pod"'],
        ],
      },
    ],
  },
  {
    name: 'App: Club Admin In-App',
    description:
      'Club Admin mode in the customer app (menu > Switch role > Club Admin): Club Studio (/clubs/manage), Club Dashboard, club pods list, pod detail and editor, the attendance override and Pod Monitoring (AI), plus the club Auto Pod queue. mWeb opens the shared pod detail page; native opens its existing PodDetails screen for a club pod.',
    sub_flows: [
      {
        name: 'Open Club Studio and the dashboard',
        description: 'A club admin switches mode and reviews their clubs\' figures.',
        steps: [
          ['As a user listed in a club\'s admins open the menu and tap "Switch role", then "Club Admin"', 'Navigates to /clubs/manage showing "Your clubs" with Pods and Edit club actions'],
          ['Open the menu row "Club Dashboard" (/clubs/dashboard)', 'Title "Club Admin Dashboard" with a "Range" pill row (Last 30 days, This month, Last 12 months, All time)'],
          ['Read the KPI groups', 'Overview, Engagement, Community and Revenue cards (Total Pods, Upcoming Pods, Total Bookings, Fill Rate, Backed Out, Total Followers, Avg Rating, Total Revenue…)'],
          ['Switch the range to "This month"', 'Flow figures (pods, bookings, revenue, new followers) recompute; stock figures (assigned clubs, total followers, rating) stay as of the range end'],
          ['Sign in as a club admin with no clubs', '"No clubs are assigned to you yet."'],
        ],
      },
      {
        name: 'Manage a club\'s pods list',
        description: 'Every stage of the club\'s pods, paged, with status filter and search.',
        steps: [
          ['From Club Studio tap "Pods" on a club', 'Page /clubs/<clubId>/pods titled with the club name and a "New Pod" button'],
          ['Filter status "Awaiting venue"', 'Only pods with that status chip remain; "All statuses" restores the list'],
          ['Search part of a pod title', 'List reloads with matching pods (paged with "Load more")'],
          ['Read a row\'s actions', 'Pod details, Pod Attendance, Edit pod, AI Monitoring and Delete pod'],
          ['Tap "AI Monitoring" on a row', 'Dialog "Activity · <title>" lists audit entries or "No recorded activity for this pod yet."'],
          ['Open /clubs/<otherClubId>/pods for a club you do not administer', 'Error alert from the server (forbidden scope)'],
        ],
      },
      {
        name: 'Delete a club pod',
        description: 'A club admin delete is a cancellation with refunds and attendee notices.',
        steps: [
          ['Tap "Delete pod" on a row', 'Confirm "Delete pod?" — "This will remove <title> from the club. Members lose access to it. This cannot be undone."'],
          ['Tap "Delete"', 'Pod is cancelled, successful payments are refunded and attendees are notified; the row shows status "Cancelled"'],
        ],
      },
      {
        name: 'Create or edit a pod as club admin',
        description: 'The shared @duncit/pod-form editor at /clubs/:clubId/pods/new and /:id/edit.',
        steps: [
          ['Tap "New Pod"', 'Editor opens with note "You are added as the pod host automatically unless you assign hosts below."'],
          ['Save a valid pod', 'Toast "Pod created." and navigates back to the club pods list'],
          ['Open "Edit pod" on an existing pod, lower its spots below seats taken', 'Error "<n> seats are already booked — the pod cannot hold fewer than that"'],
          ['Lower spots within range and save', 'Toast "Pod updated." (club admins may reduce spots, hosts may not)'],
          ['Open /clubs/<clubId>/pods/<unknownId>/edit', '"Pod not found in this club."'],
        ],
      },
      {
        name: 'Club admin pod detail',
        description: 'The club-scoped pod detail with a link to its attendance board.',
        steps: [
          ['Tap "Pod details" on a row (mWeb)', 'Page /clubs/<clubId>/pods/<id> shows the shared pod details with attendees and a "Pod Attendance" card below them'],
          ['Tap "Pod Attendance"', 'Opens /host/pod/<id>/attendance as viewer CLUB_ADMIN'],
          ['Open the same pod on the native app', 'The app opens its standard PodDetails screen for the pod'],
        ],
      },
      {
        name: 'Mark attendance as club admin',
        description: 'The Club Admin override offers a code or a direct mark, with no companion gate.',
        steps: [
          ['On the attendance board as club admin tap "Mark Attendance" on an unmarked row', 'Dialog "Mark <name> present" with "Verify with a one-time code" and "Mark directly, no code"'],
          ['Choose "Verify with a one-time code" and complete it with the test code', 'Row is marked "Marked by Club Admin" with "Verified <phone>"'],
          ['On another row choose "Mark directly, no code"', 'Dialog "Mark attendance without a scan" with the warning and the person\'s name, number and ticket code'],
          ['On a 3-seat booking read the direct dialog', '"Who else did this booking bring?" with optional Name / "Phone number (optional)" rows'],
          ['Leave the rows blank and tap "Yes, mark present"', 'Mark goes through; row shows "Marked by Club Admin"'],
          ['Open a board whose host completion window expired', 'Club admin controls remain available'],
        ],
      },
      {
        name: 'Review Pod Monitoring (AI)',
        description: 'The club-scoped audit trail of pod edits and critical actions.',
        steps: [
          ['Open the menu row "Pod Monitoring (AI)" (/clubs/monitoring)', 'Title "Pod Monitoring (AI)" with "Search pod, actor or AI summary"'],
          ['Read an entry', 'Action (Created, Edited, Resubmitted, Deleted, Venue Approved, Venue Rejected, Completed, Content Blocked), source, "AI risk: <LOW|MEDIUM|HIGH>" and when'],
          ['Open an entry', 'Detail shows "Changes (<n>)" with from/to values, "AI Summary" and any note'],
          ['With no activity', '"No pod activity recorded yet."'],
        ],
      },
      {
        name: 'Claim an Auto Pod for your club',
        description: 'Club admins enrol last, after the host.',
        steps: [
          ['In Club Admin mode open "Auto Pods for your club" (/clubs/auto-pods)', 'Offers that already have a host are listed with "Claim for my club"'],
          ['Tap "Claim for my club"', 'Dialog "Claim this Auto Pod?" asks "Which club?" and says "The pod is created under this club as soon as everyone has enrolled."'],
          ['Confirm', 'The offer materializes into a live pod under the club; it appears in the club pods list'],
          ['Claim an offer another club took first', 'Error "Another club has already claimed this Auto Pod."'],
          ['Claim an offer with no host yet (API)', 'Error "A host has to take this Auto Pod before a club can claim it."'],
        ],
      },
    ],
  },
  {
    name: 'App: City Launch Waitlist',
    description:
      'A city an admin has not launched yet (Admin > Locations, Launched off) in the customer app (mWeb + native): its picker tile, the subscribe-for-launch page that replaces the feed, and the shareable /city-launch/:locationId page.',
    sub_flows: [
      {
        name: 'Unlaunched city in the location picker',
        description: 'The tile shows the waitlist instead of clubs, and the city can still be chosen.',
        steps: [
          ['Open "Choose your location" and find a city whose Launched switch is off', 'Its tile shows "N people are in" and a "Coming soon" badge instead of "N clubs"'],
          ['Open that city', 'Its localities are still listed'],
          ['Pick the city and Apply', 'The city becomes the selected location and Home shows the city launch page instead of the pod feed'],
          ['Pick a launched city again', 'The normal Home feed returns'],
        ],
      },
      {
        name: 'Add your name to a city waitlist',
        description: 'A signed-in member with a WhatsApp number subscribes.',
        steps: [
          ['Open Home with an unlaunched city selected', 'The first screen shows "{city}, are you in?" over the launch video (its backup image when the video cannot play), "Live count", the subscriber number in red, "People are in for" with the city under it, a progress bar from that number to the target and "We\'ll launch once {target} people have added their names."'],
          ['Tap "Join the waitlist!"', 'The page flips to "Your name has been added" with "We\'ll notify you on WhatsApp when we launch in {city}."'],
          ['Reload the page', 'The count went up by one and the added state stays'],
          ['Tap notify again via the API', 'No second subscription is created; the count is unchanged'],
        ],
      },
      {
        name: 'Subscribe without a WhatsApp number',
        description: 'The launch message needs a WhatsApp number on the profile.',
        steps: [
          ['As a member with no WhatsApp or phone number tap "Join the waitlist!"', 'A card says "Add your WhatsApp number to your profile so we can tell you when {city} launches." with "Go to profile"'],
          ['Tap "Go to profile"', 'The account screen opens where the WhatsApp number is edited'],
          ['Add a WhatsApp number, come back and tap notify', 'The added state shows'],
        ],
      },
      {
        name: 'Signed-out visitor on the launch page',
        description: 'Subscribing needs an account.',
        steps: [
          ['Open /city-launch/<location id> signed out', 'The count and goal show with "Sign in to get notified" instead of notify'],
          ['Tap "Sign in to get notified"', 'Sign-in opens and returns to the same city launch page afterwards'],
        ],
      },
      {
        name: 'Share the waitlist and join the city WhatsApp group',
        description: 'The added state offers two actions.',
        steps: [
          ['Tap "Send this to your friends"', 'The share sheet opens with the city launch link (mWeb without share support copies it and shows "Link copied")'],
          ['With a WhatsApp group link set on the city tap "Join {city}\'s WhatsApp for launch updates"', 'The chat.whatsapp.com invite opens outside the app'],
          ['Clear the city WhatsApp group link in Admin and reload', 'The WhatsApp group tile is hidden'],
        ],
      },
      {
        name: 'Host, Venue Partner and Club Admin screens',
        description: 'Three full-height screens send people to the Earn journeys.',
        steps: [
          ['Scroll past the first screen', 'Three full-height screens follow, each over its own video: "Want to host your own Pods?" with a HOST badge and "Hobbies hit different", "Turn your space into a community" with a VENUE PARTNER badge, and "Run your own Club." with a CLUB ADMIN badge — each with "Tell me more"'],
          ['Tap "Tell me more" on each screen', 'They open the Earn host, venue and club admin journeys respectively'],
          ['Turn on Reduce Motion on the device and reopen the page', 'Every screen shows its backup image instead of the video'],
        ],
      },
      {
        name: 'Launched or unknown city on the launch page',
        description: 'Edge states of the shareable page.',
        steps: [
          ['Open /city-launch/<an unknown id>', '"This city is not on Duncit." shows'],
          ['Subscribe to a city that was launched in the meantime (API)', 'Error "{city} is already live on Duncit."'],
        ],
      },
    ],
  },
  {
    name: 'App: Pod and Club Locality Chips',
    description:
      'Clubs can share a name, so the customer app (mWeb + native) shows a locality chip on club sections and pod cards.',
    sub_flows: [
      {
        name: 'Locality on home club sections and pod cards',
        description: 'Two same-name clubs are told apart by their area.',
        steps: [
          ['Open Home in a city with two clubs of the same name in different localities', 'Each club section title has its own locality chip under it'],
          ['Look at a venue pod card on a home rail', 'A pin chip with the venue locality shows at the bottom of the card and the card height matches its neighbours'],
          ['Look at a virtual pod card', 'No locality chip shows'],
        ],
      },
      {
        name: 'Locality on See all and club page cards',
        description: 'The same chip on the full lists.',
        steps: [
          ['Open "Happening nearby" See all', 'Every pod card with a venue or zone shows its locality chip at the bottom'],
          ['Open a club page and look at its pod cards', 'Each card shows the pod locality chip'],
        ],
      },
    ],
  },
];

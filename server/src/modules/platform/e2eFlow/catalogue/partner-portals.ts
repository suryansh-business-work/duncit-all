import type { CatalogueFlow } from './catalogue.types';

/** The partner-side and pod-operations portals: Partners, Venues, Hosts, Clubs, Club Admins, Regional Club Admin, Pods, Onboarding and Products. */
export const PARTNER_PORTAL_FLOWS: readonly CatalogueFlow[] = [
  {
    name: 'Partners: Venue Owner Access',
    description:
      'The VENUE_OWNER role gates every /venues* and /register-venue* route and the Venue Owner sidebar group in partners-app.duncit.com (SectionGate + buildNav).',
    sub_flows: [
      {
        name: 'Venue owner sees the Venue Owner sidebar group',
        description: 'A signed-in user holding VENUE_OWNER gets the Venue Owner group with its own entries.',
        steps: [
          ['Sign in to partners-app.duncit.com as a user whose roles include VENUE_OWNER (auto_pods flag off)', 'The shell loads and the sidebar shows a "Venue Owner" group'],
          ['Expand the "Venue Owner" group', 'Children in order: Venue Dashboard, Venue Management, Slot Requests, Change Requests, Pods, Settings'],
          ['Check the entries below the partner groups', 'Wallet is listed (the user holds a partner role), followed by Verification, FAQs, Support, Policies and the featured "Earn with Duncit" card'],
          ['Click "Venue Management"', 'Navigates to /register-venue and the "Register your venue" page renders'],
          ['Click "Settings" in the Venue Owner group', 'Navigates to /venues/settings and the "Venue settings" page renders'],
        ],
      },
      {
        name: 'Venue owner lands on the Venue Dashboard from /',
        description: 'The root route redirects to the first child of the first partner area the user holds.',
        steps: [
          ['Sign in as a user whose only partner role is VENUE_OWNER', 'Sign-in succeeds'],
          ['Open https://partners-app.duncit.com/', 'The browser is redirected (replace) to /venues/dashboard'],
          ['Look at the page header', 'Overline "Partner tools · Venues" and heading "Venue Dashboard" are shown'],
        ],
      },
      {
        name: 'Venue Owner group is absent without the role',
        description: 'Venue Owner has no onboarding entry, so a user without VENUE_OWNER never sees the group.',
        steps: [
          ['Sign in as a user with no partner roles (only USER)', 'The shell loads'],
          ['Inspect the sidebar', 'No "Venue Owner" group and no Venue Dashboard / Venue Management / Slot Requests entries are rendered'],
          ['Inspect the Host group', 'The Host group is present with a single "Be a Host" entry (onboarding entry), unlike Venue Owner'],
          ['Inspect the tail of the sidebar', 'No Wallet entry is shown; Verification, FAQs, Support, Policies and "Earn with Duncit" are shown'],
          ['Open / ', 'The user is redirected to /earn because they hold no partner area'],
        ],
      },
      {
        name: 'Typed-in venue URL without the role redirects',
        description: 'SectionGate sends a user without VENUE_OWNER back to / instead of rendering an empty venue page.',
        steps: [
          ['Sign in as a user without VENUE_OWNER (no partner roles)', 'Sign-in succeeds'],
          ['Type /venues/dashboard into the address bar', 'Nothing from the Venue Dashboard renders; the user is redirected to / and then on to /earn'],
          ['Type /register-venue/new into the address bar', 'The registration form never renders; the user ends on /earn'],
          ['Type /venues/requests/<any slotId>?action=approve', 'The decision page never renders and no approve mutation is sent; the user ends on /earn'],
          ['Sign in instead as a user holding only HOST and open /venues/settings', 'The user is redirected to / which lands on /host/dashboard'],
        ],
      },
      {
        name: 'Venue routes wait for the user before deciding',
        description: 'While the user or product-visibility query is pending SectionGate renders nothing rather than bouncing a bookmarked page.',
        steps: [
          ['As a VENUE_OWNER, hard-reload /venues/pods (bookmark)', 'The portal chrome renders while the page body is blank until the user data loads'],
          ['Wait for the user query to resolve', 'The Pods page renders in place; the user is not redirected to /'],
        ],
      },
      {
        name: 'Auto Pods sidebar entry follows the auto_pods flag',
        description: 'The Venue Owner Auto Pods entry is inserted right after Venue Dashboard only when the auto_pods feature flag is on.',
        steps: [
          ['With the auto_pods feature flag OFF, sign in as a VENUE_OWNER', 'The Venue Owner group has no "Auto Pods" entry'],
          ['Turn the auto_pods feature flag ON (admin) and reload the portal', 'The Venue Owner group now reads Venue Dashboard, Auto Pods, Venue Management, Slot Requests, Change Requests, Pods, Settings'],
          ['Click "Auto Pods"', 'Navigates to /venues/auto-pods and the "Auto Pods for your venue" heading renders'],
          ['Open / again', 'Still redirects to /venues/dashboard (Auto Pods is never the first child)'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Management',
    description:
      'The /register-venue page ("Register your venue"): the owner\'s venue registrations table with per-status actions and the entry into a new registration.',
    sub_flows: [
      {
        name: 'View the venue registrations table',
        description: 'Rows come from myVenuesTable, scoped to the signed-in owner and sorted by last update.',
        steps: [
          ['As a VENUE_OWNER with several venues, open /register-venue', 'Hero shows overline "Venue registration", heading "Register your venue" and text "Track review status and continue your venue application."'],
          ['Look at the card below the hero', 'Card titled "Your venue registrations" with a table: Venue, Capacity, Status, Updated, Action'],
          ['Inspect a row', 'Venue cell shows the cover thumbnail, the venue name (or "Untitled venue") and "<venue type> · <city>" ("City pending" when empty)'],
          ['Inspect the default order', 'Rows are sorted by Updated, newest first'],
          ['Inspect the Status column', 'Each row shows a status chip for DRAFT, SUBMITTED, APPROVED or REJECTED'],
          ['Check another owner\'s venues', 'No venue owned by a different user appears in the table'],
        ],
      },
      {
        name: 'Row actions follow the venue status',
        description: 'The Action column offers Availability only for approved venues and names the edit action by status.',
        steps: [
          ['Find a DRAFT row', 'Action column shows an "Edit" button only'],
          ['Find a REJECTED row', 'Action column shows "Edit & resubmit" only'],
          ['Find a SUBMITTED row', 'Action column shows "View" only'],
          ['Find an APPROVED row', 'Action column shows "Availability" and "View"'],
          ['Click "Availability" on the APPROVED row', 'Navigates to /venues/<venueId>/availability'],
          ['Go back and click "Edit" on the DRAFT row', 'Navigates to /register-venue/<venueId> with the draft hydrated into the form'],
        ],
      },
      {
        name: 'Search, filter and sort registrations',
        description: 'The table is a DuncitTable backed by the server table query (search venue name, type, city, locality).',
        steps: [
          ['Type part of a venue name into the "Search venue, type, city" box', 'Only matching rows remain and the total updates'],
          ['Search by a city name', 'Rows whose city matches are listed'],
          ['Filter the Status column to APPROVED', 'Only APPROVED rows are shown'],
          ['Sort by Capacity', 'Rows reorder by the total capacity number'],
          ['Show the hidden Type, City, Locality and Created columns from the column menu', 'The extra columns appear with their values ("Not available" for a missing date)'],
        ],
      },
      {
        name: 'Empty registrations table',
        description: 'A venue owner with no venue documents sees the table empty state.',
        steps: [
          ['As a VENUE_OWNER who owns no venue, open /register-venue', 'The page renders'],
          ['Look at the "Your venue registrations" table', 'The empty text "No venue registration yet." is shown'],
        ],
      },
      {
        name: 'Start a new registration',
        description: 'The hero Register Venue button opens the registration form.',
        steps: [
          ['On /register-venue click "Register Venue"', 'Navigates to /register-venue/new'],
          ['Look at the form header', 'Overline "Venue registration", heading "Register your venue" (or the resumed draft\'s name) and "Complete each section, then submit your space for review."'],
          ['Click "Your venue registrations" in the header', 'Returns to /register-venue'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Registration Form',
    description:
      'RegisterVenuePage at /register-venue/new, /register-venue/current and /register-venue/:venueId: seven sections, Zod validation, draft steps 1-3, submit for review, the view-only/approved-edit modes and Leaves & Holidays.',
    sub_flows: [
      {
        name: 'Register a new venue and submit for review',
        description: 'Happy path through every section using the sticky Save & continue bar, ending in SUBMITTED.',
        steps: [
          ['As a VENUE_OWNER with no open draft, open /register-venue/new', 'Section rail "Registration sections" lists Venue Details, Type & Capacity, Amenities & Security, Venue Documents, Owner Details, Leaves & Holidays, Review & Submit; Venue Details is active'],
          ['Fill Venue name "Sector 62 Sports Arena", a description, upload a cover image via "Upload cover image" and pick the media, choose Super category, Category and Sub category', 'Cover preview appears, button reads "Change cover image"; no errors shown'],
          ['Enter Address line 1 and pick Country, State, City and Locality from the location cascade', 'Fields fill; a map card appears when the Google Maps key is configured'],
          ['Click "Save & continue"', 'submitVenueStep1 saves a DRAFT (step_completed 1); the Venue Details rail tick turns green and Type & Capacity opens'],
          ['Select Venue type "Sports Turf", click "Add capacity entry" and enter "Court 1" / 10, add "Court 2" / 8', 'A "Total: 18" chip appears next to Capacity'],
          ['Click "Save & continue"', 'Step 1 is saved again with capacity 18 and Amenities & Security opens'],
          ['Toggle "Parking", "Washroom" and "CCTV Surveillance" chips, then click "Venue Documents" in the rail', 'Selected chips turn filled (aria-pressed true); Venue Documents opens'],
          ['Enter GSTIN "22ABCDE1234F1Z5" and PAN "ABCDE1234F", click "Add document", keep type "GST Certificate", click "Upload file" and upload a PDF', 'The row shows a green "Uploaded" chip'],
          ['Click "Save & continue"', 'submitVenueStep2 saves the documents (step_completed 2) and Owner Details opens'],
          ['Check Owner email, fill Owner phone "+919876543210", Owner DOB and Owner address', 'Owner email is pre-filled from the account, disabled, helper "Locked to your Duncit account"'],
          ['Click "Save & continue"', 'submitVenueStep3 saves owner details (step_completed 3) and Leaves & Holidays opens with no sticky save bar'],
          ['Click "Review & Submit" in the rail', '"Review your registration" lists venue name, type, category path, address, total capacity with space chips, documents, GSTIN, PAN and owner rows'],
          ['Click "Submit for review"', 'All steps are re-saved then submitVenueFinal runs; the page replaces the URL with /register-venue/<venueId>'],
          ['Look at the header and alerts', 'Status chip "SUBMITTED" and info alert "Application under review — view only."'],
          ['Open /register-venue', 'The venue row shows status SUBMITTED with a "View" action'],
        ],
      },
      {
        name: 'Venue Details validation messages',
        description: 'Save & continue on Venue Details runs the section\'s Zod rules and blocks the save.',
        steps: [
          ['Open /register-venue/new with an empty form and click "Save & continue"', 'No mutation is sent; the first invalid field is focused'],
          ['Read the Venue name error', '"Venue name must be at least 2 characters"'],
          ['Read the description and cover errors', '"Venue description is required" and "Upload a cover image" (the "Cover image *" caption turns red)'],
          ['Read the category error', '"Select the super category, category and sub category."'],
          ['Read the address and location errors', '"Address line 1 must be at least 3 characters", "State is required", "City is required", "Locality / area is required" (Country defaults to India)'],
          ['Type a 2001-character description and blur', '"Description must be 2000 characters or fewer"'],
          ['Fix every field and click "Save & continue"', 'Errors clear, the draft saves and Type & Capacity opens'],
        ],
      },
      {
        name: 'Server rejects an invalid location or category',
        description: 'submitVenueStep1 re-validates the location zone and the category chain server-side.',
        steps: [
          ['Fill Venue Details but send a city whose Location has zones without a locality (e.g. via a stale form)', 'Error alert under the form: "Select a locality for this city"'],
          ['Send a locality that is not a zone of the chosen city', 'Error alert: "Selected locality is not available for this city"'],
          ['Send a location id that no longer exists', 'Error alert: "Selected location was not found"'],
          ['Send a category whose sub category is not under the chosen category', 'Error alert: "Select a valid sub category under the chosen category"'],
          ['Correct the values and click "Save & continue"', 'The draft saves and the next section opens'],
        ],
      },
      {
        name: 'Type & Capacity list rules',
        description: 'Venue type plus the dynamic capacity list: labels required, whole numbers 1..100000.',
        steps: [
          ['Open Type & Capacity on a draft whose details are valid and remove every capacity row, then click "Save & continue"', 'Errors "Select a venue type" and "Add at least one capacity entry for your venue"'],
          ['Click "Add capacity entry" and leave the row blank, then save', 'Row errors "Give this capacity a label (e.g. Banquet hall)" and "Capacity must be at least 1"'],
          ['Enter capacity 2.5 and blur', '"Capacity must be a whole number"'],
          ['Enter capacity 100001', '"Capacity is unrealistic"'],
          ['Enter an 81-character label', '"Capacity label must be 80 characters or fewer"'],
          ['Enter "Banquet hall" / 120 and "Rooftop tables" / 40', 'Chip "Total: 160" appears'],
          ['Click the delete icon (aria "Remove capacity entry") on Rooftop tables', 'The row is removed and the chip reads "Total: 120"'],
          ['Select a venue type and click "Save & continue"', 'Step 1 persists capacity_items and capacity 120; Amenities & Security opens'],
        ],
      },
      {
        name: 'Capacity entry limit',
        description: 'The capacity list is capped by venueRegistrationConfig.capacity_item_limit (50).',
        steps: [
          ['On Type & Capacity add capacity entries until there are 50 rows', 'Info alert "At most 50 capacity entries are allowed." appears'],
          ['Look at "Add capacity entry"', 'The button is disabled'],
          ['Remove one row', 'The alert disappears and "Add capacity entry" is enabled again'],
        ],
      },
      {
        name: 'Amenities & Security option chips',
        description: 'Three toggle-chip groups whose options come from venueRegistrationConfig.',
        steps: [
          ['Open Amenities & Security', 'Groups "Amenities", "Facilities" and "Venue Security" with hints; options such as AC, Wi-Fi, Parking, CCTV Surveillance'],
          ['Click "Wi-Fi"', 'The chip becomes filled/primary and aria-pressed is true'],
          ['Click "Wi-Fi" again', 'The chip returns to outlined and aria-pressed is false'],
          ['Look below the groups', 'Caption "These appear on your public venue page and help hosts pick the right space."'],
          ['Complete the rest of the registration and submit', 'The selected amenities, facilities and security items are stored on the venue'],
        ],
      },
      {
        name: 'Venue Documents validation and upload',
        description: 'GSTIN/PAN format rules and at least one uploaded PDF document.',
        steps: [
          ['Open Venue Documents on a draft with saved details, clear GSTIN and PAN, remove all rows and click "Save & continue"', 'Errors "GSTIN is required", "PAN is required" and "Upload at least one document"'],
          ['Enter GSTIN "12345" and PAN "ABCD1234"', '"GSTIN must follow format like 22ABCDE1234F1Z5" and "PAN must follow format ABCDE1234F"'],
          ['Click "Add document" and save without uploading', 'Row error "Upload the document file"'],
          ['Click "Upload file"', 'Picker titled "Upload document (PDF, max 50 MB)" opens accepting PDF only ("Click to choose a PDF")'],
          ['Choose a PDF and confirm', 'The dialog closes and the row shows an "Uploaded" chip; clicking it opens the file in a new tab'],
          ['Click the chip\'s delete icon', 'The upload is cleared and the "Upload file" button returns'],
          ['Upload again, enter valid GSTIN/PAN and click "Save & continue"', 'Step 2 saves only rows that have a type and file; Owner Details opens'],
        ],
      },
      {
        name: 'Owner Details validation',
        description: 'Owner contact rules; the owner email is locked to the signed-in account.',
        steps: [
          ['Open Owner Details on a draft with saved documents', 'Info "Where slot requests arrive" explains requests go to these owner details once approved'],
          ['Check the Owner email field', 'Pre-filled with the account email, disabled and read-only'],
          ['Clear Owner name, Owner phone, Owner DOB and Owner address and click "Save & continue"', 'Errors "Owner name is required", phone format error, "Owner DOB is required", "Owner address is required"'],
          ['Enter owner name "R@hul"', '"Owner name can use letters, spaces, apostrophes, periods and hyphens only"'],
          ['Enter owner phone "98-765"', '"Owner phone must contain only digits (6–15 digits) with optional + prefix"'],
          ['Open the Owner DOB picker', 'Dates after today cannot be selected'],
          ['Enter a 501-character address', '"Address must be 500 characters or fewer"'],
          ['Fix all fields and click "Save & continue"', 'Step 3 saves and Leaves & Holidays opens'],
        ],
      },
      {
        name: 'Later section saved before Venue Details',
        description: 'Saving any other section first validates Venue Details and steers the owner there.',
        steps: [
          ['On a blank /register-venue/new click "Venue Documents" in the rail', 'Venue Documents opens'],
          ['Fill GSTIN, PAN and one uploaded document and click "Save & continue"', 'No mutation is sent'],
          ['Look at the form', 'Venue Details becomes the active section and an error alert reads "Complete the Venue Details section first."'],
        ],
      },
      {
        name: 'Submit with incomplete sections',
        description: 'Submit for review validates the whole schema and jumps to the first failing section.',
        steps: [
          ['On a draft with valid details but no documents, open "Review & Submit"', 'The review list shows "—" for missing values; rail shows an empty circle for Venue Documents and Owner Details'],
          ['Click "Submit for review"', 'No submit mutation is sent'],
          ['Look at the form', 'The first incomplete section opens and the alert reads "Fix the highlighted fields before submitting."'],
          ['Complete the missing sections and submit again', 'The venue moves to SUBMITTED and the URL becomes /register-venue/<venueId>'],
        ],
      },
      {
        name: 'Resume an open draft from the new route',
        description: '/register-venue/new hydrates the owner\'s latest DRAFT or REJECTED application instead of starting blank.',
        steps: [
          ['Save Venue Details on a new registration, then leave the page', 'A DRAFT exists for the owner'],
          ['Open /register-venue/new again', 'The form is pre-filled with the draft, the header shows the venue name and a "DRAFT" status chip'],
          ['Check the rail ticks', 'Venue Details shows a green tick; unsaved sections show an empty circle'],
          ['Edit the description and click "Save & continue"', 'The same draft is updated (no second venue is created)'],
        ],
      },
      {
        name: 'Register another venue after one is submitted',
        description: 'When the owner has no DRAFT/REJECTED application, /register-venue/new starts a brand-new venue.',
        steps: [
          ['As an owner whose only venue is SUBMITTED or APPROVED, open /register-venue/new', 'A blank form with heading "Register your venue" and no status chip'],
          ['Complete Venue Details and click "Save & continue"', 'A new DRAFT venue is created; the existing venue is untouched'],
          ['Open /register-venue', 'Both venues are listed, the new one as DRAFT with "Edit"'],
        ],
      },
      {
        name: 'Open the current application',
        description: '/register-venue/current always hydrates the owner\'s current application (DRAFT, REJECTED or SUBMITTED first, else latest).',
        steps: [
          ['As an owner with one SUBMITTED venue, open /register-venue/current', 'The submitted venue is shown with chip "SUBMITTED" and the view-only alert'],
          ['As an owner with an APPROVED venue only, open /register-venue/current', 'The approved venue opens in approved-edit mode'],
        ],
      },
      {
        name: 'Submitted application is view-only',
        description: 'A SUBMITTED venue renders every section disabled with no save or submit actions.',
        steps: [
          ['Open /register-venue/<submittedVenueId>', 'Info alert "Application under review — view only." and status chip "SUBMITTED"'],
          ['Try typing in Venue name and toggling an amenity chip', 'Inputs and chips do not respond (fieldset disabled)'],
          ['Open each section in the rail', 'No "Save & continue", "Save changes" or "Submit for review" bar is shown'],
          ['Open Leaves & Holidays', 'The date picker is disabled, holiday chips cannot be deleted and there is no "Save leaves & holidays" button'],
          ['Send submitVenueStep1 for this venue id directly', 'Server refuses with "This venue application is no longer editable"'],
        ],
      },
      {
        name: 'Rejected application is edited and resubmitted',
        description: 'A REJECTED venue shows the reviewer notes, stays editable and returns to DRAFT on save.',
        steps: [
          ['An admin rejects a submitted venue with notes "PAN document is blurry"', 'Venue status becomes REJECTED'],
          ['Open /register-venue as the owner', 'The row shows REJECTED with "Edit & resubmit"'],
          ['Click "Edit & resubmit"', 'Error alert "Rejected: PAN document is blurry Update and resubmit." and chip "REJECTED"; fields are editable'],
          ['Upload a new document in Venue Documents and click "Save & continue"', 'The venue is saved and its status moves back to DRAFT'],
          ['Open "Review & Submit" and click "Submit for review"', 'Status becomes SUBMITTED and the view-only alert is shown'],
        ],
      },
      {
        name: 'Approved venue edits description and images',
        description: 'Approved-edit mode keeps identity fields locked and saves only description, cover and gallery.',
        steps: [
          ['Open /register-venue/<approvedVenueId>', 'Success alert starting "Approved — you can update the description, images, capacity, owner details and add new documents." and chip "APPROVED"'],
          ['Check the rail', '"Review & Submit" is not listed'],
          ['Inspect Venue name, category, Address line 1 and location', 'All disabled with helper "Locked after approval"'],
          ['Edit the description, click "Add image" and pick a photo', 'The gallery shows the new image with a "Remove image" button'],
          ['Click "Save changes"', 'updateApprovedVenue saves description, cover_image_url and gallery; alert "Changes saved." and the section does not change'],
          ['Clear the description and click "Save changes"', '"Venue description is required" and nothing is saved'],
        ],
      },
      {
        name: 'Approved venue edits its capacity list',
        description: 'Capacity entries stay editable after approval while the venue type is locked.',
        steps: [
          ['On an approved venue open Type & Capacity', 'Venue type is disabled with "Locked after approval"; capacity rows are editable'],
          ['Add a capacity entry "Court 3" / 6 and click "Save changes"', '"Changes saved."; the venue capacity total is recalculated server-side'],
          ['Remove every capacity row and click "Save changes"', '"Add at least one capacity entry for your venue" and no update is sent'],
        ],
      },
      {
        name: 'Approved venue appends a document',
        description: 'Existing documents are locked; only newly added rows are sent as add_documents.',
        steps: [
          ['On an approved venue open Venue Documents', 'GSTIN and PAN are disabled ("Locked after approval"); caption says verified documents are locked'],
          ['Inspect an existing document row', 'Type select disabled with helper "Verified document", "Uploaded" chip has no delete icon and there is no "Remove document" button'],
          ['Click "Add document", choose "Trade License" and upload a PDF', 'The new row shows "Uploaded" and a "Remove document" button'],
          ['Click "Save changes"', '"Changes saved."; the new document is appended and every original document is still present'],
        ],
      },
      {
        name: 'Approved venue edits owner details',
        description: 'Owner name, phone, DOB and address can be updated after approval; the email stays locked.',
        steps: [
          ['On an approved venue open Owner Details', 'Owner email is disabled; other fields are editable'],
          ['Change Owner phone to "+918888888888" and click "Save changes"', '"Changes saved." and the new phone is stored on the venue'],
          ['Enter an invalid phone "abc" and click "Save changes"', 'Phone format error is shown and nothing is saved'],
        ],
      },
      {
        name: 'Approved venue amenities are locked',
        description: 'Amenities, facilities and security cannot be changed after approval.',
        steps: [
          ['On an approved venue open Amenities & Security', 'Info alert "Amenities, facilities and security are locked after approval. Contact support to change them."'],
          ['Click any chip', 'Chips are disabled and do not toggle'],
          ['Look for a save bar', 'No "Save changes" button is shown for this section'],
          ['Send updateApprovedVenue for a DRAFT venue id directly', 'Server refuses with "Only approved venues can be edited here"'],
        ],
      },
      {
        name: 'Registration not found',
        description: 'A venue id that is not the caller\'s shows a not-found alert instead of the form.',
        steps: [
          ['Open /register-venue/<venueId owned by another user>', 'Error alert "This venue registration was not found in your account." and no form'],
          ['Open /register-venue/000000000000000000000000', 'The same not-found alert is shown'],
          ['Click "Your venue registrations"', 'Returns to /register-venue'],
        ],
      },
      {
        name: 'Section navigation keeps the tab in the URL',
        description: 'Sections are URL-backed tabs (?selectedtab=) and collapse to scrollable tabs on small screens.',
        steps: [
          ['On a draft click "Owner Details" in the rail', 'The URL gains ?selectedtab=owner and the rail item is aria-current'],
          ['Reload the page', 'Owner Details is still the active section'],
          ['Open an approved venue with ?selectedtab=review', 'The form falls back to Venue Details because Review & Submit is not offered'],
          ['Resize to a phone width (~400px)', 'The side rail hides and a scrollable tab strip with the same section names appears'],
        ],
      },
      {
        name: 'Add and remove leave dates',
        description: 'Leaves & Holidays saves settings.holidays through updateVenueSettings, for drafts and approved venues.',
        steps: [
          ['On a saved venue open Leaves & Holidays', 'Heading "Leaves & Holidays", text "No leave dates yet.", disabled "Save leaves & holidays"'],
          ['Open the "Add a leave date" picker', 'Past dates cannot be picked; helper "Pick a date, then press Add"'],
          ['Pick a future date and click "Add date"', 'A red chip with the formatted date appears and "Save leaves & holidays" becomes enabled'],
          ['Add the same date again', 'No duplicate chip is created'],
          ['Click "Save leaves & holidays"', 'Success alert "Leaves & holidays saved. These dates are now blocked for slots and bookings."'],
          ['Delete the chip and save again', 'The date is removed from the venue holidays'],
        ],
      },
      {
        name: 'Leaves need a saved venue first',
        description: 'On a brand-new registration there is no venue id to store leaves against.',
        steps: [
          ['Open a blank /register-venue/new and click "Leaves & Holidays"', 'Info alert "Save the Venue Details section first — leaves are stored on your venue."'],
          ['Look at the controls', 'The date picker, "Add date" and "Save leaves & holidays" are disabled'],
          ['Save Venue Details and return to Leaves & Holidays', 'The info alert is gone and the picker is enabled'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Dashboard',
    description:
      '/venues/dashboard: slot-based KPI tiles from venueOwnerStats scoped to all venues or one, quick actions and the first-venue prompt.',
    sub_flows: [
      {
        name: 'Stat tiles across all venues',
        description: 'Six tiles computed from upcoming slots of every venue the owner has.',
        steps: [
          ['As a VENUE_OWNER with slots, open /venues/dashboard', 'Hero "Partner tools · Venues" / "Venue Dashboard" with "Slot-based earnings potential, capacity and booking requests across your venues."'],
          ['Check the Venue picker', 'Label "Venue", value "All venues", helper "Pick one venue or view all together"'],
          ['Read the tiles in order', 'Potential Earnings, Booked Value, Upcoming Slots, Booked Slots, Pending Requests, Total Capacity with their hints'],
          ['Compare Potential Earnings with the data', 'Equals the price sum of AVAILABLE, PENDING and BOOKED slots starting from now, shown as INR'],
          ['Compare Booked Value / Booked Slots / Pending Requests', 'Booked Value and Booked Slots count future BOOKED slots; Pending Requests counts future PENDING slots'],
          ['Compare Total Capacity', 'Equals the sum of capacity across all the owner\'s venues'],
        ],
      },
      {
        name: 'Scope the dashboard to one venue',
        description: 'Choosing a venue re-runs venueOwnerStats with that venue_id.',
        steps: [
          ['Open the Venue picker', 'Lists "All venues" then each owned venue by name ("Untitled venue" when blank)'],
          ['Pick one approved venue', 'Tiles reload and show only that venue\'s figures'],
          ['Switch back to "All venues"', 'Tiles return to the combined figures'],
        ],
      },
      {
        name: 'Quick actions',
        description: 'The Quick actions widget links to management, requests and the selected venue\'s calendar.',
        steps: [
          ['Look at the "Quick actions" widget with "All venues" selected', 'Buttons "Venue Management" and "Slot Requests"; no "Availability Calendar" button'],
          ['With 2 pending requests, read the Slot Requests button', 'It reads "Slot Requests (2)"'],
          ['Select an APPROVED venue in the picker', 'An "Availability Calendar" button appears'],
          ['Click "Availability Calendar"', 'Navigates to /venues/<venueId>/availability'],
          ['Select a DRAFT venue instead', 'The "Availability Calendar" button is not shown'],
          ['Click "Venue Management"', 'Navigates to /register-venue'],
        ],
      },
      {
        name: 'No venues prompt',
        description: 'An owner with no venues is invited to register one.',
        steps: [
          ['As a VENUE_OWNER with no venues, open /venues/dashboard', 'Info alert "Register your first venue to start publishing bookable slots." with a "Register venue" button'],
          ['Read the tiles', 'All six tiles show zero values'],
          ['Click "Register venue"', 'Navigates to /register-venue/new'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Slot Requests',
    description:
      '/venues/requests: pending booking requests (a host booked another partner\'s venue slot), filter by venue, approve (pod goes live) or decline (slot reopens).',
    sub_flows: [
      {
        name: 'Review pending requests',
        description: 'Only PENDING slots whose start is still in the future are listed, newest request first.',
        steps: [
          ['A host creates a pod on an AVAILABLE slot of the owner\'s approved venue', 'The slot becomes PENDING, the pod is created offline with venue approval PENDING and the owner is emailed'],
          ['As the venue owner open /venues/requests', 'Header "Partner tools · Venues" / "Slot Requests" with "Hosts who want to run their pod at your venue. A pod only goes live after you approve its slot."'],
          ['Inspect the request card', 'Pod title, description (or "No description provided."), warning chip "Awaiting decision"'],
          ['Inspect the details rows', 'Venue, Slot (whole-day/multi-day aware), Slot price ("₹1,500" or "Free"), Requested date-time, Host, Email (mailto), Phone (tel)'],
          ['Inspect the card actions', 'Buttons "View earnings", "Decline" and "Approve"'],
        ],
      },
      {
        name: 'Filter requests by venue',
        description: 'The venue select re-queries venueSlotRequests for one venue.',
        steps: [
          ['Open the Venue select (helper "Filter requests by venue")', 'Options "All venues" and each owned venue'],
          ['Choose one venue', 'Only requests for that venue remain'],
          ['Choose "All venues"', 'Requests from every venue are listed again'],
        ],
      },
      {
        name: 'Approve a request from the list',
        description: 'Approving books the slot and puts the pod live.',
        steps: [
          ['Click "Approve" on a request card', 'Dialog "Approve this slot booking?" says "<pod title>" will be confirmed for the slot and the pod goes live immediately'],
          ['Click "Approve booking"', 'Success alert "Booking approved — the pod is now live." and the card disappears from the list'],
          ['Check the data', 'Slot status BOOKED with decision APPROVED; pod venue_approval_status APPROVED and is_active true; audit VENUE_APPROVED recorded'],
          ['Check the host side', 'Pod hosts get the in-app note "Venue approved your slot"'],
          ['Open the venue\'s availability calendar on that date', 'The slot shows status BOOKED with "Booked by pod: <pod title>"'],
        ],
      },
      {
        name: 'Decline a request with an optional reason',
        description: 'Declining frees the slot and takes the pod offline as DECLINED.',
        steps: [
          ['Click "Decline" on a request card', 'Dialog "Decline this slot booking?" with "The slot opens up again and the host is notified that the request was declined."'],
          ['Type a reason in "Reason (optional)"', 'Helper "Shared with the host so they can follow up"; input stops at 280 characters'],
          ['Click "Decline booking"', 'Success alert "Booking declined — the slot is open again." and the card is removed'],
          ['Check the data', 'Slot back to AVAILABLE with decision DECLINED and the reason stored; pod venue_approval_status DECLINED, is_active false, venue_slot_id null'],
          ['Decline another request leaving the reason empty', 'The decline succeeds with no reason; the audit note is "Venue owner declined the slot booking request"'],
        ],
      },
      {
        name: 'Close approve and decline dialogs without deciding',
        description: 'Cancel in either dialog leaves the request pending.',
        steps: [
          ['Click "Approve" then "Cancel"', 'Dialog closes, no mutation is sent, the card still shows "Awaiting decision"'],
          ['Click "Decline", type a reason, then "Cancel"', 'Dialog closes and the request remains in the list'],
        ],
      },
      {
        name: 'Decision fails because the request changed',
        description: 'Server guards surface as an error alert on the page.',
        steps: [
          ['Open /venues/requests in two tabs and approve a request in the first tab', 'The first tab shows the success alert'],
          ['In the second tab click "Approve" then "Approve booking" on the same card', 'Error alert "This slot has no pending booking request"'],
          ['Close the alert', 'The alert disappears'],
        ],
      },
      {
        name: 'Empty requests list',
        description: 'No pending, future requests.',
        steps: [
          ['As an owner with no pending requests open /venues/requests', 'Info alert "No pending slot requests right now. New requests appear here the moment a host books one of your slots."'],
        ],
      },
      {
        name: 'Unanswered request expires at slot start',
        description: 'The 10-minute sweep auto-declines PENDING requests whose slot has started.',
        steps: [
          ['Leave a PENDING request unanswered until after its slot start time', 'The request disappears from /venues/requests as soon as the start time passes'],
          ['Wait for the next expiry sweep (every 10 minutes)', 'Slot returns to AVAILABLE with decision DECLINED and reason "Missed View Deadline by the Venue"; the pod goes offline as DECLINED'],
          ['Check notifications', 'The host is told; no "You declined a slot" message is sent to the venue owner; audit source is SYSTEM'],
        ],
      },
      {
        name: 'View earnings from a request card',
        description: 'The card links to the same decision page the request email opens.',
        steps: [
          ['Click "View earnings" on a request card', 'Navigates to /venues/requests/<slotId> without an action parameter'],
          ['Look at the page', 'Pending decision view with the earning breakdown and Approve booking / Decline buttons'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Slot Decision Page',
    description:
      '/venues/requests/:slotId opened from the slot-request email (?action=approve or ?action=decline) or from Slot Requests; shows the venue earning and the stored outcome.',
    sub_flows: [
      {
        name: 'Approve from the email Approve button',
        description: '?action=approve confirms the booking on arrival exactly once.',
        steps: [
          ['Open the approve_url from the slot request email: /venues/requests/<slotId>?action=approve', 'The page loads the request and sends approveVenueSlotRequest once'],
          ['Look at the header after it refetches', 'Green hero "Booking confirmed" / "Your venue is booked" / "Blocked for <date time>. The pod is live and open for bookings."'],
          ['Inspect the summary card', 'Pod title, slot window, "<venue> · <space>", "Hosted by <host>" with email/phone links and the pod description'],
          ['Inspect the earnings box', '"Your earning from this booking" hero amount, Slot price, "Duncit commission (<pct>%)" as a minus, "You receive" and the wallet-credit note'],
          ['Reload the page with ?action=approve still in the URL', 'No second approve is sent; the confirmed outcome is shown'],
          ['Click "See all slot requests"', 'Navigates to /venues/requests where this request is no longer listed'],
        ],
      },
      {
        name: 'Decline from the email Decline button',
        description: '?action=decline opens the required-reason form on arrival.',
        steps: [
          ['Open /venues/requests/<slotId>?action=decline for a pending request', 'Header "Awaiting your decision" / "A host wants to book your venue"; the decline form "Why are you declining?" is open'],
          ['Look at the form controls', 'Placeholder "e.g. the space is already blocked for a private event that evening", helper "Shared with the host so they can follow up · 0/280", "Decline booking" disabled'],
          ['Type "Private event booked that evening"', 'The counter updates and "Decline booking" becomes enabled'],
          ['Click "Decline booking"', 'Red hero "Booking declined" / "You turned this slot down" / "<date time> is open again on your calendar."'],
          ['Inspect the card', 'Earnings box titled "Earning you passed on" with the amount struck through, "You would have received", and info "Reason shared with the host: “Private event booked that evening”"'],
        ],
      },
      {
        name: 'Decide on the page without an action parameter',
        description: 'Opening the page plainly shows both buttons for a pending request.',
        steps: [
          ['Open /venues/requests/<slotId> for a pending request', 'Buttons "Decline" and "Approve booking" under the earnings box'],
          ['Click "Approve booking"', 'Button reads "Approving…" while running, then the header switches to "Your venue is booked"'],
        ],
      },
      {
        name: 'Keep a request pending',
        description: 'The decline form can be dismissed without deciding.',
        steps: [
          ['On a pending request click "Decline"', 'The decline form replaces the two buttons'],
          ['Type a reason, then click "Keep it pending"', 'The form closes, the Decline / Approve booking buttons return and no mutation is sent'],
          ['Reload /venues/requests', 'The request is still listed as "Awaiting decision"'],
        ],
      },
      {
        name: 'Re-open an already decided link',
        description: 'The decision is stored on the slot, so old links show the outcome instead of an error.',
        steps: [
          ['Approve a request, then open its decline_url (?action=decline)', 'The approved outcome is shown; no decline form opens and no mutation is sent'],
          ['Decline another request, then open its approve_url (?action=approve)', 'The declined outcome with the stored reason is shown; no approve is sent'],
          ['Check the buttons on both pages', 'No Approve booking / Decline buttons are rendered for a decided request'],
        ],
      },
      {
        name: 'Expired request shows the deadline decline',
        description: 'A request auto-declined by the expiry sweep reads as declined with the system reason.',
        steps: [
          ['Let a request expire (slot started and the sweep ran), then open its approve_url', 'Header "You turned this slot down"'],
          ['Read the reason alert', '"Reason shared with the host: “Missed View Deadline by the Venue”"'],
        ],
      },
      {
        name: 'Approve after the slot has started but before the sweep',
        description: 'The server refuses to put a pod live for a slot that has begun.',
        steps: [
          ['Open /venues/requests/<slotId>?action=approve after the slot start time but before the sweep runs', 'The auto-approve is attempted'],
          ['Look at the page', 'Error alert "This slot has already started and can no longer be approved" and the request stays pending'],
          ['Click "Decline", enter a reason and "Decline booking"', 'The decline succeeds and the declined outcome is shown'],
        ],
      },
      {
        name: 'Request not accessible',
        description: 'Ownership and existence errors from venueSlotDecision.',
        steps: [
          ['As a different venue owner open /venues/requests/<slotId of someone else>', 'Error alert "Not your slot" and no decision controls'],
          ['Open the page for your own slot that never had a booking request', 'Error alert "This slot has no booking request"'],
          ['Open /venues/requests/abc', 'Error alert "Invalid slot_id"'],
        ],
      },
      {
        name: 'Email link opened while signed out',
        description: 'The route is auth-guarded so a mail scanner cannot decide; the owner lands back on it after login.',
        steps: [
          ['While signed out open /venues/requests/<slotId>?action=approve', 'The login page is shown and no approve mutation is sent'],
          ['Sign in as the venue owner', 'The user returns to /venues/requests/<slotId>?action=approve and the booking is approved on arrival'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Availability',
    description:
      '/venues/:venueId/availability: the shared VenueAvailabilityEditor calendar (day/week/month), the day drawer to add, block and delete slots, whole-day and multi-day slots, spaces, leave days and overlap conflicts.',
    sub_flows: [
      {
        name: 'Availability blocked for an unapproved venue',
        description: 'Only APPROVED venues can edit availability.',
        steps: [
          ['Open /venues/<draftVenueId>/availability', 'Warning alert "Availability is only editable once your venue is approved (current status: DRAFT)."'],
          ['Check the page', 'No calendar is rendered; a "Back to venues" button is shown'],
          ['Click "Back to venues"', 'Navigates to /register-venue'],
          ['Open the page for a SUBMITTED venue', 'The warning names status SUBMITTED'],
        ],
      },
      {
        name: 'Venue not found or not yours',
        description: 'The venue id must be one of myVenues.',
        steps: [
          ['Open /venues/<another owner\'s venueId>/availability', 'Error alert "Venue not found, or it isn\'t yours." with "Back to venues"'],
          ['Query venueSlots for that venue directly', 'Server refuses with "Only the venue owner can view all slots"'],
        ],
      },
      {
        name: 'Open the calendar and switch views',
        description: 'Month view by default with toolbar navigation capped at the 60-day window.',
        steps: [
          ['From /register-venue click "Availability" on an APPROVED venue', 'Header overline "Venue · <venue name>", heading "Slot availability" and the hint about Available slots'],
          ['Look at the toolbar', 'Day / Week / Month toggle (Month selected), Previous, period label, Next, "Today" and "Recurring availability"'],
          ['Look at the grid and legend', 'Weekday headers Sun..Sat, day cells with A/P/B/× count badges; legend "A — Available", "P — Pending approval", "B — Booked", "× — Blocked", "Leave / Holiday"'],
          ['Check past days and days beyond 60 days from today', 'They are dimmed, aria-disabled and do nothing on click'],
          ['Click Next until the period passes today + 60 days', 'The Next button becomes disabled'],
          ['Click "Week", then "Day"', 'The grid shows 7 days of the anchor week, then a single day with its full date'],
          ['Click "Today"', 'The period jumps back to the current day/week/month'],
          ['Click the back arrow (aria "Back") in the header', 'Navigates to /register-venue'],
        ],
      },
      {
        name: 'Add a timed slot',
        description: 'The day drawer creates one slot for the default (first) space with on_conflict FAIL.',
        steps: [
          ['Click a future day with no slots', 'Right drawer "Availability" with the date; "Existing slots" reads "No slots for this date yet."'],
          ['Look at the "Add availability" form', 'Whole day switch, Space select (e.g. "Court 1 · holds 10") with hint, Start date/Start time, End date/End time, "Price (₹)" ("Leave 0 for a free slot"), "Notes (optional)", "Add slot"'],
          ['Pick Start time 18:00, End time 19:00, price 500, notes "Floodlights on"', 'No warning; "Add slot" is enabled'],
          ['Click "Add slot"', 'Button reads "Adding…", then the form resets and the slot card appears'],
          ['Inspect the slot card', 'Time range, "₹500", status chip "AVAILABLE", caption "Court 1 · holds 10", the notes, and "Block" / "Delete" buttons'],
          ['Close the drawer and look at the day cell', 'The cell shows a "1A" badge'],
        ],
      },
      {
        name: 'Add-slot live validation',
        description: 'The draft is re-checked against a live clock; invalid windows keep Add disabled.',
        steps: [
          ['Open today\'s drawer and set a start time that has already passed', 'Warning "Start time must be in the future." and "Add slot" disabled (the picker also blocks past times)'],
          ['Set start and end to the same time', 'Warning "Start and end time cannot be the same."'],
          ['Set End date to a later day and End time before Start time on a same-day slot', 'Warning "End must be after start." when the end instant is earlier'],
          ['Set End date before Start date', 'Warning "End date must be on or after the start date."'],
          ['Clear the start time and click "Add slot"', 'Error "Pick the start and end time."'],
          ['Keep the drawer open past the start time of a valid draft (30 s clock tick)', 'The warning "Start time must be in the future." appears without touching the form'],
        ],
      },
      {
        name: 'Create a whole-day slot',
        description: 'Whole day hides the time pickers and books the entire date.',
        steps: [
          ['Open a future day and switch on "Whole day"', 'Hint "Book the entire date(s) — no time selection needed."; Start time and End time pickers disappear'],
          ['Set price 3000 and click "Add slot"', 'A card labelled "Whole day" with "₹3000" and status "AVAILABLE" appears'],
          ['Check the stored slot', 'whole_day is true and it spans that whole date'],
        ],
      },
      {
        name: 'Create a multi-day slot',
        description: 'A later end date creates ONE continuous booking that shows on every covered day.',
        steps: [
          ['Open a future day, keep Whole day on and pick an End date two days later', 'Info "This creates one continuous multi-day booking (e.g. a multi-day activity or event)."'],
          ['Click "Add slot"', 'A card labelled "Whole day · <from> – <to>" appears'],
          ['Close the drawer and inspect the three covered days', 'Each covered day shows an A badge'],
          ['Open the middle day', 'The same multi-day slot is listed there too'],
          ['Create a timed multi-day slot (Whole day off, end date next day)', 'Card label is "<start date-time> – <end date-time>"'],
        ],
      },
      {
        name: 'Two spaces share the same time window',
        description: 'Overlaps are per space, so different spaces may publish the same hour.',
        steps: [
          ['Add a slot 18:00–19:00 for "Court 1"', 'Slot created'],
          ['In the same drawer pick Space "Court 2" and add 18:00–19:00', 'Second slot created without a conflict'],
          ['Inspect the existing slots list', 'Slots are ordered by space label then time: Court 1 first, Court 2 second'],
        ],
      },
      {
        name: 'Overlap conflict and overwrite',
        description: 'A clash in the same space returns CONFLICT, which can be resolved by a confirmed REPLACE.',
        steps: [
          ['With Court 1 18:00–19:00 AVAILABLE, add Court 1 18:30–19:30 at price 800', 'Error alert "Overlaps with existing slot <start ISO> – <end ISO>" with an "Overwrite" action'],
          ['Click "Overwrite"', 'Confirm "Overwrite the existing slot?" explaining the existing slot is permanently deleted; buttons "Cancel" and "Delete and overwrite"'],
          ['Click "Cancel"', 'Dialog closes and nothing changes'],
          ['Click "Overwrite" again and confirm "Delete and overwrite"', 'The 18:00–19:00 slot is deleted and 18:30–19:30 at ₹800 is created (on_conflict REPLACE)'],
          ['Add a multi-day slot that crosses a venue leave date', 'Error alert "<yyyy-MM-dd> is marked as a venue leave/holiday" is shown without an "Overwrite" action'],
        ],
      },
      {
        name: 'Overwrite never replaces booked or pending slots',
        description: 'REPLACE leaves BOOKED and PENDING slots alone.',
        steps: [
          ['On a day with a BOOKED Court 1 slot 10:00–11:00, add Court 1 10:00–11:00', 'Error alert with an "Overwrite" action'],
          ['Confirm "Delete and overwrite"', 'Error "Every new slot overlaps a booked slot or a pending request, which cannot be replaced." and the booked slot is unchanged'],
        ],
      },
      {
        name: 'Block and unblock a slot',
        description: 'Blocking toggles an AVAILABLE slot to BLOCKED through updateVenueSlot.',
        steps: [
          ['Click "Block" on an AVAILABLE slot card', 'The button spins, then the chip reads "BLOCKED" and the button reads "Unblock"'],
          ['Look at the calendar day cell', 'The badge shows "1×" instead of "1A"'],
          ['Check hosts\' slot picker for the venue', 'The blocked slot is not offered (only AVAILABLE slots are bookable)'],
          ['Click "Unblock"', 'Chip returns to "AVAILABLE" and the badge to "1A"'],
        ],
      },
      {
        name: 'Delete a slot',
        description: 'Deleting asks for confirmation and keeps the dialog open until the server answers.',
        steps: [
          ['Click "Delete" on an AVAILABLE slot', 'Dialog "Delete this slot?" with "This permanently removes the time slot. Booked slots cannot be deleted."'],
          ['Click "Cancel"', 'Dialog closes and the slot remains'],
          ['Click "Delete" then the dialog\'s "Delete"', 'The slot disappears from the list and the calendar counts update'],
        ],
      },
      {
        name: 'Pending and booked slots are locked',
        description: 'A slot with a booking request or a booking cannot be blocked, edited or deleted.',
        steps: [
          ['Open a day with a PENDING slot', 'Card shows chip "PENDING", "Requested by pod: <title>" and "Awaiting your decision — approve or decline it under Slot Requests."'],
          ['Look for actions on that card', 'No "Block" or "Delete" buttons'],
          ['Open a day with a BOOKED slot', 'Card shows chip "BOOKED" and "Booked by pod: <title>" with no actions'],
          ['Send deleteVenueSlot for the BOOKED slot directly', 'Server refuses with "Booked slots cannot be deleted. Cancel the pod first."'],
          ['Send updateVenueSlot for the PENDING slot directly', 'Server refuses with "This slot has a pending booking request. Approve or decline it first."'],
        ],
      },
      {
        name: 'Leave days cannot take slots',
        description: 'Dates in settings.holidays render red and refuse slots in the UI and on the server.',
        steps: [
          ['Add a future leave date in Leaves & Holidays for the approved venue and open its availability', 'That day cell is red with a "LEAVE" tag'],
          ['Switch to Day view on that date', 'The cell reads "Venue on leave — not bookable"'],
          ['Click the leave day', 'Drawer shows error "This date is marked as a venue leave/holiday — slots cannot be added or booked." and the add form is hidden'],
          ['Create a multi-day slot from the day before that crosses the leave date', 'Error "<yyyy-MM-dd> is marked as a venue leave/holiday" and nothing is created'],
        ],
      },
      {
        name: 'Server window limits',
        description: 'createVenueSlots enforces past, advance-cap and span limits.',
        steps: [
          ['Send createVenueSlots with a start in the past', '"Cannot create slots in the past"'],
          ['Send a start beyond the venue\'s max_advance_days (default 60)', '"Slots can only be scheduled up to 60 days in advance"'],
          ['Send end_at before start_at', '"end_at must be after start_at"'],
          ['Send a price of -1', '"price must be 0 or more"'],
          ['Send two overlapping slots for the same space in one batch', '"Two of the new slots overlap with each other"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Recurring Availability',
    description:
      'The "Recurring availability" dialog on /venues/:venueId/availability: generate slot batches by date range, weekdays, time windows or whole days, per-space pricing and conflict mode, plus venue rules, auto-extend, templates and bulk actions.',
    sub_flows: [
      {
        name: 'Generate a recurring batch of timed slots',
        description: 'The preview and the created batch come from the same generator.',
        steps: [
          ['On an approved venue with spaces Court 1 (10) and Court 2 (8) click "Recurring availability"', 'Dialog "Recurring availability" / "Create slots with custom timing, pricing and venue settings."'],
          ['Look at the defaults', 'All 7 days ticked, Whole day off, one time slot 13:00–14:00, both spaces included at price 399, "Keep the existing slot" selected; "Create 0 slots" disabled'],
          ['Pick Start date tomorrow and End date 7 days later', 'Preview shows "Slots to be created" with the count, per-space counts, "₹399 · cap 10" and "Total revenue (est.)"'],
          ['Click "Weekdays"', 'Only Mon–Fri stay ticked and the count drops'],
          ['Click "Add time slot"', 'A second row 15:00–16:00 ("Start #2") is added and the count doubles'],
          ['Click "Create N slots"', 'Button reads "Creating…"; the dialog closes and the calendar shows the new A badges on the chosen weekdays'],
        ],
      },
      {
        name: 'Generate a recurring batch of whole-day slots',
        description: 'Whole day turns each eligible date into one whole-day slot per space.',
        steps: [
          ['Open "Recurring availability", pick a date range and switch on "Whole day"', 'Hint "Each selected day becomes one whole-day booking — no time windows needed."; the Time slots section disappears'],
          ['Read the preview', 'One slot per selected day per included space'],
          ['Click Create', 'Whole-day slots are created and each day cell shows the A badges'],
        ],
      },
      {
        name: 'Recurring validation warnings',
        description: 'Once both dates are picked the first generator error is shown and Create stays disabled.',
        steps: [
          ['Pick dates and untick every weekday', 'Warning "Select at least one day to repeat on." and Create disabled'],
          ['Tick days again and set a time slot End before Start', '"Each time slot must end after it starts."'],
          ['Set a time slot starting 07:00 with default hours 09:00–23:00', '"A time slot starts before the venue opens (09:00)."'],
          ['Set a time slot ending 23:30', '"A time slot ends after the venue closes (23:00)."'],
          ['Make two time slots overlap', '"Time slots must not overlap."'],
          ['Untick both spaces', '"Add at least one space with a price."'],
          ['Set Start and End date to today with a single 13:00–14:00 time slot after 13:00 has passed', 'Preview shows "0 Slots" with "Auto-skipped: 1 past" and "Create 0 slots" stays disabled'],
        ],
      },
      {
        name: 'Keep existing slots on a clash',
        description: 'SKIP (default) creates only the slots that do not clash with published ones.',
        steps: [
          ['Publish Court 1 13:00–14:00 tomorrow, then open Recurring availability for tomorrow..+3 days, 13:00–14:00, Court 1 only', 'Preview counts every day including tomorrow'],
          ['Keep "Keep the existing slot" and click Create', 'Dialog closes; tomorrow keeps its original slot and only the other days get new slots'],
          ['Repeat the exact same run', 'Server error in the dialog: "Every matching slot already exists — nothing to add."'],
        ],
      },
      {
        name: 'Overwrite existing slots on a clash',
        description: 'REPLACE deletes clashing AVAILABLE/BLOCKED slots but never BOOKED or PENDING ones.',
        steps: [
          ['Select "Overwrite the existing slot"', 'Warning alert explains overwriting permanently deletes slots for the same space and time; booked and pending ones are never deleted'],
          ['Run a batch that clashes with one AVAILABLE slot (price 399) and one BOOKED slot', 'The AVAILABLE slot is replaced by the new one; the clash with the BOOKED slot is skipped and the booked slot is untouched'],
          ['Run a batch whose every slot clashes with BOOKED or PENDING slots', 'Error "Every new slot overlaps a booked slot or a pending request, which cannot be replaced."'],
        ],
      },
      {
        name: 'Per-space pricing and include toggle',
        description: 'Each included space with a price generates its own slots.',
        steps: [
          ['Untick the include checkbox for "Court 2"', 'Its price field is disabled and the preview drops Court 2'],
          ['Set Court 1 price to 600', 'Preview shows "₹600 · cap 10" and revenue recalculates'],
          ['Clear the Court 1 price', 'Court 1 no longer generates slots; with no priced space the warning "Add at least one space with a price." shows'],
          ['On a venue without named spaces open the dialog', 'A single "Whole venue" row with "Capacity <venue capacity>" and no include checkbox'],
        ],
      },
      {
        name: 'Save venue rules',
        description: 'The "Venue rules" accordion saves settings.rules through updateVenueSettings.',
        steps: [
          ['Expand "Venue rules" (caption "Buffer, booking window and advance-booking limits")', 'Fields: Buffer between slots (min), Minimum booking notice (min), Maximum advance booking (days), Maximum bookings per slot, and four switches'],
          ['Type 90 into "Maximum advance booking (days)"', 'The value is capped at 60'],
          ['Set buffer to 30 and click "Save rules"', 'Button reads "Saving…", then "Venue rules saved."'],
          ['Look at the Time slots hint', 'Reads "Venue hours <open>–<close>. Keep a 30-min gap between slots."'],
          ['Add two time slots 13:00–14:00 and 14:15–15:15', 'Warning "Keep at least a 30-minute gap between time slots."'],
        ],
      },
      {
        name: 'Configure auto-extend',
        description: 'The "Future availability" accordion keeps slots published ahead from the default template.',
        steps: [
          ['Expand "Future availability" and switch on "Auto-extend availability"', 'Body explains the daily job; horizon and "Stop on (optional)" become enabled'],
          ['With no default slot template', 'Warning "You don’t have a default template yet. Save one under “Save as template” and mark it default — auto-extend rolls that template forward."'],
          ['Type 200 into "Keep published ahead (days, max 60)" and blur', 'The value snaps to 60'],
          ['Pick a Stop on date, then click "Clear"', 'The date is cleared'],
          ['Click "Save auto-extend"', '"Auto-extend saved."; settings.auto_extend is enabled with horizon 60 (never above max_advance_days)'],
          ['Simulate a failed save', 'Error "Could not save auto-extend. Please try again."'],
        ],
      },
      {
        name: 'Save, apply and delete a slot template',
        description: 'Templates capture weekdays, the first time range and a base price.',
        steps: [
          ['Expand "Save as template"', 'Template name field with "Save" disabled while empty'],
          ['Set Weekends, 07:00–09:00, price 450, type "Weekend mornings" and click "Save"', 'A "Weekend mornings" chip appears with "Use" and a delete button; the name field clears'],
          ['Reset the form (close and reopen the dialog) and click "Use" on the template', 'Weekdays become Sat/Sun, one time slot 07:00–09:00 and every space price becomes 450'],
          ['Click the delete icon (aria "Delete Weekend mornings")', 'The template disappears from the list'],
        ],
      },
      {
        name: 'Bulk delete upcoming slots',
        description: 'Bulk actions touch only upcoming non-booked, non-pending slots matching the filter.',
        steps: [
          ['Expand "Bulk actions"', 'Hint "Filter (all optional — empty means every upcoming non-booked slot). Booked slots are never affected."'],
          ['Pick From/To dates and tick Saturday, then click "Delete matching"', 'Confirm "Are you sure?" / "Delete all matching upcoming slots? This cannot be undone."'],
          ['Click "Confirm"', 'Info "Deleted N slot(s)." and the calendar refreshes without those slots'],
          ['Check a BOOKED or PENDING slot inside the filter', 'It still exists'],
        ],
      },
      {
        name: 'Bulk disable, enable and re-price',
        description: 'Bulk update blocks, unblocks or re-prices matching upcoming slots.',
        steps: [
          ['Click "Disable" and confirm', 'Info "Disabled: N updated." and matching slots show BLOCKED'],
          ['Click "Enable" and confirm', 'Info "Enabled: N updated." and they return to AVAILABLE'],
          ['Look at "Set price" with the "New price (₹)" field empty', '"Set price" is disabled'],
          ['Enter 700, click "Set price"', 'Confirm "Re-price all matching upcoming slots to ₹700? Existing prices are overwritten."'],
          ['Confirm', 'Info "Re-priced: N updated." and matching slots show ₹700'],
        ],
      },
      {
        name: 'Cancel the recurring dialog',
        description: 'Closing resets the form without creating anything.',
        steps: [
          ['Fill dates and time slots, then click "Cancel"', 'The dialog closes and no slots are created'],
          ['Reopen "Recurring availability"', 'Dates are empty and defaults are restored'],
          ['Open on a phone-width screen', 'The dialog renders full screen'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Pods',
    description:
      '/venues/pods: every pod booked at the owner\'s venues with URL tabs, venue filter, attendee dialog and the owner\'s cancel-and-refund action with its Account Health penalty.',
    sub_flows: [
      {
        name: 'Browse pods by tab',
        description: 'Tabs All, Upcoming (includes ongoing), Cancelled and Completed with counts.',
        steps: [
          ['As a VENUE_OWNER with pods at their venues open /venues/pods', 'Header "Partner tools · Venues" / "Pods" with "Every pod booked at your venues — upcoming, completed and cancelled. Click a pod for its attendees."'],
          ['Look at the tabs', '"All (n)", "Upcoming (n)", "Cancelled (n)", "Completed (n)" with counts from the rows'],
          ['Look at the table', 'Columns Pod (title + host names), Venue, Date, Price ("Free" or "₹amount"), Attendees ("booked / spots"), Status chip, Actions'],
          ['Click "Upcoming"', 'Only Upcoming and Ongoing rows remain and the selected tab is kept in the URL (?selectedtab=)'],
          ['Reload the page', 'The same tab is still selected'],
          ['Click "Cancelled"', 'Only cancelled pods are listed'],
        ],
      },
      {
        name: 'Filter pods by venue and search',
        description: 'Venue filter re-queries venuePods; search runs in memory over pod, host and venue.',
        steps: [
          ['Open the Venue select', 'Options "All my venues" and each owned venue'],
          ['Pick one venue', 'Rows and tab counts reflect only that venue'],
          ['Type a host name into "Search pod, host or venue"', 'Only pods with that host remain'],
          ['Clear the search and pick "All my venues"', 'All pods return'],
          ['On an owner without pods', 'Empty text "No pods at your venues yet."'],
        ],
      },
      {
        name: 'View pod details and attendees',
        description: 'Clicking a row opens the pod detail dialog.',
        steps: [
          ['Click a pod row', 'Dialog titled with the pod title and status chip; rows Venue, Hosts, When, Ends, Price, Attendees'],
          ['Look at "Who\'s coming"', 'Each attendee is listed with avatar and full name'],
          ['Open a pod with no attendees', '"No attendees yet."'],
          ['Open a completed or cancelled pod', 'Completed or Cancelled date row is shown'],
          ['Click "Close"', 'The dialog closes'],
        ],
      },
      {
        name: 'Cancel an upcoming pod',
        description: 'venueCancelPod refunds paid attendees, emails everyone and applies the admin-configured health penalty.',
        steps: [
          ['On an Upcoming pod click "Cancel pod" (tooltip "Cancel this pod and refund every paid attendee")', 'Dialog "Cancel this pod?" with pod title and "<date> · <venue>"; the row click dialog does not open'],
          ['Read the warning', 'Headline "Cancelling this pod will reduce this venue\'s Account Health by N points." (or "cannot be undone" when the penalty is 0) and the refund/email explanation'],
          ['Type "Court flooded after heavy rain" in "Why are you cancelling?"', 'Hint about at least 5 characters and the cancellation email'],
          ['Click "Cancel this pod"', 'Button shows "Cancelling…", the dialog closes and a snackbar reads "Pod cancelled — N payments refunded. This venue\'s Account Health is now X."'],
          ['Check the table', 'The pod moves to the Cancelled tab with status Cancelled and its "Cancel pod" button disabled'],
          ['Check the data', 'Pod soft-deleted, venue slot released to AVAILABLE, venue health reduced by the configured penalty'],
        ],
      },
      {
        name: 'Cancel reason validation',
        description: 'The reason is required text of 5 to 500 characters.',
        steps: [
          ['Open "Cancel this pod?" and click "Cancel this pod" with an empty reason', '"Reason must be at least 5 characters" and no mutation is sent'],
          ['Enter "rain"', 'Still "Reason must be at least 5 characters"'],
          ['Enter 501 characters', '"Reason must be 500 characters or fewer"'],
          ['Click "Keep the pod"', 'The dialog closes and the pod is unchanged'],
        ],
      },
      {
        name: 'Cancel is unavailable once a pod is not upcoming',
        description: 'The Cancel button is disabled with a reason tooltip, and the server refuses too.',
        steps: [
          ['Hover "Cancel pod" on an Ongoing pod', 'Button disabled, tooltip "This pod has already started, so it can no longer be cancelled."'],
          ['Hover it on a Completed pod', 'Tooltip "This pod has already finished."'],
          ['Hover it on a Cancelled pod', 'Tooltip "This pod is already cancelled."'],
          ['Send venueCancelPod for a pod that has started', 'Server refuses with "Only an upcoming pod can be cancelled"'],
          ['Send venueCancelPod for a pod at another owner\'s venue', 'The request is refused and nothing is refunded'],
        ],
      },
      {
        name: 'Request Change Venue entry point',
        description: 'The non-destructive action beside Cancel opens the shared change-request dialog (detailed in the Change Requests flows).',
        steps: [
          ['On a pod row click "Request Change Venue"', 'The change-request dialog opens for this pod with role VENUE; the pod detail dialog does not open'],
          ['File the request', 'The dialog closes and a snackbar confirms the request was filed'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Auto Pods',
    description:
      '/venues/auto-pods (sidebar entry behind the auto_pods flag): Auto Pod offers the chosen approved venue can take, accepting with one of its own slots, the potential-earnings calculator and withdrawing an accepted slot.',
    sub_flows: [
      {
        name: 'Queue loads for the first approved venue',
        description: 'The venue picker lists approved, active venues and selects the first on arrival.',
        steps: [
          ['As a VENUE_OWNER with approved venues open /venues/auto-pods', 'Heading "Auto Pods for your venue" with a handshake icon'],
          ['Look at the Venue picker', 'Label "Venue", first approved active venue preselected, caption "Category: <Super › Category › Sub>"'],
          ['Look at the filters', 'Country / State / City location cascade'],
          ['Look at the queue', 'Section "Needs your action" with cards; accepted offers under "Assigned slot"'],
          ['Inspect a card', 'Title, mode chip Physical/Virtual, Auto Pod number · category, ticks Venue Enroll / Host Enroll / Club Admin Enroll, city line, "View Potential Earnings", "Expires in Xh Ym Zs", "Accept & pick a slot"'],
          ['Choose another venue in the picker', 'The queue reloads with offers that venue could take'],
        ],
      },
      {
        name: 'No approved venues or no category',
        description: 'The picker explains why nothing can be offered.',
        steps: [
          ['As an owner whose venues are all DRAFT or SUBMITTED open /venues/auto-pods', 'Info "Add an approved venue to be offered Auto Pods." instead of the picker'],
          ['Check the card buttons if any offers render', '"Accept & pick a slot" is disabled because no venue is selected'],
          ['As an owner whose approved venue has no category', 'Warning "This venue has no category yet — set one under Manage venue to be offered Auto Pods."'],
          ['With no offers for the venue', 'Info "No Auto Pods are waiting for a venue right now."'],
        ],
      },
      {
        name: 'Accept an Auto Pod with a slot',
        description: 'Accepting books one of the venue\'s own future slots (BOOKED under the Auto Pod) and enrols the venue.',
        steps: [
          ['Publish an AVAILABLE slot inside the offer window, then click "Accept & pick a slot" on an offer', 'Dialog "Accept this Auto Pod?" with "Your slot is booked for this pod straight away. It goes live once everyone else has enrolled too."'],
          ['Read the context', 'Pod title, "In <city>" when pinned, "Accepting with <venue name>"'],
          ['Open "Pick a slot"', 'Helper "Free slots in the next N days, nearest first."; options "<date time> · <space> · ₹price"'],
          ['Choose a viable slot', 'Success alert "You earn ₹X from this slot, after Duncit’s deductions." and "Accept & pick a slot" enabled'],
          ['Click "Accept & pick a slot"', 'Dialog closes; the card moves under "Assigned slot" with the venue name and slot time and the Venue Enroll tick done'],
          ['Check the data', 'Slot status BOOKED (held by the Auto Pod), offer stage CLAIMING, city pinned to the venue\'s city if unpinned'],
        ],
      },
      {
        name: 'Accept without free slots',
        description: 'A venue with nothing free in the window is sent to its availability calendar.',
        steps: [
          ['Click "Accept & pick a slot" for a venue with no AVAILABLE slots in the window', 'Info "This venue has no free slots. Add availability first." with an "Add availability" button; the slot picker is disabled'],
          ['Click "Add availability"', 'Navigates to /venues/<venueId>/availability'],
        ],
      },
      {
        name: 'Slot the pod cannot cover',
        description: 'A slot price the offer\'s economics cannot pay is shown but cannot be accepted.',
        steps: [
          ['In the accept dialog choose a slot priced above what the pod can cover', 'Warning "The pod cannot cover this slot’s price."'],
          ['Look at the accept button', '"Accept & pick a slot" stays disabled'],
        ],
      },
      {
        name: 'Pinned offer in another city',
        description: 'An offer pinned to a city only takes venues from that city.',
        steps: [
          ['Pick a venue in Bengaluru and open an offer pinned to Pune', 'Warning "None of your venues is in Pune." (city label) and the slot picker is disabled'],
          ['Look at the accept button', 'Disabled; no slots are fetched'],
        ],
      },
      {
        name: 'Another venue accepted first',
        description: 'The losing venue gets a conflict and its booked slot is released.',
        steps: [
          ['Open the same offer in two venue owners\' sessions and accept in the first', 'First accept succeeds'],
          ['Accept in the second session with a slot', 'Error in the dialog: "This Auto Pod has already been accepted by another venue." (or "Someone else took this Auto Pod first.")'],
          ['Check the second venue\'s slot', 'The slot is back to AVAILABLE'],
          ['Accept an offer the admin has paused', 'Error "This Auto Pod is paused — try again once the admin resumes it"'],
        ],
      },
      {
        name: 'View Potential Earnings calculator',
        description: 'A local calculator per space; nothing is saved.',
        steps: [
          ['Click "View Potential Earnings" on a card', 'Dialog "Potential Earnings" with "Enter a ticket price for a space to see what this pod could take there." and one row per space with "Capacity: N"'],
          ['Enter Ticket price 250 for a space with capacity 6', '"Potential Earnings (Ticket Price × Slots): ₹250 × 6 = ₹1,500"'],
          ['Close the dialog', 'The card reads "You could earn ₹1,500"'],
          ['Open it for a venue with no spaces', 'Info "Add a space with a capacity to this venue to see its potential earnings."'],
        ],
      },
      {
        name: 'Cancel an accepted Auto Pod',
        description: 'The venue withdraws its slot while the offer is still enrolling.',
        steps: [
          ['On a card under "Assigned slot" click "Cancel Auto Pod"', 'Dialog "Cancel this Auto Pod?" with the dependency warning and "Cancelling deducts N Account Health points." when a penalty is set'],
          ['Click "Cancel" in the dialog', 'The dialog closes and nothing changes'],
          ['Click "Cancel Auto Pod" then "Yes, cancel"', 'The dialog closes and the offer returns under "Needs your action"'],
          ['Check the data', 'Slot released to AVAILABLE, venue claim cleared, withdraw penalty applied to the venue and owner'],
          ['Look at an offer that already went live', 'No "Cancel Auto Pod" button; a "Live" chip is shown instead'],
        ],
      },
      {
        name: 'Queue load failure',
        description: 'A failed queue query offers a retry.',
        steps: [
          ['Make venueAutoPods fail (e.g. network offline) and open /venues/auto-pods', 'Error "Could not load Auto Pods. Please try again." with "Try again"'],
          ['Restore the network and click "Try again"', 'The queue loads'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Venue Settings',
    description:
      '/venues/settings: one venue at a time, the cancellation policy (reschedule-only switch and charge bands) saved through updateVenueSettings.',
    sub_flows: [
      {
        name: 'Open settings for the first venue',
        description: 'The page lands on the first owned venue rather than an empty form.',
        steps: [
          ['As a VENUE_OWNER open /venues/settings', 'Heading "Venue settings" and "Rules that apply to bookings at your venue."'],
          ['Look at the Venue select', 'The first owned venue is preselected'],
          ['Look at the "Cancellation policy" card', 'Checkbox "Reschedule only — no cancellations" with its hint, "Cancellation charges" with the bands hint'],
          ['On a venue with no bands', 'Success alert "No charges yet — cancelling is free at any time."'],
        ],
      },
      {
        name: 'Add charge bands and save',
        description: 'Bands are stored widest window first.',
        steps: [
          ['Click "Add a charge"', 'A band appears prefilled "Cancel within (hours)" 24, "Charge" "Percent of slot price", "Amount" 50'],
          ['Add another band and set 6 hours, "Flat amount", 500', 'Two band rows are shown'],
          ['Click "Save policy"', 'Button reads "Saving…", then a snackbar "Cancellation policy saved."'],
          ['Reload the page', 'Bands are shown with the 24-hour band listed before the 6-hour band'],
        ],
      },
      {
        name: 'Charge band validation',
        description: 'makeCancellationPolicySchema refuses bad bands before any request.',
        steps: [
          ['Clear a band\'s hours and click "Save policy"', '"Enter the hours before the slot" (or the number error) and nothing is saved'],
          ['Enter hours 2.5', '"Use whole hours"'],
          ['Enter hours -1', '"Hours cannot be negative"'],
          ['Enter hours 9000', '"Use 8760 hours (a year) or less"'],
          ['Enter amount -10', '"The charge cannot be negative"'],
          ['Set Percent of slot price with amount 120', '"A percentage cannot go above 100"'],
          ['Give two bands 24 hours', 'The second band shows "Another band already covers this window"'],
        ],
      },
      {
        name: 'Reschedule-only venue',
        description: 'The switch greys out bands without deleting them.',
        steps: [
          ['Tick "Reschedule only — no cancellations"', 'Info "Cancellation charges are off because this venue is reschedule-only."; band fields, remove buttons and "Add a charge" are disabled'],
          ['Click "Save policy"', 'Snackbar "Cancellation policy saved."; reschedule_only true and the bands are still stored'],
          ['Untick the checkbox and save', 'Bands become editable again with their previous values'],
        ],
      },
      {
        name: 'Remove a charge band',
        description: 'Each band has a remove button.',
        steps: [
          ['Click the delete icon (tooltip "Remove this charge") on a band', 'The band row disappears'],
          ['Click "Save policy"', 'The saved policy no longer contains that band'],
        ],
      },
      {
        name: 'Switch venues',
        description: 'Each venue keeps its own policy.',
        steps: [
          ['Select a second venue in the Venue select', 'The form resets to that venue\'s own policy'],
          ['Add a band and save', 'Only the second venue\'s policy changes; the first venue is unchanged'],
        ],
      },
      {
        name: 'No venues to configure',
        description: 'An owner with no venues sees an info message.',
        steps: [
          ['As a VENUE_OWNER without venues open /venues/settings', 'Info "Register a venue first — settings apply to a venue you own." and no form'],
        ],
      },
      {
        name: 'Server refuses an invalid policy',
        description: 'updateVenueSettings re-validates bands and ownership.',
        steps: [
          ['Send updateVenueSettings with two bands sharing hours_before', 'Error shown under the form: "each cancellation band needs its own "hours before" window"'],
          ['Send a PERCENT band with value 150', 'Error "cancellation charge must be between 0 and 100"'],
          ['Send the mutation for another owner\'s venue', 'Error "Not your venue"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Host Access',
    description:
      'Who sees the Host and Club Admin areas of partners-app.duncit.com: sidebar groups built from roles, the auto_pods flag, SectionGate redirects and where / lands.',
    sub_flows: [
      {
        name: 'Signed-out visit bounces to login',
        description: 'Every partner route is wrapped by the shell auth guard.',
        steps: [
          ['Sign out, then open /host/dashboard directly', 'The browser lands on /login with a redirect parameter pointing back to /host/dashboard'],
          ['Sign in with an account that holds the HOST role', 'The app returns to /host/dashboard and the Host Dashboard hero renders'],
        ],
      },
      {
        name: 'Sidebar for a user with no partner role',
        description: 'A signed-in user with no CLUB_ADMIN, VENUE_OWNER, HOST or ECOMM_MANAGER role only gets the onboarding entries.',
        steps: [
          ['Sign in as a user with no partner roles and open /', 'The app redirects to /earn (Earn with Duncit)'],
          ['Look at the sidebar', 'A "Host" group shows exactly one child "Be a Host"; there is no "Club Admin" group and no Wallet entry'],
          ['Check the tail of the sidebar', 'Verification, FAQs, Support, Policies and the featured "Earn with Duncit" card ("Host, list or sell") are listed'],
          ['Click "Be a Host"', 'The browser navigates to /be-a-host, which opens the Earn with Duncit page focused on the Host journey'],
        ],
      },
      {
        name: 'Sidebar for an approved host',
        description: 'Holding HOST replaces the onboarding entry with the host area.',
        steps: [
          ['Sign in as a user holding only the HOST role and open /', 'The app redirects to /host/dashboard'],
          ['Expand the "Host" sidebar group', 'Children are "Host Dashboard", "Your Pods" and "Change Requests"; "Be a Host" is not shown'],
          ['Look below the partner groups', 'A "Wallet" entry is listed above Verification'],
        ],
      },
      {
        name: 'Sidebar for a club admin',
        description: 'The Club Admin group appears only for the CLUB_ADMIN role.',
        steps: [
          ['Sign in as a user holding the CLUB_ADMIN role', 'A "Club Admin" group is first in the sidebar'],
          ['Expand the group', 'Children are "Dashboard", "Clubs", "Change Requests" and "Pod Monitoring (AI)"'],
          ['Open /', 'The app redirects to /club-admin/dashboard'],
        ],
      },
      {
        name: 'Landing path for a user with several roles',
        description: 'Section order decides where / lands: Club Admin, Venue Owner, Host, E-Commerce.',
        steps: [
          ['Sign in as a user holding both CLUB_ADMIN and HOST and open /', 'The app redirects to /club-admin/dashboard, not /host/dashboard'],
          ['Look at the sidebar', 'The "Club Admin" group is listed above the "Host" group, and both show their full children'],
        ],
      },
      {
        name: 'Auto Pods entries follow the auto_pods flag',
        description: 'The Auto Pods nav entries are inserted right after each Dashboard child only while the auto_pods feature flag is on.',
        steps: [
          ['With auto_pods OFF, sign in as a user with HOST and CLUB_ADMIN', 'Neither the Host nor the Club Admin group has an "Auto Pods" entry'],
          ['Turn the auto_pods feature flag ON in Admin and reload', 'An "Auto Pods" entry appears second in the Host group (after "Host Dashboard") pointing to /host/auto-pods'],
          ['Expand the Club Admin group', 'An "Auto Pods" entry appears second (after "Dashboard") pointing to /club-admin/auto-pods'],
          ['Open / again', 'The landing route is still /club-admin/dashboard, not an Auto Pods page'],
        ],
      },
      {
        name: 'Host routes refuse a user without HOST',
        description: 'SectionGate sends anyone lacking HOST back to / for every /host route.',
        steps: [
          ['Sign in as a user without the HOST role and type /host/dashboard in the address bar', 'The page does not render; the browser is replaced to / which lands on /earn (or the first area the user holds)'],
          ['Type /host/pods', 'Redirected to / the same way'],
          ['Type /host/change-requests', 'Redirected to / the same way'],
          ['Type /host/auto-pods', 'Redirected to / the same way'],
          ['Open /become-host', 'The host application page renders, because /become-host is not a gated host route'],
        ],
      },
      {
        name: 'Club Admin routes refuse a user without CLUB_ADMIN',
        description: 'Every /club-admin path is gated on the CLUB_ADMIN role.',
        steps: [
          ['Sign in as a HOST without CLUB_ADMIN and open /club-admin/dashboard', 'Redirected to / and then to /host/dashboard'],
          ['Open /club-admin/clubs/any-id/pods/any-id/attendance', 'Redirected to / without rendering the attendance board'],
          ['Open /club-admin/monitoring', 'Redirected to / without rendering Pod Monitoring (AI)'],
        ],
      },
      {
        name: 'Legacy redirects',
        description: 'Short paths redirect into the host and club admin areas.',
        steps: [
          ['As a host, open /host', 'The browser is replaced to /host/dashboard'],
          ['Open /pods', 'The browser is replaced to /host/pods'],
          ['As a club admin, open /club-admin', 'The browser is replaced to /club-admin/dashboard'],
          ['Open an unknown path such as /host-foo', 'The catch-all route redirects to /'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Host Dashboard',
    description:
      'Host > Host Dashboard (/host/dashboard): balance hero, earnings and pod tiles, quick actions, pod insights and profile health, read from PartnerHostDashboard and PartnerHostInsights.',
    sub_flows: [
      {
        name: 'Open the host dashboard',
        description: 'The hero and six stat cards load for an approved host.',
        steps: [
          ['Sign in as a host and open /host/dashboard', 'Hero shows overline "Partner tools · Host", heading "Host Dashboard" and "Welcome back, <full name>"'],
          ['Look at the right side of the hero', '"AVAILABLE BALANCE" shows the wallet balance formatted with the currency symbol and a green "HOST" chip'],
          ['Look at the stat cards', 'Six cards: Lifetime Earnings, This Month, Pending, Total Pods, Upcoming, Completed, each with its hint line'],
          ['Compare Total Pods', 'Total Pods equals Upcoming + Ongoing + Completed + Cancelled from hostInsights'],
        ],
      },
      {
        name: 'Quick actions navigate',
        description: 'The Quick actions widget links into the host area and wallet.',
        steps: [
          ['On /host/dashboard find the "Quick actions" widget', 'Buttons "Your Pods", "Wallet" and "Create pod" are shown; "Create pod" is enabled for a HOST'],
          ['Click "Your Pods"', 'Navigates to /host/pods'],
          ['Go back and click "Wallet"', 'Navigates to /wallet'],
          ['Go back and click "Create pod"', 'Navigates to /host/pods?new=1 and the Your Pods page renders'],
        ],
      },
      {
        name: 'Insights empty states',
        description: 'A host with no pods and no earnings history.',
        steps: [
          ['Sign in as a newly approved host with no pods and open /host/dashboard', 'Stat cards show zero amounts and zero counts'],
          ['Look at "Pods by status"', 'It reads "No pods yet. Once you host one it appears here."'],
          ['Look at "Monthly earnings"', 'It reads "Not enough completed pods to draw a trend yet."'],
        ],
      },
      {
        name: 'Insights with pod history',
        description: 'Status bars and the monthly earnings line render once data exists.',
        steps: [
          ['Sign in as a host with pods in several states and at least two months of earnings', 'The dashboard loads without errors'],
          ['Look at "Pods by status"', 'Four progress bars labelled Upcoming, Ongoing, Completed, Cancelled show their counts'],
          ['Look at "Monthly earnings"', 'An SVG line chart labelled "Monthly host earnings" renders with month labels under it'],
          ['Read the caption under the chart', '"Peak month:" shows the highest monthly total formatted as money'],
        ],
      },
      {
        name: 'Profile health card',
        description: 'The myAccountHealth score and band drive the health card.',
        steps: [
          ['Open /host/dashboard as a host with a GREEN health band', 'The "Profile health" card shows the score in a green circle and "Your account is in good standing."'],
          ['Repeat as a host with a YELLOW band', 'Hint reads "A few things need attention — complete your verification to rank higher."'],
          ['Repeat as a host with a RED band', 'Hint reads "Your account needs attention. Contact support if this looks wrong."'],
          ['Read the right side of the card', 'The number of pods settled is shown above "pods settled"'],
        ],
      },
      {
        name: 'Dashboard query failure',
        description: 'A server error is shown in the header instead of crashing.',
        steps: [
          ['Make PartnerHostDashboard fail (e.g. server offline) and open /host/dashboard', 'A red error alert with the query error message is shown under the hero'],
          ['Look at the stat cards', 'They fall back to zero values instead of breaking the page'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Host Pods',
    description:
      'Host > Your Pods (/host/pods): the myHostPodsTable, New Pod dialog and the per-row HostPodActionsMenu (scan, complete, edit/resubmit, links, Request Change Host, cancel).',
    sub_flows: [
      {
        name: 'Open the Your Pods table',
        description: 'The host pods table lists every pod the host runs.',
        steps: [
          ['Sign in as an approved host and open /host/pods', 'Hero shows "Partner tools · Host", "Your Pods" and a "New Pod" button'],
          ['Look at the table columns', 'Pod (title with club caption), Place, Date, Attendees, Attendance, Status and Actions are visible'],
          ['Look at a virtual pod row', 'Place reads "Virtual pod"'],
          ['Type part of a pod title in the search box ("Search pod title or ID")', 'Only matching rows remain'],
          ['Search for text that matches nothing', 'The table shows "No pods created from your partner account yet."'],
        ],
      },
      {
        name: 'Status chips per stage',
        description: 'The Status column is derived from is_deleted, completed_at, venue_approval_status and is_active.',
        steps: [
          ['Open /host/pods with pods in every stage', 'Chips read Active, Draft, Awaiting venue, Venue rejected, Completed or Cancelled'],
          ['Check a completed pod', 'Status chip is green "Completed" and the Attendance cell shows attended/booked seats'],
        ],
      },
      {
        name: 'New Pod blocked until the host application is approved',
        description: 'The New Pod button follows myHost.status, not just the role.',
        steps: [
          ['Sign in as a user who holds HOST but whose myHost status is not APPROVED and open /host/pods', 'An info alert reads "Your host application must be approved before you can create pods."'],
          ['Look at the "New Pod" button', 'It is disabled'],
        ],
      },
      {
        name: 'Create a physical pod',
        description: 'The New Pod dialog uses the shared pod form with venue slot picker and products.',
        steps: [
          ['As an approved host on /host/pods click "New Pod"', 'Dialog "New Pod" opens with info "Your approved host profile is added as the pod host automatically."'],
          ['Enter a title, description, choose a club, keep Physical pod, pick one of your approved venues and an available slot', 'Start and end fields fill from the slot'],
          ['Add at least one image, set Pod type, Amount and No. of spots', 'No field shows an error'],
          ['Click "Save"', 'The dialog closes, a snackbar reads "Pod created." and the table refetches with the new pod'],
        ],
      },
      {
        name: 'New Pod validation errors',
        description: 'Zod rules from @duncit/pod-form.',
        steps: [
          ['Open "New Pod" and click "Save" without entering anything', 'Errors include "Title is too short", "Add a longer description", "Select a club" and "At least one image is required"'],
          ['Keep Physical pod without a venue and save', '"Select a venue" is shown on the Venue field'],
          ['Pick a venue but no slot and no start date, then save', '"Pick an available slot" is shown'],
          ['Set Amount to 2500 and save', '"Amount cannot exceed 1999" is shown'],
          ['Choose a Free pod type with a non-zero amount and save', '"Free pods must have amount 0" is shown'],
          ['Switch to Virtual pod with no meeting link and no end time, then save', '"Meeting link is required" and "End date/time is required for a virtual pod" are shown'],
          ['Enter a meeting link that is not http(s)', '"Meeting link must be a valid http(s) URL" is shown'],
        ],
      },
      {
        name: 'Save a pod as draft',
        description: 'Save as Draft submits the pod as a draft.',
        steps: [
          ['Fill the New Pod form with valid values', 'Form is valid'],
          ['Click "Save as Draft"', 'The dialog closes and the snackbar reads "Pod draft saved."'],
          ['Find the pod in the table', 'Its Status chip reads "Draft"'],
        ],
      },
      {
        name: 'Create pod refused by the server',
        description: 'Server guards on createPartnerPod surface inside the dialog.',
        steps: [
          ['Create a paid physical pod whose ticket price times payable spots is below the venue slot price', 'The dialog stays open with error "Total pod value is less than the venue price. Increase the ticket price so the pod covers the venue."'],
          ['Set a ticket price so low the host share is zero and save', 'Error "Estimated host earnings are ₹0 for this ticket price. Increase the ticket price to earn from this pod." is shown'],
          ['Save as a host whose host account was deactivated', 'Error "Your host account has been deactivated" is shown and no pod is created'],
        ],
      },
      {
        name: 'Row menu on an upcoming pod',
        description: 'The overflow menu on a pod more than 15 minutes before its start.',
        steps: [
          ['On /host/pods click the three-dot "Pod actions" button of an upcoming pod', 'A menu opens (aria label "Actions for <title>")'],
          ['Read the scan row', '"Scan attendee event tickets" is disabled with "Scanning opens 15 minutes before the pod starts."'],
          ['Look for Complete', 'There is no "Complete pod" row on an upcoming pod'],
          ['Read the remaining rows', '"Edit pod", "Upload Pod Media", "Feedback link", "Request Change Host" and "Cancel pod" are enabled'],
        ],
      },
      {
        name: 'Row menu on a past pod',
        description: 'Once a pod has ended the plan is frozen and completion is offered.',
        steps: [
          ['Open the "Pod actions" menu of a pod whose end time has passed', 'The scan row is disabled with "This pod has ended — tickets can no longer be scanned."'],
          ['Look at "Complete pod"', 'The row is present and enabled'],
          ['Look at "Edit pod", "Request Change Host" and "Cancel pod"', 'All three are disabled and show "This pod has ended — it can no longer be edited, re-hosted or cancelled."'],
        ],
      },
      {
        name: 'Cancelled pod has no actions',
        description: 'A soft-deleted pod disables the whole menu.',
        steps: [
          ['On /host/pods find a pod with Status "Cancelled"', 'The row renders normally'],
          ['Try to click its "Pod actions" button', 'The button is disabled and no menu opens'],
        ],
      },
      {
        name: 'Venue-rejected pod actions',
        description: 'A DECLINED pod never ran, so attendee actions are hidden and Edit opens resubmission.',
        steps: [
          ['Open the menu of a pod with Status "Venue rejected"', 'Scan, Complete, Upload Pod Media and Feedback link rows are not shown'],
          ['Click "Edit pod"', 'Dialog "Edit & resubmit pod" opens instead of the plain edit dialog'],
        ],
      },
      {
        name: 'Scan a ticket at the door',
        description: 'TicketScanDialog calls hostScanPodTicket, which records HOST_SCAN attendance.',
        steps: [
          ['Within 15 minutes of the start, open the pod menu and click "Scan attendee event tickets"', 'Dialog "Scan attendee tickets" opens with the pod title and a camera viewport "Hold the attendee’s ticket QR inside the frame."'],
          ['Scan a valid single-seat ticket for this pod', '"Checking the ticket…" shows, then a confirmation "Attendance marked" with "<name> is checked in." and a "Done" button'],
          ['Click "Done"', 'The confirmation closes; the dialog shows a green alert and the attendee card with a "Scan next" button'],
          ['Click "Scan next"', 'The camera viewport returns for the next guest'],
          ['Scan the same ticket again', 'A green alert reads "Already checked in" and no second confirmation appears'],
        ],
      },
      {
        name: 'Scan by pasting a ticket code',
        description: 'Manual entry when the camera cannot read the QR.',
        steps: [
          ['Open the scan dialog on an open pod', 'The viewport offers "Or paste the ticket code"'],
          ['Paste a valid ticket token and click "Check"', 'The ticket is checked the same way as a camera scan and the attendee card appears'],
        ],
      },
      {
        name: 'Scan refusals',
        description: 'hostScanPodTicket never throws for a bad code; it answers with a reason shown in red.',
        steps: [
          ['Scan a random or tampered QR', 'A red alert reads "Invalid or tampered QR code"'],
          ['Scan a valid ticket belonging to a different pod', 'Red alert "This ticket is for another pod — <other pod title>"'],
          ['Scan a cancelled ticket', 'Red alert "Ticket cancelled"'],
          ['Open "Complete pod" on an already completed pod with unmarked guests, click "Scan Attendee Event Tickets" and scan a ticket', 'Red alert "Attendance is closed for this pod"'],
        ],
      },
      {
        name: 'Scan a multi-seat ticket that needs companions',
        description: 'A ticket that admits more than one person requires the other people named before it is marked.',
        steps: [
          ['Scan a ticket that admits 3 seats with no companions recorded', 'A blue info alert reads "This ticket admits 3 — add the other 2 people to mark attendance" and the attendee card shows "Not checked in yet"'],
          ['Look below the card', 'Form "Who else is coming in?" shows rows "Person 1" and "Person 2" with Name, Country code and Phone'],
          ['Click "Mark attendance" with a one-letter name and a 3-digit phone', 'Errors "Enter the name" and "Enter a phone number — digits only, 6 to 15" are shown'],
          ['Enter the same phone number on both rows', 'The code button explains "Someone on this ticket already has this number. Every person needs their own."'],
          ['Fill both rows with valid distinct names and numbers and click "Mark attendance"', 'Confirmation "Attendance marked" reads "<name> and 2 more are checked in." with a "Checked in on this ticket" list'],
        ],
      },
      {
        name: 'Edit an active pod',
        description: 'PodEditDialog runs the content check then hostUpdatePod.',
        steps: [
          ['Open the menu of an upcoming active pod and click "Edit pod"', 'Dialog "Edit pod" opens prefilled with Title, Description and Media'],
          ['Look for the spots control', 'A Total spots stepper appears once podSpotLimits loads, with a hint about taken seats'],
          ['Change the title and description to valid new text and click "Save changes"', 'The button reads "Saving…", the dialog closes and the table row shows the new title'],
          ['Open Pod Monitoring as the pod club admin', 'An "Edited" entry for this pod is listed'],
        ],
      },
      {
        name: 'Edit pod validation',
        description: 'Host edit schema rules.',
        steps: [
          ['In "Edit pod" set the title to two characters and save', '"Title is too short" is shown and nothing is saved'],
          ['Set a title longer than 120 characters', '"Title is too long" is shown'],
          ['Set a description shorter than 10 characters', '"Add a longer description" is shown'],
          ['Remove every image from Media and save', '"Add at least one image URL" is shown'],
        ],
      },
      {
        name: 'Edit pod blocked by the content check',
        description: 'moderatePodContent refuses content that breaks the guidelines.',
        steps: [
          ['In "Edit pod" change the title to include a banned word and click "Save changes"', 'A "Content check" alert lists the violated rule and the Title field shows the violation message'],
          ['Confirm the table', 'The pod title is unchanged'],
          ['As the club admin open Pod Monitoring (AI)', 'A "Content Blocked" entry for this pod records the attempted change'],
        ],
      },
      {
        name: 'Host cannot lower spots',
        description: 'A host may only raise a live pod capacity.',
        steps: [
          ['Open "Edit pod" on a live pod', 'The spots stepper will not go below the current value and explains "A live pod’s spots can only be increased — ask your Club Admin to reduce them."'],
          ['Raise the spots within the venue capacity and save', 'The pod saves with the new number of spots'],
        ],
      },
      {
        name: 'Edit and resubmit a venue-rejected pod',
        description: 'hostResubmitPod reuses the same pod with a new venue slot.',
        steps: [
          ['Open the menu of a "Venue rejected" pod and click "Edit pod"', 'Dialog "Edit & resubmit pod" opens with the info hint about sending the booking request again'],
          ['Click "Resubmit request" without choosing a venue or slot', 'Errors "Select a venue" and "Select a time slot" are shown'],
          ['Pick a venue, then pick one of its available slots', 'The slot field enables only after a venue is picked and lists that venue slots'],
          ['Click "Resubmit request"', 'The button reads "Resubmitting…", the dialog closes and the Status chip becomes "Awaiting venue"'],
        ],
      },
      {
        name: 'Complete a past pod',
        description: 'PodCompleteDialog submits completePodSettlement with the venue bill amount.',
        steps: [
          ['Open the menu of an ended physical pod and click "Complete pod"', 'Dialog "Complete pod" shows the completion hint, "Venue Bill Amount" (₹), a "Pod Media" summary and "Your share (credited to your wallet on completion)"'],
          ['Look at the Attendance roster in the share block', 'A chip reads "<attended> of <booked> seats marked"; unmarked guests are listed under "Not marked yet — their seats are not part of the payout below."'],
          ['Enter a venue bill amount', 'After a short delay the share waterfall recalculates (Customer Paid, − GST, − Platform Fee, Pool, You receive)'],
          ['Click "Scan Attendee Event Tickets" and scan a guest, then close the scanner', 'The share preview re-reads and the guest moves into the attended list'],
          ['Click "Complete pod"', 'The button reads "Completing…", the dialog closes and the pod Status becomes "Completed"'],
        ],
      },
      {
        name: 'Complete pod validation and refusal',
        description: 'Venue bill rule and the already-submitted guard.',
        steps: [
          ['Open "Complete pod" on an ended physical pod and submit with the bill empty', '"Enter the venue bill amount" is shown'],
          ['Enter 0 or a negative bill and submit', '"Enter the venue bill amount" is shown again'],
          ['Open "Complete pod" on a virtual pod', 'No Venue Bill Amount field is shown'],
          ['Open "Complete pod" on a pod that is already Completed and submit', 'A red alert reads "This pod has already been submitted for completion"'],
          ['Open "Complete pod" on a pod with nobody scanned in', 'A warning reads "Nobody has been scanned in yet, so this pod would settle at zero."'],
        ],
      },
      {
        name: 'Cancel a pod nobody else joined',
        description: 'hostDeletePod with the mandatory reason.',
        steps: [
          ['Open the menu of an upcoming pod with no other attendees and click "Cancel pod"', 'Dialog "Cancel pod" reads "You are cancelling <title>. This cannot be undone." and info "No one else has joined this pod — it will be cancelled immediately."'],
          ['Pick reason "Low attendance" and click "Cancel pod"', 'The button reads "Cancelling…", the dialog closes and the row Status becomes "Cancelled"'],
          ['Open the row menu again', 'The Pod actions button is disabled'],
        ],
      },
      {
        name: 'Cancel a pod with paid attendees',
        description: 'hostPodDeleteImpact previews refunds before the cancel.',
        steps: [
          ['Click "Cancel pod" on a pod with paid bookings', 'A warning reads "<n> other attendees joined this pod." followed by "Cancelling initiates a refund of <amount> across <n> payments (logged in the Finance portal). All attendees will be emailed."'],
          ['Look at the confirm button', 'It reads "Initiate refunds & cancel"'],
          ['Pick "Venue unavailable", add a note and confirm', 'The pod is cancelled, payments are refunded and the row shows "Cancelled"'],
          ['Click "Keep pod" on another pod cancel dialog', 'The dialog closes and nothing changes'],
        ],
      },
      {
        name: 'Cancel pod validation',
        description: 'Reason and note rules.',
        steps: [
          ['Open "Cancel pod" and confirm without a reason', '"Select a reason" is shown under Reason'],
          ['Pick reason "Other" and leave Note empty', 'Note becomes required and confirming shows "Please describe the reason"'],
          ['Type a note longer than 500 characters', '"Keep the note under 500 characters" is shown'],
          ['Read the Note helper with no error', 'It reads "Shared with attendees in the cancellation email."'],
        ],
      },
      {
        name: 'Share and copy the feedback link',
        description: 'The rating link points at mWeb.',
        steps: [
          ['Open a pod menu and click the "Feedback link" row', 'The mWeb pod feedback page opens in a new tab'],
          ['Open the menu again and click the copy icon "Copy feedback link"', 'A green toast reads "Feedback link copied"'],
          ['In a browser that blocks clipboard access click the copy icon', 'A red toast reads "Could not copy the link. Copy it from the feedback page instead."'],
          ['Click the share icon "Share feedback link" in a browser without a share sheet', 'The message "How was “<title>”? Tell us in a minute:" plus the link is copied instead'],
        ],
      },
      {
        name: 'Upload Pod Media link',
        description: 'The pod media page link row.',
        steps: [
          ['Open a pod menu and click "Upload Pod Media"', 'The mWeb Upload Pod Media page for this pod opens in a new tab'],
          ['Click its copy icon "Copy upload link"', 'A green toast reads "Upload link copied"'],
        ],
      },
      {
        name: 'Request Change Host from a pod row',
        description: 'requestPodChange with role HOST from the Your Pods menu.',
        steps: [
          ['Open an upcoming pod menu and click "Request Change Host"', 'Dialog "Ask Duncit for a change?" shows "Duncit will look for a different host for this pod. Nothing moves until a new host accepts it."'],
          ['Read the penalty notice', 'It reads "This deducts <n> Account Health points." or "This does not affect your Account Health." per Pod Settings'],
          ['On a pod with bookings read the attendee notice', 'It reads "<n> people have already booked seats on this pod."'],
          ['Click "Yes, request a change" with an empty reason', '"Please tell us why you need this change" is shown and nothing is filed'],
          ['Enter a reason and click "Yes, request a change"', 'The dialog closes and the snackbar reads "Duncit has your request. We will find a replacement."'],
          ['Open /host/change-requests', 'The request appears under "Your requests" with status "Looking for a replacement"'],
        ],
      },
      {
        name: 'Second change request on the same pod is refused',
        description: 'Only one open change request per pod.',
        steps: [
          ['File "Request Change Host" again on a pod that already has an open request', 'The dialog stays open with error "You already have an open change request for this pod. Duncit is working on it."'],
          ['Click "Not now"', 'The dialog closes without filing'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Host Auto Pods',
    description:
      'Host > Auto Pods (/host/auto-pods): the host queue of Auto Pod offers, category and city filters, potential earnings, Assign Myself and cancelling an assignment.',
    sub_flows: [
      {
        name: 'Open the host Auto Pods queue',
        description: 'The queue splits into offers needing action and offers already taken.',
        steps: [
          ['As a host with auto_pods on, click "Auto Pods" in the Host group', 'Page /host/auto-pods shows heading "Auto Pods to host"'],
          ['Look at the filter row', 'Country, State and City selects plus a "Category" select defaulting to "All my categories"'],
          ['Look at the cards', 'Cards under "Needs your action" show title, Physical or Virtual tag, enrolment ticks, city line, expiry countdown and an "Assign Myself" button'],
          ['Look at an offer you already assigned', 'It is listed under "Assigned Auto Pods"'],
        ],
      },
      {
        name: 'Empty and failing queue',
        description: 'Empty and error states of AutoPodQueue.',
        steps: [
          ['Open /host/auto-pods when no offers need a host', 'An info alert reads "No Auto Pods need a host right now."'],
          ['Make hostAutoPods fail and reload', 'An error alert reads "Could not load Auto Pods. Please try again." with a "Try again" button'],
          ['Restore the server and click "Try again"', 'The queue loads'],
        ],
      },
      {
        name: 'Filter by category and city',
        description: 'Filters are passed to hostAutoPods.',
        steps: [
          ['Open the "Category" select', 'Only the sub-categories this host is approved in are listed as "Super › Category › Sub"'],
          ['Pick one sub-category', 'The queue refetches with only offers in that sub-category'],
          ['Pick a Country, State and City', 'The queue narrows to offers pinned to that city plus offers no partner has pinned yet'],
          ['Sign in as a host with no approved categories', 'The Category select is disabled with "You are not an approved host in any category yet."'],
        ],
      },
      {
        name: 'View potential earnings',
        description: 'The calculator on each card does not save anything.',
        steps: [
          ['Click "View Potential Earnings" on a card', 'Dialog "Potential Earnings" opens with "Add Ticket Price" and a spots control'],
          ['Enter 0 as ticket price', '"Enter a ticket price above zero." is shown'],
          ['Enter a valid price and move the spots slider', '"Your potential earning" lists "You earn", Venue, Club admin and "Duncit fee and GST" amounts'],
          ['Close the dialog with "Close"', 'The card earnings line reads "You could earn <amount>" with the typed figure'],
        ],
      },
      {
        name: 'Assign Myself to a pinned physical offer',
        description: 'hostAssignAutoPod with price and spots.',
        steps: [
          ['Click "Assign Myself" on a physical offer already pinned to a city with a venue slot', 'Dialog "Host this Auto Pod?" shows the title, "In <city>" and the venue and slot time'],
          ['Enter a viable ticket price and spots', 'The projection shows "You earn <amount>" and "Assign Myself" enables'],
          ['Click "Assign Myself"', 'The dialog closes, the queue refetches and the offer moves under "Assigned Auto Pods" with the Host tick done'],
        ],
      },
      {
        name: 'Unpinned offer needs a city first',
        description: 'An offer nobody has pinned takes its city from the host filter.',
        steps: [
          ['With no City selected, click "Assign Myself" on an unpinned offer', 'A warning reads "Select your city at the top first — this pod takes its city from you." and "Assign Myself" is disabled'],
          ['Close, select a City in the filter row and reopen the offer', 'An info alert reads "This pod will be set to <city>."'],
          ['Enter a viable price and assign', 'The offer is assigned and its card city line reads "In <city>"'],
        ],
      },
      {
        name: 'Virtual offer needs meeting details',
        description: 'autoPodHostMeetingReady gates the virtual assignment.',
        steps: [
          ['Click "Assign Myself" on a Virtual offer', 'Fields appear under "You run this pod online — set where members join and when it happens.": Meeting platform, Meeting link, Start date & time, End date & time'],
          ['Enter a viable price but leave the meeting link empty', '"Assign Myself" stays disabled'],
          ['Enter a non-http meeting link or an end time before the start', '"Assign Myself" stays disabled'],
          ['Enter a valid https link, a future start and a later end, then assign', 'The offer is assigned and moves to "Assigned Auto Pods"'],
        ],
      },
      {
        name: 'Price that earns nothing',
        description: 'The projection refuses a non-viable price.',
        steps: [
          ['Open "Assign Myself" and enter a ticket price too low to cover deductions', 'A warning reads "At this price you would earn nothing — raise the ticket price or the number of spots."'],
          ['Check the confirm button', '"Assign Myself" is disabled'],
        ],
      },
      {
        name: 'Another host took the offer first',
        description: 'The first host wins.',
        steps: [
          ['Open "Assign Myself" on an offer in two browsers as two different hosts', 'Both dialogs open'],
          ['Assign in the first browser', 'The first assignment succeeds'],
          ['Assign in the second browser', 'A red alert reads "Another host has already taken this Auto Pod." and the offer is not assigned'],
        ],
      },
      {
        name: 'Cancel an assigned Auto Pod',
        description: 'hostWithdrawAutoPod before the pod goes live.',
        steps: [
          ['Under "Assigned Auto Pods" click "Cancel Auto Pod" on an offer that is not live yet', 'Dialog "Cancel this Auto Pod?" shows the warning about dependent resources and "Cancelling deducts <n> Account Health points." when a penalty is set'],
          ['Click "Cancel" in the dialog', 'The dialog closes and the assignment stays'],
          ['Click "Cancel Auto Pod" again and then "Yes, cancel"', 'The dialog closes, the queue refetches and the offer is back under "Needs your action"'],
          ['Look at a LIVE assigned offer', 'It shows a green "Live" chip and no "Cancel Auto Pod" button'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Host Application',
    description:
      'The host application form at /become-host (reached after the onboarding meeting): four steps Personal, Identity, Verify, Submit, plus withdraw, rejection and approved states.',
    sub_flows: [
      {
        name: 'Personal step',
        description: 'Step 1 saves submitHostStep1.',
        steps: [
          ['Sign in as a user without a host application and open /become-host', 'Hero reads "Become a host" and "4 steps - submit your profile for review"; stepper shows Personal, Identity, Verify, Submit'],
          ['Look at the Email field', 'It is prefilled with the account email, disabled, with "Locked to your Duncit account"'],
          ['Clear Full name and click "Next"', 'An error alert about Full name is shown and the step is not saved'],
          ['Enter a name with digits and click "Next"', 'Error "Full name can use letters, spaces, apostrophes, periods and hyphens only"'],
          ['Enter a phone with letters or fewer than 6 digits', 'Error "Phone must contain only digits (6-15 digits)"'],
          ['Enter valid name and phone and click "Next"', 'Step 1 is saved (step_completed 1) and the stepper moves to Identity'],
        ],
      },
      {
        name: 'Date of birth range',
        description: 'Host age must be 18 to 100.',
        steps: [
          ['On the Personal step open the DOB picker', 'Dates younger than 18 years and older than 100 years cannot be picked'],
          ['Submit a DOB outside that range', 'Error "Host age must be between 18 and 100 years"'],
          ['Leave DOB empty with valid name and phone and click "Next"', 'The step saves because DOB is optional'],
        ],
      },
      {
        name: 'Identity step',
        description: 'Step 2 saves submitHostStep2.',
        steps: [
          ['On the Identity step click "Next" with empty fields', 'Error "Aadhar must be 12 digits" or "Aadhar is required"'],
          ['Enter an 11-digit Aadhar number', 'Error "Aadhar must be 12 digits"'],
          ['Enter a PAN like ABCD1234E', 'The field upper-cases input and "Next" shows "PAN must follow format ABCDE1234F"'],
          ['Enter valid Aadhar and PAN without a photo and click "Next"', 'Error "Passport-size photo is required"'],
          ['Click "Upload" beside Passport-size photo and pick an image', 'A preview image and an "Uploaded" chip appear'],
          ['Click "Next"', 'Step 2 saves and the stepper moves to Verify'],
        ],
      },
      {
        name: 'Verify step',
        description: 'Step 3 saves submitHostStep3.',
        steps: [
          ['On Verify click "Next" without a certificate', 'Error "Police verification is required"'],
          ['Upload a police verification certificate (image or PDF)', 'An "Uploaded" chip appears beside Police verification certificate'],
          ['Enter a 5-character Full address and click "Next"', 'Error "Full address must be at least 6 characters"'],
          ['Enter a valid address and click "Next"', 'Step 3 saves and the stepper moves to Submit'],
          ['Click "Back"', 'The stepper returns to Verify with the values kept'],
        ],
      },
      {
        name: 'Submit the application',
        description: 'submitHostFinal moves the application to SUBMITTED.',
        steps: [
          ['On the Submit step read the content', '"Submit your application for review." with "<full name> - <email>"'],
          ['Click "Submit"', 'The status chip in the hero reads SUBMITTED and an info alert "Application under review." appears'],
          ['Look at the navigation buttons', '"Submit"/"Next" is disabled while the application is under review'],
          ['Reload /become-host', 'The stepper reopens on the last completed step with the saved values'],
        ],
      },
      {
        name: 'Withdraw the application',
        description: 'withdrawHostApplication returns the application to draft.',
        steps: [
          ['With a SUBMITTED application read the warning alert', '"You can withdraw this host application until it is approved." with a "Withdraw" button'],
          ['Click "Withdraw"', 'Dialog "Withdraw host application?" explains it moves back to draft'],
          ['Click "Cancel"', 'The dialog closes and the status stays SUBMITTED'],
          ['Click "Withdraw" then confirm "Withdraw"', 'The status chip reads DRAFT and the form can be edited and submitted again'],
        ],
      },
      {
        name: 'Rejected application',
        description: 'A reviewer rejection shows the notes and allows editing.',
        steps: [
          ['Reject the application in the Onboarding portal with notes, then open /become-host', 'A red alert reads "Rejected: <reviewer notes>" and the hero chip reads REJECTED'],
          ['Edit the Personal step and click "Next"', 'The step saves and the application returns to DRAFT'],
        ],
      },
      {
        name: 'Approved host sees the hosting state',
        description: 'An approved host is not shown the application form.',
        steps: [
          ['Approve the application, then open /become-host', 'Hero reads "Your hosting" with a HOST chip and no stepper'],
          ['Read the success alert', '"Your host profile is approved. Create and manage your pods from the Host section."'],
          ['Click "Your Pods" on the alert', 'Navigates to /host/pods'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Dashboard',
    description:
      'Club Admin > Dashboard (/club-admin/dashboard): range select, Your Categories, KPI groups, monthly trend and the per-club breakdown table.',
    sub_flows: [
      {
        name: 'Open the club admin dashboard',
        description: 'clubAdminDashboard loads with the default range.',
        steps: [
          ['Sign in as a club admin and open /club-admin/dashboard', 'Hero reads "Partner tools · Club Admin", "Club Admin Dashboard" and the subtitle about pods, bookings, community and revenue'],
          ['Look at the Range select', 'It defaults to "Last 12 months" and offers Last 30 days, This month, Last 12 months, All time'],
          ['Look at the KPI groups', 'Overview, Engagement, Community and Revenue headings with 14 cards (Assigned Clubs … Total Spots)'],
          ['Look at "Your Categories"', 'One tile per category the clubs run under, with Clubs and Pods counts'],
        ],
      },
      {
        name: 'Change the date range',
        description: 'The range updates the KPIs and the table.',
        steps: [
          ['Change Range to "Last 30 days"', 'KPI cards reload for the new window'],
          ['Look at the Per-club breakdown table', 'It refetches with the same window'],
          ['Change Range to "All time"', 'The trend covers every month with activity, capped to the last 36 months'],
        ],
      },
      {
        name: 'Per-club breakdown table',
        description: 'clubAdminDashboardTable rows link to club pods.',
        steps: [
          ['Scroll to "Per-club breakdown"', 'Columns Club, Upcoming, Completed, Followers, Rating and Revenue are shown'],
          ['Search "Search club name or slug" for one club', 'Only that club row remains'],
          ['Click a club name', 'Navigates to /club-admin/clubs/<clubId> (the club pods page)'],
        ],
      },
      {
        name: 'Club admin with no clubs',
        description: 'Empty states when no club is assigned.',
        steps: [
          ['Sign in as a CLUB_ADMIN user not listed on any club and open the dashboard', 'KPI cards show zeros'],
          ['Look at "Your Categories"', '"No category is set on your clubs yet."'],
          ['Look at "Monthly trend" and the table', '"Not enough data to draw a trend yet." and "No clubs are assigned to you yet."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Clubs',
    description:
      'Club Admin > Clubs (/club-admin/clubs) and Edit Club Details (/club-admin/clubs/:clubId/edit): the clubs table and the content-only club editor.',
    sub_flows: [
      {
        name: 'Open Your Clubs',
        description: 'myAdminClubsTable lists every club the user administers.',
        steps: [
          ['Click "Clubs" in the Club Admin group', 'Page /club-admin/clubs shows "Your Clubs" and its subtitle'],
          ['Look at the columns', 'Club (thumbnail, name, verified badge, slug), Category, Locality, Followers, Pods, Upcoming, Venues, Verified, status and date, Actions'],
          ['Search "Search clubs" by a slug', 'Only the matching club remains'],
          ['Sign in as a club admin with no clubs', 'The table reads "No clubs are assigned to you yet."'],
        ],
      },
      {
        name: 'Open a club from the table',
        description: 'Row click and the Pods button go to different pages.',
        steps: [
          ['Click a club row outside the Actions cell', 'Navigates to /club-admin/clubs/<clubId>/edit'],
          ['Go back and click the "Pods" button in Actions', 'Navigates to /club-admin/clubs/<clubId>'],
        ],
      },
      {
        name: 'Edit club details',
        description: 'clubAdminUpdateClub strips governance fields.',
        steps: [
          ['Open /club-admin/clubs/<clubId>/edit', 'Page shows "Club Admin · Edit", the club name heading, a "Back to pods" button and the club form with preview'],
          ['Look for admin, verified and active controls', 'No Club Admin picker, verified toggle or active toggle is rendered'],
          ['Change the description and a perk, then click "Save"', 'A success toast reads "Club details updated." and the browser returns to /club-admin/clubs/<clubId>'],
          ['Click "Back to pods" from the edit page', 'Navigates to /club-admin/clubs/<clubId> without saving'],
        ],
      },
      {
        name: 'Edit club validation',
        description: 'Shared club schema rules.',
        steps: [
          ['Clear the Club name', 'The "Save" button is disabled'],
          ['Enter a name, clear the description and remove every feature image, then save', 'Errors "A short description is required" and "Add at least one feature image"'],
          ['Clear the WhatsApp Community link', '"WhatsApp community link is required"'],
          ['Enter "whatsapp-group" as WhatsApp Group link', '"Enter a valid link (https://…)"'],
          ['Remove every Who We Are, What We Do, Perks and Values entry and save', 'Errors ask for at least one point, perk and value'],
        ],
      },
      {
        name: 'Edit a club you do not administer',
        description: 'The server refuses the write for a foreign club.',
        steps: [
          ['Open /club-admin/clubs/<another club id>/edit', 'The public club data prefills the form'],
          ['Change a field and click "Save"', 'An error alert reads "You do not administer this club" and nothing is saved'],
          ['Open /club-admin/clubs/<unknown id>/edit', 'A warning reads "Club not found."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Club Pods',
    description:
      'The club pods page /club-admin/clubs/:clubId: status filter, New Pod launcher, per-pod actions (details, attendance, edit, Request Change Club Admin, delete) and the AI Monitoring activity dialog.',
    sub_flows: [
      {
        name: 'Open a club pods list',
        description: 'clubAdminPodsTable is pinned to the club server-side and returns every stage.',
        steps: [
          ['Open /club-admin/clubs/<clubId>', 'Header shows "Club Admin · Pods", the club name, "Create, edit and delete pods for this club." and "Edit Club Details"'],
          ['Look at the table', 'Columns Pod, Place, Date, Attendees, Attendance, Status, AI Monitoring and Actions; toolbar has a "Status" select and "New Pod"'],
          ['Open a club with no pods', 'The table reads "This club has no pods yet. Create the first one."'],
          ['Click "Edit Club Details"', 'Navigates to /club-admin/clubs/<clubId>/edit'],
        ],
      },
      {
        name: 'Filter pods by status',
        description: 'The status is a query argument.',
        steps: [
          ['Open the "Status" select', 'Options: All statuses, Awaiting venue, Venue rejected, Draft, Active, Completed, Cancelled'],
          ['Pick "Cancelled"', 'The table refetches and only Cancelled pods remain'],
          ['Pick "All statuses"', 'Every stage is listed again'],
        ],
      },
      {
        name: 'Row actions per stage',
        description: 'Which icon buttons render depends on the pod status.',
        steps: [
          ['Look at an Active pod row', 'Icons: Pod details, Pod Attendance, Edit pod, Request Change Club Admin, Delete pod'],
          ['Look at a Draft or Awaiting venue pod', 'No Pod Attendance icon'],
          ['Look at a Cancelled pod', 'Only Pod details and Edit pod icons; no Request Change Club Admin and no Delete pod'],
          ['Click the Pod details icon', 'Navigates to /club-admin/clubs/<clubId>/pods/<podId>'],
        ],
      },
      {
        name: 'Delete a pod',
        description: 'clubAdminDeletePod soft-deletes after a confirm dialog.',
        steps: [
          ['Click "Delete pod" on an active pod', 'Confirm dialog "Delete pod?" reads "This will remove <title> from the club. Members lose access to it. This cannot be undone."'],
          ['Click "Cancel"', 'The dialog closes and the pod stays'],
          ['Click "Delete pod" again and confirm "Delete"', 'The button reads "Deleting…", then a snackbar "Pod deleted." and the row status becomes Cancelled'],
          ['Make the delete fail on the server and confirm', 'The dialog closes and a red alert above the table shows the server message'],
        ],
      },
      {
        name: 'Open a pod activity trail',
        description: 'The AI Monitoring pill opens clubAdminPodAuditLogs for one pod.',
        steps: [
          ['Click the "AI Monitoring" pill on a pod row', 'Dialog "Activity · <title>" lists each action chip, actor, source chip and AI risk chip'],
          ['Read an edited entry', 'Each changed field reads "<field>: <from> → <to>" and an "AI: <summary>" caption when reviewed'],
          ['Open the pill on a pod with no audit entries', '"No recorded activity for this pod yet."'],
          ['Click "Close"', 'The dialog closes'],
        ],
      },
      {
        name: 'Request Change Club Admin',
        description: 'requestPodChange with role CLUB_ADMIN from the club pods table.',
        steps: [
          ['Click the "Request Change Club Admin" icon on an active pod', 'Dialog "Ask Duncit for a change?" reads "Duncit will look for a different admin for this pod’s club. Nothing moves until one accepts."'],
          ['Type more than 500 characters in the reason', 'Input stops at 500 characters'],
          ['Enter a reason and click "Yes, request a change"', 'Snackbar "Duncit has your request. We will find a replacement."'],
          ['Open /club-admin/change-requests', 'The request is listed under "Your requests" with the Club Admin role chip'],
        ],
      },
      {
        name: 'Another club pods are refused',
        description: 'A club admin cannot read a club they do not administer.',
        steps: [
          ['Open /club-admin/clubs/<a club you do not administer>', 'The server refuses clubAdminPodsTable with "You do not administer this club" and no pod rows load'],
          ['Open /club-admin/clubs/<clubId>/pods/<pod of another club>/attendance', 'The attendance board shows the error "You do not administer this club" with a "Try again" button'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Pod Editor',
    description:
      'The full-page pod editor at /club-admin/clubs/:clubId/pods/new and /pods/:id/edit (useClubAdminPodEditor + PodEditorPage) and the New Pod kind chooser.',
    sub_flows: [
      {
        name: 'New Pod with Auto Pods off',
        description: 'Without the auto_pods flag the launcher opens the editor directly.',
        steps: [
          ['With auto_pods OFF click "New Pod" on /club-admin/clubs/<clubId>', 'Navigates straight to /club-admin/clubs/<clubId>/pods/new'],
          ['Look at the page', 'Eyebrow "Club Admin · <club name>", heading "New Pod", "Back to pods" and info "You are added as the pod host automatically unless you assign hosts below."'],
        ],
      },
      {
        name: 'New Pod with Auto Pods on',
        description: 'The launcher asks which kind of pod.',
        steps: [
          ['With auto_pods ON click "New Pod"', 'Dialog "What kind of pod?" offers "Normal Pod" and "Auto Pod" with their descriptions'],
          ['Click "Cancel"', 'The dialog closes and nothing navigates'],
          ['Click "New Pod" then "Normal Pod"', 'Navigates to /club-admin/clubs/<clubId>/pods/new'],
          ['Go back, click "New Pod" then "Auto Pod"', 'Navigates to /club-admin/clubs/<clubId>/auto-pods/new'],
        ],
      },
      {
        name: 'Create a physical pod for the club',
        description: 'clubAdminCreatePod pins the club and injects the club admin as host when none is chosen.',
        steps: [
          ['On /pods/new fill Pod title and Description, keep Physical pod and pick a venue', 'The club is pinned to this club and the live member preview updates as you type'],
          ['Pick an available slot in "When, Where & Map"', 'Start and end fill from the slot'],
          ['Add an image in "Images & videos", set Pod type, Amount and No. of spots', 'No errors are shown'],
          ['Leave Hosts empty and click "Save"', 'Toast "Pod created." and the browser returns to /club-admin/clubs/<clubId> with the new pod listed'],
          ['Open the new pod details', 'The Hosts card lists the club admin as host'],
        ],
      },
      {
        name: 'Assign a host while creating',
        description: 'The Hosts field searches approved hosts through clubAdminHostSearch.',
        steps: [
          ['On /pods/new type a name into "Search hosts…"', 'Approved hosts matching the name are suggested'],
          ['Pick a host and save a valid pod', 'The pod is created with that host instead of the club admin'],
        ],
      },
      {
        name: 'Create a virtual pod',
        description: 'Meeting Details replace When, Where & Map.',
        steps: [
          ['Switch Pod mode to "Virtual pod"', 'The "Meeting Details" section shows Meeting platform, Meeting link, Meeting notes, Start and End date & time'],
          ['Save without an end date', '"End date/time is required for a virtual pod"'],
          ['Set an end before the start', '"End must be after start"'],
          ['Attach a Duncit product and save', '"A virtual pod cannot carry products"'],
          ['Fix all fields and click "Save"', 'Toast "Pod created." and the pod shows Place "Virtual pod"'],
        ],
      },
      {
        name: 'Pod editor validation',
        description: 'Zod rules in makePodSchema.',
        steps: [
          ['Click "Save" on an empty /pods/new form', 'Errors "Title is too short", "Add a longer description", "Select a venue", "Start date/time required" and "At least one image is required"'],
          ['Pick a start date in the past', '"Start date/time must be after current date/time"'],
          ['Enter a reel URL that is not http(s)', '"Reel video must be a valid http(s) URL"'],
          ['Enable the multi-ticket discount with no tier', '"Add at least one discount tier"'],
        ],
      },
      {
        name: 'Save a club pod as draft',
        description: 'Save as Draft on the create route.',
        steps: [
          ['Fill a valid pod on /pods/new and click "Save as Draft"', 'Toast "Pod draft saved." and the browser returns to the club pods list'],
          ['Filter the list by "Draft"', 'The saved pod is listed'],
        ],
      },
      {
        name: 'Edit an existing club pod',
        description: 'clubAdminUpdatePod at any stage; an unchanged slot is not re-sent.',
        steps: [
          ['Click the Edit pod icon on a pod row', 'Navigates to /club-admin/clubs/<clubId>/pods/<podId>/edit with heading "Edit Pod" and values prefilled'],
          ['Change the description only and click "Save"', 'Toast "Pod updated." and the browser returns to the club pods list; the venue approval status is unchanged'],
          ['Edit a Venue rejected pod and pick a different venue slot, then save', 'The pod is re-routed and its status becomes Awaiting venue'],
        ],
      },
      {
        name: 'Edit refused by the content guard',
        description: 'podService.update screens only changed content.',
        steps: [
          ['On the edit page change the title to include a banned word and save', 'A red alert shows the guideline headline followed by one line per broken rule; the page stays open'],
          ['Open Pod Monitoring (AI)', 'A "Content Blocked" entry with HIGH risk records the attempted change'],
        ],
      },
      {
        name: 'Spots cannot drop below seats taken',
        description: 'Club admins may lower spots but never below seats already booked.',
        steps: [
          ['Edit a live pod with 8 seats booked and try to set No. of spots to 5', 'The control will not go below the booked seats; a save carrying 5 is refused with "8 seats are already booked — the pod cannot hold fewer than that"'],
          ['Try to set spots above the booked space capacity', 'The control caps at the capacity; a save above it is refused with "The booked space holds <n> people — the pod cannot have more spots than that"'],
          ['Set spots between seats taken and capacity and save', 'Toast "Pod updated."'],
        ],
      },
      {
        name: 'Edit a pod outside this club',
        description: 'clubAdminPodForEdit is gated on club membership.',
        steps: [
          ['Open /club-admin/clubs/<clubId>/pods/<pod of another club>/edit', 'The editor does not render; the error "You do not administer this club" is shown'],
          ['Open /club-admin/clubs/<clubId>/pods/<unknown id>/edit', 'The editor does not render and a warning or error about the missing pod is shown'],
          ['Click "Back to pods" on a valid edit page', 'Navigates to /club-admin/clubs/<clubId> without saving'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Pod Details',
    description:
      'The read-only pod details page /club-admin/clubs/:clubId/pods/:id rendered by @duncit/pod-details at CLUB_ADMIN scope, with the Mark Attendance section in its footer.',
    sub_flows: [
      {
        name: 'Open pod details',
        description: 'Every section uses the club-scoped query twin.',
        steps: [
          ['Click the Pod details icon on a club pod row', 'Page shows a "Club pods" back button, the pod title and status chips'],
          ['Look at the left column', '"Overview" card and "Timeline" section'],
          ['Look at the right column', 'Hosts, Club, Club Admin Details, Finance and Ratings cards'],
          ['Scroll down', '"Attendees" table, "Payments & transactions" and the "Mark Attendance" section'],
        ],
      },
      {
        name: 'Navigate from pod details',
        description: 'Back and Edit actions.',
        steps: [
          ['Click "Edit pod" in the header', 'Navigates to /club-admin/clubs/<clubId>/pods/<podId>/edit'],
          ['Return to details and click "Club pods"', 'Navigates to /club-admin/clubs/<clubId>'],
        ],
      },
      {
        name: 'Attendees table is read-only',
        description: 'Marking lives only in the Mark Attendance section.',
        steps: [
          ['Scroll to the Attendees table', 'Rows show each attendee and status with no "Mark present" link'],
          ['Scroll to the Mark Attendance section below', 'The attendance board renders with its roster and Mark Attendance buttons when marking is open'],
        ],
      },
      {
        name: 'Foreign pod details are refused',
        description: 'Club-scoped queries are gated on assertClubAdminForPod.',
        steps: [
          ['Open /club-admin/clubs/<clubId>/pods/<pod of a club you do not administer>', 'Club-scoped sections (attendees, payments, feedback) fail with "You do not administer this club"'],
          ['Open /club-admin/clubs/<clubId>/pods/<unknown id>', 'A warning "Pod not found." is shown'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Mark Attendance',
    description:
      'The Mark Attendance board at /club-admin/clubs/:clubId/pods/:id/attendance (podAttendanceBoard): CLUB_ADMIN two doors (OTP or ForceMarkDialog), the HOST view when the club admin hosts the pod, locks and OTP errors.',
    sub_flows: [
      {
        name: 'Open the attendance page',
        description: 'The attendance icon only shows for Active and Completed pods.',
        steps: [
          ['On a club pods list click the green "Pod Attendance" icon of an Active pod', 'Navigates to /club-admin/clubs/<clubId>/pods/<podId>/attendance with a "Club pods" back button'],
          ['Read the board header', '"Mark Attendance" card with "<marked> of <total> attendees marked" and a "<n> of <m> bookings" chip plus progress bar'],
          ['Read the notice above the roster', 'Info "Marking attendance is how you get paid" with the earnings sentence'],
          ['Look at the roster', 'Sections "Not marked yet · <n>" and "Attendance marked · <n>"; marked rows are green with a "Marked" chip'],
          ['Click "Club pods"', 'Navigates back to /club-admin/clubs/<clubId>'],
        ],
      },
      {
        name: 'Empty and fully marked rosters',
        description: 'Roster edge states.',
        steps: [
          ['Open attendance for an Active pod nobody booked', '"Nobody has booked this pod yet."'],
          ['Open attendance for a pod where every booking is marked', 'Green alert "Everyone on this pod is marked. Nothing left to do."'],
          ['Read a marked row caption', 'It shows the method (e.g. "Ticket scanned", "Marked by Club Admin"), "Marked by <name>" and "Marked <time>"'],
        ],
      },
      {
        name: 'Club Admin chooses how to mark',
        description: 'ClubAdminMarkDialog asks which door first.',
        steps: [
          ['As a club admin who does not host the pod, click "Mark Attendance" on an unmarked row', 'Dialog "Mark <name> present" explains a ticket scan is the strongest proof'],
          ['Read the two options', '"Verify with a one-time code" and "Mark directly, no code" with their descriptions'],
          ['Click "Cancel"', 'The dialog closes and the row stays unmarked'],
          ['Look for a scanner button on this board', 'No "Scan Attendee Event Tickets" button and no "Need help? Contact your Club Admin" card are shown'],
        ],
      },
      {
        name: 'Mark directly without a code',
        description: 'ForceMarkDialog then clubAdminForceAttendance records CLUB_ADMIN_FORCE.',
        steps: [
          ['Click "Mark Attendance" on a single-seat row and choose "Mark directly, no code"', 'Dialog "Mark attendance without a scan" shows the warning and the attendee name with phone, email and ticket code'],
          ['Click "Cancel"', 'The dialog closes and nothing is written'],
          ['Open it again and click "Yes, mark present"', 'The button reads "Marking…", a green toast shows the attendee name and the row moves under "Attendance marked"'],
          ['Read the marked row', 'Caption reads "Marked by Club Admin · Marked by <your name> · Marked <time>"'],
        ],
      },
      {
        name: 'Force mark a multi-seat booking',
        description: 'Companion names are optional for a Club Admin.',
        steps: [
          ['Choose "Mark directly, no code" on a row that "Admits 4"', 'Section "Who else did this booking bring?" shows 3 rows with Name, Country code and "Phone number (optional)"'],
          ['Type a one-letter name in a row and confirm', '"Enter the attendee name" is shown and nothing is written'],
          ['Type "12" as a phone number in a row', '"Enter a phone number — digits only, 6 to 15" is shown'],
          ['Clear the bad values, name only one companion and click "Yes, mark present"', 'The booking is marked, the named companion is recorded and the blank rows are ignored'],
        ],
      },
      {
        name: 'Mark with a one-time code',
        description: 'requestPodAttendanceOtp, verifyPodAttendanceOtp, then clubAdminForceAttendance with the challenge.',
        steps: [
          ['Click "Mark Attendance" and choose "Verify with a one-time code"', 'Dialog "Verify the attendee" prefills Attendee name, Country code and Phone number with WhatsApp and SMS ticked'],
          ['Click "Send code"', 'The button reads "Sending…" then "Send again"; a One-time code field appears (with a test-code notice when delivery is stubbed)'],
          ['Enter the code the attendee received and click "Verify"', 'The dialog closes, a green toast shows the name and the row moves to "Attendance marked"'],
          ['Read the marked row', 'It also shows "Verified <phone>" for the number that answered'],
        ],
      },
      {
        name: 'OTP form validation',
        description: 'Client rules before a code is sent or checked.',
        steps: [
          ['In "Verify the attendee" clear Attendee name and click "Send code"', '"Enter the attendee name"'],
          ['Enter letters as Country code', '"Enter a country code"'],
          ['Enter a 4-digit phone number', '"Enter a phone number — digits only, 6 to 15"'],
          ['Untick both WhatsApp and SMS and click "Send code"', '"Choose at least one way to send the code."'],
          ['Look at "Verify" before any code is sent', 'It is disabled'],
          ['After sending, enter 4 digits and click "Verify"', '"Enter the 6-digit code"'],
        ],
      },
      {
        name: 'Wrong or expired one-time code',
        description: 'Errors from the shared otpService.',
        steps: [
          ['Send a code, enter a wrong 6-digit code and click "Verify"', 'A red alert reads "Incorrect code — <n> attempts left" and the row stays unmarked'],
          ['Keep entering wrong codes until the limit', 'Red alert "Too many wrong codes — send a new one"'],
          ['Click "Send again" immediately after sending', 'Red alert "Wait <n>s before asking for another code"'],
          ['Enter a correct code after it has expired', 'Red alert "That code has expired — send a new one"'],
        ],
      },
      {
        name: 'Attendance locked after completion',
        description: 'attendanceLock returns COMPLETED once completed_at is set.',
        steps: [
          ['Open attendance for a Completed pod', 'Warning "Attendance is closed for this pod" with "This pod is completed and its payout is already split, so attendance can no longer be changed…"'],
          ['Look at the unmarked rows', 'They render read-only with no "Mark Attendance" button'],
          ['Look for the earnings notice', 'The "Marking attendance is how you get paid" notice is replaced by the locked notice'],
        ],
      },
      {
        name: 'Cancelled pod attendance',
        description: 'attendanceLock returns CANCELLED for a soft-deleted pod.',
        steps: [
          ['On the club pods list look at a Cancelled pod', 'No "Pod Attendance" icon is shown'],
          ['Open /club-admin/clubs/<clubId>/pods/<cancelled pod id>/attendance directly', 'Warning "This pod was cancelled" with "A cancelled pod has no attendance to record…" and no Mark Attendance buttons'],
        ],
      },
      {
        name: 'Club Admin can still mark after the completion window expires',
        description: 'EXPIRED shuts only the host side.',
        steps: [
          ['Let an uncompleted pod pass its pod_complete_timeout_hours window and open its attendance as a club admin', 'The earnings notice shows and "Mark Attendance" buttons are enabled'],
          ['Mark an attendee with "Mark directly, no code"', 'The row moves to "Attendance marked" with method "Marked by Club Admin"'],
        ],
      },
      {
        name: 'Club admin hosting the pod gets the host board',
        description: 'podAttendanceBoard answers viewer HOST when the caller hosts the pod.',
        steps: [
          ['As a club admin who is the pod host, open its attendance page before completion', 'A warning "Complete this pod before <time>" with the hours sentence is shown'],
          ['Scroll down', 'A "Scan Attendee Event Tickets" button and "Need help? Contact your Club Admin" card with Email, Call and WhatsApp chips are shown'],
          ['Click "Mark Attendance" on a row', 'No door chooser appears; the host path is used'],
        ],
      },
      {
        name: 'Host manual mark with OTP required',
        description: 'Admin > Pods > Pod Settings attendance_otp_required ON (default).',
        steps: [
          ['Keep attendance_otp_required ON and, as the pod host, click "Mark Attendance" on an unmarked row', 'Dialog "Verify the attendee" opens'],
          ['Send and verify the code', 'hostMarkPodAttendance records HOST_MANUAL and the row reads "Marked by host" with "Verified <phone>"'],
          ['Open the board with the setting OFF, switch it ON in Admin, then click "Mark Attendance" without reloading', 'A red toast reads "Verify the attendee’s phone number first" and the row stays unmarked'],
        ],
      },
      {
        name: 'Host manual mark with OTP not required',
        description: 'attendance_otp_required OFF.',
        steps: [
          ['Turn attendance_otp_required OFF in Admin > Pods > Pod Settings', 'Setting saved'],
          ['As the pod host click "Mark Attendance" on a single-seat row', 'No OTP dialog opens; the button reads "Marking…" and the row moves to "Attendance marked" with "Marked by host"'],
        ],
      },
      {
        name: 'Host board blocks multi-seat rows until companions are named',
        description: 'NEEDS_COMPANIONS applies to the HOST viewer only.',
        steps: [
          ['As the pod host look at an unmarked row that admits 3 with no companions', 'Caption reads "Add the other 2 on this booking at the door first." and "Mark Attendance" is disabled'],
          ['Click "Scan Attendee Event Tickets" and scan that ticket, then name both companions', 'The booking is marked'],
          ['Close the scanner', 'The board re-reads and the row appears under "Attendance marked"'],
        ],
      },
      {
        name: 'Host window expired',
        description: 'EXPIRED lock for the HOST viewer.',
        steps: [
          ['As the pod host open attendance for a pod past its completion window', 'Warning "The time to complete this pod has passed" with the no-earnings explanation'],
          ['Look at the roster and scanner', 'No "Mark Attendance" buttons and no scanner button are shown; the Club Admin contact card remains'],
        ],
      },
      {
        name: 'Board load failure',
        description: 'Error state of PodAttendanceView.',
        steps: [
          ['Make podAttendanceBoard fail and open the attendance page', 'A red alert with the error message and a "Try again" button are shown'],
          ['Restore the server and click "Try again"', 'The board loads'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Auto Pods',
    description:
      'Club Admin Auto Pods: opening a new Auto Pod for a club (/club-admin/clubs/:clubId/auto-pods/new) and the claim queue at /club-admin/auto-pods.',
    sub_flows: [
      {
        name: 'Open a new Auto Pod for a club',
        description: 'The stepper is create-only and locked to the club category.',
        steps: [
          ['With auto_pods ON click "New Pod" then "Auto Pod" on a club with a category', 'Page heading "New Auto Pod", eyebrow "Club Admin · <club>", "Back to pods" and the info hint that the Auto Pod is already claimed for this club'],
          ['Look at the stepper', 'Steps "Pod category", "Pod details" and "Review & roll out"; the category is prefilled and locked'],
          ['Click "Next" to Pod details', 'A "Where the pod happens" mode choice and the pod sections show; there is no club, venue, host or finance field'],
        ],
      },
      {
        name: 'Roll out the Auto Pod',
        description: 'clubAdminCreateAutoPod.',
        steps: [
          ['Fill title, description and add an image on Pod details and click "Next"', 'The review step lists Category, Mode, Title, Description and media count'],
          ['Click "Roll out Auto Pod"', 'The button reads "Saving…", then toast "Auto Pod opened — venues, hosts and club admins can now enrol."'],
          ['Check the destination', 'The browser lands on /club-admin/auto-pods, not the club pods table'],
        ],
      },
      {
        name: 'Auto Pod stepper validation',
        description: 'Template rules for Auto Pod mode.',
        steps: [
          ['On Pod details click "Next" with no title and no image', '"Fix the highlighted fields before continuing." with field errors including "At least one image is required"'],
          ['Click "Back"', 'The stepper returns to Pod category'],
          ['Click "Cancel"', 'Navigates to /club-admin/clubs/<clubId>'],
        ],
      },
      {
        name: 'Club without a category cannot open an Auto Pod',
        description: 'The form refuses to open.',
        steps: [
          ['Open /club-admin/clubs/<clubId>/auto-pods/new for a club with no category', 'Red alert "This club has no category yet. Set one under Edit Club Details before opening an Auto Pod."'],
          ['Click "Back to pods"', 'Navigates to /club-admin/clubs/<clubId>'],
        ],
      },
      {
        name: 'Claim an Auto Pod for a club',
        description: 'clubClaimAutoPod from the queue.',
        steps: [
          ['Open /club-admin/auto-pods', 'Heading "Auto Pods for your club", a Country/State/City filter and cards with "Claim for my club"'],
          ['Click "Claim for my club" on an offer', 'Dialog "Claim this Auto Pod?" with "The pod is created under this club as soon as everyone has enrolled." and a "Which club?" select'],
          ['Open "Which club?"', 'Only clubs in the offer sub-category (and its pinned city) are listed; a single eligible club is preselected'],
          ['Click "Claim for my club"', 'The dialog closes and the offer moves under "Final assigned Auto Pods" with the Club Admin tick done'],
        ],
      },
      {
        name: 'No eligible club in the pinned city',
        description: 'City-pinned offers only accept clubs in that city.',
        steps: [
          ['Open "Claim for my club" on an offer pinned to a city where you run no club', 'Warning "None of your clubs is in <city>."'],
          ['Look at the confirm button', '"Claim for my club" stays disabled because no club can be picked'],
        ],
      },
      {
        name: 'Claim conflicts',
        description: 'First club wins.',
        steps: [
          ['Claim an offer that another club claimed a moment earlier', 'Red alert "Another club has already claimed this Auto Pod."'],
          ['Claim an offer that an admin has paused', 'Red alert "This Auto Pod is paused — try again once the admin resumes it"'],
          ['Open /club-admin/auto-pods with no offers waiting', 'Info alert "No Auto Pods need a club right now."'],
        ],
      },
      {
        name: 'Withdraw a club claim or open the live pod',
        description: 'Actions on offers the club already enrolled in.',
        steps: [
          ['Under "Final assigned Auto Pods" click "Cancel Auto Pod" on an offer that is not live', 'Dialog "Cancel this Auto Pod?" with the dependency warning'],
          ['Click "Yes, cancel"', 'The claim is released and the offer returns to "Needs your action"'],
          ['Look at an offer that went LIVE', 'A green "Live" chip and a "View pod" button; no Cancel Auto Pod button'],
          ['Click "View pod"', 'Navigates to /club-admin/clubs/<clubId>/pods/<podId>'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Club Admin Pod Monitoring',
    description:
      'Club Admin > Pod Monitoring (AI) (/club-admin/monitoring): the AI risk-scored audit table of pod actions across the admin clubs and its detail dialog.',
    sub_flows: [
      {
        name: 'Open Pod Monitoring (AI)',
        description: 'clubAdminPodAuditLogsTable is pinned to the caller clubs.',
        steps: [
          ['Click "Pod Monitoring (AI)" in the Club Admin group', 'Page shows "Pod Monitoring (AI)" and "Every pod edit, status change and critical action in your clubs — risk-scored by AI."'],
          ['Look at the table columns', 'When, Pod, Action, By, Changes, AI Risk and AI Summary; newest first'],
          ['Look at a row actor', 'By reads "<actor name> · <source>" e.g. "… · Club Admin" or "… · Host"'],
          ['Sign in as a club admin whose clubs have no audit rows', 'The table reads "No pod activity recorded yet."'],
        ],
      },
      {
        name: 'Filter and search audit rows',
        description: 'Enum filters and search.',
        steps: [
          ['Search "Search pod, actor or AI summary" for a pod title', 'Only that pod entries remain'],
          ['Filter Action to "Edited"', 'Only Edited rows remain'],
          ['Filter AI Risk to "HIGH"', 'Only HIGH risk rows remain'],
        ],
      },
      {
        name: 'Open an audit entry',
        description: 'PodAuditDetailDialog shows the diff.',
        steps: [
          ['Click an "Edited" row', 'Dialog "Edited — <pod title>" shows action chip, "AI risk: <risk>" chip and source chip'],
          ['Read the body', 'Time and actor, the AI summary alert, and "Changes (<n>)" with each field shown as − old and + new'],
          ['Open an entry with no tracked field change', '"No tracked field changed for this action."'],
          ['Click "Close"', 'The dialog closes'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Change Requests',
    description:
      'The shared ChangeRequestsPage mounted at /host/change-requests (HOST), /club-admin/change-requests (CLUB_ADMIN) and /venues/change-requests (VENUE): incoming offers to approve or pass and own requests to withdraw.',
    sub_flows: [
      {
        name: 'Host change requests board',
        description: 'myPodChangeBoard filtered to role HOST.',
        steps: [
          ['As a host click "Change Requests" in the Host group', 'Page /host/change-requests shows overline "Partner tools · Host", "Change Requests" and "What you asked Duncit to change, and what Duncit is asking of you."'],
          ['Look at the two lists', '"Waiting on you" with "A pod that needs you. Approve it and it becomes yours." and "Your requests"'],
          ['With nothing filed or offered', '"Nothing is waiting on you right now." and "You have not asked Duncit to change anything."'],
          ['Look at a request card', 'Pod title and date, role chip "Host", status chip, Request number, Requested time, Attendees, Health points and Reason'],
        ],
      },
      {
        name: 'Club Admin change requests board',
        description: 'The same page scoped to CLUB_ADMIN.',
        steps: [
          ['As a club admin who is also a host click "Change Requests" in the Club Admin group', 'Page /club-admin/change-requests shows overline "Partner tools · Club Admin"'],
          ['Compare with /host/change-requests', 'Each page lists only requests and offers for its own role; the host request does not appear on the club admin page'],
        ],
      },
      {
        name: 'Venue Owner change requests board',
        description: 'The same page scoped to VENUE.',
        steps: [
          ['As a venue owner open /venues/change-requests', 'Overline reads "Partner tools · Venues" with the same "Waiting on you" and "Your requests" lists'],
          ['Look at an offered venue request', 'The card also shows the offered "Slot" time'],
        ],
      },
      {
        name: 'Request status chips',
        description: 'Status and resolution labels.',
        steps: [
          ['Look at a request nobody has been offered yet', 'Chip "Looking for a replacement"'],
          ['Look at a request Duncit offered to a partner', 'Chip "Offered — waiting on a partner"'],
          ['Look at resolved requests', 'Chips "Replaced" or "Pod cancelled and refunded"'],
          ['Look at a withdrawn request', 'Chip "Withdrawn"'],
        ],
      },
      {
        name: 'Approve an incoming offer',
        description: 'respondToPodChange APPROVE swaps the partner onto the pod.',
        steps: [
          ['As a host offered a pod by Duncit, open /host/change-requests', 'The offer card under "Waiting on you" has "Pass" and "Approve" buttons'],
          ['Click "Approve"', 'A success toast reads "Done — the pod is yours." and the board refetches without that offer'],
          ['Open /host/pods', 'The approved pod now appears in Your Pods'],
        ],
      },
      {
        name: 'Pass on an incoming offer',
        description: 'PASS closes only the offer.',
        steps: [
          ['Click "Pass" on an offer', 'Confirm dialog "Pass on this pod?" with "Duncit will offer it to somebody else. The pod keeps its current partner meanwhile."'],
          ['Click "Cancel"', 'The dialog closes and the offer stays'],
          ['Click "Pass" and confirm "Pass"', 'Toast "Passed. Duncit will ask somebody else." and the offer leaves "Waiting on you"'],
        ],
      },
      {
        name: 'Offer already decided',
        description: 'Stale offers are refused by the server.',
        steps: [
          ['Open the board in two tabs and Approve the offer in the first tab', 'The first tab succeeds'],
          ['Click "Approve" on the same offer in the second tab', 'A red alert above the lists reads "This request is no longer waiting on you"'],
          ['Approve an offer whose pod was cancelled meanwhile', 'Red alert "This pod has been cancelled"'],
        ],
      },
      {
        name: 'Withdraw your own open request',
        description: 'withdrawPodChange while status is OPEN.',
        steps: [
          ['Under "Your requests" find a request "Looking for a replacement"', 'It shows a "Withdraw" button'],
          ['Click "Withdraw"', 'Confirm dialog "Withdraw this request?" with "Duncit will stop looking for a replacement. Your Account Health points are not returned."'],
          ['Confirm "Withdraw"', 'Toast "Request withdrawn." and the chip becomes "Withdrawn"'],
          ['Look at a request already offered to someone', 'No "Withdraw" button is shown'],
        ],
      },
      {
        name: 'Withdraw after Duncit has offered it',
        description: 'Server guard for a stale withdraw.',
        steps: [
          ['Open your requests while status is OPEN, then have an admin offer it to a partner', 'The stale tab still shows "Withdraw"'],
          ['Click "Withdraw" and confirm in the stale tab', 'Red alert "Duncit has already offered this pod to someone. Contact support to stop it."'],
        ],
      },
      {
        name: 'Change request filing refused',
        description: 'Server guards on requestPodChange.',
        steps: [
          ['File a Request Change Host on a pod you do not host (e.g. via a stale row)', 'Dialog error "You do not host this pod"'],
          ['File a Request Change Club Admin on a pod of a club you do not administer', 'Dialog error "You do not administer this pod’s club"'],
          ['As a club admin click "Request Change Club Admin" on a Completed pod and confirm with a reason', 'Dialog error "This pod is already completed — nothing left to hand over"'],
        ],
      },
      {
        name: 'Board load failure',
        description: 'Error state with retry.',
        steps: [
          ['Make myPodChangeBoard fail and open any Change Requests page', 'A red alert "Could not load your change requests." with a "Try again" button'],
          ['Restore the server and click "Try again"', 'Both lists load'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Landing & Sidebar',
    description:
      'Where / sends a signed-in user and how the Partners sidebar is composed from the partner roles they hold, the product flag, the Auto Pods flag and the role-independent tail.',
    sub_flows: [
      {
        name: 'Landing for a user with no partner role',
        description: 'Somebody with no partner role lands on Earn with Duncit.',
        steps: [
          ['Sign in to partners-app.duncit.com with an account that holds no CLUB_ADMIN, VENUE_OWNER, HOST or ECOMM_MANAGER role', 'Sign-in succeeds (the portal is open to any signed-in user)'],
          ['Open /', 'A loading spinner shows briefly while the user and product flag load'],
          ['Wait for the redirect', 'The URL becomes /earn and the Earn with Duncit page renders'],
        ],
      },
      {
        name: 'Landing for a single-role partner',
        description: 'The first child of the held section is the landing page.',
        steps: [
          ['Sign in as a user holding only ECOMM_MANAGER while the is_product_visible flag is ON', 'Sign-in succeeds'],
          ['Open /', 'The URL becomes /ecomm/dashboard and the E-Commerce Brand Dashboard renders'],
          ['Sign in as a user holding only HOST and open /', 'The URL becomes /host/dashboard'],
          ['Sign in as a user holding only VENUE_OWNER and open /', 'The URL becomes /venues/dashboard'],
          ['Sign in as a user holding only CLUB_ADMIN and open /', 'The URL becomes /club-admin/dashboard'],
        ],
      },
      {
        name: 'Landing precedence for a multi-role partner',
        description: 'Sections are ordered Club Admin, Venue Owner, Host, E-Commerce Brand; the first held one wins.',
        steps: [
          ['Sign in as a user holding HOST and ECOMM_MANAGER', 'Sign-in succeeds'],
          ['Open /', 'The URL becomes /host/dashboard (Host comes before E-Commerce Brand)'],
          ['Sign in as a user holding VENUE_OWNER and HOST, then open /', 'The URL becomes /venues/dashboard'],
        ],
      },
      {
        name: 'Landing for an e-commerce-only partner with the product flag off',
        description: 'The product flag removes the E-Commerce Brand area from landing.',
        steps: [
          ['In Admin, turn the is_product_visible system flag OFF', 'The flag is saved'],
          ['Sign in to Partners as a user holding only ECOMM_MANAGER and open /', 'The URL becomes /earn instead of /ecomm/dashboard'],
        ],
      },
      {
        name: 'Sidebar for a not-yet-partner',
        description: 'Host and E-Commerce Brand keep a single onboarding entry; Club Admin and Venue Owner are absent; no Wallet.',
        steps: [
          ['Sign in as a user with no partner role while is_product_visible is ON', 'The sidebar renders'],
          ['Inspect the sidebar groups', 'A Host group with only "Be a Host" and an E-Commerce Brand group with only "Become an E-Commerce Brand Partner" are shown; there is no Club Admin or Venue Owner group'],
          ['Look for a Wallet entry', 'No Wallet entry is shown'],
          ['Inspect the tail of the sidebar', 'Verification, FAQs, Support, Policies appear in that order, followed by the highlighted "Earn with Duncit" card captioned "Host, list or sell"'],
          ['Click "Be a Host"', 'The URL is /be-a-host and the page heading reads "Be a Host"'],
          ['Click "Become an E-Commerce Brand Partner"', 'The URL is /become-a-brand-partner and the page heading reads "Become an E-Commerce Brand Partner"'],
        ],
      },
      {
        name: 'Sidebar for an e-commerce partner',
        description: 'Holding ECOMM_MANAGER shows the E-Commerce Brand entries and Wallet.',
        steps: [
          ['Sign in as a user holding only ECOMM_MANAGER while is_product_visible is ON', 'The sidebar renders'],
          ['Expand the E-Commerce Brand group', 'It lists "E-Commerce Brand Dashboard" (/ecomm/dashboard) and "Your Brands" (/ecomm-brand)'],
          ['Inspect the Host group', 'The Host group still shows only "Be a Host"'],
          ['Look below the partner groups', 'A Wallet entry (/wallet) appears above Verification, FAQs, Support, Policies and Earn with Duncit'],
        ],
      },
      {
        name: 'Sidebar with the product flag off',
        description: 'The product switch removes the whole E-Commerce Brand group but Wallet follows the role.',
        steps: [
          ['Turn is_product_visible OFF in Admin', 'The flag is saved'],
          ['Sign in as a user holding only ECOMM_MANAGER', 'The sidebar renders'],
          ['Inspect the sidebar', 'There is no E-Commerce Brand group at all (not even the onboarding entry)'],
          ['Look for Wallet', 'Wallet is still shown because the user holds a partner role'],
          ['Sign in as a user with no partner role', 'The sidebar shows the Host group with "Be a Host" but no E-Commerce Brand group'],
        ],
      },
      {
        name: 'Auto Pods entries follow the auto_pods flag',
        description: 'The Auto Pods entry is inserted right after a section dashboard, never first, so landing does not move.',
        steps: [
          ['Turn the auto_pods feature flag ON and sign in as a user holding HOST', 'The sidebar renders'],
          ['Expand the Host group', 'Children read Host Dashboard, Auto Pods, Your Pods, Change Requests'],
          ['Open /', 'The URL still becomes /host/dashboard'],
          ['Turn auto_pods OFF and reload', 'The Auto Pods entry is gone from the Host group'],
          ['Sign in as an ECOMM_MANAGER with auto_pods ON', 'The E-Commerce Brand group has no Auto Pods entry'],
        ],
      },
      {
        name: 'Unknown routes return to landing',
        description: 'Any unmatched path redirects to /.',
        steps: [
          ['While signed in, open /this-route-does-not-exist', 'The app redirects to / and then to the landing page for the account roles'],
          ['Open /pods', 'The URL becomes /host/pods (and then follows the Host section gate)'],
        ],
      },
    ],
  },
  {
    name: 'Partners: E-Commerce Access',
    description:
      'Route gating for the E-Commerce Brand area (/ecomm and /ecomm-brand prefixes): the ECOMM_MANAGER role and the is_product_visible system flag.',
    sub_flows: [
      {
        name: 'Typed URL without the ECOMM_MANAGER role',
        description: 'SectionGate sends anyone without the role back to /.',
        steps: [
          ['Sign in as a user holding only HOST', 'The Host dashboard is the landing page'],
          ['Type /ecomm-brand in the address bar', 'The page does not render; the app redirects to / and lands on /host/dashboard'],
          ['Type /ecomm/dashboard', 'Redirected to / and then /host/dashboard'],
          ['Type /ecomm-brand/<any id>/products/new', 'Redirected to / and then /host/dashboard'],
          ['Sign in as a user with no partner role and type /ecomm-brand', 'Redirected to / and then /earn'],
        ],
      },
      {
        name: 'Typed URL with the product flag off',
        description: 'The whole area is gone while is_product_visible is off, even for an e-commerce manager.',
        steps: [
          ['Turn is_product_visible OFF and sign in as a user holding ECOMM_MANAGER', 'Sign-in succeeds'],
          ['Type /ecomm-brand', 'Redirected to /, which lands on /earn (or the first other section held)'],
          ['Type /ecomm-brand/<brand id>/settings', 'Redirected to / — warehouse settings are not reachable'],
          ['Type /ecomm/dashboard', 'Redirected to /'],
          ['Turn the flag back ON and open /ecomm-brand', 'The Your Brands page renders'],
        ],
      },
      {
        name: 'Legacy list-products redirect',
        description: '/list-products forwards to the brands page.',
        steps: [
          ['As an ECOMM_MANAGER with the product flag on, open /list-products', 'The URL becomes /ecomm-brand and the E-Commerce Brands page renders'],
        ],
      },
      {
        name: 'Bookmarked page waits for role and flag',
        description: 'No decision is made before the user and flag load, so a bookmarked page is not bounced on first paint.',
        steps: [
          ['As an ECOMM_MANAGER with the flag on, hard-reload /ecomm-brand', 'The portal chrome shows while the gated content is blank for a moment'],
          ['Wait for the user and flag to load', 'The Your Brands page renders without any redirect'],
        ],
      },
    ],
  },
  {
    name: 'Partners: E-Commerce Dashboard',
    description: 'Owner-scoped brand, product, warehouse and order KPIs at /ecomm/dashboard.',
    sub_flows: [
      {
        name: 'View e-commerce KPIs',
        description: 'The performance widget shows seven cards from partnerEcommStats.',
        steps: [
          ['As an ECOMM_MANAGER, click "E-Commerce Brand Dashboard" in the sidebar', 'The URL is /ecomm/dashboard'],
          ['Read the hero', 'Overline "E-Commerce Brand", heading "Dashboard", text "How your brands, products and orders are performing on Duncit." and a "Your Brands" button'],
          ['Find the "E-commerce performance" widget', 'Cards Total Brands, Total Products, Total Warehouses, Total Orders, Total Items Sold, Total Revenue and Total Earnings are shown'],
          ['Check the Total Brands and Total Products cards', 'Each has a green caption "<n> approved"'],
          ['Check Total Revenue and Total Earnings', 'Both are formatted in INR (₹)'],
        ],
      },
      {
        name: 'Products performance chart',
        description: 'One bar per sold product, sized on gross revenue, labelled with net earnings.',
        steps: [
          ['Open /ecomm/dashboard for a partner with product sales', 'The "Products Performance" widget lists one row per sold product'],
          ['Inspect a row', 'It shows the product name, its net earnings in ₹ on the right, a progress bar and "Units sold: <n>"'],
          ['Compare the best seller bar with others', 'The best seller by gross revenue fills the bar; the others are proportionally shorter'],
          ['Open the dashboard for a partner with no sales', 'The widget reads "No product sales yet. Once a product sells it appears here." and all KPI cards show 0 / ₹0'],
        ],
      },
      {
        name: 'Navigate to Your Brands',
        description: 'The hero button opens the brands page.',
        steps: [
          ['On /ecomm/dashboard click "Your Brands"', 'The URL becomes /ecomm-brand and the E-Commerce Brands page renders'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Your Brands',
    description:
      'E-commerce managers register brands, save drafts, submit them for review, withdraw a submission, read approval or rejection, and temporarily deactivate an approved brand at /ecomm-brand.',
    sub_flows: [
      {
        name: 'Browse the brands table',
        description: 'Server-paged list of the partner\'s own brands.',
        steps: [
          ['As an ECOMM_MANAGER, open /ecomm-brand', 'Hero reads "Partner tools", "E-Commerce Brands" and "Register one or more product brands — our onboarding team verifies each before it goes live."'],
          ['Find the "Your brands" card', 'A table with columns Brand, Categories, Status and Action and a "New brand" toolbar button is shown, sorted by most recently updated'],
          ['Inspect a brand row', 'Brand cell shows logo (or first letter), brand name (or "Untitled brand") and tagline (or —); Categories joins product categories'],
          ['Type part of a tagline in "Search brand name or tagline"', 'Only matching brands remain'],
          ['Filter Status by REJECTED', 'Only rejected brands remain; status chips are coloured DRAFT warning, SUBMITTED info, APPROVED success, REJECTED error'],
          ['Sign in as an ECOMM_MANAGER with no brands', 'The table reads "No brands yet — create your first product brand to get started."'],
        ],
      },
      {
        name: 'Create a brand and save a draft',
        description: 'A partial draft can be saved; the form is lenient.',
        steps: [
          ['On /ecomm-brand click "New brand"', 'A dialog titled "New brand" opens with sections Brand identity, Online presence, Contact, Business & legal, Address, Payout (optional), Product categories, Brand media and Documents'],
          ['Check the defaults', 'Contact email is prefilled with the account email and Country is "India"'],
          ['Enter a Brand name and Tagline only', 'Values are accepted'],
          ['Type a category in "Add a category" and press Enter', 'A chip with the category appears and the input clears'],
          ['Type the same category again and click "Add"', 'No duplicate chip is added'],
          ['Click "Save draft"', 'The dialog closes and a snackbar reads "Brand saved."'],
          ['Look at the table', 'The new brand appears with status DRAFT and Edit and Brand settings actions'],
        ],
      },
      {
        name: 'Brand form client validation',
        description: 'Zod rules on the brand form.',
        steps: [
          ['Open "New brand" and set Contact email to "not-an-email"', 'Value is typed'],
          ['Click "Save draft"', 'The Contact email field shows "Enter a valid email" and nothing is saved'],
          ['Clear Contact email and click "Save draft"', 'The draft saves (an empty email is allowed on a draft)'],
          ['Enter a Brand name longer than 120 characters and save', 'The Brand name field shows a maximum-length error'],
          ['Enter an Established year longer than 4 characters and save', 'The Established year field shows a maximum-length error'],
        ],
      },
      {
        name: 'Add brand media and documents',
        description: 'Logo, cover and documents are picked through the shared media picker.',
        steps: [
          ['In the brand dialog click "Upload" under Logo', 'The media picker titled "Upload brand media" opens with an "Upload from device" tab and a Pexels photos tab'],
          ['Choose an image from the device and click "Use this image"', 'The picker closes and the logo preview appears with "Change" and "Remove" buttons'],
          ['Click "Remove" under Logo', 'The preview disappears and the button reads "Upload" again'],
          ['Click "Add document" and upload a PDF', 'A document row appears with a Type field (default "DOCUMENT") and the file URL'],
          ['Change the Type to "GST" and click "Remove document" on another row', 'The type updates and the removed row disappears'],
          ['Before any document is added, read the Documents section', 'It shows "Brand registration, trademark, GST certificate, etc."'],
        ],
      },
      {
        name: 'Submit a brand for review',
        description: 'Submitting saves the form and then moves the brand to SUBMITTED.',
        steps: [
          ['Open a DRAFT brand from the table', 'The dialog is titled "Edit brand" with Save draft and "Submit for review" buttons'],
          ['Fill Brand name, Description and Contact email', 'Values are accepted'],
          ['Click "Submit for review"', 'The dialog closes and a snackbar reads "Brand submitted for review."'],
          ['Check the table row', 'Status is SUBMITTED and the row action is "View" instead of "Edit"'],
        ],
      },
      {
        name: 'Submit rejected by server required fields',
        description: 'The server requires brand name, description and contact email on submit.',
        steps: [
          ['Open a DRAFT brand with an empty Description and click "Submit for review"', 'An error alert in the dialog reads "Add a brand description before submitting"'],
          ['Clear Brand name and click "Submit for review"', 'The alert reads "Add a brand name before submitting"'],
          ['Fill name and description, clear Contact email, click "Submit for review"', 'The alert reads "Add a contact email before submitting"'],
          ['Close the error alert', 'The alert disappears and the dialog stays open'],
        ],
      },
      {
        name: 'View a brand under review and move it back to draft',
        description: 'A SUBMITTED brand is locked until withdrawn.',
        steps: [
          ['Click "View" on a SUBMITTED brand', 'The dialog is titled "Brand details", every field is disabled and there are no Save or Submit buttons'],
          ['Read the alert', 'An info alert reads "This brand is under review." with an "Edit" action'],
          ['Click "Edit" on the alert', 'A snackbar reads "Brand moved back to draft." and the form unlocks with Save draft and Submit for review'],
          ['Close the dialog and check the table', 'The brand status is DRAFT'],
        ],
      },
      {
        name: 'Read an approved brand',
        description: 'Approved brands are read-only and gain product and pause actions.',
        steps: [
          ['Find an APPROVED brand row', 'Actions show Product management, Temporarily deactivate, View and Brand settings'],
          ['Click "View"', 'The dialog is titled "Brand details" with a success alert "Approved — your brand is verified." and all fields disabled'],
          ['Close the dialog and click "Product management"', 'The URL becomes /ecomm-brand/<brandId>/products'],
        ],
      },
      {
        name: 'Update and resubmit a rejected brand',
        description: 'Reviewer notes are shown; saving moves the brand back to DRAFT.',
        steps: [
          ['Click "Edit" on a REJECTED brand', 'The dialog is titled "Edit brand" with an error alert "Rejected: <reviewer notes> Update and resubmit." (or "See notes." when there are none)'],
          ['Change the Description and click "Save draft"', 'Snackbar "Brand saved." and the row status becomes DRAFT'],
          ['Open it again and click "Submit for review"', 'Snackbar "Brand submitted for review." and status SUBMITTED'],
        ],
      },
      {
        name: 'Temporarily deactivate and reactivate a brand',
        description: 'Pausing hides the brand and all its products from the shop without touching status.',
        steps: [
          ['On an APPROVED active brand click "Temporarily deactivate"', 'A dialog "Temporarily deactivate brand" reads "<brand> and all of its products will be hidden from the shop until you reactivate it. Orders already placed are not affected."'],
          ['Click "Cancel"', 'The dialog closes and nothing changes'],
          ['Open it again and click "Deactivate"', 'The dialog closes and a snackbar reads "Brand visibility updated."'],
          ['Check the row', 'The status shows APPROVED plus an outlined "PAUSED" chip and the action tooltip reads "Reactivate"'],
          ['Click "Reactivate" then confirm "Reactivate"', 'Dialog text reads "<brand> and its products will be visible in the shop again."; after confirming the PAUSED chip disappears'],
        ],
      },
      {
        name: 'Paused brand cannot list new products',
        description: 'Server blocks a new listing on a deactivated brand.',
        steps: [
          ['Deactivate an APPROVED brand', 'The row shows PAUSED'],
          ['Open /ecomm-brand/<brandId>/products/new and complete every step with valid data', 'The Preview step is reached'],
          ['Click "Submit for approval"', 'An error alert above the stepper reads "This brand is deactivated and cannot list new products"'],
        ],
      },
      {
        name: 'Complete a brand drafted from an onboarding meeting',
        description: 'Approving an ECOMM onboarding meeting grants ECOMM_MANAGER and drafts a brand prefilled from the applicant.',
        steps: [
          ['In the Onboarding portal approve an ECOMM meeting for a test applicant', 'The meeting is approved'],
          ['Sign in to Partners as the applicant', 'The sidebar now shows E-Commerce Brand Dashboard and Your Brands'],
          ['Open /ecomm-brand', 'A DRAFT brand prefilled with the applicant name as Brand name and Contact person, and their email as Contact email, is listed'],
          ['Open it, add a Description and click "Submit for review"', 'Snackbar "Brand submitted for review." and status SUBMITTED'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Brand Settings & Warehouses',
    description:
      'Per-brand warehouses (pickup locations) at /ecomm-brand/:brandId/settings: add, edit, delete, set default, review status. ShipRocket registration happens server-side when the brand is approved.',
    sub_flows: [
      {
        name: 'Open brand settings',
        description: 'The settings page lists the brand warehouses.',
        steps: [
          ['On /ecomm-brand click "Brand settings" on a brand row', 'The URL is /ecomm-brand/<brandId>/settings'],
          ['Read the hero', 'Heading "<brand name> settings" and text "Warehouses your products ship from. Orders pick up from the warehouse chosen on each product."'],
          ['Read the Warehouses card', 'An info alert says every new warehouse and every edit is reviewed by the Duncit team and a product can only be listed against an approved warehouse'],
          ['For a brand with no warehouses', 'The card reads "No warehouses yet — add the location your products ship from." with an "Add warehouse" button'],
          ['Click "Back"', 'The URL returns to /ecomm-brand'],
        ],
      },
      {
        name: 'Add a warehouse',
        description: 'A new partner warehouse is saved as PENDING review.',
        steps: [
          ['Click "Add warehouse"', 'A dialog "New warehouse" opens; Country defaults to "India" and the default switch is off'],
          ['Fill Warehouse name "Delhi warehouse", Contact name, Phone (digits), Email, Address line 1, City, State, Pincode (6 digits)', 'No field errors are shown'],
          ['Click "Save warehouse"', 'The button shows "Saving...", the dialog closes and a snackbar reads "Warehouse saved."'],
          ['Inspect the new card', 'It shows the nickname, an "Awaiting approval" chip, the address line, "contact · phone · email" and the hint "Products cannot ship from this warehouse until the Duncit team approves it."'],
        ],
      },
      {
        name: 'Warehouse form validation',
        description: 'Zod rules on the warehouse form, validated on blur and submit.',
        steps: [
          ['Open "Add warehouse" and click "Save warehouse" with everything empty', 'Errors include "Warehouse name must be at least 2 characters", "Contact name must be at least 2 characters", "Email is required" and "Address line 1 must be at least 3 characters"'],
          ['Enter Phone "98-765" and blur', 'Phone shows "Phone must contain only digits (6-15 digits)"'],
          ['Enter Email "abc" and blur', 'Email shows "Enter a valid email"'],
          ['Enter Pincode "1234" and blur', 'Pincode shows "Enter a valid 6-digit pincode"'],
          ['Enter a Warehouse name of 61 characters and blur', 'Shows "Warehouse name must be 60 characters or fewer"'],
          ['Enter City "D" and State "X" and blur', 'Shows "City must be at least 2 characters" and "State must be at least 2 characters"'],
          ['Click "Cancel"', 'The dialog closes without saving'],
        ],
      },
      {
        name: 'Duplicate warehouse nickname',
        description: 'Nicknames are unique per brand.',
        steps: [
          ['Click "Add warehouse" and use the same Warehouse name as an existing warehouse with valid other fields', 'Form is valid'],
          ['Click "Save warehouse"', 'The dialog stays open with an error alert "A warehouse with this nickname already exists"'],
        ],
      },
      {
        name: 'Edit a warehouse sends it back for review',
        description: 'Any partner save forces review_status PENDING.',
        steps: [
          ['On an APPROVED warehouse card click "Edit <nickname>"', 'A dialog "Edit warehouse" opens prefilled with its values'],
          ['Change Address line 2 and click "Save warehouse"', 'Snackbar "Warehouse saved."'],
          ['Inspect the card', 'The chip now reads "Awaiting approval" with the pending hint'],
        ],
      },
      {
        name: 'Fix a rejected warehouse',
        description: 'A rejected warehouse tells the partner to edit and resave.',
        steps: [
          ['Find a warehouse rejected in the Products portal', 'Card shows a "Rejected" chip and "This warehouse was rejected — edit the address and save to request another review."'],
          ['Click Edit, correct the address and click "Save warehouse"', 'Snackbar "Warehouse saved." and the chip becomes "Awaiting approval"'],
        ],
      },
      {
        name: 'Set the default warehouse',
        description: 'Only one default per brand.',
        steps: [
          ['On a non-default card click the star "Make <nickname> default"', 'Snackbar reads "<nickname> is now the default warehouse."'],
          ['Inspect the cards', 'That card shows a "Default" chip and a filled, disabled star (tooltip "Default warehouse"); the previous default loses its chip'],
          ['Add a new warehouse with "Use as the default warehouse for this brand" switched on', 'After saving, the new card is the only one with the "Default" chip'],
        ],
      },
      {
        name: 'Delete a warehouse',
        description: 'Deletion is confirmed and blocked while products ship from it.',
        steps: [
          ['Click "Delete <nickname>" on a warehouse with no products', 'A dialog "Delete warehouse" reads "<nickname> will be removed. Products still shipping from it must be moved first."'],
          ['Click "Cancel"', 'The dialog closes and the card remains'],
          ['Open it again and click "Delete"', 'Snackbar "Warehouse deleted." and the card disappears'],
          ['Delete a warehouse used by a product listing', 'Snackbar reads "This warehouse is used by <n> product(s) — move them to another warehouse first" and the card remains'],
        ],
      },
      {
        name: 'Settings for a brand not in the account',
        description: 'Ownership is enforced.',
        steps: [
          ['As an ECOMM_MANAGER open /ecomm-brand/<a brand id owned by someone else>/settings', 'A warning alert reads "Brand was not found in your account." and no Warehouses card or Add warehouse button is shown'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Product Listings',
    description:
      'The brand product table at /ecomm-brand/:brandId/products: search, inline quantity, low-stock highlight and the row menu (edit, settings, pause, ads, delete).',
    sub_flows: [
      {
        name: 'Browse brand products',
        description: 'Server-paged table of the partner\'s listings for one brand.',
        steps: [
          ['From /ecomm-brand click "Product management" on an APPROVED brand', 'The URL is /ecomm-brand/<brandId>/products'],
          ['Read the hero', '"Back to brands", overline "Product management", heading "Brand products", a hint about Super → Category → Sub category and an "Add Product" button'],
          ['Read the "Your listed products" table', 'Columns Product, Price (₹0.00 format), Quantity (inline input + Update) and Status; Delivery and Updated columns are hidden by default'],
          ['Inspect a product cell', 'It shows the image, product name and "<n> images · <size or No size>"'],
          ['Search "Search product, size, color" with part of a name', 'Only matching listings remain'],
          ['Open a brand with no listings', 'The table reads "No product listings yet."'],
          ['Click "Back to brands"', 'The URL returns to /ecomm-brand'],
        ],
      },
      {
        name: 'Listing status chips',
        description: 'Review status and paused state on each row.',
        steps: [
          ['Find a listing awaiting review', 'Status chip reads PENDING in warning colour'],
          ['Find an approved active listing', 'Status chip reads APPROVED in success colour'],
          ['Find a listing denied in the Products portal', 'Status chip reads DENIED in error colour'],
          ['Find an approved listing that was temporarily deactivated', 'Status chip reads PAUSED in warning colour'],
        ],
      },
      {
        name: 'Update quantity inline',
        description: 'Quantity updates stock without re-review.',
        steps: [
          ['Change a row Quantity to 25 and click "Update"', 'An alert above the table reads "Quantity updated." and the row refreshes'],
          ['Set Quantity below the units already requested or reserved and click "Update"', 'An error alert reads "Quantity cannot be less than <n> committed units"'],
          ['Set Quantity to -1 and click "Update"', 'An error alert reads "Quantity must be a whole number"'],
        ],
      },
      {
        name: 'Low-stock row highlight',
        description: 'Rows at or below their threshold are tinted when notify is on.',
        steps: [
          ['In a product Settings set Low-stock threshold 10 and turn notify on, then save', '"Settings saved."'],
          ['Return to the products table and set that row Quantity to 5 and click Update', 'The row is highlighted with a warning tint'],
          ['Set Quantity to 50 and click Update', 'The warning tint is removed'],
        ],
      },
      {
        name: 'Row actions menu',
        description: 'The 3-dots "Product actions" menu.',
        steps: [
          ['Click "Product actions" on a PENDING listing', 'Menu shows Edit, Settings, Temporarily deactivate (disabled), Run Product Ad, Run Brand Ad and Delete (in red)'],
          ['Open the menu on an APPROVED active listing', 'Temporarily deactivate is enabled'],
          ['Click "Edit"', 'The URL becomes /ecomm-brand/<brandId>/products/<productId>'],
          ['Go back, open the menu and click "Settings"', 'The URL becomes /ecomm-brand/<brandId>/products/<productId>/settings'],
          ['Go back and click a row outside the Quantity cell', 'The URL becomes /ecomm-brand/<brandId>/products/<productId>/view'],
        ],
      },
      {
        name: 'Temporarily deactivate and reactivate a listing',
        description: 'Pausing hides an approved listing from the shop; orders already placed are untouched.',
        steps: [
          ['On an APPROVED active listing choose "Temporarily deactivate"', 'Dialog "Temporarily deactivate product" reads "<product> will be hidden from the shop until you reactivate it. Orders already placed are not affected."'],
          ['Click "Deactivate"', 'An alert reads "Product visibility updated." and the status chip becomes PAUSED'],
          ['Open the menu again and choose "Reactivate", then confirm "Reactivate"', 'Dialog "Reactivate product" reads "<product> will be visible and purchasable in the shop again."; after confirm the chip returns to APPROVED'],
        ],
      },
      {
        name: 'Delete (archive) a listing',
        description: 'Delete archives the listing; an archived listing cannot be reactivated.',
        steps: [
          ['Choose "Delete" in a row menu', 'Dialog "Delete product listing" reads "<product> will be archived and removed from active listing."'],
          ['Click "Cancel"', 'The dialog closes and nothing changes'],
          ['Choose Delete again and click "Delete"', 'An alert reads "Product listing deleted."'],
          ['Open that row menu', 'Temporarily deactivate / Reactivate is disabled for the archived listing'],
        ],
      },
      {
        name: 'Run a product ad',
        description: 'The shared ad-request form prefilled from the product, submitted to Marketing.',
        steps: [
          ['Choose "Run Product Ad" in a row menu', 'A dialog "Run a Product Ad" opens with the ad form and an "Estimated Cost" card'],
          ['Check prefilled values', 'Ad Title is the product name, Ad Description is the product description and Ad Media is the product image'],
          ['Pick an Ad Position and a start date of today, keep duration within the window', 'The Estimated Cost card shows the per-day price, duration and total estimate'],
          ['Click the "Run a Product Ad" submit button', 'The dialog closes and an alert reads "Ad request submitted · <trace id>. Marketing will review it."'],
        ],
      },
      {
        name: 'Run a brand ad',
        description: 'Brand ads use the product as the seed.',
        steps: [
          ['Choose "Run Brand Ad" in a row menu', 'A dialog "Run a Brand Ad" opens'],
          ['Check the Ad Title', 'It reads "Discover <product name>"'],
          ['Submit with valid values', 'An alert reads "Ad request submitted · <trace id>. Marketing will review it."'],
        ],
      },
      {
        name: 'Ad request validation',
        description: 'Zod rules from the shared ad-request form.',
        steps: [
          ['Open "Run Product Ad" and set Ad Title to "Hi"', 'On submit the field shows "Ad Title must be at least 3 characters"'],
          ['Set Ad Description to fewer than 10 characters', 'Shows "Ad Description must be at least 10 characters"'],
          ['Set Ad Start Date to yesterday', 'Shows "Ad start date must be today or later"'],
          ['Enter Redirect URL "ftp://example"', 'Shows "Redirect URL must be a valid http(s) link"'],
          ['Close the dialog', 'No ad request is created'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Product Listing Editor',
    description:
      'The six-step product wizard (Category, Product, Variants, Commission, Delivery, Preview) at /ecomm-brand/:brandId/products/new and /:productId, with Zod rules, AI moderation preflight and server checks.',
    sub_flows: [
      {
        name: 'Create a product listing',
        description: 'Happy path from Add Product to submission.',
        steps: [
          ['On the brand products page click "Add Product"', 'The URL is /ecomm-brand/<brandId>/products/new with overline "New product", heading "Add Product" and a vertical stepper'],
          ['Step Category: under "Which categories do you want to sell your product in?" pick Super Category, Category and Sub Category; click "Next"', 'The Product step opens'],
          ['Step Product: enter Product title and click "Next"', 'The Variants step opens'],
          ['Step Variants: in "Variant 1" add a variant image, a 20+ character Description, Height, Weight, Length, Breadth, Price (₹) and Stock; click "Next"', 'The Commission step opens'],
          ['Step Commission: move the slider to 20', 'The label reads "Duncit commission: 20%"; click "Next" opens Delivery'],
          ['Step Delivery: keep "ShipRocket delivery", choose an approved warehouse in "Ship-from warehouse"; click "Next"', 'The Preview step opens'],
          ['Review the Preview', 'Shows the title, category chips, a variant table (Variant, Price, Stock, L × B × H · Weight), "Commission: 20% · Total stock: <n>" and "Delivery: ShipRocket · from <warehouse> (<city>)"'],
          ['Click "Submit for approval"', '"AI is checking all your details…" shows, then the page returns to /ecomm-brand/<brandId>/products'],
          ['Find the new row', 'The listing appears with status PENDING'],
        ],
      },
      {
        name: 'Category step validation',
        description: 'At least one full Super → Category → Sub row.',
        steps: [
          ['On a new listing click "Next" without choosing categories', 'The step does not advance and shows "Select a Super category, Category and Sub category"'],
          ['Click "Add category"', 'A second category row appears; the remove button is enabled on both rows'],
          ['Click "Remove category" until one row remains', 'The remove button on the last row is disabled'],
        ],
      },
      {
        name: 'Product title validation',
        description: 'Title must be at least 3 characters.',
        steps: [
          ['On the Product step enter "TV" and click "Next"', 'The field shows "Product title is too short" and the step does not advance'],
          ['Enter a title of 3+ characters and click "Next"', 'The Variants step opens'],
          ['Click "Back"', 'The Product step reopens with the title kept'],
        ],
      },
      {
        name: 'Variant field validation',
        description: 'Per-variant rules checked when leaving the Variants step.',
        steps: [
          ['On the Variants step leave everything empty and click "Next"', 'Errors include "Description must be at least 20 characters", "Add at least one image", "Enter a valid height in cm", "Enter the variant price" and "Enter the variant stock"'],
          ['Enter Height 1500', 'Shows "Value cannot exceed 1000"'],
          ['Enter Price 0', 'Shows "Price must be greater than 0"'],
          ['Enter Stock 2.5', 'Shows "Stock must be a whole number"'],
          ['Enter Stock -1', 'Shows "Stock cannot be negative"'],
          ['Fill all fields but set Stock 0 on every variant and click "Next"', 'Shows "Total stock across variants must be at least 1"'],
        ],
      },
      {
        name: 'Options generate variant tabs',
        description: 'Options build the variant matrix automatically.',
        steps: [
          ['On the Variants step click "Add option", enter Option name "Size" and values S, M (type a value + Enter)', 'After a moment variant tabs "S" and "M" appear'],
          ['Add a second option "Colour" with values Red, Blue', 'Tabs "S / Red", "S / Blue", "M / Red", "M / Blue" appear and each shows option chips instead of a Variant name field'],
          ['Click "Remove option" on Colour', 'The option row is removed'],
          ['Add an option with values but no Option name, go to Preview, click "Submit for approval", then click Back to the Variants step', 'Nothing was submitted and the option row shows "Option name is required"'],
        ],
      },
      {
        name: 'Add and remove variants manually',
        description: 'Without options, variants are added by hand.',
        steps: [
          ['With no options, check the single variant', 'Tab "Variant 1" shows a "Variant name (e.g. Default)" field and "Remove this variant" is disabled'],
          ['Click "Add variant"', 'Tab "Variant 2" is added and selected; Remove this variant is enabled'],
          ['Upload an image via "Add variant image" then click the image "Remove image" button', 'The picker titled "Upload variant image" adds the image; removing clears it from the grid'],
          ['Click "Remove this variant" on Variant 2', 'The tab is removed and Variant 1 is selected'],
        ],
      },
      {
        name: 'Delivery step with no usable warehouse',
        description: 'Only APPROVED warehouses can be selected.',
        steps: [
          ['Create a listing for a brand with no warehouses and reach Delivery', 'Warning: "This brand has no warehouses yet — add one in Brand Settings before listing the product." with a Brand Settings link'],
          ['Use a brand whose warehouses are all pending', 'Warning: "None of this brand\'s warehouses is approved yet..." and the Ship-from warehouse options read "<name> — <city> (awaiting approval)" and are disabled'],
          ['Click "Next" without a warehouse', 'The field shows "Select a warehouse"'],
          ['Enter Free delivery above (₹) -10 and click "Next"', 'Shows "Amount cannot be negative"'],
          ['Click the "Brand Settings" link', 'The URL becomes /ecomm-brand/<brandId>/settings'],
        ],
      },
      {
        name: 'Free delivery offer in preview',
        description: 'Blank threshold means no offer.',
        steps: [
          ['Leave Free delivery above blank and open Preview', 'Preview reads "No free-delivery offer"'],
          ['Go back, enter 999 and open Preview', 'Preview reads "Free delivery on orders of ₹999 or more"'],
        ],
      },
      {
        name: 'AI moderation blocks a listing',
        description: 'The moderateProductContent preflight runs before submit.',
        steps: [
          ['On Preview click the "AI monitoring" pill', 'Dialog "AI content check" lists Product title, Variant descriptions and Variant images; click "Got it" closes it'],
          ['Create a listing whose product title contains prohibited wording and click "Submit for approval"', '"AI is checking all your details…" shows, then a dialog "Fix these before publishing" reads "Our AI check found content that breaks the community guidelines, so the product was not submitted. Fix the items below and try again."'],
          ['Read the dialog entries', 'Each violation shows its message and a "Fix in <step name>" link; the wizard has already moved to the earliest offending step'],
          ['Click "Fix in Product"', 'The dialog closes, the Product step is open and the Product title field shows the moderation message'],
          ['Fix the wording and submit again', 'The listing is submitted and the page returns to the products list'],
        ],
      },
      {
        name: 'Server rejects a listing',
        description: 'Server-side rules surface as an error alert above the stepper.',
        steps: [
          ['Select an approved warehouse, then edit that warehouse in Brand Settings in another tab (it returns to Awaiting approval) and submit the listing', 'Alert reads "This warehouse is awaiting approval — it can be used once approved"'],
          ['Without options, add two variants that share the same Variant name, fill them validly and submit', 'Alert reads "Duplicate variant combination: <variant name>"'],
          ['Revoke the user ECOMM_MANAGER role in Admin while the wizard is open, then submit', 'Alert reads "You must be an Ecomm Manager to manage product listings"'],
        ],
      },
      {
        name: 'Edit an existing listing',
        description: 'Updating resets the listing to PENDING review and hides it until re-approved.',
        steps: [
          ['Choose "Edit" on an APPROVED listing', 'Overline "Edit product", heading is the product name, and the wizard is prefilled on step Category'],
          ['Step through to Preview changing the Price', 'Preview shows the new price'],
          ['Click "Update listing"', 'The page returns to /ecomm-brand/<brandId>/products'],
          ['Check the row', 'Status is PENDING again'],
          ['Open the editor again and scroll below the wizard', 'A "Ratings & reviews" panel for the product is shown'],
        ],
      },
      {
        name: 'Edit a listing that does not exist',
        description: 'Unknown product ids are handled.',
        steps: [
          ['Open /ecomm-brand/<brandId>/products/<unknown product id> directly', 'A warning reads "Product listing was not found." and no wizard is shown'],
          ['Click "Back"', 'The URL returns to /ecomm-brand/<brandId>/products'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Product Details & Reviews',
    description: 'Read-only product detail, analytics and seller replies at /ecomm-brand/:brandId/products/:productId/view.',
    sub_flows: [
      {
        name: 'View product details',
        description: 'Listing summary and variants.',
        steps: [
          ['Click a row on the brand products table', 'The URL is /ecomm-brand/<brandId>/products/<productId>/view with overline "Product details" and an "Edit" button'],
          ['Read the detail card', 'Shows product name, review status chip, category chips (Super › Category › Sub), description and "Delivery: ShipRocket · Commission: <n>%"'],
          ['For a denied listing with notes', 'A line reads "Review notes: <notes>"'],
          ['Read "Variants (<n>)"', 'Each variant card shows its name, images, description, "₹<price> · <n> in stock · Size <size>" and "L × B × H cm · <w> kg"'],
          ['Click "Edit"', 'The URL becomes /ecomm-brand/<brandId>/products/<productId>'],
        ],
      },
      {
        name: 'Product analytics',
        description: 'Orders, units, earnings, views and clicks.',
        steps: [
          ['On the product view page find the "Analytics" card', 'Metrics Product views, Total clicks, Orders, Units sold, Gross revenue, Total earning and Pods listed in are shown'],
          ['For a product sold in several variants', 'A "By variant" table lists Variant, Sold, Orders, Clicks and Views'],
          ['For a product with orders from several locations', 'A "Purchase locations" section shows chips "<location>: <n> sold"'],
        ],
      },
      {
        name: 'Reply to a product review',
        description: 'Only the brand owner can reply.',
        steps: [
          ['On a product with reviews, read "Ratings & reviews"', 'Summary shows star rating, "<average> · <n> reviews" and each review with name, stars, comment, images and up/down vote counts'],
          ['Check the Reply button with an empty reply box', '"Reply" is disabled'],
          ['Type a reply in "Reply to this review" and click "Reply"', 'The reply saves and the button now reads "Update"'],
          ['Edit the reply text and click "Update"', 'The reply is updated'],
          ['Open a product with no reviews', 'Panel reads "No reviews yet for this product."'],
        ],
      },
      {
        name: 'View a product that does not exist',
        description: 'Unknown ids show a not-found warning.',
        steps: [
          ['Open /ecomm-brand/<brandId>/products/<unknown id>/view', 'A warning reads "Product listing was not found." and no Edit button is shown'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Product Settings',
    description:
      'Per-product low-stock threshold and notification at /ecomm-brand/:brandId/products/:productId/settings. Saving does not send the listing back for review.',
    sub_flows: [
      {
        name: 'Save low-stock settings',
        description: 'Threshold plus notify toggle.',
        steps: [
          ['Choose "Settings" in a product row menu', 'Heading "<product> settings" and text "Currently <n> units available."'],
          ['Check the defaults for a product never configured', 'Low-stock threshold is 5 and "Notify me when this product hits the low-stock threshold" is off'],
          ['Set threshold 8, turn notify on and click "Save settings"', 'The button shows "Saving..." then a success alert reads "Settings saved."'],
          ['Click "Back" and check the row status', 'The listing status is unchanged (no re-review)'],
        ],
      },
      {
        name: 'Low-stock settings validation',
        description: 'Whole, non-negative numbers only.',
        steps: [
          ['Enter threshold -1 and click "Save settings"', 'The field shows "Cannot be negative"'],
          ['Enter threshold 2.5 and click "Save settings"', 'The field shows "Enter a whole number"'],
        ],
      },
      {
        name: 'Settings for an unknown product',
        description: 'Not-found handling.',
        steps: [
          ['Open /ecomm-brand/<brandId>/products/<unknown id>/settings', 'A warning reads "Product listing was not found." and no settings form is shown'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Earn with Duncit',
    description:
      'The shared Earn journey cards (host, venue, product, club) at /earn, and the focused /be-a-host and /become-a-brand-partner pages: lock states, CTAs and onboarding meeting reschedule/cancel.',
    sub_flows: [
      {
        name: 'Browse all earn journeys',
        description: 'The full menu for a user with no roles or meetings.',
        steps: [
          ['Click "Earn with Duncit" in the sidebar', 'The URL is /earn with heading "Earn with Duncit" and caption "Pick a way to start earning on Duncit."'],
          ['Inspect the cards (product flag on)', 'Four cards: "By hosting a pod", "By registering your venue", "By listing your product", "By managing a club", each with its description'],
          ['Click "By listing your product"', 'A new browser tab opens the mWeb /survey/ecomm page'],
          ['Click "By hosting a pod"', 'A new tab opens mWeb /survey/host'],
        ],
      },
      {
        name: 'Product journey hidden when product flag is off',
        description: 'The product-seller card follows is_product_visible.',
        steps: [
          ['Turn is_product_visible OFF and open /earn', 'Only the host, venue and club cards are shown'],
          ['Open /become-a-brand-partner', 'The heading "Become an E-Commerce Brand Partner" shows with no journey card and a "See all the ways to earn with Duncit" link'],
        ],
      },
      {
        name: 'Focused Be a Host page',
        description: 'The sidebar entry opens the host journey only.',
        steps: [
          ['As a user without HOST, click "Be a Host" in the sidebar', 'The URL is /be-a-host, heading "Be a Host", caption "Start here — the steps below are your onboarding."'],
          ['Inspect the page', 'Only the "By hosting a pod" card is shown'],
          ['Click "See all the ways to earn with Duncit"', 'The URL becomes /earn with all journey cards'],
        ],
      },
      {
        name: 'Focused brand partner page',
        description: 'The E-Commerce Brand onboarding entry opens the product journey only.',
        steps: [
          ['As a user without ECOMM_MANAGER (product flag on) click "Become an E-Commerce Brand Partner"', 'The URL is /become-a-brand-partner with only the "By listing your product" card'],
          ['Click the card', 'A new tab opens mWeb /survey/ecomm to fill the survey and book the onboarding meeting'],
        ],
      },
      {
        name: 'Approved role shows next-step CTA',
        description: 'Cards for held roles read Already enabled with a contextual button.',
        steps: [
          ['Sign in as an ECOMM_MANAGER and open /earn', 'The product card shows a green "Already enabled" chip and a "Ready to add another brand?" button; the card itself is not clickable'],
          ['Click "Ready to add another brand?"', 'The URL becomes /ecomm-brand'],
          ['As a VENUE_OWNER click "Ready to register another venue?"', 'The URL becomes /register-venue/new'],
          ['As a CLUB_ADMIN click "Manage your clubs"', 'The URL becomes /club-admin/dashboard'],
          ['As a HOST click "Ready to host more experiences?"', 'A new tab opens mWeb /host/manage'],
        ],
      },
      {
        name: 'Card locked by a scheduled meeting',
        description: 'A REQUESTED or SCHEDULED onboarding meeting locks its card.',
        steps: [
          ['Book an ECOMM onboarding meeting on mWeb, then open /earn in Partners', 'The product card shows a "Meeting scheduled" chip and is not clickable'],
          ['Read the card description', 'It reads "You already have an onboarding meeting (Request ID: <id>) scheduled for this on <date, time>. Our team will meet you then — this option unlocks once the meeting is done."'],
          ['Look below the card', '"Reschedule meeting" and "Cancel meeting" buttons are shown'],
        ],
      },
      {
        name: 'Reschedule an onboarding meeting',
        description: 'One-time reschedule with a mandatory reason and a different slot.',
        steps: [
          ['Click "Reschedule meeting"', 'Dialog "Reschedule your onboarding meeting" shows "Currently booked for <when>. You can reschedule once." and a slot calendar with the current slot marked and disabled'],
          ['Click "Move to this slot" without picking a slot but with a reason', 'A warning reads "Please pick an available slot."'],
          ['Pick a slot and leave the reason empty, then click "Move to this slot"', 'The reason field shows "Please tell us a reason."'],
          ['Pick a free slot, enter a genuine reason and click "Move to this slot"', 'Text "Moving from <old> to <new>." shows, the button reads "Moving…", then the dialog closes and the card shows the new time'],
          ['Look below the card', 'Only "Cancel meeting" remains and an info alert reads "You have already used your one-time reschedule option."'],
        ],
      },
      {
        name: 'Reschedule rejected by the server',
        description: 'Slot conflicts, holidays and invalid reasons.',
        steps: [
          ['In the reschedule dialog pick a slot another applicant just booked and submit', 'A warning reads "That slot is already booked — please pick another one" and slots reload'],
          ['Pick a slot on an onboarding-team holiday and submit', 'A warning reads "Our onboarding team is on leave that day — please pick another slot"'],
          ['Enter a meaningless or previously used reason and submit', 'A warning reads "Please enter a valid reason related to your reschedule/cancellation request."'],
          ['Enter a reason over 500 characters', 'The field shows "Keep the reason under 500 characters."'],
          ['When no slots are open', 'The dialog shows "No slots are open right now — please check back soon." and "Move to this slot" is disabled'],
        ],
      },
      {
        name: 'Cancel an onboarding meeting',
        description: 'Cancelling frees the slot and unlocks the card.',
        steps: [
          ['Click "Cancel meeting"', 'Dialog "Cancel this meeting?" reads "Your onboarding meeting will be cancelled and the slot freed. You can book a new one anytime." with a "Reason for cancelling" field'],
          ['Click "Keep meeting"', 'The dialog closes and the meeting stays'],
          ['Reopen, leave the reason empty and click "Cancel meeting"', 'The field shows "Please tell us a reason."'],
          ['Enter a genuine reason and click "Cancel meeting"', 'The button reads "Cancelling…", the dialog closes and the card becomes clickable again with its normal description'],
        ],
      },
      {
        name: 'Card locked while onboarding is reviewed',
        description: 'A finished meeting awaiting approval, or an approved meeting whose record is under review, locks the card.',
        steps: [
          ['Mark a VENUE meeting DONE with approval still pending, then open /earn as that user', 'The venue card shows the chip "Onboarding in process." and reads "Onboarding in process. Our team is reviewing your application."'],
          ['Try clicking the card', 'Nothing opens'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Verification',
    description:
      'Identity, Address and Email verification at /verification using the shared verification cards; a row under review or approved is locked.',
    sub_flows: [
      {
        name: 'View verification status',
        description: 'Three cards in server order.',
        steps: [
          ['Click "Verification" in the sidebar', 'The URL is /verification with heading "Verification" and caption "Verify your identity, address and email"'],
          ['Inspect the cards for a fresh account', 'Identity and Address show "Not Verified" chips; the tick icons are grey'],
          ['Read the Email card', 'It shows "Verified by the App" (or "Not Verified") and the note "Your email is verified when you sign in — no action needed here."'],
        ],
      },
      {
        name: 'Submit an identity document',
        description: 'One image or PDF up to 4 MB.',
        steps: [
          ['On the Identity card click "Upload document"', 'A file chooser opens accepting images and PDFs'],
          ['Choose a PDF under 4 MB', 'The button reads "Uploading…" while it uploads'],
          ['Wait for completion', 'An info alert reads "Submitted for review." and the Identity chip becomes "Under review"'],
          ['Inspect the Identity card', 'The upload button and AI monitoring chip are no longer shown'],
        ],
      },
      {
        name: 'Identity document too large',
        description: 'Client-side 4 MB cap.',
        steps: [
          ['On the Identity card click "Upload document" and choose a 6 MB image', 'No upload starts'],
          ['Read the alert', 'An info alert reads "Please upload a document under 4 MB."'],
          ['Close the alert', 'The alert disappears and the status is unchanged'],
        ],
      },
      {
        name: 'Submit an address',
        description: 'Manual residential address.',
        steps: [
          ['On the Address card click "Submit address" with empty fields', 'An alert reads "Address line, city, state and pincode are required."'],
          ['Fill Address line 1, State, City and Pincode (leave Address line 2 and Country blank)', 'Placeholders like "House / street" and "e.g. Mumbai" disappear as you type'],
          ['Click "Submit address"', 'The button reads "Submitting…", then an alert reads "Submitted for review." and the chip becomes "Under review"'],
          ['Inspect the Address card', 'The address form is hidden while under review'],
        ],
      },
      {
        name: 'Resubmit after rejection',
        description: 'A rejected row shows the reason and re-opens its control.',
        steps: [
          ['Reject the Identity verification in Admin with a reason', 'Rejection saved'],
          ['Reload /verification', 'The Identity chip reads "Rejected", the reason shows in red and the button reads "Re-upload"'],
          ['Click "Re-upload" and choose a valid file', 'Alert "Submitted for review." and chip "Under review"'],
          ['Reject the Address verification and reload', 'The Address card shows the reason and the form prefilled with the previous address'],
        ],
      },
      {
        name: 'Verification locked under review',
        description: 'The server refuses a second submission while one is pending.',
        steps: [
          ['Open /verification in two tabs while Address is "Not Verified"', 'Both tabs show the address form'],
          ['Submit the address in the first tab', 'The first tab shows "Under review"'],
          ['Submit a different address in the second tab without reloading', 'An alert reads "This is already under review. You can submit again once it has been approved or rejected."'],
          ['Approve the Address in Admin and reload', 'The chip reads "Verified", the tick is green and no form is shown'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Wallet & Withdrawals',
    description:
      'The partner wallet at /wallet: balance, payout cycle, withdrawals, transactions and the withdrawal request form with the role-wise minimum.',
    sub_flows: [
      {
        name: 'View the wallet',
        description: 'Balance, payout cycle and history.',
        steps: [
          ['As a partner, click "Wallet" in the sidebar', 'The URL is /wallet with heading "Wallet"'],
          ['Read the balance card', '"Available balance" shows ₹<amount with 2 decimals> and a caption like "Paid on the weekly payout cycle · Next cycle <date>"'],
          ['Read the Withdrawals card for a new partner', 'It shows "No withdrawals yet."'],
          ['Read the Transactions card for a new partner', 'It shows "Your payouts will show up here."'],
          ['For a partner with earnings', 'Transactions list the reason (or source), date and a green +₹ credit or red −₹ debit'],
        ],
      },
      {
        name: 'Request a UPI withdrawal',
        description: 'Default payout method is UPI.',
        steps: [
          ['With a balance above the minimum click "Withdraw"', 'Dialog "Withdraw from wallet" opens with "Amount (max ₹<balance>)", Payout method UPI and a UPI ID field'],
          ['Enter an amount within the balance and a UPI ID', 'No errors'],
          ['Click "Request withdrawal"', 'The button reads "Requesting…", then the dialog closes'],
          ['Check the wallet', 'Balance drops by the amount, a Withdrawals row "₹<amount> · UPI" with a PENDING chip and "Requested <date>" appears, and a Transactions row "Withdrawal requested" shows −₹<amount>'],
        ],
      },
      {
        name: 'Request a bank withdrawal',
        description: 'IMPS and NEFT require account number and IFSC.',
        steps: [
          ['Open "Withdraw" and set Payout method to IMPS', 'UPI ID is replaced by Account holder name, Account number and IFSC code'],
          ['Click "Request withdrawal" with Account number and IFSC empty', 'Fields show "Enter account number" and "Enter IFSC code"'],
          ['Fill the bank fields with test account details and submit', 'The dialog closes and a PENDING "₹<amount> · IMPS" withdrawal appears'],
          ['Repeat with NEFT', 'A PENDING "₹<amount> · NEFT" withdrawal appears'],
        ],
      },
      {
        name: 'Withdrawal amount validation',
        description: 'Amount must be positive, within balance and at least the minimum.',
        steps: [
          ['Open "Withdraw" and submit with an empty amount', 'Amount shows "Enter an amount"'],
          ['Enter an amount greater than the balance', 'Amount shows "Max <balance>"'],
          ['With a role minimum configured in Finance, enter an amount below it', 'Amount shows "Minimum <min>"'],
          ['Choose UPI and leave UPI ID empty with a valid amount', 'UPI ID shows "Enter your UPI ID"'],
          ['Click "Cancel"', 'The dialog closes and the form resets next time it opens'],
        ],
      },
      {
        name: 'Balance below the role minimum',
        description: 'The Withdraw button is disabled until the balance reaches the minimum for the partner role.',
        steps: [
          ['In Finance > Withdrawals set the E-Commerce Brand minimum above an ECOMM partner current balance', 'Setting saved'],
          ['As that partner open /wallet', 'The "Withdraw" button is disabled'],
          ['Read the caption under the button', 'It reads "You can withdraw once your balance reaches ₹<min>.00."'],
          ['Lower the minimum below the balance and reload', 'The Withdraw button is enabled and the caption is gone'],
        ],
      },
      {
        name: 'Withdrawal rejected by the server',
        description: 'Server-side eligibility and balance checks shown in the dialog.',
        steps: [
          ['Open Withdraw in two tabs and request the full balance in the first', 'The first request succeeds'],
          ['Submit the full balance again from the second tab', 'An error alert in the dialog reads "Insufficient wallet balance"'],
          ['Raise the role minimum in Finance while the dialog is open, then submit an amount below it', 'An error alert reads "The minimum withdrawal for a <role> is ₹<min>." or "A <role> can withdraw once the wallet balance reaches ₹<min>. Available: ₹<balance>."'],
        ],
      },
      {
        name: 'Rejected withdrawal is shown with reason',
        description: 'Finance review outcome appears in the list.',
        steps: [
          ['In Finance reject a PENDING withdrawal with a reason', 'Rejected'],
          ['Reload /wallet as the partner', 'The withdrawal chip reads REJECTED, the caption shows "Requested <date> · <reason>" and the balance is refunded'],
          ['Mark another withdrawal PAID in Finance and reload', 'That withdrawal chip reads PAID in green'],
        ],
      },
      {
        name: 'Wallet entry follows partner roles',
        description: 'Wallet is in the sidebar only for partner-role holders.',
        steps: [
          ['Sign in as a user with no partner role', 'No Wallet entry in the sidebar'],
          ['Grant the user HOST in Admin and sign in again', 'The Wallet entry appears above Verification'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Support',
    description: 'Partner support requests at /support, submitted as a contact message that raises a support ticket.',
    sub_flows: [
      {
        name: 'Send a support request',
        description: 'Happy path with account details prefilled.',
        steps: [
          ['Click "Support" in the sidebar', 'The URL is /support with overline "Partner Support", heading "Need help?" and a "Support desk" chip'],
          ['Read the form card', 'Heading "Create support request" and "Your account email is used for replies and cannot be edited here."'],
          ['Check the prefilled fields', 'Your name holds the account name; Email holds the account email, is disabled and hinted "Locked to your Duncit account"; Category defaults to "Host application"'],
          ['Choose Category "Product listing", enter a Subject and a Message of 10+ characters', 'No errors'],
          ['Click "Send to support"', 'The button reads "Sending...", then a success snackbar reads "Thanks! We have received your message."'],
        ],
      },
      {
        name: 'Support form validation',
        description: 'Zod rules on name, subject and message.',
        steps: [
          ['Clear Your name and blur', 'Shows "Name is required"'],
          ['Enter name "John123" and blur', 'Shows "Name can use letters, spaces, apostrophes, periods and hyphens only"'],
          ['Enter Subject "Hi" and blur', 'Shows "Subject must be at least 3 characters"'],
          ['Enter a Message of 5 characters and blur', 'Shows "Message must be at least 10 characters"'],
          ['Enter a Subject longer than 120 characters and blur', 'Shows "Subject must be 120 characters or fewer"'],
          ['Click "Send to support" with errors present', 'Nothing is sent'],
        ],
      },
      {
        name: 'Support categories',
        description: 'All category options.',
        steps: [
          ['Open the Category select', 'Options are Venue request, Host application, Product listing, Payout or earning, Technical issue and Other'],
          ['Send a request with "Payout or earning" and subject "Late payout"', 'Success snackbar shows; in CRM the submission subject reads "[PAYOUT] Late payout"'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Policies',
    description: 'Active legal policies managed in Admin, read at /policies and /policies/:slug.',
    sub_flows: [
      {
        name: 'Open policies',
        description: '/policies forwards to the first policy.',
        steps: [
          ['Click "Policies" in the sidebar', 'The URL becomes /policies/<first policy slug>'],
          ['Read the hero', 'Overline "Duncit Partners", heading "Policies" and "Policy content is managed from the admin panel."'],
          ['Read the left list', 'Each active policy is a button; the open one is highlighted and marked as the current page'],
          ['Read the article', 'The policy title, rich-text content and "Last updated <date>" aligned right'],
        ],
      },
      {
        name: 'Switch between policies',
        description: 'Slug-based navigation.',
        steps: [
          ['Click a different policy in the left list', 'The URL becomes /policies/<slug> and the article shows that policy'],
          ['Use browser Back', 'The previous policy is shown again'],
        ],
      },
      {
        name: 'Unknown or hidden policy',
        description: 'Missing and inactive policies.',
        steps: [
          ['Open /policies/does-not-exist', 'The article area shows "No policy found."'],
          ['Deactivate a policy in Admin and open its /policies/<slug>', 'The article area shows "This policy is currently hidden." and it no longer appears in the left list'],
        ],
      },
      {
        name: 'No active policies',
        description: 'Empty state.',
        steps: [
          ['With every policy deactivated, open /policies', 'The left list reads "No active policies yet." and the article area reads "Select a policy."'],
        ],
      },
    ],
  },
  {
    name: 'Partners: FAQs',
    description: 'Partner-audience FAQs at /faqs with topic filter and search.',
    sub_flows: [
      {
        name: 'Browse FAQs',
        description: 'All active partner FAQs.',
        steps: [
          ['Click "FAQs" in the sidebar', 'The URL is /faqs with overline "Partner help", heading "FAQs" and "Answers for venues, hosts, and product listings."'],
          ['Inspect the topic chips', 'Chips All, Venue, Host and Products are shown; All is selected (pressed)'],
          ['Inspect an FAQ row', 'It shows the question and a topic chip (Venue, Host, Products or Partner)'],
          ['Expand a question', 'The answer is shown with its line breaks preserved'],
        ],
      },
      {
        name: 'Filter FAQs by topic',
        description: 'Topic chips re-query the server.',
        steps: [
          ['Click the "Products" chip', 'Products becomes selected and only product FAQs are listed'],
          ['Click "All"', 'FAQs of every topic are listed again'],
          ['Select a topic with no active FAQs', 'An info alert reads "No FAQs found for this filter."'],
        ],
      },
      {
        name: 'Search FAQs',
        description: 'Client-side search over question and answer.',
        steps: [
          ['Type a word that appears only in one answer into "Search FAQs"', 'Only FAQs whose question or answer contains the word remain'],
          ['Type a nonsense string', 'An info alert reads "No FAQs found for this filter."'],
          ['Clear the search', 'The full list for the selected topic returns'],
        ],
      },
    ],
  },
  {
    name: 'Venues: Access & Dashboard',
    description:
      'venues.duncit.com admits ALL_VENUES_ACCESS or ONBOARDING_MANAGER. The dashboard at / shows four lifecycle tiles, each a way into the list already filtered.',
    sub_flows: [
      {
        name: 'Dashboard tiles open the filtered list',
        description: 'The brief at / counts venues by review status in one query and links each tile to /venues.',
        steps: [
          ['Sign in to the Venues portal as a user holding ALL_VENUES_ACCESS', 'The shell opens on / with the sidebar showing Dashboard and Venues'],
          ['Look at the page header', 'Title "Venues" with the subtitle "Every venue Duncit works with — an application awaiting review and a live space taking bookings sit in one list."'],
          ['Look at the tiles', 'Four tiles render: Total, Approved, Awaiting review and Declined, each with a number'],
          ['Hover the Total tile', 'The hint reads "Open the list"'],
          ['Click the Approved tile', 'The browser navigates to /venues?status=APPROVED and the table lists only APPROVED venues'],
          ['Go back and click Awaiting review', 'The browser navigates to /venues?status=SUBMITTED'],
          ['Go back and click Declined', 'The browser navigates to /venues?status=REJECTED'],
        ],
      },
      {
        name: 'Counts query fails',
        description: 'A failing counts query surfaces its message instead of silent zeros.',
        steps: [
          ['Open / while the venuesTable query returns an error', 'An error Alert shows the GraphQL error message above the tiles'],
          ['Look at the tiles', 'The tiles still render, showing 0 once loading ends'],
        ],
      },
      {
        name: 'User without a venues role is refused',
        description: 'The portal gate rejects accounts holding neither ALL_VENUES_ACCESS nor ONBOARDING_MANAGER.',
        steps: [
          ['Sign in to venues.duncit.com with an account that holds neither ALL_VENUES_ACCESS nor ONBOARDING_MANAGER', 'The shell refuses access to the console and no venue data loads'],
          ['Call venuesTable directly with that session', 'The server answers "Access Denied" (FORBIDDEN)'],
        ],
      },
    ],
  },
  {
    name: 'Venues: Venue List',
    description: 'The /venues list is a server-side table over venuesTable with a pinned Super Category filter and an Add venue button.',
    sub_flows: [
      {
        name: 'Browse, search and filter venues',
        description: 'Search, column filters, sort and paging are one server query.',
        steps: [
          ['Open /venues', 'Header "Venues" with the directory subtitle, a Super Category select and an "Add venue" button; the table is sorted by Created, newest first'],
          ['Check the columns', 'Venue (name over type), Category (Super > Category > Sub), Location, Owner (name over phone or email), Capacity, Status chip, Active chip, Pods count and Created date'],
          ['Type part of a city into the search box ("Search name, type, city or owner")', 'The table refetches and lists only matching venues'],
          ['Pick a super category in the Super Category select', 'The table resets to page 1 and shows only venues under that super category; no removable filter chip appears for it'],
          ['Filter the Status column to APPROVED', 'Only APPROVED venues remain'],
          ['Clear all filters on a portal with no venues matching', 'The empty text for venues shows instead of rows'],
        ],
      },
      {
        name: 'Open a venue from the list',
        description: 'The row itself is the only action on the list.',
        steps: [
          ['Open /venues and click a venue row', 'The browser navigates to /venues/<venueId> and the venue record opens'],
        ],
      },
    ],
  },
  {
    name: 'Venues: Venue Record',
    description: 'The venue record at /venues/:venueId: summary card, Overview, Pods, Operations, Documents and Change Logs tabs, with Edit venue.',
    sub_flows: [
      {
        name: 'Read a venue across its tabs',
        description: 'Tabs are held in the URL (?selectedtab=) so a reload keeps the open tab.',
        steps: [
          ['Open /venues/<venueId>', 'A back arrow (aria "Back to venues"), eyebrow "Venue", the venue name as title and an "Edit venue" button render above a summary card'],
          ['Look at the tab strip', 'Tabs Overview, Pods, Operations, Documents and Change Logs; Overview is selected'],
          ['Stay on Overview', 'About, category, spaces, amenities, facilities, security, tags, gallery, location, owner, payout and record cards render; missing data shows copy such as "No description added yet."'],
          ['Click the Pods tab', 'The URL gains ?selectedtab=pods and "Pods at this venue" lists pods with Pod, When, Hosts, Venue approval and Spots columns, or "No pods at this venue yet."'],
          ['Click the Operations tab', 'Operating hours, weekly off ("Open every day" when none), holidays, auto-extend and cancellation bands render'],
          ['Click the Documents tab', 'Uploaded documents list with "Uploaded <date>", or "No documents uploaded."'],
          ['Reload the page', 'The Documents tab is still selected'],
        ],
      },
      {
        name: 'Unknown venue id',
        description: 'A record that does not exist shows a warning rather than an empty page.',
        steps: [
          ['Open /venues/000000000000000000000000', 'A warning reads "Venue not found." and no tabs render'],
        ],
      },
      {
        name: 'Review the venue change log',
        description: 'Every tracked field change is appended with who changed it and from where.',
        steps: [
          ['Open /venues/<venueId>?selectedtab=changeLogs', 'Heading "Change logs" and the append-only subtitle render above a table sorted by Changed On, newest first'],
          ['Check the columns', 'Field / Data Name, Old Data, New Data, Action (Created/Updated/Deleted), Changed On, Updated By (Owner/Admin/System), Updated By Name / ID and Source (Native/mWeb/Admin Portal/Portal/System)'],
          ['Search for a field name in "Search field, old or new value, or who changed it"', 'Only matching entries remain'],
          ['Open a venue that was never edited', 'The table shows "No changes recorded yet."'],
        ],
      },
    ],
  },
  {
    name: 'Venues: Venue Editor',
    description:
      'The /venues/new and /venues/:venueId/edit page: eight sections (The space, Where it is, Photos, Paperwork, Who runs it, How it operates, Cancellations, Status and money) validated with Zod and saved in one press.',
    sub_flows: [
      {
        name: 'Register a new venue for an owner account',
        description: 'Creating a venue on behalf of an existing Duncit account.',
        steps: [
          ['On /venues click "Add venue"', 'The browser opens /venues/new with eyebrow "Venues · Add", title "New venue" and "Save venue" in the header and at the foot'],
          ['In Who runs it, search the Owner account picker and pick an account', 'Owner name, Owner email and Owner phone are filled from that account'],
          ['Fill Venue name, Venue type, Total capacity and a Category', 'The fields accept the values without errors'],
          ['In Where it is pick the city and area from the location list and enter Address line 1', 'City and locality are set from the admin location list'],
          ['Set Opens at 09:00 and Closes at 22:00 in How it operates', 'The clock fields accept 24-hour times'],
          ['Click "Save venue"', 'The button shows a loading state, then a "Venue created" toast appears'],
          ['Observe the navigation', 'The browser lands on /venues/<newId> showing the new venue record'],
          ['Open the Change Logs tab', 'Created entries are recorded for the new venue'],
        ],
      },
      {
        name: 'Required and format validation',
        description: 'Zod rules block Save and show field messages.',
        steps: [
          ['Open /venues/new and click "Save venue" with everything empty', 'The form does not submit; "Pick the account that owns this venue" shows under Owner account'],
          ['Check the Venue name field', '"Venue name must be at least 2 characters"'],
          ['Check the location field', '"Pick the city from the location list" and "City is required" show'],
          ['Enter "ab" in Address line 1 and blur', '"Address line 1 must be at least 3 characters"'],
          ['Enter 0 in Total capacity and blur', '"Total capacity must be at least 1"'],
          ['Enter 70 in Maximum advance (days)', '"Maximum advance (days) must be at most 60"'],
          ['Enter "12AB" in GSTIN', '"GSTIN looks like 22ABCDE1234F1Z5"'],
          ['Enter "ABC12" in PAN', '"PAN looks like ABCDE1234F"'],
          ['Enter "9:5" in Opens at', '"Opens at must be a 24-hour time like 09:00"'],
          ['Set Opens at 18:00 and Closes at 10:00', '"Closing time must be after the opening time" under Closes at'],
          ['Enter an invalid postal code', '"Enter a valid postal/ZIP code"'],
          ['Enter letters in Owner phone', '"Owner phone must contain only digits (6-15 digits)"'],
        ],
      },
      {
        name: 'Edit an existing venue',
        description: 'Details save through adminUpdateVenue then updateVenueSettings.',
        steps: [
          ['On /venues/<venueId> click "Edit venue"', 'The editor opens at /venues/<venueId>/edit with eyebrow "Venues · Edit" and the venue name as title, prefilled'],
          ['Look at Who runs it', 'No owner picker; the note says the owning account cannot be changed here'],
          ['Change the description and add a gallery photo via Upload', 'The media picker dialog "Choose a file" opens and the chosen URL is added to the gallery'],
          ['Click "Save venue"', 'A "Venue saved" toast appears and the browser returns to /venues/<venueId>'],
          ['Open the Change Logs tab', 'Updated rows show the old and new description with source Portal or Admin Portal'],
        ],
      },
      {
        name: 'Cancel leaves without saving',
        description: 'Cancel and the back arrow return to the record or list.',
        steps: [
          ['Open /venues/<venueId>/edit and change the venue name', 'The field shows the new text'],
          ['Click "Cancel" at the foot', 'The browser returns to /venues/<venueId> and the old name is still shown'],
          ['Open /venues/new and press the back arrow', 'The browser returns to /venues'],
        ],
      },
      {
        name: 'Capacity spaces, documents and holidays lists',
        description: 'Repeating rows inside the editor.',
        steps: [
          ['Open /venues/<venueId>/edit and click "Add a space"', 'A Space + Seats row appears'],
          ['Leave the Space name blank and Save', '"Space is required" shows on that row'],
          ['Click "Remove this space"', 'The row disappears'],
          ['Click "Add a document" and leave Document type blank', '"Document type is required" and "File or link is required" show on Save'],
          ['Pick a Holiday date and click "Add"', 'The date joins the holiday list; with none the text reads "No holidays added."'],
        ],
      },
      {
        name: 'Cancellation bands validation',
        description: 'Charge and refund ladders reject duplicates and over-100 percentages.',
        steps: [
          ['Open /venues/<venueId>/edit and in Cancellations click "Add a charge band" twice', 'Two Within (hours) / Charge / Value rows appear'],
          ['Give both bands the same Within (hours) and Save', '"Two bands cannot share the same notice window" shows'],
          ['Set a band Charge to "Percent of slot" with Value 150', '"A percentage charge cannot exceed 100"'],
          ['Set Charge to "Flat amount" with Value 150', 'No ceiling error for a flat amount'],
          ['Turn on "Bookings may only be rescheduled, never cancelled"', 'The hint "While this is on, the charge bands below do not apply." is shown'],
          ['Add a refund band with Refund % 120', '"Refund % must be at most 100"'],
        ],
      },
      {
        name: 'Console-role editor cannot govern status and money',
        description: 'An ALL_VENUES_ACCESS user without a governor role edits details only.',
        steps: [
          ['Sign in with ALL_VENUES_ACCESS only and open /venues/<venueId>/edit', 'Status and money shows an info note: "Approvals, the percentages and the live switch are set by platform admins and the onboarding desk. Everything else on this page is yours to edit."'],
          ['Look at Status, Venue share % and Venue commission %', 'All three are disabled and the "Live and taking bookings" switch is disabled'],
          ['Change the address and Save', '"Venue saved" appears; no setVenueDeductions or setVenueActive request is sent'],
          ['Attempt adminUpdateVenue with a status from this session', 'The server refuses with "You cannot change a venue review status"'],
        ],
      },
      {
        name: 'Governor approves and deactivates a venue',
        description: 'SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN or ONBOARDING_MANAGER can move status, percentages and the live switch.',
        steps: [
          ['Sign in as ONBOARDING_MANAGER and open /venues/<venueId>/edit', 'Status, Venue share %, Venue commission % and the live switch are enabled; no governed-by note'],
          ['Set Status to Approved and Venue commission % to 12', 'The values are accepted'],
          ['Turn off "Live and taking bookings"', 'A warning reads "Saving with this off deactivates the venue and emails the owner. Its existing pods are not cancelled."'],
          ['Click "Save venue"', '"Venue saved" appears; the record shows status APPROVED, Inactive and commission 12%'],
          ['Enter 120 in Venue share %', '"Venue share % must be at most 100" blocks Save'],
        ],
      },
    ],
  },
  {
    name: 'Hosts: Access & Dashboard',
    description: 'hosts.duncit.com admits ALL_HOSTS_ACCESS or ONBOARDING_MANAGER; / shows Total, Approved, Awaiting review and Declined host tiles.',
    sub_flows: [
      {
        name: 'Dashboard tiles open the filtered hosts list',
        description: 'Tiles count hostsTable by status.',
        steps: [
          ['Sign in to the Hosts portal with ALL_HOSTS_ACCESS', 'The sidebar shows Dashboard and Hosts'],
          ['Open /', 'Title "Hosts" with its subtitle and four tiles: Total, Approved, Awaiting review, Declined'],
          ['Click Awaiting review', 'The browser opens /hosts?status=SUBMITTED listing only submitted host applications'],
          ['Go back and click Total', 'The browser opens /hosts unfiltered'],
        ],
      },
      {
        name: 'Account without a hosts role',
        description: 'Neither ALL_HOSTS_ACCESS nor ONBOARDING_MANAGER.',
        steps: [
          ['Sign in to hosts.duncit.com with an account lacking both roles', 'Access to the console is refused'],
          ['Query hostsTable with that session', 'The server answers "Access Denied" (FORBIDDEN)'],
        ],
      },
    ],
  },
  {
    name: 'Hosts: Host List & Record',
    description: 'The /hosts list and the /hosts/:hostId record with Overview, Pods and Change Logs tabs.',
    sub_flows: [
      {
        name: 'Search and filter hosts',
        description: 'Server-side table over hostsTable.',
        steps: [
          ['Open /hosts', 'Header "Hosts", an "Add host" button and a table sorted by Applied, newest first'],
          ['Check the columns', 'Host (name over HOST- id), Contact (email over phone), Runs, Status chip (Draft/Awaiting review/Approved/Rejected), Live (Live/Paused), Commission ("Platform default" when unset) and Applied'],
          ['Search with "Search name, email, phone or host ID"', 'Only matching hosts remain'],
          ['Filter Status to Approved', 'Only Approved hosts remain'],
          ['With no hosts in the system', 'The table shows "No hosts yet."'],
        ],
      },
      {
        name: 'Open a host record and its pods',
        description: 'The record resolves pods by the host account id.',
        steps: [
          ['Click a host row on /hosts', 'The browser opens /hosts/<hostId> with eyebrow "Host", the full name ("Unnamed host" if blank) and "Edit host"'],
          ['Look below the summary card', 'Tabs Overview, Pods and Change Logs; Overview shows identity, verification, categories, payout and reviewer notes'],
          ['Click the Pods tab', '"Pods they run" lists pods with Pod, When, Mode, Booked (booked/total) and Venue approval, or "This host has not run a pod yet."'],
          ['Click the Change Logs tab', 'The host change log table loads for this record'],
        ],
      },
      {
        name: 'Unknown host id',
        description: 'Missing record handling.',
        steps: [
          ['Open /hosts/000000000000000000000000', 'A warning reads "Host not found."'],
        ],
      },
    ],
  },
  {
    name: 'Hosts: Host Editor',
    description: 'The /hosts/new and /hosts/:hostId/edit page: Who they are, Verification, What they run and Status and money.',
    sub_flows: [
      {
        name: 'Create a host record for an account',
        description: 'One host record per login; created active.',
        steps: [
          ['On /hosts click "Add host"', '/hosts/new opens with eyebrow "Hosts · Add", title "New host" and "Save host"'],
          ['Pick a Duncit account in the account picker', 'Full name, Email and Phone are filled from the account'],
          ['Enter the Address', 'The field accepts the text'],
          ['Click "Add a category" and choose Super, Category and Sub', 'A full category triple row is added'],
          ['Click "Save host"', '"Host created" toast; the browser opens /hosts/<newId>'],
          ['Open the Pods tab on the new host', 'The pods table loads for that account'],
        ],
      },
      {
        name: 'Host form validation',
        description: 'Zod messages on the host editor.',
        steps: [
          ['On /hosts/new click "Save host" with nothing filled', '"Pick the Duncit account this host record belongs to" shows and nothing is saved'],
          ['Leave Full name empty', '"Full name is required"'],
          ['Type "R2D2" into Full name', '"Full name can use letters, spaces, apostrophes, periods and hyphens only"'],
          ['Type "not-an-email" into Email', '"Enter a valid email"'],
          ['Type "12345" into Aadhaar number', '"Aadhaar must be 12 digits"'],
          ['Type "ABCD" into PAN number', '"PAN looks like ABCDE1234F"'],
          ['Leave Address empty', '"Address is required"'],
          ['As a governor enter 101 in Commission', '"Commission must be at most 100"'],
        ],
      },
      {
        name: 'Edit categories and verification documents',
        description: 'Categories save as a full replace; partial rows are dropped.',
        steps: [
          ['Open /hosts/<hostId>/edit', 'The account picker is replaced by the note that the account cannot be changed; categories hint explains saving replaces the whole set'],
          ['Click "Remove this category" on one row', 'The row disappears'],
          ['Add a row with only Super and Category picked', 'The row is allowed in the form'],
          ['Upload a Passport photo and paste a Police verification link', 'Both URL fields show the chosen values'],
          ['Click "Save host"', '"Host saved"; returning to the record shows the removed category gone and the incomplete row not saved'],
        ],
      },
      {
        name: 'Console-role editor versus governor',
        description: 'Only governors move status, commission and the live switch.',
        steps: [
          ['Sign in with ALL_HOSTS_ACCESS only and open /hosts/<hostId>/edit', 'Status, Commission and "Live and able to run pods" are disabled with the governed-by note'],
          ['Save a phone change', '"Host saved"; no setHostDeductions or setHostActive call is made'],
          ['Sign in as ONBOARDING_MANAGER, open the same editor and turn the live switch off', 'Warning: "Saving with this off pauses the host and notifies them. Pods they already run are not cancelled."'],
          ['Click "Save host"', '"Host saved" and the record shows Paused'],
        ],
      },
      {
        name: 'Server-side date of birth range',
        description: 'The server enforces the host age window.',
        steps: [
          ['On /hosts/<hostId>/edit set Date of birth to a date making the host 15 and Save', 'The save error Alert shows "Host age must be between 18 and 100 years"'],
        ],
      },
    ],
  },
  {
    name: 'Clubs: Access & Dashboard',
    description: 'clubs.duncit.com admits ALL_CLUBS_ACCESS; / shows Total, Active, Verified and Inactive club tiles.',
    sub_flows: [
      {
        name: 'Dashboard tiles open the filtered clubs list',
        description: 'Clubs have no status lifecycle, so tiles read is_active and is_verified.',
        steps: [
          ['Sign in to the Clubs portal with ALL_CLUBS_ACCESS', 'The sidebar shows Dashboard and Clubs'],
          ['Open /', 'Title "Clubs" and four tiles: Total, Active, Verified, Inactive'],
          ['Click Active', 'The browser opens /clubs?is_active=true'],
          ['Go back and click Verified', 'The browser opens /clubs?is_verified=true'],
          ['Go back and click Inactive', 'The browser opens /clubs?is_active=false'],
        ],
      },
      {
        name: 'Account without ALL_CLUBS_ACCESS',
        description: 'The portal gate.',
        steps: [
          ['Sign in to clubs.duncit.com with an account lacking ALL_CLUBS_ACCESS', 'Access to the console is refused'],
        ],
      },
    ],
  },
  {
    name: 'Clubs: Club List',
    description: 'The /clubs table: cover, club, category, matched venues, WhatsApp markers, status, created and actions, plus a Super Category filter.',
    sub_flows: [
      {
        name: 'Browse clubs and spot clubs without an admin',
        description: 'A club with no admin is flagged in red on its name.',
        steps: [
          ['Open /clubs', 'Heading "Clubs", "Manage clubs. Pods are organised inside a club.", a Super Category select and a "New Club" toolbar button; rows sorted by club name A-Z'],
          ['Find a club with no club admin', 'Its name is red with an error icon and the caption "No club admin assigned"'],
          ['Hover that club name', 'Tooltip: "This club has nobody to run it. Open the club and assign a Club Admin — until then its pods have no owner and its club-admin share of every settlement is never paid out."'],
          ['Check the WhatsApp column', 'A "C" chip for a community link and a "G" chip for a group link'],
          ['Search "Search name, ID or locality"', 'Only matching clubs remain'],
          ['Pick a super category', 'The list resets to page 1 filtered to that super category'],
          ['With no clubs at all', 'Empty text: No clubs yet. Click "New Club" to create the first one.'],
        ],
      },
      {
        name: 'Row actions: view, pods, edit',
        description: 'Each row opens the record, its Pods tab or the editor.',
        steps: [
          ['Click a club row', 'The browser opens /clubs/<id>'],
          ['Back on /clubs click the "View Pods" icon on a row', 'The browser opens /clubs/<id>?selectedtab=pods'],
          ['Click the edit action on a row', 'The browser opens /clubs/<id>/edit'],
          ['Open a legacy bookmark /clubs?edit=<id>', 'The browser is redirected to /clubs/<id>/edit'],
        ],
      },
      {
        name: 'Delete a club',
        description: 'Destructive confirmation, then deleteClub.',
        steps: [
          ['On /clubs click the delete action on a club', 'A confirm dialog titled "Delete club" asks Delete club "<name>"? with a destructive Delete button'],
          ['Click Cancel', 'The dialog closes and the club remains'],
          ['Click delete again and confirm', 'A "Deleted" snackbar shows and the table refetches without the club'],
          ['Confirm a delete as a user who is not SUPER_ADMIN or CITY_ADMIN', 'An error notification shows "Access Denied" and the club remains'],
        ],
      },
    ],
  },
  {
    name: 'Clubs: Club Record',
    description: 'The /clubs/:id record with Overview, Hosts, Pods and Change Logs tabs, and nested host, club admin and pod records that keep Back inside the club.',
    sub_flows: [
      {
        name: 'Read the club overview',
        description: 'Overview card, cover media, moments, content sections and the Club Admins card.',
        steps: [
          ['Open /clubs/<id>', 'A back button "Clubs", the club name with a verified icon when verified, an Active/Inactive chip, /<club_id> caption and "Edit club"'],
          ['Stay on Overview', 'Overview card, "Cover media", "Moments" (or "No moments captured for this club yet.") and content sections render'],
          ['Look at the Club Admins card', 'The card lists admins with a count chip, or "No club admins assigned yet."'],
          ['Click an admin name', 'The browser opens /clubs/<id>/club-admins/<clubAdminId> showing that Club Admin record'],
          ['Press Back on that record', 'The browser returns to /clubs/<id>?selectedtab=overview'],
        ],
      },
      {
        name: 'Open a club host and edit inside the club',
        description: 'Host records open under the club so Back returns to the Hosts tab.',
        steps: [
          ['On /clubs/<id> click the Hosts tab', '"Hosts of this club" table loads, or "No hosts in this club yet."'],
          ['Click a host row', 'The browser opens /clubs/<id>/hosts/<hostId> showing the host record'],
          ['Click "Edit host"', 'The editor opens at /clubs/<id>/hosts/<hostId>/edit'],
          ['Click "Save host"', '"Host saved" and the browser returns to /clubs/<id>/hosts/<hostId>'],
          ['Press Back on the host record', 'The browser returns to /clubs/<id>?selectedtab=hosts'],
        ],
      },
      {
        name: 'Open a club pod',
        description: 'Pods open at /pods/:id and Back returns to the pod\'s own club.',
        steps: [
          ['On /clubs/<id> click the Pods tab', '"Pods in this club" table loads, or "No pods in this club yet."'],
          ['Click a pod row', 'The browser opens /pods/<podId> with a "Back to club" back link'],
          ['Open the pod editor from that page', 'The editor opens at /pods/<podId>/edit with "Back to pod"'],
          ['Press "Back to pod"', 'The browser returns to /pods/<podId>'],
          ['Press "Back to club"', 'The browser returns to /clubs/<clubId>?selectedtab=pods'],
        ],
      },
      {
        name: 'Unknown club',
        description: 'Missing record handling.',
        steps: [
          ['Open /clubs/000000000000000000000000', 'A warning reads "Club not found."'],
        ],
      },
    ],
  },
  {
    name: 'Clubs: Club Editor',
    description: 'The /clubs/new and /clubs/:id/edit full-page club form with live member preview, AI fill, draft save and exactly one Club Admin.',
    sub_flows: [
      {
        name: 'Create and publish a club',
        description: 'Full validation on Save; the club is created active.',
        steps: [
          ['On /clubs click "New Club"', '/clubs/new opens with eyebrow "Admin · Clubs", heading "New Club", "Back to clubs" and a live preview beside the form'],
          ['Look at the footer', 'Cancel, "Save as Draft" and "Save"; both save buttons are disabled until Club name has text'],
          ['Fill Club name, description, super and sub category, location, a feature image, WhatsApp community and group links, and one entry each for Who we are, What we do, Perks and Values', 'The preview updates as fields change'],
          ['Search the Club Admin picker and pick one user', 'The picker shows the chosen admin; candidates are narrowed to Club Admins of the club category'],
          ['Click "Save"', 'A "Saved" toast appears and the browser returns to /clubs with the new club listed as active'],
        ],
      },
      {
        name: 'Club form validation messages',
        description: 'Required fields and link format.',
        steps: [
          ['On /clubs/new type a Club name only and click "Save"', 'The form does not submit'],
          ['Check the messages', '"A short description is required", "Select a super category", "Select a sub category", "Select the club location" show'],
          ['Check the lists and media', '"Add at least one "Who we are" point", "Add at least one "What we do" point", "Add at least one perk", "Add at least one value", "Add at least one feature image"'],
          ['Check the links', '"WhatsApp community link is required" and "WhatsApp group link is required"'],
          ['Enter "chat.whatsapp" as the group link', '"Enter a valid link (https://…)"'],
          ['Check the admin picker', '"Assign a Club Admin"'],
        ],
      },
      {
        name: 'Save a club as draft',
        description: 'A draft create skips validation and stays inactive.',
        steps: [
          ['On /clubs/new type only a Club name', '"Save as Draft" becomes enabled'],
          ['Click "Save as Draft"', 'A "Draft saved" toast appears and the browser returns to /clubs'],
          ['Find the club in the list', 'Its status chip reads Draft (inactive)'],
          ['Open /clubs/<id>/edit for that club', 'The footer shows Cancel and Save only; "Save as Draft" is not offered when editing'],
        ],
      },
      {
        name: 'Replace a multi-admin club with one admin',
        description: 'Older clubs with several admin ids are trimmed to one on save.',
        steps: [
          ['Open /clubs/<id>/edit for a club with two admins', 'A warning says the club was set up with more than one admin and names who will be removed and lose the Club Admin role unless they administer another club'],
          ['Search for a user who holds no Club Admin role', 'No option; text "No Club Admin users match. The role is granted by approving a Club Admin onboarding meeting, or from Users → Roles."'],
          ['Pick a different Club Admin and click "Save"', '"Saved"; the club record Club Admins card lists only the chosen admin'],
        ],
      },
      {
        name: 'AI fill the club form',
        description: 'The AI fill button merges suggested content without overwriting picked structure.',
        steps: [
          ['On /clubs/new with a category already picked, click the AI fill button', 'Content fields (name, description, bullets, FAQs, links) are filled'],
          ['Check category, location and admin', 'The already-picked category is kept; empty location and admin are filled only when the server resolved them to real ids'],
          ['Check FAQs', 'At most 10 FAQs, each with both a question and an answer'],
        ],
      },
      {
        name: 'Non-admin cannot save a club',
        description: 'createClub and updateClub require SUPER_ADMIN or CITY_ADMIN.',
        steps: [
          ['Sign in with ALL_CLUBS_ACCESS only, open /clubs/<id>/edit and click "Save"', 'The editor shows an error Alert "Access Denied" and stays on the page'],
        ],
      },
    ],
  },
  {
    name: 'Club Admins: Access & Dashboard',
    description: 'club-admins.duncit.com admits ALL_CLUB_ADMINS_ACCESS; / shows Total, Approved, Awaiting review (DRAFT) and Declined tiles.',
    sub_flows: [
      {
        name: 'Dashboard tiles open the filtered list',
        description: 'Pending means DRAFT for Club Admins.',
        steps: [
          ['Sign in to the Club Admins portal with ALL_CLUB_ADMINS_ACCESS', 'The sidebar shows Dashboard and Club Admins'],
          ['Open /', 'Title "Club Admins" and tiles Total, Approved, Awaiting review, Declined'],
          ['Click Awaiting review', 'The browser opens /club-admins?status=DRAFT'],
          ['Go back and click Declined', 'The browser opens /club-admins?status=REJECTED'],
        ],
      },
    ],
  },
  {
    name: 'Club Admins: List & Record',
    description: 'The /club-admins list over clubAdminProfilesTable and the /club-admins/:clubAdminId record with Overview and Change Logs.',
    sub_flows: [
      {
        name: 'Browse club admins',
        description: 'Only governors see the appoint button.',
        steps: [
          ['Open /club-admins as an ALL_CLUB_ADMINS_ACCESS-only user', 'The list loads with "Search name, email, phone or club admin ID" and no "Appoint a club admin" button'],
          ['Open /club-admins as SUPER_ADMIN', 'An "Appoint a club admin" button appears'],
          ['Search by an email', 'Only the matching club admin remains'],
          ['With none in the system', '"No club admins yet."'],
        ],
      },
      {
        name: 'Open a club admin record',
        description: 'Status chip, live chip, id and tabs.',
        steps: [
          ['Click a row on /club-admins', '/club-admins/<id> opens with eyebrow "Club Admin", the name ("Unnamed club admin" if blank) and "Edit club admin"'],
          ['Look at the status card', 'A status chip (Drafted, not reviewed / Approved / Rejected), a Live or Paused chip and the Club Admin ID'],
          ['Stay on Overview', 'Contact, Category, Commission ("Platform default" when unset), "Clubs they run" (or "No clubs assigned yet — assign them from Review on the list."), onboarding record and reviewer notes'],
          ['Click Change Logs', 'The change log table for this Club Admin loads'],
          ['Open /club-admins/000000000000000000000000', '"Club admin not found."'],
        ],
      },
    ],
  },
  {
    name: 'Club Admins: Club Admin Editor',
    description: 'The /club-admins/new and /club-admins/:clubAdminId/edit page: Who they are, Clubs they run, Status and money.',
    sub_flows: [
      {
        name: 'Appoint a club admin',
        description: 'Appointing grants the CLUB_ADMIN role; governors only.',
        steps: [
          ['As SUPER_ADMIN click "Appoint a club admin" on /club-admins', '/club-admins/new opens with eyebrow "Club Admins · Appoint" and "Save club admin"'],
          ['Pick an account in the Duncit account picker', 'Full name, Email and Phone fill from the account; the hint says appointing grants the CLUB_ADMIN role'],
          ['Pick a Category', 'The category is set'],
          ['Look at Clubs they run', 'Info: "Clubs can be assigned once the record exists — save this page first, then reopen it."'],
          ['Click "Save club admin"', '"Club admin appointed" and the browser opens /club-admins/<newId>'],
          ['Repeat for the same account', 'The save error shows "This account is already a Club Admin"'],
        ],
      },
      {
        name: 'Validation on the club admin form',
        description: 'Phone is optional here.',
        steps: [
          ['On /club-admins/new click "Save club admin" empty', '"Pick the Duncit account to appoint" shows'],
          ['Enter "abc" in Email', '"Enter a valid email"'],
          ['Leave Phone empty', 'No phone error'],
          ['Enter "12ab" in Phone', '"Phone must contain only digits (6-15 digits)"'],
          ['Enter 150 in Commission', '"Commission must be at most 100"'],
        ],
      },
      {
        name: 'Assign clubs to a club admin',
        description: 'Assignment replaces the whole set; out-of-category clubs are labelled.',
        steps: [
          ['Open /club-admins/<id>/edit', 'The account note says it cannot be changed; "Clubs they run" shows a multi-select'],
          ['Search clubs and tick two', 'Both appear as chips; a club outside the admin category shows "Outside their category — assigned anyway"'],
          ['Read the caption', '"Saving replaces the whole set. Other admins of these clubs are untouched."'],
          ['Click "Save club admin"', '"Club admin saved"; the record lists both clubs under Clubs they run'],
        ],
      },
      {
        name: 'Approve, reject or suspend a club admin',
        description: 'Status decisions call approve or reject only when the status moved.',
        steps: [
          ['As ONBOARDING_MANAGER open /club-admins/<id>/edit for a DRAFT record', 'Status offers Drafted, not reviewed / Approved / Rejected'],
          ['Set Status to Approved and Save', '"Club admin saved"; the record status chip reads Approved'],
          ['Edit again, set Status to Rejected and Save', 'The record is rejected with reviewer note "Rejected from the Club Admins console."'],
          ['Turn off "Live and able to run their clubs"', 'Warning: "Saving with this off suspends the club admin and notifies them. The clubs they run are not reassigned."'],
          ['Save', 'The record shows Paused'],
          ['As an ALL_CLUB_ADMINS_ACCESS-only user open the editor', 'Status, Commission and the live switch are disabled with the governed-by note'],
        ],
      },
    ],
  },
  {
    name: 'Regional Club Admin: Region Structure',
    description: 'regional-club-admin.duncit.com requires REGIONAL_CLUB_ADMIN. The / canvas draws Region > City > Locality > Club Admin > Host from the Club Admins stored on the region.',
    sub_flows: [
      {
        name: 'View the region canvas',
        description: 'The canvas is the landing page.',
        steps: [
          ['Sign in with REGIONAL_CLUB_ADMIN', 'The sidebar shows Region Structure and Club Admins; / opens the canvas'],
          ['Watch the first load', '"Drawing your region…" with a spinner shows until the tree arrives'],
          ['Look at the header', 'The region name as title with "Your whole region on one canvas — every city, locality, Club Admin and Host under you."'],
          ['Look at the legend', 'Chips Region, City, Locality, Club Admin, Host in hierarchy order'],
          ['Read the hint', '"Click a Host to see the pods they run in this region."'],
        ],
      },
      {
        name: 'Empty region',
        description: 'A region with no Club Admins.',
        steps: [
          ['Open / for a region with no Club Admins', 'Info: "No Club Admins in your region yet. Add one from the Club Admins page and the canvas fills in from the clubs they run."'],
        ],
      },
      {
        name: 'Search and lay out the canvas',
        description: 'Search and direction live in the URL.',
        steps: [
          ['Type a city name in "Search the canvas"', 'Matching boxes stay lit, others dim, and "<n> of <total> boxes match" appears; the URL gains ?q='],
          ['Type text that matches nothing', 'Warning: "Nothing on the canvas matches that search."'],
          ['Click the clear (x) button', 'The search empties and all boxes are lit'],
          ['Toggle Layout to Vertical', 'The tree redraws top-to-bottom'],
          ['Reload the page', 'The same search and layout are restored'],
        ],
      },
      {
        name: 'Canvas zoom and full screen',
        description: 'Canvas controls.',
        steps: [
          ['Click "Zoom in" then "Zoom out"', 'The canvas scales accordingly'],
          ['Click "Fit the whole region"', 'All boxes fit in view'],
          ['Click "Full screen"', 'The canvas fills the viewport, hiding the header and legend; the button becomes "Exit full screen"'],
          ['Press Escape', 'Full screen closes'],
          ['Click "Reset the view"', 'The viewport returns to its initial position'],
        ],
      },
      {
        name: 'Drill from a host to a pod',
        description: 'Host boxes open the pods drawer scoped to this region.',
        steps: [
          ['Click a Host box on the canvas', 'A right drawer opens titled with the host name and "Pods this host runs inside your region."'],
          ['Read the drawer', 'Info "Click a pod to open its full detail." above a table with Pod, When, Club, Price, Spots and Status (Live/Off)'],
          ['Search "Search pod name or id"', 'The pods table filters'],
          ['For a host with no pods here', '"This host has no pods in your region yet."'],
          ['Click a pod row', 'The browser opens /pods/<podId>'],
        ],
      },
      {
        name: 'Drill from a Club Admin box',
        description: 'Club Admin boxes open their clubs.',
        steps: [
          ['Click a Club Admin box', 'The drawer opens with "The clubs this Club Admin runs in your region." and Club, City, Locality, Pods and Status (Active/Inactive)'],
          ['Click a club row', 'The drawer shows the club pods with "Every pod this club has held." and a back button labelled with the Club Admin name'],
          ['Click the back button', 'The drawer returns to the clubs list'],
          ['Click Close', 'The drawer closes'],
          ['Click a City or Locality box', 'Nothing opens; those boxes are read-only'],
        ],
      },
    ],
  },
  {
    name: 'Regional Club Admin: Club Admins',
    description: 'The /club-admins page is the only place a region is edited: rename it, add and remove Club Admins, and drill into clubs and pods.',
    sub_flows: [
      {
        name: 'Rename the region',
        description: 'Save is enabled only for a changed, non-empty name.',
        steps: [
          ['Open /club-admins', 'Title "Club Admins", the region card with Region name, Save, the region number chip and "<n> Club Admin(s)"'],
          ['Look at Save with the name unchanged', 'Save is disabled'],
          ['Change the Region name and click Save', 'The button reads Saving… then the name persists; the canvas title shows the new name'],
          ['Clear the name', 'Save stays disabled'],
        ],
      },
      {
        name: 'Add a Club Admin to the region',
        description: 'Only Club Admins not in a region are offered.',
        steps: [
          ['Click "Add Club Admin" in the table toolbar', 'A dialog "Add Club Admin" opens with "Search Club Admins" and the hint "Only Club Admins who are not already in a region are offered."'],
          ['Look at the Add button', 'Disabled until a person is picked'],
          ['Search a name that matches nobody', '"No Club Admin matches that search."'],
          ['Pick a Club Admin and click Add', 'The dialog closes; the table and member count refresh and the new row lists their clubs'],
          ['Add a person already in another region via the API', 'The dialog shows "Already in the region "<name>""'],
          ['Add a user without the CLUB_ADMIN role via the API', 'Error "That person does not hold the Club Admin role"'],
        ],
      },
      {
        name: 'Remove a Club Admin from the region',
        description: 'Removing changes only the manager view.',
        steps: [
          ['Click the delete action "Remove from region" on a row', 'A destructive confirm "Remove from region" says "<name> will leave this region. Their clubs, hosts and pods are untouched — only your view of them changes."'],
          ['Click Cancel', 'The row stays'],
          ['Confirm "Remove"', 'The row disappears, the member count drops and the canvas no longer draws their branch'],
        ],
      },
      {
        name: 'Browse members and drill into clubs',
        description: 'The same drawer as the canvas.',
        steps: [
          ['Read the table', 'Columns Club Admin (name over email), Clubs chips ("No clubs assigned yet" in warning colour when none) and Clubs count; hint "Click a Club Admin to open their clubs, then a club to open its pods."'],
          ['Search "Search name, email or club"', 'Matching members remain'],
          ['Click a member row', 'The drawer opens on their clubs; with none it reads "This Club Admin runs no clubs yet."'],
          ['Open a club, then a pod', 'The browser navigates to /pods/<podId>'],
          ['With an empty region', 'The table shows "No Club Admins in this region yet."'],
        ],
      },
    ],
  },
  {
    name: 'Regional Club Admin: Pod Detail',
    description: 'The /pods/:id page is the admin pod detail at REGIONAL scope: read-only, no edit actions, and forbidden outside the manager region.',
    sub_flows: [
      {
        name: 'Open a pod in the region',
        description: 'Read-only pod detail.',
        steps: [
          ['Open a pod from either drill-down', '/pods/<podId> renders the pod detail with a back link "Club Admins"'],
          ['Look for edit or action buttons', 'No pod actions or banner are offered; the page only reads'],
          ['Click the back link', 'The browser returns to /club-admins'],
        ],
      },
      {
        name: 'Pod outside the region is forbidden',
        description: 'Region-scoped queries gate on membership.',
        steps: [
          ['Open /pods/<id of a pod whose club admin is not in this region>', 'The pod sections fail with "Access Denied" and no pod data is shown'],
          ['Open an unknown path such as /anything', 'The browser redirects to /'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Access & Brief',
    description:
      'pods.duncit.com admits ALL_PODS_ACCESS. The / brief shows Total, Upcoming, Running now and Completed tiles; the sidebar Pods group holds nine entries.',
    sub_flows: [
      {
        name: 'Brief tiles open the list by lifecycle',
        description: 'Each tile links to /pods already filtered by lifecycle.',
        steps: [
          ['Sign in to the Pods portal with ALL_PODS_ACCESS', 'The sidebar shows Dashboard and a Pods group with Dashboard, All Pods, Auto Pods, Change Requests, Pod Ideas, Pod Plans, Event Tickets, Pod Settings and Pod Monitoring (AI)'],
          ['Open /', 'Title "Pods" with "Every pod on Duncit — upcoming, running, and the ones already settled." and tiles Total, Upcoming, Running now, Completed'],
          ['Click Upcoming', 'The browser opens /pods?lifecycle=UPCOMING'],
          ['Go back and click Running now', 'The browser opens /pods?lifecycle=ONGOING'],
          ['Go back and click Total', 'The browser opens /pods'],
        ],
      },
      {
        name: 'Account without ALL_PODS_ACCESS',
        description: 'The portal gate.',
        steps: [
          ['Sign in to pods.duncit.com with an account lacking ALL_PODS_ACCESS', 'Access to the console is refused'],
          ['Open an unknown path such as /nowhere after signing in with access', 'The browser redirects to /'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pods Dashboard',
    description: 'The /pods/dashboard page: live count tiles, a creation trend, ratings, best-rated, needs-attention and starting-next lists over a chosen reporting period.',
    sub_flows: [
      {
        name: 'Read the dashboard for a period',
        description: 'Money, ratings and trend follow the period toggle; counts are live.',
        steps: [
          ['Open /pods/dashboard', 'Header "Pods dashboard" with "Counts are live. Money, ratings and the trend cover the selected period." and a Reporting period toggle'],
          ['Look at the tiles', 'All pods, Upcoming, Later today, Completed, Awaiting venue, Cancelled, Seats filled (with "<n> of <m> spots"), Collected (with "<n> payments"), Average payment and Rated'],
          ['Pick a different reporting period', 'The query reruns; Collected, Average payment, Rated and the trend update while count tiles stay live'],
          ['Click the All pods tile', 'The browser opens /pods'],
          ['Look at Best rated', '"Highest scoring pods, all time" with rated pods, or "No pod has been rated yet."'],
          ['Look at Needs attention', '"Rated below four — look at these first", or "Nothing is scoring badly."'],
          ['Look at Starting next', '"The pods coming up, with seats sold", or "No upcoming pods."'],
          ['Click a pod in any list', 'The browser opens /pods/<podId>'],
        ],
      },
      {
        name: 'Rearrange dashboard widgets',
        description: 'Widgets sit on the shared dashboard grid.',
        steps: [
          ['Drag the Needs attention widget by its grip above Best rated', 'The widget moves and the layout reflows'],
          ['Reload /pods/dashboard', 'The rearranged layout is kept for this viewer'],
        ],
      },
      {
        name: 'Dashboard query error',
        description: 'Errors surface under the header.',
        steps: [
          ['Open /pods/dashboard while podDashboard fails', 'An error Alert shows the message under the header'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: All Pods',
    description: 'The /pods table: status and club filters, Include cancelled, New Pod, row actions (complete, quick edit, edit, delete) and the AI Monitoring pill.',
    sub_flows: [
      {
        name: 'Browse and filter pods',
        description: 'Filters outside the table reload it.',
        steps: [
          ['Open /pods', 'Heading "Pods" with "Events organised inside a club. Hosts are attendees by default.", a Status select, a Club select ("All clubs") and the table sorted by Date / Time, newest first'],
          ['Check the columns', 'Cover, Title (with pod ID), Club, Venue, Date / Time, Type, Amount ("Free" or ₹), Spots, Attendance, Hits, Status, AI Monitoring and Actions; Products appears only when products are visible'],
          ['Pick Status "Upcoming"', 'Only upcoming pods remain'],
          ['Pick a club in the Club select', 'The URL gains ?club_id=<id> and only that club pods remain'],
          ['Search "Search title or pod ID"', 'Only matching pods remain'],
          ['Turn on "Include cancelled"', 'Cancelled pods appear with a red "Cancelled" status chip'],
          ['With nothing matching', '"No pods yet."'],
        ],
      },
      {
        name: 'Status chips and at-risk rows',
        description: 'The status cell names the reason; at-risk rows are tinted red.',
        steps: [
          ['Find a pod whose bookings cannot cover the venue cost inside the risk window', 'The whole row is tinted red and Status reads "Cancellation risk"'],
          ['Find a pod waiting on the venue', 'Status reads "Awaiting venue"'],
          ['Find a pod the venue declined', 'Status reads "Venue rejected"'],
          ['Find a completed pod', 'Status reads "Completed"'],
          ['Find an inactive pod', 'Status reads "Draft"'],
          ['Look at a cancelled row actions', 'Complete and Delete icons are hidden; Quick edit and Edit remain'],
        ],
      },
      {
        name: 'Start a new pod and choose its kind',
        description: 'New Pod asks Normal or Auto when the auto_pods flag is on.',
        steps: [
          ['With auto_pods on, click "New Pod"', 'A dialog "What kind of pod?" offers Normal Pod and Auto Pod'],
          ['Pick Normal Pod', 'The browser opens /pods/new (keeping ?club_id= when a club was filtered)'],
          ['Back on /pods, click "New Pod" and pick Auto Pod', 'The browser opens /auto-pods/new'],
          ['With auto_pods off, click "New Pod"', 'No chooser; the browser opens /pods/new directly'],
        ],
      },
      {
        name: 'Quick edit a pod',
        description: 'Name, description and images only.',
        steps: [
          ['Click the Quick edit icon (tooltip "Quick edit (name, description, images)") on a row', 'Dialog "Quick edit pod" opens with Club and Place shown read-only'],
          ['Change the title and description and add an image', 'The fields update'],
          ['Save', 'The dialog closes, "Saved" toast shows and the row shows the new title'],
          ['Save text that breaks the content rules', 'The dialog shows which rule and field were refused and stays open'],
        ],
      },
      {
        name: 'Delete a pod',
        description: 'Confirm, then deletePod (SUPER_ADMIN, CITY_ADMIN or ZONAL_ADMIN on the server).',
        steps: [
          ['Click the Delete icon on a live pod', 'A destructive confirm "Delete pod" asks Delete pod "<title>"?'],
          ['Cancel', 'The pod remains'],
          ['Delete again and confirm', 'A "Deleted" snackbar shows and the table reloads without it'],
          ['Confirm delete as an ALL_PODS_ACCESS-only user', 'An error notification shows "Access Denied"'],
        ],
      },
      {
        name: 'Open the AI activity for a pod',
        description: 'The pill opens the pod audit trail without navigating.',
        steps: [
          ['Click the AI Monitoring pill on a row', 'Dialog "Activity · <title>" opens; the page does not navigate'],
          ['Read an entry', 'An action chip, the actor, a source chip, an AI risk chip, field changes "field: old → new", the note, "AI: <summary>" and the time'],
          ['Open the pill for a pod with no audit entries', '"No recorded activity for this pod yet."'],
          ['Click Close', 'The dialog closes'],
          ['Click the row itself', 'The browser opens /pods/<podId>'],
        ],
      },
      {
        name: 'Legacy edit bookmark',
        description: 'Old links redirect to the editor page.',
        steps: [
          ['Open /pods?edit=<podId>', 'The browser is redirected to /pods/<podId>/edit'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Complete a Pod',
    description: 'The Complete this pod dialog on /pods: choose the payout host, enter the venue bill, add party media, preview the settlement and release payouts.',
    sub_flows: [
      {
        name: 'Complete a venue pod and release payouts',
        description: 'Creates HOST, VENUE, CLUB_ADMIN and product payout releases.',
        steps: [
          ['Click the Complete icon (tooltip "Complete this pod") on an ended pod with scanned attendance', 'Dialog "Complete this pod" opens with the pod title, Host select, Venue bill amount, Party photos & videos, a settlement preview and Notes'],
          ['Pick the host and enter a Venue bill amount', 'The settlement preview recalculates for that host and bill'],
          ['Add a party photo via "Add media"', 'The media list shows the file'],
          ['Click "Complete pod"', 'The button reads "Completing…", then the dialog closes with the toast "Pod completion submitted for approval"'],
          ['Read the follow-up dialog', '"Pod completed — payouts released" lists Host payout, Venue payout, Club admin payout and Product sales payout amounts with status and release id'],
          ['Click Done', 'The dialog closes and the pod row shows Completed'],
        ],
      },
      {
        name: 'Completion form validation',
        description: 'Zod rules in the dialog.',
        steps: [
          ['Open Complete on a venue pod and clear the host', '"Select host"'],
          ['Enter 0 in Venue bill amount and submit', '"Venue bill must be greater than 0"'],
          ['Enter letters in Venue bill amount', '"Enter a valid amount"'],
          ['Submit with no media', '"Upload at least one party photo or video"'],
          ['Enter more than 1000 characters in Notes', '"Notes must be 1000 characters or fewer"'],
          ['Open Complete on a virtual pod', 'No Venue bill amount field is shown'],
        ],
      },
      {
        name: 'Completion refused by the server',
        description: 'Attendance and double-submit guards.',
        steps: [
          ['Complete a pod that had bookings but no scanned attendance', 'The dialog shows "No attendance has been recorded for this pod. Scan each guest’s ticket before completing it — the payout is calculated from who attended."'],
          ['Complete a pod that already has a pending or approved release', 'The dialog shows "This pod has already been submitted for completion"'],
          ['Click Close', 'The dialog closes and nothing is released'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Editor',
    description: 'The /pods/new and /pods/:id/edit full-page pod form: accordion sections with live preview, AI fill, venue slot picker, meeting details for virtual pods and admin extras.',
    sub_flows: [
      {
        name: 'Create a physical pod on a venue slot',
        description: 'A normal pod saved and scheduled on Save.',
        steps: [
          ['Open /pods/new', 'Eyebrow "Admin · Pods", "Back to pods" and sections Basic Information, When, Where & Map, About this Pod, What This Pod Offers, Available Perks, Payment & Charges beside a member preview'],
          ['Use "Expand all"', 'All sections open; "Collapse all" becomes enabled'],
          ['Fill title, pick a club, choose Physical mode and pick a venue', 'The venue slot picker lists that venue free slots'],
          ['Pick an available slot and one host', 'The start date/time follows the slot'],
          ['Enter a description of at least 10 characters, price and spots, and add a cover image', 'The preview shows the title, price and cover'],
          ['Click Save', '"Saved" toast and the browser returns to /pods with the new pod listed'],
        ],
      },
      {
        name: 'Pod editor validation',
        description: 'Zod rules shared with every pod form.',
        steps: [
          ['On /pods/new click Save with only "ab" as title', '"Title is too short" and "Select a club"'],
          ['Leave Physical mode with no venue', '"Select a venue"'],
          ['Pick a venue but no slot and no date', '"Pick an available slot"'],
          ['Leave hosts empty', '"Add at least one host"; picking two shows "Select only one host"'],
          ['Set a start date in the past', '"Start date/time must be after current date/time"'],
          ['Set the end before the start', '"End must be after start"'],
          ['Enter a short description', '"Add a longer description"'],
          ['Enter 2500 as the amount', '"Amount cannot exceed 1999"; -5 shows "Amount cannot be negative"'],
          ['Make a FREE pod with amount 50', '"Free pods must have amount 0"'],
          ['Remove every image', '"At least one image is required"'],
        ],
      },
      {
        name: 'Create a virtual pod with a meeting link',
        description: 'Virtual pods need an end time and a valid meeting URL.',
        steps: [
          ['On /pods/new switch mode to Virtual', 'When, Where & Map is replaced by Meeting Details'],
          ['Save without a meeting link', '"Meeting link is required"'],
          ['Enter "zoom-meeting" as the link', '"Meeting link must be a valid http(s) URL"'],
          ['Leave the end date empty', '"End date/time is required for a virtual pod"'],
          ['Add a product while Virtual', '"A virtual pod cannot carry products"'],
          ['Pick a platform, generate or paste a valid link, set start and end and Save', '"Saved" and the pod is listed with its meeting platform in the Venue column'],
        ],
      },
      {
        name: 'Save a pod as draft and edit it later',
        description: 'Draft is offered on create only.',
        steps: [
          ['On /pods/new fill a title and click "Save as Draft"', '"Draft saved" and the pod appears with a Draft status'],
          ['Open /pods/<id>/edit for it', 'The footer shows Cancel and Save; "Save as Draft" is hidden when editing'],
          ['Change the price and Save', '"Saved" and the browser returns to /pods'],
          ['Open /pods/000000000000000000000000/edit', '"Pod not found."'],
        ],
      },
      {
        name: 'Multi-ticket discount tiers',
        description: 'Tier rules capped by the admin setting.',
        steps: [
          ['On a paid pod open Multi-ticket discount and turn on "Offer a discount when one person books multiple tickets"', 'The base row "1 ticket · 0% (full price)" and "Add tier" appear'],
          ['Save with no tiers', '"Add at least one discount tier"'],
          ['Add a tier with 1 ticket', '"Tickets must be a whole number of at least 2"'],
          ['Add a second tier with fewer tickets than the first', '"Needs more tickets than the row above"'],
          ['Set a discount above the configured maximum', '"Discount can’t be more than <max>%"'],
        ],
      },
      {
        name: 'AI fill the pod form',
        description: 'AI fill proposes content from the approved lists.',
        steps: [
          ['On /pods/new click the AI fill button', 'Title, description, offers and perks are filled; club, venue and host are only set from real approved records'],
          ['Review and Save', 'Validation runs as for a hand-filled pod'],
        ],
      },
      {
        name: 'Server-side pod guards',
        description: 'Rules the server enforces beyond the form.',
        steps: [
          ['Save a FREE physical pod', '"Physical pods must be paid — free pods are only available for virtual pods"'],
          ['Save a pod on a slot another pod just booked', '"Selected slot is no longer available"'],
          ['Save on a date the venue marked as leave', '"The venue is on leave on this date. Pick another slot."'],
          ['Add more of a product than stock allows', '"Not enough inventory for <product>"'],
          ['Move a completed pod to another slot', '"A completed pod cannot be moved to another venue slot"'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Details',
    description: 'The /pods/:id page: status chips, Edit pod, cancellation-risk report, overview, timeline, hosts, club, club admins, finance, ratings, attendees, payments, offer codes and Revoke cancellation.',
    sub_flows: [
      {
        name: 'Read a pod record',
        description: 'Two columns then full-width tables.',
        steps: [
          ['Open /pods/<podId>', 'A back link, the pod title with status chips and an "Edit pod" button'],
          ['Read the left column', 'Overview card and Timeline'],
          ['Read the right column', 'Hosts, Club, Club Admins, Finance and Ratings cards'],
          ['Scroll to the tables', 'Attendees (read-only, no mark-present link) and Payments & transactions'],
          ['Click "Edit pod"', 'The browser opens /pods/<podId>/edit'],
          ['Open /pods/000000000000000000000000', '"Pod not found."'],
        ],
      },
      {
        name: 'Cancellation risk report',
        description: 'Shown only while the pod is at risk.',
        steps: [
          ['Open an at-risk pod', 'A "Cancellation risk" section with a red chip leads the page'],
          ['Read the lead', '"This pod will be cancelled automatically on <date> unless its bookings cover the venue cost by then…" and hours until start'],
          ['Read Finance — why it is negative', 'The money waterfall ends below zero with "Short by" the shortfall'],
          ['Read Attendees — what would close the gap', 'Seats booked, Seats still open, Ticket price per spot and "Bookings needed"'],
          ['Read How to fix it and Alerts', 'Fix options (share, cheaper slot, raise price, cancel now) and alert rounds sent or "The host and club admins have not been alerted yet; the next sweep sends the first alert."'],
          ['Open a healthy pod', 'No risk section renders'],
        ],
      },
      {
        name: 'Manage offer codes on a pod',
        description: 'Coupons locked to this pod.',
        steps: [
          ['On /pods/<podId> scroll to "Offer codes"', 'A coupons table of global and pod-scoped codes with "New offer code"'],
          ['Click "New offer code", fill the coupon and save', '"Coupon created" and the code is listed, locked to this pod'],
          ['Edit the code and save', '"Coupon updated"'],
          ['Delete the code and confirm "Delete coupon"', '"Coupon deleted" and the row disappears'],
        ],
      },
      {
        name: 'Revoke a cancellation before the pod starts',
        description: 'Admin-only; prices the refunds before confirming.',
        steps: [
          ['Open a cancelled pod whose start is still ahead', 'An enabled "Revoke cancellation" button sits beside Edit pod'],
          ['Click "Revoke cancellation"', 'Dialog "Revoke this cancellation?" says the pod becomes visible again and takes back its venue slot and stock'],
          ['Read the refund ledger', 'Each refund marked Paid back or Scheduled, with the loss total and the scheduled total; or "Nobody was refunded for this pod, so revoking costs nothing."'],
          ['Click "Keep it cancelled"', 'The dialog closes and nothing changes'],
          ['Confirm "Revoke cancellation"', '"Cancellation revoked — the pod is visible again." and the status chips and timeline refresh'],
        ],
      },
      {
        name: 'Revoke blocked after the start time',
        description: 'The button is disabled with a reason.',
        steps: [
          ['Open a cancelled pod whose start has passed', '"Revoke cancellation" is disabled'],
          ['Hover the disabled button', 'Tooltip: "This pod started on <when>. A cancellation can only be revoked before the pod date and time."'],
          ['Call revokePodCancellation on it', 'Server error "This pod already started — a cancellation can only be revoked before the pod date and time."'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Auto Pods',
    description: 'The /auto-pods list (auto_pods flag): stage filter, New Auto Pod, dependency dots, and a row menu with View details, Edit, Activate/Deactivate, Open pod, Cancel and Delete.',
    sub_flows: [
      {
        name: 'Browse auto pods by stage',
        description: 'The status filter lives in ?status=.',
        steps: [
          ['Open /auto-pods', 'Title "Auto Pods" with "Pods the marketplace completes: a venue, a host and a club admin each enrol, in any order."'],
          ['Check the columns', 'Auto Pod, Title, Category, Mode, Pod dependency (venue/host/club dots), Stage, Status (Active/Inactive), Created, Updated, Actions'],
          ['Pick "Enrolling" in the Status filter', 'The URL gains ?status=CLAIMING and only enrolling offers remain'],
          ['Reload', 'The filter is still applied'],
          ['Filter Pod dependency to "Host pending"', 'Only offers still waiting on a host remain'],
          ['Click a green venue dot', 'A "Venue details" dialog shows owner, email, phone, address, capacity, slot and slot price'],
        ],
      },
      {
        name: 'Pause and resume an auto pod',
        description: 'Only while partners can still enrol.',
        steps: [
          ['Open the row menu (More actions) on an Open offer and click Deactivate', '"Auto Pod paused — it is shown to nobody until you activate it." and Status reads Inactive'],
          ['Open the menu again and click Activate', '"Auto Pod is active again — partners still missing are told."'],
          ['Open the menu on a Live offer', 'Edit, Activate/Deactivate and Cancel are disabled; Open pod is shown'],
        ],
      },
      {
        name: 'Cancel an auto pod with a reason',
        description: 'Keeps the record for the books.',
        steps: [
          ['Click "Cancel Auto Pod" in the row menu of an enrolling offer', 'Confirm "Cancel this Auto Pod?" with "Everyone who enrolled is told, and the venue gets its slot back. This cannot be undone." and "Reason (optional)"'],
          ['Type a reason and confirm', '"Auto Pod cancelled." and the Stage reads Cancelled'],
          ['Open its details page', 'The summary shows the Cancel reason'],
        ],
      },
      {
        name: 'Delete an auto pod',
        description: 'Removed for good; not allowed while live or materializing.',
        steps: [
          ['Click "Delete Auto Pod" on an expired offer', 'Confirm "Delete this Auto Pod?" explains the record is removed and enrolled partners are told'],
          ['Confirm', '"Auto Pod deleted." and the row disappears'],
          ['Open the menu on a Live offer', '"Delete Auto Pod" is disabled'],
        ],
      },
      {
        name: 'Auto pods hidden with the flag off',
        description: 'The auto_pods feature flag gates every route.',
        steps: [
          ['Turn the auto_pods flag off and open /auto-pods', 'The route renders nothing'],
          ['Open /auto-pods/new', 'Nothing renders'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Auto Pod Editor & Details',
    description: 'The /auto-pods/new and /auto-pods/:id/edit three-step stepper (Pod category, Pod details, Review & roll out) and the /auto-pods/:id details page.',
    sub_flows: [
      {
        name: 'Roll out a new auto pod',
        description: 'Category with audience counts, details, review.',
        steps: [
          ['Click "New Auto Pod" on /auto-pods', '/auto-pods/new opens on step "Pod category" with "Who can enrol" counts for Venues, Hosts and Club admins'],
          ['Pick a sub-category whose counts are all above zero and click Next', 'Step "Pod details" opens with "Where the pod happens" (physical or virtual)'],
          ['Enter a title, description and an image and click Next', 'Step "Review & roll out" reads everything back with "Rolling out sends this offer to every venue, host and club admin in the category."'],
          ['Click "Roll out Auto Pod"', '"Auto Pod opened — venues, hosts and club admins can now enrol." and the browser returns to /auto-pods'],
        ],
      },
      {
        name: 'Stepper validation and blocked audience',
        description: 'A category with nobody to enrol cannot roll out.',
        steps: [
          ['On step 1 click Next without a category', '"Select a category" and "Fix the highlighted fields before continuing."'],
          ['Pick a category with no club admins', '"This category has no club admins yet — the pod could never go live. Pick another category, or onboard partners first."'],
          ['Click the Hosts count', 'A drawer "Hosts in this category" lists Name, Email and Phone, or "Nobody yet."'],
          ['On step 2 remove every image and click Next', '"At least one image is required"'],
        ],
      },
      {
        name: 'Edit an auto pod after an enrolment',
        description: 'Category locks once a host or club enrols.',
        steps: [
          ['Open /auto-pods/<id>/edit for an offer a host already enrolled on', 'The category shows "Locked — a host or club has already enrolled on this category."'],
          ['Change the description and click "Save changes"', '"Auto Pod updated." and the browser returns to /auto-pods'],
          ['Save after someone else changed the offer', '"This Auto Pod changed while you were editing it — refresh and try again"'],
        ],
      },
      {
        name: 'Read the auto pod details page',
        description: 'Stage, enrolment cards and template summary.',
        steps: [
          ['Click a row on /auto-pods', '/auto-pods/<id> opens with "Back to Auto Pods", the title, auto pod number, stage chip and Active/Inactive chip'],
          ['Read the enrolment cards', 'Venue, Host and Club Admin cards each show who enrolled with "Enrolled: <date>" or a pending chip, and "<n> eligible"'],
          ['Open a virtual offer', 'The Venue card reads "Not needed — a virtual pod has no venue."'],
          ['Click the open button on an enrolled Host card', '"Host details" dialog shows name, email, phone and address'],
          ['Read "Pod details"', 'Description, Pod info, Hashtags, Images & videos "<n> file(s)", offers, perks and Meeting ("Set by the host when they assign themselves.")'],
          ['For a live offer click "Open pod"', 'The browser opens /pods/<podId>'],
          ['Open /auto-pods/000000000000000000000000', '"This Auto Pod no longer exists."'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Change Requests',
    description: 'The /pods/change-requests queues (Venue, Host, Club Admin tabs): find a replacement and send an offer, or cancel the pod and refund everyone.',
    sub_flows: [
      {
        name: 'Browse change request queues',
        description: 'Tabs are kept in ?selectedtab=.',
        steps: [
          ['Open /pods/change-requests', 'Header "Change Requests" with its subtitle and tabs Venue, Host, Club Admin'],
          ['Read the Venue queue columns', 'Request ID, Pod, Requested by, Requested, Attendees, Status and actions'],
          ['Click the Host tab', 'The URL gains ?selectedtab=host and host requests load'],
          ['Search "Search by request ID or reason"', 'Matching requests remain'],
          ['With an empty queue', '"No change requests in this queue."'],
        ],
      },
      {
        name: 'Offer a venue replacement with a slot',
        description: 'Venue requests pick a venue then a slot.',
        steps: [
          ['On the Venue tab click "Assign a different venue" on an open request', 'Drawer "Find a replacement" opens with the request number, pod title, the venue hint and the partner reason'],
          ['Click Slot on a candidate venue card', 'The drawer shows "Pick a slot at <venue>" with free slots, price and capacity'],
          ['Click "Back to the list"', 'The candidate list returns'],
          ['Pick the venue again and click "Send request" on a slot', 'The drawer closes with "Request sent. They will get an email, a WhatsApp message and an app notification."'],
          ['Look at the row', 'Status reads "Offered — waiting on a partner" and the assign action is disabled with tooltip "Waiting on <name>. You can act again once they approve or pass."'],
        ],
      },
      {
        name: 'Offer a host or club admin replacement',
        description: 'One click sends the offer.',
        steps: [
          ['On the Host tab click "Assign a different host"', 'The drawer lists approved hosts in the pod category with phone and email'],
          ['Click "Send request" on a host', 'The offer is sent and the snackbar confirms'],
          ['On the Club Admin tab open a request whose category has no candidates', '"Nobody matches this pod’s category and city yet. Onboard a partner, or cancel the pod and refund everyone."'],
          ['Pick a venue with no free slots', '"This venue has no free slots. Pick a different venue."'],
          ['Send a slot that was just taken', 'The drawer shows "That slot is no longer available. Pick another one."'],
        ],
      },
      {
        name: 'Cancel the pod and refund everyone',
        description: 'Destructive, needs a reason of 5+ characters.',
        steps: [
          ['Click the cancel action (tooltip explains Finance returns the money) on an open request', 'Dialog "Cancel the pod and refund everyone?" with the pod title and attendee count'],
          ['Type "no" in "Why is Duncit cancelling this pod?" and click "Cancel pod and refund"', '"Say why the pod is being cancelled (at least 5 characters)." and nothing is sent'],
          ['Type a proper reason and confirm', '"Pod cancelled. Every attendee’s payment is marked refunded." and the row shows the pod as cancelled'],
          ['Look at a resolved or withdrawn request', 'Both assign and cancel actions are disabled'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Ideas',
    description: 'The /pod-ideas moderation table: view details and comments, approve, reject, reset to pending, delete ideas and comments.',
    sub_flows: [
      {
        name: 'Review and approve an idea',
        description: 'Status moves between PENDING, APPROVED and REJECTED.',
        steps: [
          ['Open /pod-ideas', 'Title "Pod Ideas" and a table with Idea, Author, Engagement (likes, comments, shares), Status, Created and actions; search "Search title or description"'],
          ['Click the view action on a pending idea', 'A details dialog shows the author, description, likes/comments/shares counts and comments'],
          ['Click Approve', 'The status chip turns Approved and the Approve button disappears'],
          ['Click "Reset to Pending"', 'The status returns to Pending'],
          ['Click Reject from the table row', 'The snackbar shows "Marked rejected"'],
        ],
      },
      {
        name: 'Delete a comment on an idea',
        description: 'Confirmed, permanent.',
        steps: [
          ['Open an idea with comments and click a comment delete icon', 'Dialog "Delete this comment?" says it cannot be undone'],
          ['Confirm Delete', 'The button reads "Deleting…", then the comment disappears and the count refreshes'],
          ['Open an idea with no comments', '"No comments yet."'],
        ],
      },
      {
        name: 'Delete an idea',
        description: 'Removes the idea and all its comments.',
        steps: [
          ['Click the delete action on a row', 'Dialog "Delete idea?" says it will permanently delete the idea along with all its comments'],
          ['Click Cancel', 'The idea remains'],
          ['Delete again and confirm', '"Deleted" snackbar and the row disappears'],
          ['With filters matching nothing', '"No pod ideas match the current filters."'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Plans',
    description: 'The /pod-plans table of plan tiers shown in mWeb (behind the pod_plans_section flag), with create, edit and delete.',
    sub_flows: [
      {
        name: 'Create a plan',
        description: 'New plan dialog with Zod validation.',
        steps: [
          ['Open /pod-plans', 'Title "Pod Plans" with the pod_plans_section note and a table with Name, Key, Price label, Features, Status and Coming soon'],
          ['Click "New plan"', 'Dialog "New plan" with Key, Display name, Description, Image URL, Features (one per line), Price label, Sort order, Coming soon and Active'],
          ['Enter key "premium", name "Premium", two feature lines and sort order 1', 'The fields accept the values'],
          ['Click "Create plan"', '"Plan created" and the plan is listed'],
        ],
      },
      {
        name: 'Plan form validation',
        description: 'Key, name, URL and sort order rules.',
        steps: [
          ['Enter "Premium Plan!" as Key', '"Key may contain lowercase letters, digits, dashes and underscores"'],
          ['Clear Display name', '"Name is required"'],
          ['Enter "not a url" in Image URL', '"Image URL must be a valid http(s) URL"'],
          ['Enter 1000 in Sort order', '"Sort order must be 999 or fewer"; -1 shows "Sort order must be 0 or greater"'],
        ],
      },
      {
        name: 'Edit and delete a plan',
        description: 'Key is fixed after creation.',
        steps: [
          ['Click edit on a plan', 'Dialog "Edit plan" opens with Key disabled'],
          ['Toggle Coming soon and click "Save changes"', '"Plan updated" and the Coming soon column updates'],
          ['Click delete and confirm "Delete plan"', '"Plan deleted" and the row disappears'],
          ['With no plans', 'No plans yet. Click "New plan" to create one.'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Event Tickets',
    description: 'The /event-tickets page: QR token verify and check-in, the tickets table with download and check-in, and the group companions form.',
    sub_flows: [
      {
        name: 'Verify and check in by QR token',
        description: 'Check in unlocks only after a valid verify.',
        steps: [
          ['Open /event-tickets', 'Title "Event Tickets" with "Issued tickets, QR check-in and downloads." and a "Check-in by QR" card'],
          ['Look at the buttons with an empty token', 'Verify and Check in are disabled'],
          ['Paste a scanned token and click Verify', 'A success Alert "Valid ticket"; Check in becomes enabled'],
          ['Click "Check in"', '"Checked in" toast; the token clears and the ticket row shows checked in'],
          ['Verify a tampered token', 'Error Alert "Invalid or tampered QR code" and Check in stays disabled'],
          ['Verify a cancelled ticket token', 'Error Alert "Ticket cancelled"'],
          ['Verify an already used token', 'Success Alert "Already checked in at <time>"'],
        ],
      },
      {
        name: 'Check in from the tickets table',
        description: 'Row actions per ticket.',
        steps: [
          ['Read the table', 'Ticket, Event, Attendee, When, Status, Checked in, Created and actions; search "Search code, attendee or event"'],
          ['Click "Check in" on a VALID single-seat ticket', '"Checked in <code>" and the row updates'],
          ['Look at a CHECKED_IN ticket', 'The check-in action is disabled with tooltip "Checked in"'],
          ['Click "Download ticket"', 'A PDF named ticket-<code>.pdf downloads'],
          ['With no tickets', '"No tickets yet."'],
        ],
      },
      {
        name: 'Check in a group ticket with companions',
        description: 'COMPANIONS_REQUIRED opens the form.',
        steps: [
          ['Click "Check in" on a ticket that admits 3 seats with no companions recorded', 'Dialog "Who else is coming in?" says the ticket admits more than one person and asks for the other 2'],
          ['Submit with a one-letter name', '"Enter the name" under that person'],
          ['Enter "12ab" as a phone', 'The phone field shows an error; 6-15 digits are required'],
          ['Fill every name and a valid phone for each and submit', '"Checked in <code>" and the dialog closes'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Settings',
    description: 'The /pod-settings page: lifecycle, reminder, Auto Pods and Request Change cards. Number cards save individually; toggle cards save on flip.',
    sub_flows: [
      {
        name: 'Change a numeric setting',
        description: 'Save enables only for a valid, changed value.',
        steps: [
          ['Open /pod-settings', 'Title "Pod Settings" with "Platform-level defaults for the Create-a-Pod flow." and cards grouped by lifecycle, reminders, Auto Pods and Request Change Setting'],
          ['Look at "Draft Pod Retention Period (Days)" Save', 'Disabled while the value is unchanged'],
          ['Change it to 5 and click Save', 'The button reads "Saving…", then "Pod settings saved" and the value persists after reload'],
          ['Enter 0', 'Warning "Enter a whole number of 1 or more." and Save disabled'],
          ['Clear the Account Health Penalty box', 'Warning "Enter a whole number of 0 or more." and Save disabled'],
          ['Enter 200 in "Max multi-ticket discount (%)"', 'Warning "Enter a whole number between 1 and 99."'],
          ['Enter 9000 in "Cancellation Risk Window (Hours)"', 'Warning "Enter a whole number between 1 and 8760."'],
        ],
      },
      {
        name: 'Flip the attendance OTP requirement',
        description: 'Toggles save immediately.',
        steps: [
          ['Find "OTP Verification Before Marking Attendance"', 'The caption reads the current state, e.g. "On — the host verifies the attendee’s number before the Mark Attendance button unlocks."'],
          ['Turn the switch off', 'The switch disables while saving, then "Pod settings saved"; caption "Off — the host can mark an attendee present without verifying their number."'],
          ['Flip it while the save fails', 'The switch snaps back and an error Alert shows the message'],
        ],
      },
      {
        name: 'Auto-cancel and refund hold settings',
        description: 'The loss-making pod sweep.',
        steps: [
          ['Turn on "Auto-Cancel Finance-Negative Pods"', 'Caption "On — loss-making pods inside their venue’s cancellation trigger are cancelled and refunded automatically."'],
          ['Set "Auto-Cancel Lead Window (Hours)" to 24 and Save', '"Pod settings saved"'],
          ['Set "Cancellation Risk Alerts (Every N Hours)" to 200', 'Warning "Enter a whole number between 1 and 168."'],
          ['Turn on "Hold cancellation refunds until the pod starts"', 'Caption says a cancellation schedules its refunds for the pod start'],
        ],
      },
      {
        name: 'Auto Pods and Request Change settings',
        description: 'Bounded windows and penalties.',
        steps: [
          ['Enter 90 in "Auto Pods — slot window"', 'Warning "Enter a whole number between 1 and 60."'],
          ['Enter 800 in "Auto Pods — assignment window"', 'Warning "Enter a whole number between 1 and 720."'],
          ['Enter 11 in "Request Change — Host"', 'Warning "Enter a whole number between 0 and 10."'],
          ['Enter 3 in "Request Change — Venue" and Save', '"Pod settings saved" and 3 persists'],
        ],
      },
    ],
  },
  {
    name: 'Pods Portal: Pod Monitoring (AI)',
    description: 'The /pod-monitoring audit table of every pod edit, status change and critical action, risk-scored by AI.',
    sub_flows: [
      {
        name: 'Browse and open audit entries',
        description: 'Rows open an audit detail dialog.',
        steps: [
          ['Open /pod-monitoring', 'Title "Pod Monitoring (AI)" with "Every pod edit, status change and critical action — risk-scored by AI for auditability."'],
          ['Read the columns', 'When, Pod, Action, By, Changes, AI Risk and AI Summary'],
          ['Search "Search pod, actor or AI summary"', 'Matching entries remain'],
          ['Click an entry row', 'An audit detail dialog opens for that entry'],
          ['With no audit data', '"No pod activity recorded yet."'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Portal Navigation & Product Flag',
    description:
      'onboarding.duncit.com admits ONBOARDING_MANAGER. The sidebar holds Dashboard, Surveys, a Meeting Schedule group and an Onboarding group; the e-commerce entries follow the is_product_visible system flag.',
    sub_flows: [
      {
        name: 'Sidebar lists every onboarding area',
        description: 'With the product flag on, all nav entries are present and route correctly.',
        steps: [
          ['Sign in to the Onboarding portal as an ONBOARDING_MANAGER with is_product_visible on', 'The shell loads with Dashboard, Surveys, Meeting Schedule and Onboarding in the sidebar'],
          ['Expand Meeting Schedule', 'Children: Calendar, Venue Meetings, Host Meetings, E-Commerce Brand Meetings, Club Admin Meetings, Meeting Availability'],
          ['Expand Onboarding', 'Children: Host Additional Requests, Onboarded Hosts, Onboarded Venues, Onboarded E-Commerce Brands, Onboarded Club Admins'],
          ['Click Host Meetings', 'The browser opens /meetings/host'],
          ['Click Onboarded Club Admins', 'The browser opens /club-admins'],
          ['Click Meeting Availability', 'The browser opens /meetings/availability'],
        ],
      },
      {
        name: 'Product flag off hides e-commerce',
        description: 'With is_product_visible off the brand console and brand meeting queue drop out of the sidebar and /ecomm-brands redirects home.',
        steps: [
          ['Turn is_product_visible off in admin settings, then sign in to the Onboarding portal', 'The portal loads normally'],
          ['Expand Meeting Schedule', 'E-Commerce Brand Meetings is not listed; Calendar, Venue, Host, Club Admin Meetings and Meeting Availability remain'],
          ['Expand Onboarding', 'Onboarded E-Commerce Brands is not listed'],
          ['Open /ecomm-brands directly', 'After the flag set resolves the browser is redirected to / and the Dashboard renders'],
          ['Turn the flag back on and open /ecomm-brands', 'The E-Commerce Brands page renders without a redirect'],
        ],
      },
      {
        name: 'Unknown route falls back to the dashboard',
        description: 'Any unmatched path redirects to /.',
        steps: [
          ['While signed in, open /does-not-exist', 'The browser is redirected to / and the Dashboard renders'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Dashboard',
    description:
      'The / overview: welcome header, KPI tiles, meeting schedule tiles, host/venue/brand status doughnuts, a 6-month onboarding trend and the account summary card, all from one OnboardingDashboard query.',
    sub_flows: [
      {
        name: 'Read the overview',
        description: 'Every widget renders from live data.',
        steps: [
          ['Open /', 'Heading "Welcome back, <first name>" with the tagline "Manage onboarding journeys, verification and approvals." and a chip per role, e.g. ONBOARDING MANAGER'],
          ['Look at the KPI strip', 'Tiles Total hosts, Total venues, Total brands, Total surveys, Pending review and Approved with numeric values'],
          ['Compare Pending review with the data', 'Pending review equals SUBMITTED hosts + venues + brands; Approved equals APPROVED hosts + venues + brands'],
          ['Look at the Meeting schedule widget', 'Cards "Venue meetings", "Host meetings" and "E-Commerce Brand meetings", each with a count and "View requests"'],
          ['Look at the status cards', '"Hosts by status", "Venues by status" and "E-Commerce brands by status" doughnuts with DRAFT, SUBMITTED, APPROVED, REJECTED legends, or "No host data yet." style text when empty'],
          ['Look at the trend widget', '"Onboarding trend (last 6 months)" with "Hosts, Venues, Brands and Club Admins by month." and a bar chart, or "No submissions in this period yet."'],
          ['Scroll to the bottom', 'The account summary card for the signed-in user is shown'],
        ],
      },
      {
        name: 'Tiles and cards open their lists',
        description: 'Clickable KPIs, meeting tiles and status cards deep-link into the portal.',
        steps: [
          ['Click the Total hosts tile', 'The browser opens /hosts'],
          ['Go back and click Total venues', 'The browser opens /venues'],
          ['Go back and click Total surveys', 'The browser opens /surveys'],
          ['Go back and click the Pending review tile', 'Nothing navigates; the cross-entity tiles have no link'],
          ['Click the Host meetings card', 'The browser opens /meetings/host?status=REQUESTED with the Requested toggle selected'],
          ['Go back and click the E-Commerce Brand meetings card', 'The browser opens /meetings/ecomm?status=REQUESTED'],
          ['Go back and click the Venues by status card', 'The browser opens /venues'],
        ],
      },
      {
        name: 'Dashboard with the product flag off',
        description: 'The brand segment is not asked for and not drawn.',
        steps: [
          ['Turn is_product_visible off and open /', 'The dashboard loads without an error'],
          ['Look at the KPI strip', 'Total brands is absent; Pending review and Approved count only hosts and venues'],
          ['Look at the Meeting schedule widget', 'Only Venue meetings and Host meetings cards are shown'],
          ['Look at the status cards', 'Hosts by status and Venues by status split the row; E-Commerce brands by status is absent'],
          ['Look at the trend chart legend', 'Hosts, Venues and Club Admins only; no Brands series'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Surveys Hub & Lists',
    description:
      'Surveys are grouped by audience (Venue, Host, E-Commerce Brand, Club Admin). Each kind lists its category-specific surveys; the kind-level default is reached through the Default Survey button.',
    sub_flows: [
      {
        name: 'Pick an audience from the hub',
        description: 'The /surveys hub shows one card per survey kind.',
        steps: [
          ['Open /surveys', 'Title "Surveys" with "Choose who a survey is for. Each type has its own category-specific surveys and a kind-level default."'],
          ['Look at the cards', 'Venue Surveys, Host Surveys, E-Commerce Brand Surveys and Club Admin Surveys, each with its subtitle (e.g. "Questions shown before a member becomes a host.")'],
          ['Click Venue Surveys', 'The browser opens /surveys/kind/venue'],
          ['Go back and click E-Commerce Brand Surveys', 'The browser opens /surveys/kind/seller'],
          ['Go back and click Club Admin Surveys', 'The browser opens /surveys/kind/club-admin'],
        ],
      },
      {
        name: 'Browse a kind survey list',
        description: 'The kind list shows only category-scoped surveys, never the kind default.',
        steps: [
          ['Open /surveys/kind/host', 'Back to Surveys button, title "Host Surveys", "Category-specific Host surveys shown before onboarding. Manage the fallback with Default Survey.", Default Survey and New survey buttons'],
          ['Look at the table', 'Columns Title, Scope, Questions, Active plus row actions; search placeholder "Search title"; the unscoped default survey is not listed'],
          ['Pick a Super category in the scope picker above the table', 'The table reloads showing only HOST surveys under that Super category'],
          ['Narrow further to a Category and Sub category', 'Only surveys on that exact slot remain; Scope reads "Super › Category › Sub"'],
          ['Type part of a title into the search', 'Rows filter to titles matching the text'],
          ['Click a row', 'The browser opens /surveys/<id>/edit'],
          ['Go back and click Back to Surveys', 'The browser returns to /surveys'],
        ],
      },
      {
        name: 'Delete a survey',
        description: 'Delete removes the definition but keeps existing responses.',
        steps: [
          ['Open /surveys/kind/venue and click the Delete action on a survey row', 'Dialog "Delete survey?" with "This removes the survey definition. Existing responses are kept." and Cancel / Delete buttons'],
          ['Click Cancel', 'The dialog closes and the row stays'],
          ['Open the dialog again and click Delete', 'The button reads "Deleting…", the dialog closes and the row disappears after the table refetches'],
        ],
      },
      {
        name: 'Unknown kind slug and empty taxonomy',
        description: 'Guard paths on the kind list.',
        steps: [
          ['Open /surveys/kind/unknown', 'The browser is redirected to /surveys'],
          ['With no SUPER categories in the admin category tree, open /surveys/kind/host', 'An info alert reads "No category-specific surveys yet. The Default Survey (button above) is used as the fallback. Create one with “New survey”." and no table renders'],
          ['With categories present but no scoped HOST surveys, open /surveys/kind/host', 'The table shows "No category-specific surveys yet. Create one with New survey."'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Survey Builder',
    description:
      'Create or edit a survey at /surveys/new and /surveys/:id/edit: kind, title, active switch, category scope and an ordered list of Section heading, Multiple choice, Short text and Long text questions.',
    sub_flows: [
      {
        name: 'Create a category-scoped survey',
        description: 'New survey from a kind list, scoped to a Sub category.',
        steps: [
          ['Open /surveys/kind/host and click New survey', 'The browser opens /surveys/new?kind=HOST with heading "New survey" and "Scope a survey to a category slot. Leave categories empty for the kind-level default."'],
          ['Check the form', 'Kind select preset to Host, Survey title field, Active switch on, Survey scope picker, Add select defaulting to Short text, Add question button; Back button reads "Back to Host Surveys"'],
          ['Enter a Survey title and pick Super → Category → Sub in Survey scope', 'The fields hold the values'],
          ['Click Add question', 'Card Q1 appears with Type Short text, Question, Help text (optional) and a Required switch'],
          ['Fill the Q1 Question label and switch Required on', 'The card keeps the label and the switch is on'],
          ['Click Save survey', 'The button reads "Saving…", a "Survey created" snackbar shows and the browser replaces the URL with /surveys/<new id>/edit'],
          ['Open /surveys/kind/host', 'The new survey is listed with its Scope path, Questions 1 and Active'],
        ],
      },
      {
        name: 'Build multiple-choice and section questions',
        description: 'MCQ options editor, section headings and reordering.',
        steps: [
          ['On a survey edit page choose Add = Multiple choice and click Add question', 'A card appears with Type Multiple choice (MCQ), an Options list with one "Option 1" field, Add option, Allow multiple answers and Required switches'],
          ['Type Option 1, click Add option and type Option 2', 'Two option rows exist; Move up is disabled on the first row and Move down on the last'],
          ['Click Move down on Option 1', 'The two options swap order'],
          ['Click Remove option on one row', 'That option is removed; removing the last one leaves a single empty "Option 1" field'],
          ['Choose Add = Section heading and click Add question', 'A card with label "Heading" appears and it has no Required switch'],
          ['Click Move up on the last card', 'The section card swaps with the one above; Q numbers update'],
          ['Click the Delete icon on a card', 'The card is removed from the list'],
          ['Click Save survey', 'A "Survey saved" snackbar shows and reloading keeps the new order and options'],
        ],
      },
      {
        name: 'Survey validation errors from the server',
        description: 'Question labels, MCQ options and one survey per slot are enforced on save.',
        steps: [
          ['Add a Short text question and leave its Question label blank, then click Save survey', 'An error alert reads "Every question needs a label" and nothing is saved'],
          ['Fill the label, add a Multiple choice question labelled "Diet" with every option blank, then Save survey', 'An error alert reads MCQ "Diet" needs at least one option'],
          ['Close the alert with its X', 'The alert disappears'],
          ['Create a new HOST survey on a Super › Category › Sub slot that already has a HOST survey and Save survey', 'Alert: "A HOST survey already exists for this exact category slot — edit that one instead of creating a new one."'],
          ['Edit an existing survey and move its scope onto a slot another survey already uses, then Save survey', 'Alert: "A survey already exists for this category slot"'],
        ],
      },
      {
        name: 'Create and edit the kind default survey',
        description: 'Default Survey opens the kind-level fallback with no category scope.',
        steps: [
          ['On /surveys/kind/venue with no default yet, click Default Survey', 'The browser opens /surveys/new?kind=VENUE&default=1 with heading "New Venue default survey"'],
          ['Check the form', 'Subtitle "The kind-level fallback survey, shown when no category-specific survey exists. No category needed."; no Kind select and no Survey scope picker'],
          ['Add a titled question and click Save survey', '"Survey created" snackbar and the URL becomes /surveys/<id>/edit'],
          ['Go back to /surveys/kind/venue', 'The default survey does not appear in the category-specific table'],
          ['Click Default Survey again', 'The browser opens /surveys/<default id>/edit?default=1 with heading "Edit Venue default survey"'],
          ['Switch Active off and click Save survey', '"Survey saved" snackbar; the default survey is stored inactive'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Meeting Schedule Queues',
    description:
      'Per-kind meeting queues at /meetings/venue, /meetings/host, /meetings/ecomm and /meetings/club_admin: a server-driven table with status toggles, requester dialog, details drawer and status-driven row actions.',
    sub_flows: [
      {
        name: 'Open each kind queue',
        description: 'Heading and subtitle follow the route kind.',
        steps: [
          ['Open /meetings/venue', 'Heading "Venue Meeting Schedule" with "Onboarding meeting requests from venue applicants."'],
          ['Open /meetings/host', 'Heading "Host Meeting Schedule"; the table lists only HOST meetings'],
          ['Open /meetings/ecomm', 'Heading "E-Commerce Brand Meeting Schedule"'],
          ['Open /meetings/club_admin', 'Heading "Club Admin Meeting Schedule"'],
          ['Look at the table', 'Columns Request ID (e.g. DUN-HOST-000012), Requester, Category, Requested for, Scheduled, Link, Status, Approval, Actions; search placeholder "Search request no, name or phone"'],
          ['Open /meetings/banana', 'An error alert reads "Unknown meeting kind."'],
        ],
      },
      {
        name: 'Filter by status and share the URL',
        description: 'The status toggle pins server filters and syncs ?status=.',
        steps: [
          ['Open /meetings/host', 'Toggle group All, Requested, Scheduled, Done, Rejected, Cancelled with All selected'],
          ['Click Scheduled', 'URL becomes /meetings/host?status=SCHEDULED and only Scheduled rows remain'],
          ['Click Rejected', 'URL has status=REJECTED; rows are CANCELLED meetings rejected by staff and their Status chip reads "Rejected" with the reason below'],
          ['Click Cancelled', 'Only meetings the applicant cancelled themselves remain, Status chip "Cancelled"'],
          ['Reload the page', 'The Cancelled toggle is still selected from the URL'],
          ['Click All', 'The status parameter is removed and every HOST meeting is listed'],
          ['Type a request number in the search', 'The table narrows to that meeting; an unmatched search shows "No meetings for this filter."'],
        ],
      },
      {
        name: 'Inspect requester and meeting details',
        description: 'Requester dialog and row details drawer.',
        steps: [
          ['On /meetings/venue click the requester name link in a row', 'Dialog "Requester details" with Name, Email, Phone, Request ID, Category, Requested for, Scheduled and Status'],
          ['Close the dialog with the close icon', 'The dialog closes and the drawer does not open'],
          ['Click elsewhere on a REQUESTED row', 'A right drawer opens: "Venue meeting" overline, applicant name, Requested chip, Category, Requested for, Scheduled, Contact'],
          ['Scroll the drawer', 'Survey answers submitted for that kind are listed, or "No survey answers on file."; Schedule and Cancel buttons are shown'],
          ['Close the drawer and click a SCHEDULED row', 'The drawer shows "Join meeting" under Meeting link and only a Cancel button (no Schedule)'],
          ['Open a CANCELLED row', 'The drawer shows Cancel reason, hides the meeting link and shows no action buttons'],
        ],
      },
      {
        name: 'Row actions follow meeting status',
        description: 'The Meeting actions menu is built from status and approval.',
        steps: [
          ['Open the Meeting actions menu on a REQUESTED row', 'Items Schedule and Cancel (red)'],
          ['Open the menu on a SCHEDULED row', 'Items Reschedule, Mark done and Reject (red)'],
          ['Open the menu on a DONE row with Approval "—"', 'Single item Approve / Deny'],
          ['Look at a DONE row already Approved, a Denied row and a Cancelled row', 'Their Actions cell shows "—" with no menu'],
          ['Look at the Link column on a Denied or Cancelled meeting that has a link', 'The Join link is hidden and "—" is shown'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Scheduling Meetings',
    description:
      'Staff schedule, reschedule, complete and cancel onboarding meetings through the slot-aware Schedule meeting dialog, Mark done and the Cancel meeting dialog.',
    sub_flows: [
      {
        name: 'Schedule a requested meeting',
        description: 'Pick an open slot, add a link and save — the applicant is notified.',
        steps: [
          ['On /meetings/host open Meeting actions on a REQUESTED row and click Schedule', 'Dialog "Schedule meeting" with "Requested for <date>", a slot calendar ("Greyed-out slots are already booked."), Meeting link, Status (SCHEDULED) and Notes'],
          ['Check the slot calendar', 'The requested slot is preselected; slots booked by other meetings are visible but disabled'],
          ['Pick a different open date and time', 'That slot becomes selected'],
          ['Enter a meeting link such as a Google Meet URL and a note', 'Meeting link shows the helper "Required to schedule the meeting."'],
          ['Click Save', 'The button reads "Saving…", the dialog closes and the row shows Status Scheduled, the new Scheduled time and a Join link'],
          ['Check the applicant side', 'The applicant receives the booked/scheduled WhatsApp and email notification for the new slot'],
        ],
      },
      {
        name: 'Schedule dialog validation',
        description: 'A meeting link is required while Status is SCHEDULED (a slot is also required; the requested slot is preselected).',
        steps: [
          ['Open Schedule on a REQUESTED meeting, clear the Meeting link and click Save', 'Alert "Add a meeting link to schedule the meeting." and the link field turns red'],
          ['Change Status to REQUESTED, leave the link empty and click Save', 'No client error; the meeting saves with no link'],
          ['Click Cancel in the dialog', 'The dialog closes without saving'],
        ],
      },
      {
        name: 'Slot already taken by another meeting',
        description: 'The server rejects a staff schedule onto an occupied slot.',
        steps: [
          ['Have two REQUESTED meetings whose applicants asked for the same time', 'Both rows show the same Requested for value'],
          ['Schedule the first meeting on that slot with a link', 'It saves as Scheduled'],
          ['Open Schedule on the second meeting and Save with its preselected requested slot', 'Alert "That slot is already taken by another meeting" and the row stays Requested'],
          ['Pick a free slot instead and Save', 'The meeting saves as Scheduled'],
        ],
      },
      {
        name: 'Reschedule a scheduled meeting',
        description: 'Reschedule reuses the dialog; the applicant is told the new time.',
        steps: [
          ['On a SCHEDULED row open Meeting actions and click Reschedule', 'The Schedule meeting dialog opens on the saved slot with the saved link and notes'],
          ['Pick another open slot and click Save', 'The row Scheduled column shows the new time and the Status stays Scheduled'],
          ['Check the applicant side', 'The applicant receives the rescheduled email with the new date, time and meeting link'],
          ['Reschedule again keeping the same slot but editing the link', 'The save succeeds and the applicant gets an updated-meeting notice rather than a reschedule'],
        ],
      },
      {
        name: 'Mark a meeting done',
        description: 'Mark done flips SCHEDULED to DONE and opens the decision step.',
        steps: [
          ['On /meetings/host?status=SCHEDULED open Meeting actions on a row and click Mark done', 'The mutation runs once even on a double click'],
          ['Watch the table', 'The row leaves the Scheduled list after the refetch'],
          ['Click the Done toggle', 'The meeting is listed with Status Done and Approval "—"'],
          ['Open its Meeting actions', 'Only Approve / Deny is offered'],
        ],
      },
      {
        name: 'Cancel or reject a meeting with a reason',
        description: 'Staff cancellation needs a reason, marks the row Rejected and tells the applicant.',
        steps: [
          ['On a REQUESTED row open Meeting actions and click Cancel', 'Dialog "Cancel meeting": "The applicant (<name>) will be emailed this reason and asked to fill the survey again and book a new slot.", a required Reason field, Keep meeting and Cancel meeting buttons'],
          ['Click Cancel meeting with the Reason empty', 'Alert "A cancellation reason is required — it is emailed to the applicant."'],
          ['Click Keep meeting', 'The dialog closes and the meeting is unchanged'],
          ['On a SCHEDULED row click Reject, type a reason and click Cancel meeting', 'The button reads "Cancelling…", the dialog closes and the row shows Status "Rejected" with the reason beneath'],
          ['Open the Rejected toggle', 'The meeting is listed there and not under Cancelled; its Actions show "—"'],
          ['Check the applicant side', 'Cancellation email with the reason, the rejection WhatsApp, and an in-app "Onboarding meeting cancelled" notification linking to Earn'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Meeting Decisions',
    description:
      'After a meeting is Done, staff review the survey answers, add feedback and Approve or Deny. Approval drafts the onboarded record or grants the role for the meeting kind.',
    sub_flows: [
      {
        name: 'Approve a host applicant',
        description: 'Approving a HOST meeting drafts a host into Onboarded Hosts.',
        steps: [
          ['On /meetings/host?status=DONE open Meeting actions on an undecided row and click Approve / Deny', 'Dialog "Approve or deny onboarding" with "Review <name>\'s survey answers and add your feedback. Approving drafts them into the Onboarded list; denying asks them to re-apply."'],
          ['Read the dialog body', 'The applicant HOST survey answers are listed, then a required "Your feedback" field'],
          ['Type feedback and click Approve', 'Buttons read "Saving…", the dialog closes and the row Approval chip reads Approved with Actions "—"'],
          ['Open /hosts', 'A host record for the applicant exists in DRAFT with the category they chose in the gate'],
          ['Check the applicant side', 'The applicant is told in-app that the interview is cleared and under review'],
        ],
      },
      {
        name: 'Approve venue, brand and club admin applicants',
        description: 'Each kind creates its own onboarding record; brand and club admin approvals also grant a role.',
        steps: [
          ['On /meetings/venue approve a Done meeting with feedback', 'Approval shows Approved and /venues lists a new DRAFT venue for that applicant'],
          ['On /meetings/ecomm approve a Done meeting with feedback', 'Approval shows Approved, /ecomm-brands lists a DRAFT brand and the applicant user gains the ECOMM_MANAGER role'],
          ['On /meetings/club_admin approve a Done meeting with feedback', 'Approval shows Approved and the applicant user gains the CLUB_ADMIN role'],
          ['Open /club-admins', 'A DRAFT club admin profile for that user is listed with Status Inactive'],
        ],
      },
      {
        name: 'Deny an applicant',
        description: 'Deny records feedback and blocks further actions.',
        steps: [
          ['Open Approve / Deny on a Done meeting and click Deny with the feedback empty', 'Alert "Add your feedback before deciding." and nothing is saved'],
          ['Type feedback and click Deny', 'The dialog closes; the row Approval chip reads Denied, the Join link is hidden and Actions show "—"'],
          ['Check the applicant side', 'The applicant receives the rejection notification carrying the interviewer feedback'],
          ['Open Approve / Deny on another meeting and click Cancel', 'The dialog closes and the feedback field is cleared'],
        ],
      },
      {
        name: 'Decision guards on the server',
        description: 'Only a Done, undecided meeting can be decided.',
        steps: [
          ['Open the Meeting actions menu on a SCHEDULED meeting', 'Approve / Deny is not offered until the meeting is marked done'],
          ['Call decideMeeting through the API for a SCHEDULED meeting with feedback', 'The server refuses with "Mark the meeting as done before approving it"'],
          ['Call decideMeeting again for a meeting that is already Approved', 'The server refuses with "This meeting has already been decided"'],
          ['Call decideMeeting with blank feedback', 'The server refuses with "Add your feedback before deciding"'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Meeting Calendar',
    description:
      'The /meetings/calendar page shows every onboarding meeting in Outlook-style Day, Week and Month views, coloured by display status, with holidays and a remove-from-calendar menu for cancelled meetings.',
    sub_flows: [
      {
        name: 'Switch views and move through time',
        description: 'Week is the default view.',
        steps: [
          ['Open /meetings/calendar', 'Heading "Meeting Calendar" with "Scheduled & requested onboarding meetings across venue, host and seller.", view toggle day/week/month with week selected, and the current week range'],
          ['Look at the legend', 'Pending confirmation, Confirmed, In progress, Completed and Cancelled colour keys'],
          ['Click Next', 'The range label moves one week forward'],
          ['Click Today', 'The range returns to the current week'],
          ['Select day', 'An hourly grid for one day; Previous / Next step one day'],
          ['Select month', 'A Sun–Sat month grid titled with the month and year; Previous / Next step one month'],
        ],
      },
      {
        name: 'Read meetings on the calendar',
        description: 'Events open a read-only details drawer.',
        steps: [
          ['In week view find a requested meeting', 'Its block shows the time and applicant name in the Pending confirmation colour'],
          ['Hover the block', 'Tooltip "<KIND> · <name> · Pending confirmation"'],
          ['Click the block', 'The meeting details drawer opens with status, dates, contact and survey answers, and no Schedule or Cancel buttons'],
          ['Find a scheduled meeting whose slot is in progress now', 'It is coloured In progress; one whose slot has ended reads Completed'],
          ['In month view open a day with more than three meetings', 'Three chips show plus a "+N more" link'],
          ['Click "+N more"', 'The calendar switches to day view on that date'],
        ],
      },
      {
        name: 'Remove a cancelled meeting from the calendar',
        description: 'Only cancelled meetings can be dismissed; the record stays for audit.',
        steps: [
          ['Right-click a Scheduled meeting block', 'A context menu shows a disabled item "Only cancelled meetings can be removed"'],
          ['Right-click a Cancelled (dashed, struck-through) meeting block', 'The menu item "Remove from my calendar" is enabled'],
          ['Click Remove from my calendar', 'The calendar refetches and the cancelled meeting no longer appears'],
          ['Open the meeting kind queue table', 'The cancelled meeting is still listed there'],
        ],
      },
      {
        name: 'Holidays show on the calendar',
        description: 'Holidays added on Meeting Availability tint the day.',
        steps: [
          ['Add an Office Holiday named "Diwali" on /meetings/availability', 'The holiday is listed there'],
          ['Open /meetings/calendar in month view on that month', 'The day cell is tinted and carries a "Diwali" chip with tooltip "Office Holiday · Diwali"'],
          ['Switch to week view on that week', 'Every hour band of that day is tinted as a holiday'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Meeting Availability',
    description:
      'The /meetings/availability page sets the global working days, hours (IST), slot length and booking horizon that generate bookable slots, plus holidays and leave days.',
    sub_flows: [
      {
        name: 'Save working hours',
        description: 'Availability drives the slot grid applicants book from.',
        steps: [
          ['Open /meetings/availability', 'Title "Meeting Availability", Working days checkboxes Sun–Sat, Start time (IST), End time (IST), Slot length (minutes), Booking horizon (days) and Save availability'],
          ['Tick Mon–Fri only, set 10:00 to 18:00, slot length 45 and horizon 14', 'The fields show the new values'],
          ['Click Save availability', 'Button reads "Saving…" then a success toast "Availability saved"'],
          ['Reload the page', 'The saved days, times, slot length and horizon are shown'],
          ['Open Schedule on a requested meeting', 'Slots are generated on weekdays between 10:00 and 18:00 in 45-minute steps within 14 days'],
        ],
      },
      {
        name: 'Availability validation errors',
        description: 'The server rejects impossible schedules.',
        steps: [
          ['Untick every working day and click Save availability', 'Error alert "Pick at least one working day"'],
          ['Tick a day, set Start time 18:00 and End time 10:00, then save', 'Error alert "End time must be after the start time"'],
          ['Fix the times, set Slot length (minutes) to 5 and save', 'Error alert "Slot length must be between 10 and 240 minutes"'],
          ['Set Slot length to 30 and Booking horizon (days) to 90, then save', 'Error alert "Booking horizon must be between 1 and 60 days"'],
        ],
      },
      {
        name: 'Add and remove holidays',
        description: 'Holidays block slots on that day; one entry per calendar day.',
        steps: [
          ['Scroll to "Holidays & leave"', 'Date picker, Name (optional), Type (Public Holiday / Office Holiday / Official Leave), Add button and "No holidays added yet." when empty'],
          ['Click Add without a date', 'Error alert "Pick a date for the holiday"'],
          ['Pick a date, type a name, choose Official Leave and click Add', 'Button reads "Adding…"; the list shows the formatted date, an Official Leave chip and the name; the form clears'],
          ['Add the same date again with type Public Holiday', 'No duplicate appears; the existing entry now reads Public Holiday'],
          ['Click Remove holiday on the entry', 'The entry disappears from the list'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Host Additional Requests',
    description:
      'The /host-requests queue: approved hosts asking to host in a new Super › Category › Sub. Staff acknowledge, approve with optional notes, reject with a reason, or delete.',
    sub_flows: [
      {
        name: 'Browse host requests',
        description: 'Server-driven table with status-driven actions.',
        steps: [
          ['Open /host-requests', 'Title "Host Requests" with "Review requests from approved hosts to start hosting in a new category."'],
          ['Look at the table', 'Columns Request ID, Host Name, Category (path), Requested On, Status, Action; newest first; search "Search request no, name, email or phone"'],
          ['Open Host request actions on a REQUESTED row', 'Items Acknowledge and Delete'],
          ['Open the menu on an ACKNOWLEDGED row', 'Items Approve, Reject and Delete'],
          ['Open the menu on an APPROVED or REJECTED row', 'Only Delete'],
        ],
      },
      {
        name: 'Acknowledge and approve a request',
        description: 'Acknowledge opens the contact card; Approve grants the category.',
        steps: [
          ['Click Acknowledge on a REQUESTED row', 'Status becomes ACKNOWLEDGED and the "Contact Details" dialog opens with Host Name, Email and Phone Number plus Reject and Approve'],
          ['Check the host side', 'The host gets a "Request received" in-app notice and acknowledgement email'],
          ['Click Approve in Contact Details', 'Dialog "Approve host request" showing the request number and host name, a "Notes (optional)" field with "Shared with the host on approval."'],
          ['Leave notes empty and click Approve', 'The dialog closes and the row Status becomes APPROVED'],
          ['Open that host on /hosts and Review it', 'The approved category is listed with the request number on its chip'],
          ['Check the host side', 'A "Congratulations!" in-app notice, approval email and WhatsApp name the new category'],
        ],
      },
      {
        name: 'Reject a request with a reason',
        description: 'A reason is required to reject.',
        steps: [
          ['Open Host request actions on an ACKNOWLEDGED row and click Reject', 'Dialog "Reject host request" with a required Reason field and helper "Required — shared with the host so they know why."'],
          ['Look at the Reject button with the reason empty', 'Reject is disabled'],
          ['Type a reason and click Reject', 'The dialog closes and the row Status becomes REJECTED'],
          ['Check the host side', 'The host gets a "Request update" in-app notice and rejection email'],
        ],
      },
      {
        name: 'Delete a request and stale actions',
        description: 'Delete is permanent; stale status changes surface server errors.',
        steps: [
          ['Click Delete on any row', 'Confirm dialog "Delete host request" with "Permanently delete request <request no>? This cannot be undone."'],
          ['Click Cancel', 'The dialog closes and the row remains'],
          ['Open it again and click Delete', 'The row is removed after the table refetches'],
          ['In a second tab acknowledge a request, then click Acknowledge on the same stale row in the first tab', 'Error alert "Only a requested host request can be acknowledged" and the table refetches to show ACKNOWLEDGED'],
          ['Approve a request in one tab, then Approve it again from a stale tab', 'Error alert "This host request has already been decided"'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded Hosts Review',
    description:
      'The /hosts table of host applications and approved hosts with the Review host dialog: application details, documents, survey answers, auto-saving categories and commission, and Approve / Reject.',
    sub_flows: [
      {
        name: 'Browse the hosts table',
        description: 'Columns, search and row actions.',
        steps: [
          ['Open /hosts', 'Title "Hosts" with "Review submitted host requests and manage approved hosts for Duncit communities."'],
          ['Look at the table', 'Columns Host ID, Host (linked name + user id), Contact, Documents (PAN / Aadhar), Category, Status, Active, Commission, Submitted, Actions; search "Search name, email or phone"'],
          ['Compare Active for a DRAFT host with is_active true', 'Active reads Inactive; only APPROVED and active hosts read Active'],
          ['Look at the Actions cell as an ONBOARDING_MANAGER', 'Host details, Edit, Review and Deactivate icons; no Delete permanently icon'],
          ['Click a host name', 'The browser opens /hosts/<hostId>'],
        ],
      },
      {
        name: 'Read an application in Review host',
        description: 'Everything the reviewer needs, without leaving the dialog.',
        steps: [
          ['Click Review on a SUBMITTED host', 'Dialog overline "Review host", the host name and a SUBMITTED status chip'],
          ['Read the sections', 'Application (Host ID, User ID, Onboarding "Step N of 4", Started, Submitted), Contact, Identity (Date of birth, Aadhar, PAN, Address), Payout (Method, Account holder, Account no. masked as •••• plus last 4, IFSC, UPI), Review history'],
          ['Look at Documents', 'Passport photo and Police verification thumbnails that enlarge in place, or "No documents uploaded yet."'],
          ['Look under "Earn with Duncit application"', 'The applicant HOST survey answers, or "No survey answers on file."'],
          ['Click Close', 'The dialog closes'],
        ],
      },
      {
        name: 'Categories save as you edit them',
        description: 'No Save button; each add/remove persists.',
        steps: [
          ['Review a host drafted without categories whose meeting carried a category', 'The survey category is adopted and saved automatically; the chip appears and "Applied with: <path>" is shown'],
          ['Review a host with no categories and no survey category', 'Warning "No categories — this host cannot create pods until one is assigned."'],
          ['Pick Super → Category → Sub in the picker and click Add', '"Saving…" shows, then a new chip appears'],
          ['Pick a Sub that is already assigned', '"Already added" appears and Add is disabled'],
          ['Click the delete icon on a category chip', 'The chip is removed after saving; Close and Approve are disabled while saving'],
          ['Close the dialog', 'The hosts table refreshes and the Category column shows the new list'],
        ],
      },
      {
        name: 'Host commission saves on blur',
        description: 'The field seeds from the finance default and writes only when changed.',
        steps: [
          ['Review a host with no commission override', 'Host commission panel; "Commission from host" shows the Finance default % with helper "Finance default is X%. Set 0 to always follow it."'],
          ['Tab out of the field without changing it', 'Nothing is saved'],
          ['Type 150', 'The field turns red with "Enter a number between 0 and 100." and blur does not save'],
          ['Type 12 and press Enter', '"Saving…" shows and the override is stored'],
          ['Close the dialog', 'The Commission column for the host reads 12%'],
          ['Force the save to fail (e.g. go offline) and blur a changed value', 'An inline error alert and an error toast "Could not save the host commission"; the next blur retries'],
        ],
      },
      {
        name: 'Approve or reject a host',
        description: 'Approve grants the HOST role; Reject needs notes.',
        steps: [
          ['Open Review on a SUBMITTED host', 'Reviewer notes, Tags ("Comma-separated tags applied when this host is approved."), Close, Reject and Approve'],
          ['Look at Reject with Reviewer notes empty', 'Reject is disabled'],
          ['Enter notes and tags "yoga, outdoor" and click Approve', 'The dialog closes; the row Status is APPROVED and Active reads Active'],
          ['Check the host user and notifications', 'The user now holds the HOST role; the host receives the onboarding-approved WhatsApp and email once'],
          ['Review the same approved host again and Approve with new notes', 'Notes and tags update without a second welcome message'],
          ['Review another host, enter notes and click Reject', 'The row Status becomes REJECTED with the notes saved as the last note'],
        ],
      },
      {
        name: 'Deactivate and reactivate a host',
        description: 'The power icon toggles is_active with a confirm.',
        steps: [
          ['Click Deactivate on an active APPROVED host', 'Confirm "Deactivate host": "This host will be unable to create pods and will be hidden from public discovery. You can reactivate them anytime."'],
          ['Click Deactivate', 'The row Active column reads Inactive; the host is emailed that their account was deactivated'],
          ['Click Activate on the same row', 'Confirm "Activate host": "This host will be able to create and host pods again."'],
          ['Click Activate', 'Active reads Active and the host is emailed their account is active'],
        ],
      },
      {
        name: 'Developer hard delete of a host',
        description: 'Only SUPER_ADMIN or DEVELOPERS_MANAGER can permanently delete, re-confirming their own credentials.',
        steps: [
          ['Sign in as a user with SUPER_ADMIN and open /hosts', 'Rows show a red "Delete permanently (developer)" icon'],
          ['Click it on a host', 'Dialog "Delete host": "This action cannot be undone. <name> will be permanently deleted from everywhere." with Your email and Your password; Delete permanently disabled until both are filled'],
          ['Enter an email that is not your own account email plus a password, then click Delete permanently', 'Inline error "The email does not match your account"'],
          ['Enter your own account email with a wrong password', 'Inline error "Password is incorrect"'],
          ['Confirm with your own valid credentials on a host that still hosts pods', 'Inline error "This host still hosts N pod(s). Remove or reassign them before deleting."'],
          ['Confirm on a host with no pods', 'The dialog closes and the host disappears from the table'],
        ],
      },
      {
        name: 'Host details page',
        description: '/hosts/:hostId shows the host summary and their pods.',
        steps: [
          ['Click Host details on a host row', 'The browser opens /hosts/<id>: eyebrow "Host", the host name, chips for status, Active/Inactive, email and phone, and category chips'],
          ['Look at the Pods section', 'A pods table with time toggle All / Upcoming / Started and columns Pod, Date & time, Mode, Status (Live/Offline); search "Search pod title or ID"'],
          ['Click Upcoming', 'Only pods starting from now are listed'],
          ['Open a host with no pods', 'The table reads "No pods for this host yet."'],
          ['Click the back button', 'The browser returns to /hosts'],
          ['Open /hosts/<unknown id>', 'A warning reads "Host not found."'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Host Edit Form',
    description:
      'The Edit Host dialog (React Hook Form + Zod): Personal, Identity, Verification and Bank Account Verification accordions, Host categories and Status.',
    sub_flows: [
      {
        name: 'Edit and save host details',
        description: 'All sections prefilled from the host.',
        steps: [
          ['Click Edit on a host row', 'Dialog "Edit Host" with the Personal accordion expanded and an Expand all button'],
          ['Click Expand all', 'Personal, Identity, Verification and Bank Account Verification are all open and the button reads Collapse all'],
          ['Check the fields', 'Full name, Email, Phone ("6–15 digits, optional + prefix"), DOB; Aadhar number, PAN number, Passport photo; Police verification document, Full address, Tags; Payout method and account fields'],
          ['Look at Host categories', 'Each category shows its path with "Requested · <request no>" or "Added by admin" and a remove icon; a picker to add more'],
          ['Change Full address, add a category and set Status to APPROVED', 'The values update in the form'],
          ['Click Save', 'The dialog closes and the table row shows the updated category and status'],
          ['Check the host user', 'Saving with Status APPROVED grants the HOST role'],
        ],
      },
      {
        name: 'Personal and identity validation',
        description: 'Zod messages show once a field is touched, filled or the form submitted.',
        steps: [
          ['Clear Full name and click Save', 'Full name shows "Full name is required" and nothing is saved'],
          ['Type "J0hn"', '"Full name can use letters, spaces, apostrophes, periods and hyphens only"'],
          ['Type "not-an-email" into Email', '"Enter a valid email"'],
          ['Type "98-765" into Phone', '"Phone must contain only digits with an optional + prefix"'],
          ['Pick a DOB less than 18 years ago', '"Host age must be between 18 and 100 years"'],
          ['Type 1234 into Aadhar number', '"Aadhar must be a 12 digit number"'],
          ['Type "ABC123" into PAN number', '"PAN must use format ABCDE1234F"'],
          ['Clear Passport photo and Full address to "abc"', '"Passport photo is required" and "Address must be at least 5 characters"'],
        ],
      },
      {
        name: 'Bank account validation by payout method',
        description: 'UPI needs a UPI ID; IMPS and NEFT need account number and IFSC.',
        steps: [
          ['Leave Payout method empty and Save', '"Select UPI, IMPS or NEFT"'],
          ['Choose UPI', 'A UPI ID field appears; account number and IFSC are hidden'],
          ['Type "abc" into UPI ID and Save', '"Enter a valid UPI ID"'],
          ['Choose NEFT', 'Account number ("6 to 18 digits") and IFSC code ("Format ABCD0123456") appear'],
          ['Enter account number 123 and IFSC "SBIN123"', '"Account number must be 6 to 18 digits" and "IFSC must use format ABCD0123456"'],
          ['Clear Account holder name', '"Account holder name is required"'],
          ['Enter valid values and Save', 'The dialog closes and the host is saved'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded Venues',
    description:
      'The /venues Registered Venues table, the Review venue dialog (summary, approve/reject, venue deductions, cancellation trigger), Edit Venue, lifecycle actions and the venue details page.',
    sub_flows: [
      {
        name: 'Browse registered venues',
        description: 'Columns, search and pod-count deep link.',
        steps: [
          ['Open /venues', 'Title "Registered Venues" with "Review submitted venue requests and manage approved spaces for clubs, pods and meetups."'],
          ['Look at the table', 'Columns Venue ID, Venue (linked name + type), Location (locality, city, postal code), Category, Owner, Capacity, Status, Active, Pods, Commission, Submitted, Actions; search "Search name, type, city or owner"'],
          ['Click the Pods count button on a row', 'The browser opens /venues/<id>?selectedtab=pods with the Pods tab selected'],
          ['Go back and click the venue name', 'The browser opens /venues/<id> on the Overview tab'],
        ],
      },
      {
        name: 'Approve or reject a venue',
        description: 'Approve grants the VENUE_OWNER role; Reject requires notes.',
        steps: [
          ['Click Review on a SUBMITTED venue', 'Dialog overline "Review venue", venue name and SUBMITTED chip; summary chips type, Capacity, GSTIN, PAN, "Hosts in: <path>", location with PIN and Documents chips'],
          ['Look at Reject with Reviewer notes empty', 'Reject is disabled; Approve is enabled'],
          ['Enter notes and tags and click Approve', 'The dialog closes; the row Status is APPROVED and Active reads Active'],
          ['Check the owner user and notifications', 'The owner holds VENUE_OWNER; onboarding-approved and new-venue WhatsApp/email go out once'],
          ['Review another venue, enter notes and click Reject', 'The row Status becomes REJECTED'],
        ],
      },
      {
        name: 'Override venue deductions',
        description: 'The commission field seeds from the finance default and saves only when changed.',
        steps: [
          ['Open Review on a venue with no commission override', 'Venue deductions panel; "Commission from venue" shows the Finance default %; Save deductions is disabled'],
          ['Type 120', 'The field turns red with "Enter a number between 0 and 100." and Save deductions stays disabled'],
          ['Type 15', 'Save deductions becomes enabled'],
          ['Click Save deductions', 'The override is stored while venue_share_pct is left unchanged; the dialog stays open and the table Commission column reads 15%'],
          ['Set 0 and save', 'The venue follows the Finance default again'],
        ],
      },
      {
        name: 'Set the venue cancellation trigger',
        description: 'Auto-cancel window and refund bands for loss-making pods.',
        steps: [
          ['Open Review on a venue with no trigger saved', '"Venue cancellation trigger" with Cancellation trigger 6 hours and an example "At 6 hours, a pod starting <7 PM> is cancelled by <1 PM> if its finance is still negative by then…"'],
          ['Look at Refund on cancellation', 'Success note "No bands — everyone enrolled is refunded in full." and an Add refund band button'],
          ['Change the trigger to 12', 'The example updates to 12 hours with the new deadline'],
          ['Click Add refund band', 'A row with Hours before start 24 and Refund 100% plus "100% refund if the pod is cancelled more than 24 hours before the start time."'],
          ['Add a second band with 6 hours and 50%', 'Its summary reads "50% refund if the pod is cancelled more than 6 hours before the start time."'],
          ['Click Save cancellation trigger', 'settings.cancellation.trigger_hours and refund_tiers are stored; reopening Review shows 12 hours and both bands'],
          ['Click Remove refund band on one row and save', 'Only the remaining band is stored'],
        ],
      },
      {
        name: 'Cancellation trigger validation',
        description: 'Zod checks on touch and on save.',
        steps: [
          ['Set Cancellation trigger to 2.5 and blur', '"Use whole hours."'],
          ['Set it to -1', '"Hours cannot be negative."'],
          ['Set it to 9000', '"Use 8760 hours (a year) or fewer."'],
          ['Add a band with Refund 150', '"A refund cannot exceed 100%."'],
          ['Set Refund to -5', '"A refund cannot be negative."'],
          ['Add two bands both with Hours before start 24 and click Save cancellation trigger', 'The second row shows "Another band already uses this window." and nothing is saved'],
        ],
      },
      {
        name: 'Edit a venue',
        description: 'Edit Venue accordions with Yup validation and status.',
        steps: [
          ['Click Edit on a venue', 'Dialog "Edit Venue" with Venue details expanded, Documents, Owner details and Bank Account Verification accordions, a Status select, Cancel and Save'],
          ['Check Venue details', 'Venue name, Type (Cafe, Co-working, Restaurant, Park, Studio, Other), Capacity, Address lines, Description, Tags, Location cascade, Category cascade, Amenities / Facilities / Venue Security checklists, Cover image and Other images'],
          ['Open Edit on a venue with no category of its own whose owner picked one in the onboarding survey', 'The Category cascade is prefilled from the survey category'],
          ['In Documents click Add document, choose a type and pick a file', 'A new document row with Type, File and Remove document appears'],
          ['Change the description and click Save', 'The dialog closes and the table refreshes'],
          ['Set Status to APPROVED and Save', 'The owner user gains the VENUE_OWNER role'],
        ],
      },
      {
        name: 'Venue edit validation',
        description: 'Errors appear on the fields after Save.',
        steps: [
          ['Set Venue name to "A" and click Save', '"Venue name must be at least 2 characters" and nothing is saved'],
          ['Set Capacity to 0', '"Capacity must be at least 1"'],
          ['Set Address line 1 to "ab"', '"Address line 1 must be at least 3 characters"'],
          ['Enter GSTIN "12345" and PAN "PAN1"', '"GSTIN must follow format like 22ABCDE1234F1Z5" and "PAN must follow format ABCDE1234F"'],
          ['Enter Owner email "owner@" and Owner phone "12ab"', '"Enter a valid owner email" and "Owner phone must contain only digits (6–15 digits) with optional + prefix"'],
          ['Pick an owner DOB in the future', '"Enter a valid date of birth"'],
        ],
      },
      {
        name: 'Deactivate or delete a venue',
        description: 'Lifecycle toggle and developer hard delete.',
        steps: [
          ['Click Deactivate on an active venue', 'Confirm "Deactivate venue": "This venue will stop appearing when creating pods and in public listings. You can reactivate it anytime."'],
          ['Click Deactivate', 'Active reads Inactive'],
          ['Click Activate and confirm', 'Confirm text "This venue will become available again for pod creation and public discovery." and Active reads Active'],
          ['As SUPER_ADMIN click Delete permanently on a venue with pods, confirm with your own credentials', 'Inline error "This venue still has N pod(s) attached. Remove or reassign them before deleting."'],
          ['Repeat on a venue with no pods or booked slots', 'The venue and its unbooked slot data are removed and the row disappears'],
        ],
      },
      {
        name: 'Venue details page',
        description: '/venues/:venueId with Overview and Pods tabs.',
        steps: [
          ['Open /venues/<id>', 'Eyebrow "Venue", the venue name, tabs Overview and Pods'],
          ['Read Overview', 'Cover image, status chip, type, "Capacity N", location line with postal code, address, description, tag chips and "Owner: <name> · <phone> · <email>"'],
          ['Click the Pods tab', 'URL gains ?selectedtab=pods; heading "Pods at this venue" and a table with Pod, Date & time, Host(s), Mode, Venue approval, Status'],
          ['Click Started in the time toggle', 'Only pods that already started are listed; an empty view reads "No pods in this view."'],
          ['Reload the page', 'The Pods tab stays selected'],
          ['Open /venues/<unknown id>', 'A warning reads "Venue not found."'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded E-Commerce Brands',
    description:
      'The /ecomm-brands console (behind is_product_visible): brand table, Review brand with approve/reject and product sales commission, Edit Brand, lifecycle actions.',
    sub_flows: [
      {
        name: 'Browse brands',
        description: 'Brand table columns and search.',
        steps: [
          ['Open /ecomm-brands with the product flag on', 'Title "E-Commerce Brands" with "Review and verify partner product brands before they go live."'],
          ['Look at the table', 'Columns Brand ID, Brand, Categories, Products ("N live"), Owner, Status, Active, Commission, Submitted, Actions; search "Search brand, contact or city"'],
          ['Look at the Actions cell', 'Edit, Review and Deactivate icons'],
        ],
      },
      {
        name: 'Approve or reject a brand',
        description: 'Approval grants ECOMM_MANAGER and registers warehouses.',
        steps: [
          ['Click Review on a SUBMITTED brand', 'Dialog overline "Review brand" with cover image, tagline, Description, Categories, Owner, Business & legal, Address, Website / Instagram links, Payout and Documents chips'],
          ['Look at Reject with Reviewer notes empty', 'Reject is disabled'],
          ['Enter notes and tags and click Approve', 'The dialog closes and the row Status is APPROVED'],
          ['Check the owner and warehouses', 'The owner holds ECOMM_MANAGER and the brand pickup locations are registered with ShipRocket (a failure is recorded on the warehouse, not the approval)'],
          ['Review another brand, add notes and click Reject', 'Status becomes REJECTED'],
        ],
      },
      {
        name: 'Override product sales commission',
        description: 'Saved only when changed from the effective value.',
        steps: [
          ['Open Review on a brand with no override', '"Product sales commission" field shows the Finance default %, Save commission disabled'],
          ['Type 101', 'Red helper "Enter a number between 0 and 100." and Save commission disabled'],
          ['Type 18 and click Save commission', 'Button reads "Saving…", the dialog stays open and the table Commission column reads 18%'],
        ],
      },
      {
        name: 'Edit a brand',
        description: 'Edit Brand saves every section plus status.',
        steps: [
          ['Click Edit on a brand', 'Dialog "Edit Brand" with Brand name, Tagline, Description, Product categories ("Comma separated categories."), Logo, Cover image, Website URL, Instagram URL, contact, business, address, bank fields, documents and Status'],
          ['Change Product categories to "Apparel, Footwear", add a document and click Save', 'The dialog closes and the Categories column shows Apparel, Footwear'],
          ['Set Status to APPROVED and Save', 'The brand is APPROVED and the owner holds ECOMM_MANAGER'],
          ['Make the save fail (e.g. server error)', 'An error alert with the server message, or "Failed to save brand"'],
        ],
      },
      {
        name: 'Deactivate or delete a brand',
        description: 'Lifecycle toggle and developer hard delete.',
        steps: [
          ['Click Deactivate on a brand', 'Confirm "Deactivate brand": "This brand and its products will be hidden from the marketplace and pod product picker. You can reactivate it anytime."'],
          ['Confirm', 'Active reads Inactive'],
          ['Click Activate and confirm', 'Message "This brand and its products will be visible in the marketplace again." and Active reads Active'],
          ['As SUPER_ADMIN delete permanently a brand with products using your own credentials', 'Inline error "This brand still has N product(s). Remove them before deleting."'],
          ['Delete a brand with no products', 'The row disappears; the owner loses ECOMM_MANAGER only if it was their last brand'],
        ],
      },
    ],
  },
  {
    name: 'Onboarding: Onboarded Club Admins',
    description:
      'The /club-admins table of club admin profiles drafted by meeting approval: Review Club Admin (commission, assign clubs, approve/reject), Edit Club Admin and lifecycle actions.',
    sub_flows: [
      {
        name: 'Browse club admins',
        description: 'Profiles stay Inactive until reviewed.',
        steps: [
          ['Open /club-admins', 'Title "Onboarded Club Admins" with "Everyone approved through the Club Admin onboarding meeting flow. New Club Admins stay Inactive until reviewed."'],
          ['Look at the table', 'Columns Club Admin ID, Club Admin, Category, Assigned Clubs (chips), Status, Date Joined, Pay Commission, Actions; search "Search ID, name, email or phone"'],
          ['Find a DRAFT profile from a recent meeting approval', 'Status reads Inactive'],
        ],
      },
      {
        name: 'Approve or reject a club admin',
        description: 'Approve makes the profile live; Reject needs notes.',
        steps: [
          ['Click Review on a DRAFT club admin', 'Dialog "Review Club Admin" with DRAFT chip and ID; Name, Email, Phone, Category, Assigned clubs, Status, Date joined, Request'],
          ['Look at Review notes', 'Helper "Required to reject; optional when approving." and Reject disabled while empty'],
          ['Click Approve with notes empty', 'The dialog closes; Status reads Active and Date Joined is set'],
          ['Check notifications', 'The club admin receives the onboarding-approved WhatsApp and email once'],
          ['Review another profile, type notes and click Reject', 'Status reads Inactive and the profile is stored REJECTED with the notes'],
          ['Reopen Review on the rejected profile', 'Review notes are prefilled and "Previous notes" shows them'],
        ],
      },
      {
        name: 'Set pay commission in review',
        description: 'Commission override from Finance default.',
        steps: [
          ['Open Review on a club admin with no override', 'Pay Commission hint "The cut this Club Admin is paid on every pod. Defaults to the X% set in Finance → Default Deductions…"; Save commission disabled'],
          ['Type -1', 'Red helper "Enter a number between 0 and 100."'],
          ['Type 8 and click Save commission', 'The dialog stays open and the Pay Commission column reads 8%'],
        ],
      },
      {
        name: 'Assign clubs to a club admin',
        description: 'Clubs matching the admin taxonomy, plus any already held.',
        steps: [
          ['Open Review on an approved club admin with a category', 'Assign Clubs section "Clubs matching <path>", a Search clubs field, a checkbox list and Save clubs'],
          ['Type part of a club name in Search clubs', 'The list narrows to matching clubs, or "No clubs match this category yet."'],
          ['Tick two clubs and untick one previously assigned club, then click Save clubs', 'Button reads "Saving…"; the table Assigned Clubs chips show exactly the ticked clubs'],
          ['Look at a club assigned from outside the admin category', 'It is listed with the caption "Outside their category"'],
          ['Review a club admin with no category on record', 'Info alert "This Club Admin has no category on record, so every club is listed. Set one in Edit to narrow it."'],
        ],
      },
      {
        name: 'Edit a club admin',
        description: 'Contact, category and commission.',
        steps: [
          ['Click Edit on a row', 'Dialog "Edit Club Admin" with the ID, Full name, Email ("Used for onboarding contact. The login account is not changed."), Phone, Category cascade ("Decides which clubs can be assigned in Review."), Pay commission'],
          ['Type 120 in Pay commission', 'Helper "Enter 0–100." in red and Save disabled'],
          ['Type 0', 'Helper "0 inherits the platform default."'],
          ['Enter a phone with spaces, pick a Sub category and click Save', 'The dialog closes; the row Category updates and the phone is stored without spaces'],
          ['Open Review', 'Assign Clubs now matches the new category'],
        ],
      },
      {
        name: 'Deactivate or delete a club admin',
        description: 'Deactivate keeps assignments; delete removes the profile but not the login.',
        steps: [
          ['Click Deactivate on an active club admin', 'Confirm "Deactivate Club Admin": "They lose access to the Club Admin dashboard and can no longer create or edit pods for their clubs. Their club assignments are kept…"'],
          ['Confirm', 'Status reads Inactive and the account-suspended notification goes out'],
          ['Click Activate and confirm', 'Message "They regain access to the Club Admin dashboard and to the clubs assigned to them." and Status reads Active'],
          ['As SUPER_ADMIN delete permanently a club admin with your own credentials', 'The row disappears and the person is unassigned from every club they administered'],
          ['Check the user account', 'The user and their CLUB_ADMIN role still exist'],
        ],
      },
    ],
  },
  {
    name: 'Products: Access & Product Visibility',
    description:
      'products.duncit.com requires PRODUCTS_MANAGER. Every route except the dashboard is gated on the is_product_visible flag: the sidebar drops them and a direct link redirects to /.',
    sub_flows: [
      {
        name: 'Sidebar with products visible',
        description: 'All groups show while the flag is on.',
        steps: [
          ['Sign in to the Products portal as a PRODUCTS_MANAGER with is_product_visible on', 'The sidebar shows Dashboard, Catalog (Duncit Products, Brands), Brands & Products Review (Brands Review, Products Reviews), Ecomm Requests (Brand Request, Product Request), Warehouse Approval, Fulfilment (Orders) and Settings (Duncit Warehouse Locations, Pod Shop Slider)'],
          ['Open /inventory directly', 'The Duncit Products page renders'],
        ],
      },
      {
        name: 'Product routes hidden with the flag off',
        description: 'Only the dashboard remains.',
        steps: [
          ['Turn is_product_visible off and reload the portal', 'The sidebar shows only Dashboard'],
          ['Open /orders directly', 'After the flag set loads, the browser redirects to /'],
          ['Open /catalog/brands directly', 'The browser redirects to /'],
          ['Open /anything-unknown', 'The browser redirects to /'],
        ],
      },
      {
        name: 'Account without PRODUCTS_MANAGER',
        description: 'The portal gate.',
        steps: [
          ['Sign in to products.duncit.com with an account lacking PRODUCTS_MANAGER', 'Access is denied, the stored session token is cleared and no product data loads'],
        ],
      },
    ],
  },
  {
    name: 'Products: Dashboard',
    description: 'The / dashboard aggregates inventory, orders and brands into KPI tiles and an At a glance chip row on the shared dashboard grid.',
    sub_flows: [
      {
        name: 'Read the products dashboard',
        description: 'KPIs computed from the three lists.',
        steps: [
          ['Open /', 'Heading "Dashboard" with "Hi <first name> — here is how Duncit Products is doing today." and a progress bar while loading'],
          ['Read the tiles', 'Products (with "<₹> stock value"), Revenue (with "<n> orders"), To fulfil ("orders awaiting dispatch"), Stock at risk ("<n> out, <n> low"), Brands ("<n> approved products") and Avg order value ("across all orders")'],
          ['Check tile colours with pending orders and out-of-stock items', 'To fulfil shows in warning colour and Stock at risk in error colour'],
          ['Read At a glance', 'Chips "<n> orders to fulfil", "<n> out of stock", "<n> low stock" and "<n> brands live"'],
          ['Open / while one of the three queries fails', 'An error Alert shows the message under the header'],
        ],
      },
      {
        name: 'Rearrange dashboard tiles',
        description: 'Tiles are dashboard widgets.',
        steps: [
          ['Drag the Revenue tile before the Products tile', 'The tiles reorder'],
          ['Reload /', 'The new order is kept for this viewer'],
        ],
      },
    ],
  },
  {
    name: 'Products: Duncit Products',
    description: 'The /inventory list of Duncit-owned catalogue products with Add product, edit, deactivate/reactivate, archive and permanent delete.',
    sub_flows: [
      {
        name: 'Browse Duncit products',
        description: 'Scoped to ownership DUNCIT.',
        steps: [
          ['Open /inventory', 'Heading "Duncit Products" with "Manage Duncit products, available units, and requested counts." and an "Add product" button'],
          ['Read the columns', 'Cover, Product, SKU, Selling price, Stock, Available, Status, Active, Created and actions (Brand hidden by default)'],
          ['Search "Search name, SKU, brand or tags"', 'Matching products remain'],
          ['With no products', 'Empty text: No products yet. Click "Add product" to create the first one.'],
          ['Click the Edit action on a row', 'The browser opens /inventory/<id>/edit'],
        ],
      },
      {
        name: 'Temporarily deactivate and reactivate a product',
        description: 'Pause hides the product from shop and pod picker.',
        steps: [
          ['Click the pause action on an active product', 'Confirm "Deactivate product?" says the product is hidden from the shop and pod product picker until reactivated and orders already placed are not affected'],
          ['Confirm Deactivate', 'The button reads "Working…", then "Product temporarily deactivated" and the Active chip turns off'],
          ['Click the resume action on the same row', 'Confirm "Reactivate product?" says it becomes visible and purchasable again'],
          ['Confirm Reactivate', '"Product reactivated"'],
          ['Reactivate an archived product via the API', 'Error "Restore this archived product instead of activating it"'],
        ],
      },
      {
        name: 'Archive a product from the list',
        description: 'Archive hides the product from active lists.',
        steps: [
          ['Click Archive on a row', 'Dialog "Archive product?" says archiving hides <name> from active lists and it can be restored from the product page'],
          ['Click Cancel', 'The product is unchanged'],
          ['Archive again and click "Archive"', 'The dialog closes, the list refetches and the product status becomes ARCHIVED'],
        ],
      },
      {
        name: 'Permanently delete a product linked to pods',
        description: 'The dialog lists linked pods first.',
        steps: [
          ['Click "Delete permanently" on a product used by pods', 'Dialog "Permanently delete product?" shows "Checking linked pods…" then a warning "Linked to <n> pods" listing pod titles with Active/Inactive chips'],
          ['Read the caption', '"Those pods will keep a snapshot copy but the link will be lost."'],
          ['Click "Delete permanently"', 'The dialog closes and the product disappears from the list'],
          ['Open the delete dialog for a product with no pods', 'Info "No pods reference this product."'],
        ],
      },
    ],
  },
  {
    name: 'Products: Product Editor',
    description: 'The /inventory/new, /inventory/:id/edit and /catalog/brands/:brandId/products/:id/edit product form: accordion sections with a sticky save footer, SKU generator, duplicate, archive and restore.',
    sub_flows: [
      {
        name: 'Create a Duncit product',
        description: 'Save product, then land on its editor.',
        steps: [
          ['Click "Add product" on /inventory', '/inventory/new opens with breadcrumb "Add product", heading "Add inventory product" and sections Basic info, Pricing & tax, Inventory management, Supplier details, Delivery & availability, Media & branding and Advanced settings'],
          ['Look at the sticky footer', '"All changes saved", Cancel, "Save & continue" (disabled until a change) and "Save product"'],
          ['Enter Product name, pick Product type, Unit type and Category, and set Unit cost and Selling price', 'The footer reads "You have unsaved changes"'],
          ['In Delivery & availability pick the Delivery method and a Duncit Warehouse', 'The Warehouse select shows the chosen Duncit warehouse'],
          ['In Advanced settings click "Generate new SKU"', 'An 8-character uppercase SKU fills the SKU field'],
          ['Click "Save product"', '"Created" toast and the browser replaces the URL with /inventory/<newId>/edit'],
        ],
      },
      {
        name: 'Product form validation',
        description: 'Zod rules on the product schema.',
        steps: [
          ['On /inventory/new clear Product name and save', '"Product name is required"'],
          ['Type one character as Product name', '"At least 2 characters"'],
          ['Type "abc 12" as SKU', 'The field upper-cases input; a space shows "SKU may contain only uppercase letters, digits and hyphens"'],
          ['Enter more than 280 characters in Short description', '"Keep under 280 chars"'],
          ['Set Min order qty 10 and Max order qty 5', '"Max order qty must be ≥ min order qty"'],
          ['Leave Warehouse empty on a Duncit product', '"Warehouse is required"'],
          ['Clear Unit cost', '"Cost is required"'],
          ['Enter "not-a-url" as an image URL', '"Must be a valid URL"'],
          ['Add 21 tags', '"At most 20 tags"'],
        ],
      },
      {
        name: 'Edit a product and use the footer',
        description: 'Save & continue stays; Save changes returns to the list.',
        steps: [
          ['Open /inventory/<id>/edit', 'Heading shows the product name with its SKU chip, status chip and "Last edited by <name> · <time>"'],
          ['Change Current stock and watch the stock chip', 'The live stock indicator updates as counts change'],
          ['Click "Save & continue"', '"Saved" toast; the page stays on the editor and the footer returns to "All changes saved"'],
          ['Change the price and click "Save changes"', '"Saved" and the browser returns to /inventory'],
          ['Change a field and try to close the browser tab', 'The browser shows its leave-page warning because of unsaved changes'],
          ['Open /inventory/000000000000000000000000/edit', '"Product not found." with a "Back to duncit products" button'],
        ],
      },
      {
        name: 'Delivery charge and ShipRocket hints',
        description: 'The charge field depends on the delivery switches.',
        steps: [
          ['Turn off "Delivery available"', 'Delivery charge is disabled with hint "Enable "Delivery available" to set a charge"'],
          ['Turn it on with a Host or Venue delivery method', 'Hint "Flat fee per order; set 0 for free delivery"'],
          ['Pick the ShipRocket delivery method', 'Hint "Fallback only — charged when ShipRocket cannot rate the warehouse to the buyer."'],
          ['Read Shipping dimensions', 'Length, Breadth, Height (cm) and Weight (kg) with "Package size and weight used by ShipRocket to rate and book couriers."'],
        ],
      },
      {
        name: 'Duplicate, archive and restore from the editor',
        description: 'Header actions.',
        steps: [
          ['On /inventory/<id>/edit click "Duplicate"', 'The browser opens the editor of the new copy'],
          ['Click "Archive"', '"Archived" toast and the status chip reads ARCHIVED; the button becomes "Restore"'],
          ['Click "Restore"', '"Restored" toast and the status returns'],
          ['Read Activity & analytics on an existing product', 'Activity logs, stock movements ("No stock movements yet. Adjusting stock will start the timeline.") and an analytics chart'],
        ],
      },
      {
        name: 'Server refuses a duplicate SKU',
        description: 'Uniqueness is checked on save.',
        steps: [
          ['Save a product with an SKU another product already uses', 'The error Alert shows "Product SKU already exists"'],
          ['Close the Alert', 'The Alert disappears and the form keeps its values'],
        ],
      },
    ],
  },
  {
    name: 'Products: Catalog Brands',
    description: 'The /catalog/brands list of every seller brand at any status, the /catalog/brands/:brandId manage page (details, commission, visibility) and the brand products list.',
    sub_flows: [
      {
        name: 'Browse catalog brands',
        description: 'Approvals are not offered here.',
        steps: [
          ['Open /catalog/brands', 'Heading "Brands" explaining approvals live in Brands & Products Review'],
          ['Read the columns', 'Logo, Brand, Location, Approved products, Commission, Status, Active, Created and actions'],
          ['Search "Search brand, contact or city"', 'Matching brands remain, drafts and rejected included'],
          ['Click the products action on a brand', 'The browser opens /catalog/brands/<brandId>/products'],
          ['Click the manage action', 'The browser opens /catalog/brands/<brandId>'],
          ['With a filter matching nothing', '"No brands found for this filter."'],
        ],
      },
      {
        name: 'Edit brand details',
        description: 'Saves through adminUpdateEcommBrand without a status.',
        steps: [
          ['Open /catalog/brands/<brandId>', 'BackHeader "Catalog · Brands" with the brand name, a summary card, "Commercials & visibility" and "Brand details"'],
          ['Change Tagline and Contact phone and click "Save brand details"', 'The button reads "Saving…", then "Brand details saved"'],
          ['Clear Brand name and save', '"Brand name must be at least 2 characters"'],
          ['Enter "12ab" in Contact phone', '"Contact phone must be 6-15 digits"'],
          ['Enter "22" in Established year', '"Established year must be a 4-digit year"'],
          ['Enter "HDFC1" in IFSC code', '"Enter a valid IFSC code, e.g. HDFC0000001"'],
          ['Enter "abc" in Website URL', '"Website URL must be a valid URL"'],
          ['Open /catalog/brands/000000000000000000000000', '"Brand not found."'],
        ],
      },
      {
        name: 'Set brand commission',
        description: 'Commission form validation.',
        steps: [
          ['In Commercials & visibility enter 12.5 and click "Save commission"', '"Brand commission updated"'],
          ['Enter 150', '"Commission cannot exceed 100"'],
          ['Enter "abc"', '"Enter a percentage between 0 and 100"'],
        ],
      },
      {
        name: 'Deactivate and activate a brand',
        description: 'Hides the brand and its products; the owner is emailed.',
        steps: [
          ['Click "Deactivate" on an active brand', 'Confirm "Deactivate brand" says the brand and its products are hidden from the marketplace and pod product picker and the owner is emailed'],
          ['Confirm Deactivate', '"Brand deactivated" and the button becomes "Activate"'],
          ['Click "Activate" and confirm', '"Brand activated"'],
        ],
      },
      {
        name: 'Manage a brand product list',
        description: 'Pending and denied listings show beside approved ones.',
        steps: [
          ['Open /catalog/brands/<brandId>/products', 'BackHeader "Catalog · Brand products" with "Manage brand" and a table with Product, SKU, Price, Available, Listing review, Commission, Active, Status, Added and actions'],
          ['Click "Temporarily deactivate" on a product and confirm', '"Product temporarily deactivated"'],
          ['Click Archive and confirm "Archive product?"', '"Product archived"; the pause action is hidden on the archived row'],
          ['Click Restore and confirm', '"Product restored"'],
          ['Click Duplicate', '"Product duplicated as a draft copy" and the browser opens /catalog/brands/<brandId>/products/<newId>/edit'],
          ['Click a row', 'The editor opens for that product with breadcrumb back to the brand products'],
          ['Open the page for an unknown brand id', '"Brand not found — check the link you followed."'],
        ],
      },
    ],
  },
  {
    name: 'Products: Brands Review',
    description: 'The /ecomm/brands inbox of partner brand submissions: status toggle, review dialog with notes and tags, approve (grants E-commerce Manager) or reject, and the brand review detail page with pickup locations.',
    sub_flows: [
      {
        name: 'Approve a submitted brand',
        description: 'Approval grants the owner the E-commerce Manager role.',
        steps: [
          ['Open /ecomm/brands', 'Heading "Brands Review" with the status toggle SUBMITTED selected (SUBMITTED, APPROVED, REJECTED, DRAFT, ALL)'],
          ['Read the columns', 'Logo, Brand, Location, Approved products, Pickup, Status, Submitted, Created and Review'],
          ['Click Review on a submitted brand', 'A dialog with the brand name, status chip, brand details, Reviewer notes and Tags ("Comma separated. Saved on approval only.")'],
          ['Enter tags and click Approve', 'Confirm "Approve this brand?" explains the brand goes live and the owner gets the E-commerce Manager role'],
          ['Click "Yes, approve"', 'Success Alert "<brand> approved. The owner now has the E-commerce Manager role." and the row leaves the SUBMITTED list'],
        ],
      },
      {
        name: 'Reject a brand with notes',
        description: 'Notes are required to reject.',
        steps: [
          ['Open Review on a submitted brand with Reviewer notes empty', 'Reject is disabled; hint "Required to reject — the partner reads this."'],
          ['Type notes and click Reject', 'Confirm "Reject this brand?" says the partner sees the notes and can edit and resubmit'],
          ['Click "Back"', 'The confirm closes and the dialog stays open'],
          ['Click Reject then "Yes, reject"', 'Success Alert "<brand> rejected. The partner can edit and submit it again."'],
        ],
      },
      {
        name: 'Re-review an already decided brand',
        description: 'The dialog warns before overwriting.',
        steps: [
          ['Pick APPROVED in the toggle and click Review on a brand', 'Info "This brand is APPROVED, not awaiting review. Reviewing it again overwrites the previous decision."'],
          ['Click Cancel', 'The dialog closes with no change'],
        ],
      },
      {
        name: 'Open a brand review detail page',
        description: 'Approved products and pickup locations.',
        steps: [
          ['Click a brand row', '/ecomm/brands/<brandId> opens with "Back to Brands Review", the logo, name, status chip, city and contact, and "<n> approved products"'],
          ['Read Approved products', 'The brand approved products table, or "This brand has no approved products yet."'],
          ['Read the pickup panel', 'The brand pickup / warehouse locations with default, review and ShipRocket chips'],
          ['Open /ecomm/brands/000000000000000000000000', '"Brand not found."'],
        ],
      },
    ],
  },
  {
    name: 'Products: Products Reviews',
    description: 'The /ecomm/product-requests inbox of partner product listings: PENDING, APPROVED, DENIED, ALL toggle and a review dialog that approves or denies with an admin note and commission.',
    sub_flows: [
      {
        name: 'Approve a product listing',
        description: 'Approved listings become selectable in pods.',
        steps: [
          ['Open /ecomm/product-requests', 'Heading "Products Reviews" with PENDING selected'],
          ['Read the columns', 'Product, Delivery, Inventory, Commission, Status, Submitted and Review; search "Search product, SKU, brand or submitter"'],
          ['Click Review on a pending listing', 'Dialog "Review “<product>”" with listing details (variants, stock, weight, images), Admin note and Commission % ("5–50% Duncit cut. Blank keeps current.")'],
          ['Enter commission 12 and click Approve', 'Success Alert "Product approved for pod selection." and the row leaves PENDING'],
        ],
      },
      {
        name: 'Deny a product listing',
        description: 'Deny with an admin note.',
        steps: [
          ['Open Review on a pending listing, enter an Admin note and click Deny', 'Success Alert "Product request denied."'],
          ['Pick DENIED in the toggle', 'The denied listing is listed'],
          ['With nothing in the queue', '"No product requests found for this filter."'],
        ],
      },
      {
        name: 'Commission outside the allowed range',
        description: 'The server enforces 5-50%.',
        steps: [
          ['Open Review, enter commission 60 and click Approve', 'The dialog shows "Commission must be between 5% and 50%" and stays open'],
          ['Enter 3 and click Approve', 'The same error is shown'],
        ],
      },
    ],
  },
  {
    name: 'Products: Ecomm Requests',
    description: 'The /ecomm/brand-request and /ecomm/product-request pages propose edits to a brand or product that go to admin approval, with a Your requests history.',
    sub_flows: [
      {
        name: 'Submit a brand change request',
        description: 'Only changed fields are sent.',
        steps: [
          ['Open /ecomm/brand-request', 'Title "Brand Request" with its subtitle and a "Choose a brand" select ("Its current values pre-fill the form below.")'],
          ['Pick a brand', 'Brand name, Tagline, Description and Website URL fields appear prefilled, each with its hint'],
          ['Change the Tagline and click "Submit change request"', 'Snackbar "Change request submitted for approval." and the form resets'],
          ['Read Your requests', 'A card with the request title, a PENDING chip and "Tagline: <new value>"'],
        ],
      },
      {
        name: 'Submit with nothing changed',
        description: 'At least one field must change.',
        steps: [
          ['Pick a brand and click "Submit change request" without editing', 'Snackbar "Change at least one field before submitting."'],
        ],
      },
      {
        name: 'Submit a product change request',
        description: 'Numeric price is sent as a number.',
        steps: [
          ['Open /ecomm/product-request and choose a product', 'Product name, Short description, Description and Selling price (₹) fields appear prefilled'],
          ['Change Selling price and submit', '"Change request submitted for approval."'],
          ['Read Your requests after an admin denies it', 'The card shows a DENIED chip and "Reviewer: <notes>" in red'],
          ['Open the page with no requests yet', '"No change requests yet. Submit one above and it will appear here for review."'],
        ],
      },
    ],
  },
  {
    name: 'Products: Warehouse Approval',
    description: 'The /warehouse-approval list of partner warehouse requests: approve makes a warehouse usable for shipping, deny keeps it blocked.',
    sub_flows: [
      {
        name: 'Approve a pending warehouse',
        description: 'Approve and Deny show on pending cards only.',
        steps: [
          ['Open /warehouse-approval', 'Heading "Warehouse Approval" with PENDING selected (PENDING, APPROVED, DENIED, ALL)'],
          ['Read a pending card', 'Title, PENDING chip, summary and "By <name> · <date>" with Approve and Deny buttons'],
          ['Click Approve', 'The list refetches and the card leaves PENDING'],
          ['Pick APPROVED', 'The card shows an APPROVED chip with no buttons'],
          ['On the brand in Brands Review, check that pickup location', 'Its review chip reads Approved'],
        ],
      },
      {
        name: 'Deny a warehouse and empty queue',
        description: 'Denied warehouses stay blocked.',
        steps: [
          ['Click Deny on a pending card', 'The card moves to DENIED'],
          ['Pick PENDING with nothing left', 'Info "No warehouse requests."'],
          ['Approve a request that was already reviewed via the API', 'Error "This request has already been reviewed"'],
        ],
      },
    ],
  },
  {
    name: 'Products: Pickup Locations',
    description: 'The shared pickup-location panel used on brand review pages and on /settings/warehouses: add, edit, delete, set default and register with ShipRocket.',
    sub_flows: [
      {
        name: 'Add a pickup location',
        description: 'Dialog form with Zod rules.',
        steps: [
          ['Open /settings/warehouses and click "Add location"', 'Dialog "Add pickup location" with Nickname, Contact name, Phone, Email, Address line 1, Address line 2, City, State, Pincode, Country (India) and "Set as the default pickup location"'],
          ['Fill every required field and click "Save location"', 'The button reads "Saving…", then "Pickup location saved" and the location card appears'],
          ['Read the new card', 'Nickname, an "Awaiting approval" or review chip, a "Not registered" chip, contact and address lines'],
        ],
      },
      {
        name: 'Pickup location validation',
        description: 'Required fields and formats.',
        steps: [
          ['Enter "ab" as Nickname and blur', '"Nickname must be at least 3 characters"'],
          ['Enter a 9-digit phone', '"Enter a valid 10-digit phone number"'],
          ['Enter "abc" in Email', '"Enter a valid email"'],
          ['Enter a 5-digit pincode', '"Enter a valid 6-digit pincode"'],
          ['Clear City and State', '"City is required" and "State is required"'],
          ['Save a location with an existing nickname', 'Error "A warehouse with this nickname already exists"'],
        ],
      },
      {
        name: 'Edit, default and delete a location',
        description: 'Row actions.',
        steps: [
          ['Click the star "Set as default" on a non-default location', '"Default pickup location updated" and the card shows the Default chip; its star button is disabled'],
          ['Click Edit, change the contact name and save', 'Dialog "Edit pickup location" saves with "Pickup location saved"'],
          ['Click Delete on a location', '"Pickup location deleted" and the card disappears'],
          ['Open the panel with no locations on /settings/warehouses', '"No Duncit warehouses yet. Add one so products have a shipping origin."'],
        ],
      },
      {
        name: 'Register a location with ShipRocket',
        description: 'Manual retry of the automatic registration.',
        steps: [
          ['On an unregistered location read the card', 'If automatic registration failed, a warning Alert shows the reason; a "Register with ShipRocket" button is shown'],
          ['Click "Register with ShipRocket" with valid credentials configured', '"Registered with ShipRocket" and the chip reads "ShipRocket ready"'],
          ['Click it while ShipRocket credentials are missing', 'An error notification "ShipRocket is not configured. Add the credentials in the Tech portal."'],
        ],
      },
    ],
  },
  {
    name: 'Products: Orders & Fulfilment',
    description: 'The /orders table of product orders placed inside pods and the /orders/:orderId page to switch Ship/Pickup, move status, create ShipRocket shipments and sync tracking.',
    sub_flows: [
      {
        name: 'Browse product orders',
        description: 'Server-side table.',
        steps: [
          ['Open /orders', 'Heading "Product orders" with "Every product order placed inside a pod — fulfilment ops for shipping and pickup."'],
          ['Read the columns', 'Order, Buyer, Pod, Method chip, Status (e.g. Order placed, Courier assigned, Delivered), AWB, Total, Buyer email and Placed'],
          ['Search "Search order no, buyer or AWB"', 'Matching orders remain'],
          ['Filter Status to Delivered', 'Only delivered orders remain'],
          ['With nothing matching', '"No orders match these filters."'],
          ['Click a row', 'The browser opens /orders/<orderId>'],
        ],
      },
      {
        name: 'Move an order through its status',
        description: 'Set status with an optional note.',
        steps: [
          ['Open /orders/<orderId>', '"Back to orders", the order number with a status chip, the order summary (contact, pod date, payment ref, ship to, gross) and Fulfilment and Tracking cards'],
          ['Read the Fulfilment stepper', 'A SHIP order shows the ship ladder from "Order placed" to "Delivered"; the current step is active'],
          ['Look at "Update status" with the current status selected', 'The button is disabled'],
          ['Pick "Shipped" in "Set status to", type a note and click "Update status"', 'Snackbar "Status updated" and the chip reads Shipped'],
          ['Open /orders/000000000000000000000000', '"Order not found." with "Back to orders"'],
        ],
      },
      {
        name: 'Switch fulfilment method',
        description: 'Ship or Pickup.',
        steps: [
          ['On a SHIP order click the Pickup toggle', 'Snackbar "Fulfilment method updated"; the stepper switches to the pickup ladder and the shipment actions disappear'],
          ['Click Ship again', 'The ship ladder and the shipment section return'],
        ],
      },
      {
        name: 'Create a ShipRocket shipment and sync tracking',
        description: 'Only SHIP orders; the pickup must be registered.',
        steps: [
          ['On a SHIP order with no AWB read the shipment section', '"No shipment created yet." with "Create shipment"; "Sync tracking" is disabled'],
          ['Click "Create shipment"', 'Dialog "Create ShipRocket shipment" asks for the warehouse, preselecting the order pickup or the default location'],
          ['Pick a location that is not registered with ShipRocket', 'Warning "This location is not registered with ShipRocket yet. Register it from the brand page first." and "Create shipment" is disabled'],
          ['Pick a registered location and click "Create shipment"', 'The button reads "Creating…", then "Shipment created"; the section shows "AWB <number>", the courier and "Download shipping label"'],
          ['Click "Sync tracking"', 'Snackbar "Tracking synced" and the Tracking timeline lists events, or "No tracking updates yet."'],
          ['Create a shipment when ShipRocket rejects it', 'The page error Alert shows "ShipRocket error: <message>"'],
        ],
      },
    ],
  },
  {
    name: 'Products: Pod Shop Slider',
    description: 'The /settings/pod-shop-slider page curates the image/video slider at the top of the Pod Shop on the app and mWeb, with heading, subheading and CTA per slide.',
    sub_flows: [
      {
        name: 'Add and order slider media',
        description: 'The top item shows first.',
        steps: [
          ['Open /settings/pod-shop-slider', 'Heading "Pod Shop Slider" with its reorder hint and "Slider media (images & videos)" with "Add media"'],
          ['Click "Add media" and pick an image', 'A slide row appears with Heading ("Gear Up Your Game" placeholder), Subheading, CTA label and CTA link (URL or /path)'],
          ['Add a video slide and click "Move up" on it', 'The video moves above the image; "Move up" is disabled on the first row and "Move down" on the last'],
          ['Fill heading and CTA and click "Save slider"', 'The button reads "Saving…", then "Pod Shop slider updated"'],
          ['Reload the page', 'The slides return in the saved order with their text'],
        ],
      },
      {
        name: 'Remove a slide and handle save failure',
        description: 'Remove then save.',
        steps: [
          ['Click Remove on a slide and click "Save slider"', '"Pod Shop slider updated" and the slide is gone after reload'],
          ['Save while the mutation fails', 'Error notification with the server message, or "Could not save the slider"'],
        ],
      },
    ],
  },
];

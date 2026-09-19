import type { CatalogueFlow } from './catalogue.types';

/** End-to-end journeys through every page the Admin Panel (portals/admin, admin.duncit.com) routes. */
export const ADMIN_FLOWS: readonly CatalogueFlow[] = [
  {
    name: 'Admin: Console Access & Setup',
    description:
      'Who may use the Admin Panel, the first-time "Send Credentials to Admin" helper on its login page, and how role-limited admins are refused by the server. Shared sign-in and shell chrome are covered by the portal shell flows.',
    sub_flows: [
      {
        name: 'Allowed admin roles reach the Hub',
        description:
          'The admin console accepts SUPER_ADMIN, CITY_ADMIN, ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER (overridable with VITE_REQUIRED_ROLES).',
        steps: [
          ['Sign in at /login with a SUPER_ADMIN account', 'The session is kept under the admin_token key and the browser lands on /hub'],
          ['Sign out, then sign in with a CITY_ADMIN account', 'Sign-in succeeds and /hub opens with the same six module tiles'],
          ['Repeat with ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER accounts', 'Each one reaches /hub; the sidebar shows the full admin navigation for all of them'],
          ['Sign in with an account holding only USER or HOST', 'The shared access-denied message naming Duncit Admin is shown, no token is kept and the page stays on /login'],
        ],
      },
      {
        name: 'Unknown and retired routes fall back to the Hub',
        description: 'Admin routes only its own pages; anything else (including pods/clubs that moved to their own consoles) redirects to /hub.',
        steps: [
          ['While signed in, open /does-not-exist', 'The catch-all route replaces the URL with /hub'],
          ['Open /pods', 'Admin does not own Pods any more, so the URL is replaced with /hub'],
          ['Open /clubs and /auto-pods', 'Both redirect to /hub'],
          ['Sign out and open /users directly', 'The auth guard sends the browser to /login instead of rendering the page'],
        ],
      },
      {
        name: 'Send credentials to the seeded super admin',
        description: 'First-time setup helper under the login card, gated by a 5-character captcha and locked after one successful send.',
        steps: [
          ['Open /login', 'Below the login card an "or" divider, the "Send Credentials to Admin" button and the caption "First-time setup helper. Disable in production once configured." are shown'],
          ['Click "Send Credentials to Admin"', 'A dialog titled "Confirm you\'re human" shows a 5-character code, a refresh icon and an empty Captcha field; "Send credentials" is disabled'],
          ['Click the refresh icon (aria "refresh captcha")', 'A new code is drawn and the Captcha field is cleared'],
          ['Type a wrong code and click "Send credentials"', 'Helper text reads "That does not match. Please try again." and a fresh code replaces the old one'],
          ['Type the displayed code (case-insensitive) and click "Send credentials"', 'The button reads "Sending…", then the dialog closes'],
          ['Read the alert under the button', 'A success alert says "Super admin created: <email>" or "Super admin already exists: <email>", followed by " — credentials emailed." or " — email not sent (check SMTP)."'],
          ['Look at the helper button again', 'It now reads "Credentials sent" and is disabled, so it cannot be pressed twice'],
        ],
      },
      {
        name: 'Role-limited admins are refused by the server',
        description: 'Every admin role can open the console, but each mutation re-checks the role on the server and answers "Access Denied".',
        steps: [
          ['As SUPPORT_USER open /users, click "Create User", fill a valid form and submit', 'The dialog stays open with an error alert "Access Denied" (only SUPER_ADMIN, CITY_ADMIN and ZONAL_ADMIN may create users)'],
          ['As FINANCE_USER open /users', 'The users table shows its error alert "Access Denied" instead of rows'],
          ['As CITY_ADMIN open /settings', 'Appearance, Display formats, Time zone & source and Minimum age cards render; the Account deletion card is not rendered at all'],
          ['As CITY_ADMIN change the date format and click Save', 'An error alert "Access Denied" appears in the card; app settings are writable only by SUPER_ADMIN and TECH_MANAGER'],
          ['As CITY_ADMIN open /branding and click "Save Branding"', 'An error alert "Access Denied" appears above the Save button and nothing is persisted'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Hub & Navigation',
    description: 'The /hub landing board, the admin sidebar groups and the header search keywords defined in the admin app config.',
    sub_flows: [
      {
        name: 'Open a module from the Hub',
        description: 'Six module tiles, each a navigation shortcut.',
        steps: [
          ['Open /hub', 'The heading types out "Welcome <full name>" (falls back to email, then "Admin"), with "Pick a module to get started. Each section opens its own focused workspace." below'],
          ['Read the tiles', 'Six tiles labelled Module: Dashboard, User Management, Catalog, Community, Engagement and System, each with its hint (e.g. "Users and portal access roles.")'],
          ['Click the Dashboard tile', 'Navigates to /dashboard'],
          ['Go back and click User Management, then Catalog, then Engagement, then System', 'They open /users, /categories, /badges and /branding respectively'],
          ['Click the Community tile', 'It points at /clubs, which admin no longer routes, so the browser is redirected back to /hub'],
        ],
      },
      {
        name: 'Customise the Hub layout',
        description: 'Each tile is a draggable dashboard widget whose layout is saved per user on the server.',
        steps: [
          ['On /hub click "Customise layout"', 'The board enters "Editing layout" with the hint "Drag widgets by their handle, or drag a corner to resize." and Save layout / Cancel / Reset to default controls'],
          ['Drag the System tile to the first position and click "Save layout"', 'The button shows "Saving…", edit mode ends and System stays first'],
          ['Reload the page', 'The saved arrangement is restored for this admin only'],
          ['Enter edit mode, move a tile, then click Cancel', 'The move is discarded and the saved layout returns'],
          ['Enter edit mode and click "Reset to default"', 'A confirm titled "Reset this dashboard?" explains the saved arrangement is deleted for you only'],
          ['Confirm with "Reset layout"', 'Tiles return to the default order Dashboard, User Management, Catalog, Community, Engagement, System'],
        ],
      },
      {
        name: 'Navigate with the admin sidebar',
        description: 'The sidebar groups every admin route.',
        steps: [
          ['Expand the sidebar', 'Entries: Dashboard; User Management (All Users, Roles); Partners; Membership (Plans, Subscribers); Catalog (Categories, Locations); Engagement (Badges, Something for you); Approvals; Portal Access'],
          ['Scroll the sidebar', 'Further entries: Upload Settings (Portals Upload Setting, Mobile App, mWeb Upload Setting); Localization (Locales, Translations); System (Branding, Settings, Portal App Setting)'],
          ['Click All Users, then Roles', 'Opens /users and /rbac/roles'],
          ['Click Membership > Subscribers and Upload Settings > Mobile App', 'Opens /membership/subscribers and /upload-settings/mobile'],
          ['Click System > Portal App Setting', 'Opens /portal-app-settings'],
        ],
      },
      {
        name: 'Jump to a page with header search keywords',
        description: 'The admin search index carries extra keywords per page.',
        steps: [
          ['Type "rbac" in the header search', 'The Roles result under User Management is offered; selecting it opens /rbac/roles'],
          ['Type "waitlist"', 'Subscribers under Membership is offered and opens /membership/subscribers'],
          ['Type "crop"', 'Portals Upload Setting, Mobile App and mWeb Upload Setting are offered'],
          ['Type "jump"', 'Portal Access (section Approvals) is offered and opens /portal-access'],
          ['Type "coworker"', 'Portal App Setting is offered and opens /portal-app-settings'],
          ['Type "logo"', 'Branding under System is offered and opens /branding'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Dashboard',
    description: 'Live platform totals and per-super-category counts on /dashboard (dashboardTotals is readable by SUPER_ADMIN and CITY_ADMIN).',
    sub_flows: [
      {
        name: 'Review platform totals',
        description: 'Summary tiles and the two doughnut widgets.',
        steps: [
          ['Open /dashboard as SUPER_ADMIN', 'Heading "Dashboard" with "Monitor users, pods, clubs and live activity from one workspace." and a Super Category select set to "All super categories"'],
          ['Watch the tiles while totals load', 'Six tiles Users, Pods, Clubs, Venues, Hosts and Support Tickets show "…" and then whole-number counts'],
          ['Read the "Pods by super category" widget', 'A doughnut chart plus one card per super category with its count, and "Total N" in the widget header'],
          ['Read the "Clubs by super category" widget', 'The same layout for clubs; a category with no name is labelled "Uncategorised"'],
          ['View the dashboard on a database with no super categories', 'Both widgets show "No super categories yet." and "Total 0"'],
        ],
      },
      {
        name: 'Filter totals by super category',
        description: 'The header select drives every widget.',
        steps: [
          ['Open the Super Category select', 'Options are "All super categories" followed by every SUPER-level category name'],
          ['Pick one super category (e.g. Human)', 'Totals refetch with that slug; the pods and clubs widgets and their totals change to that super category only'],
          ['Pick "All super categories" again', 'Platform-wide totals return'],
        ],
      },
      {
        name: 'Open lists from summary tiles',
        description: 'Only some tiles link anywhere.',
        steps: [
          ['Click the Users tile', 'Navigates to /users'],
          ['Go back and click the Pods tile', 'It links to /pods, which admin does not route, so the browser lands on /hub'],
          ['Go back and click the Clubs tile', 'It links to /clubs and likewise lands on /hub'],
          ['Click the Venues, Hosts and Support Tickets tiles', 'Nothing happens; these tiles have no link'],
        ],
      },
      {
        name: 'Rearrange dashboard widgets',
        description: 'The dashboard id admin.overview is saved per user.',
        steps: [
          ['Click "Customise layout", drag "Clubs by super category" above "Pods by super category"', 'The widgets swap while in edit mode'],
          ['Click "Save layout" and reload', 'The clubs widget stays above the pods widget'],
          ['Click "Customise layout" then "Reset to default" and confirm "Reset layout"', 'Tiles, pods widget and clubs widget return to the default top-to-bottom order'],
        ],
      },
      {
        name: 'Dashboard for roles without totals access',
        description: 'ZONAL_ADMIN, SUPPORT_USER and FINANCE_USER are refused by dashboardTotals.',
        steps: [
          ['Sign in as ZONAL_ADMIN and open /dashboard', 'The page renders but every tile shows 0 once loading ends'],
          ['Read both widgets', 'Each shows "Total 0" and "No super categories yet." because the server answered Access Denied'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Users',
    description: 'The user directory at /users: server-paged search, filters, CSV export and the Create User dialog (React Hook Form + Zod).',
    sub_flows: [
      {
        name: 'Browse and search users',
        description: 'The admin-users DuncitTable.',
        steps: [
          ['Open /users', 'Heading "Users" and "Manage accounts, login methods, roles and access state. Click a row to open details." above the table; rows sorted by Created, newest first'],
          ['Read a row', 'User (avatar, name or "Unnamed user", email or "No email", linked Google address), Contact (phone or —, "city · zone" or "No location"), Roles chips, Login Method, Status, Created'],
          ['Read the Login Method cell', 'A Google, Phone OTP or Email chip with the last login date below, or "Not tracked yet"'],
          ['Type part of a name, email or phone into "Search name, email or phone"', 'The table refetches from the server and only matching users remain'],
          ['Search for text that matches nobody', 'The table shows "No users match the current filters."'],
        ],
      },
      {
        name: 'Filter, sort, choose columns and export users',
        description: 'Typed per-column filters and toolbar tools.',
        steps: [
          ['Open the Roles column filter and pick HOST', 'A filter chip appears and only users holding HOST are listed'],
          ['Add a Status filter of SUSPENDED and a Login Method filter of GOOGLE', 'Two more chips appear; rows satisfy all three filters'],
          ['Click "Clear all"', 'All filter chips are removed and the full list returns'],
          ['Open "Columns" and enable Google Account, City, Zone and Last Login', 'The hidden columns appear; the choice persists for this table on reload'],
          ['Click a sortable header such as Created', 'The query re-runs with the new sort direction and the arrow flips'],
          ['Click "Export CSV"', 'A file named admin-users.csv with the visible rows downloads'],
        ],
      },
      {
        name: 'Create a user',
        description: 'Admin-created accounts get a generated temporary password and a welcome email when an email is given.',
        steps: [
          ['Click "Create User"', 'Dialog "Create User" opens with phone code +91, Roles preset to USER and a 12-character Temporary password already filled'],
          ['Click the dice icon (tooltip "Generate") beside the password', 'A new random password replaces the old one; the eye icon toggles it between hidden and visible'],
          ['Fill First name, Last name, Email, Phone number and pick a Date of birth', 'The date picker disables future dates; no errors show for valid values'],
          ['Open Roles and add CRM_MANAGER', 'Menu items read "Name (KEY)"; both USER and CRM Manager are selected'],
          ['Enter City and Zone, then click "Create User"', 'The button reads "Creating…", the dialog closes and the table refetches'],
          ['Search for the new user', 'The row shows the chosen roles, status ACTIVE and Created now; a welcome email is sent to the given address and a CREATE change log is written'],
        ],
      },
      {
        name: 'Create user validation errors',
        description: 'Zod rules from @duncit/forms, shown on touch or submit.',
        steps: [
          ['Open Create User, clear First name, Last name and Phone number and submit', 'Errors "First name is required", "Last name is required" and "Phone number must contain only digits (6-15 digits)" appear; nothing is sent'],
          ['Type "J0hn" as First name', 'Error "First name can use letters, spaces, apostrophes, periods and hyphens only"'],
          ['Type "abc" as Email', 'Error "Enter a valid email"'],
          ['Set the phone code to "91x"', 'Error "Phone code is invalid"'],
          ['Replace the password with "short"', 'Error "Min 8 characters"'],
          ['Leave Date of birth empty and submit', 'Error "Date of birth is required"'],
          ['Deselect every role', 'Error "At least one role is required"'],
          ['Type 81 characters into City', 'Error "City must be 80 characters or fewer"'],
        ],
      },
      {
        name: 'Create user server conflicts',
        description: 'Errors returned by createUser stay inside the dialog.',
        steps: [
          ['Create a user with an email already registered', 'An error alert "Email already in use" appears and the dialog stays open with the typed values'],
          ['As CITY_ADMIN create a user whose City differs from your assigned city', 'Error alert "Out of city scope"'],
          ['Click Cancel while no request is running', 'The dialog closes and no user is created'],
        ],
      },
      {
        name: 'Open a user from the list',
        description: 'Row click opens the details page.',
        steps: [
          ['Click any user row', 'Navigates to /users/<user_id> and the details page loads for that user'],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Profile & Account Status',
    description: 'The /users/:user_id header, summary card and Profile tab: editing profile and contact fields, photo, status changes and deletion.',
    sub_flows: [
      {
        name: 'Open user details',
        description: 'Header, summary card and tab strip.',
        steps: [
          ['Open /users/<user_id>', 'A spinner shows, then the header "Users / Details" with the full name (or email, or id) and buttons Call, Email, status actions and Delete'],
          ['Read the summary card', 'Avatar, status chip (Active, Inactive or Blocked), a "Verified" chip when the email is verified, and rows Email, Phone, WhatsApp number, City, Zone, Assigned City, Assigned Zones, Created, Updated'],
          ['Read the tab strip', 'Tabs Profile, Interests, Access, Badges, Verification, Surveys, Health, Activity, Call & Email Logs, User Change Logs; Profile is selected'],
          ['Click the Health tab and reload', 'The URL carries ?selectedtab=health and the Health tab is still open after reload'],
          ['Click the back arrow or the "Users" breadcrumb', 'Navigates to /users'],
        ],
      },
      {
        name: 'User not found',
        description: 'A missing record shows a warning rather than a blank page.',
        steps: [
          ['Open /users/<a valid but unused id>', 'A warning alert "User not found." replaces the page'],
          ['Open /users/not-an-id', 'An error alert with the server message is shown instead of the details'],
        ],
      },
      {
        name: 'Edit profile fields',
        description: 'Profile tab form validated with userProfileSchema; Save Changes enables only when dirty and valid.',
        steps: [
          ['Open the Profile tab', 'Fields load with the user values and "Save Changes" is disabled'],
          ['Change First name and Bio', '"Save Changes" becomes enabled'],
          ['Pick a State in the State autocomplete', 'The City field is cleared and enabled, and loads the cities of that state (free text is also accepted)'],
          ['Choose a City, type a Pincode, Zone, Assigned city and "Pune East, Pune West" as Assigned zones', 'No validation errors appear'],
          ['Pick Status Blocked in the Status select and click "Save Changes"', 'The button reads "Saving…", then a snackbar "User updated" shows and the summary card reflects the new values'],
          ['Open the User Change Logs tab', 'One row per changed field is recorded with Updated By Admin and Source Admin Portal'],
        ],
      },
      {
        name: 'Edit contact details without a one-time code',
        description: 'Admins save email, phone and WhatsApp directly; blanks clear them.',
        steps: [
          ['Read the Email helper on the Profile tab', 'It says "Email, phone and WhatsApp save straight away here. On the app they need a one-time code."'],
          ['Enter WhatsApp code +91 and a 10-digit WhatsApp number, then save', 'Snackbar "User updated"; the summary WhatsApp number row shows "+91 <number>"'],
          ['Empty the Phone number box and save', 'The phone is cleared on the server and the summary Phone row shows —'],
          ['Set Email to an address owned by another account and save', 'An error alert "Email already in use" appears under the form and nothing is written'],
          ['Set the phone to a number registered to another account and save', 'Error alert "This phone number is already registered to another account"'],
        ],
      },
      {
        name: 'Profile validation errors',
        description: 'Invalid values keep Save Changes disabled.',
        steps: [
          ['Clear First name', 'Error "First name is required" and "Save Changes" is disabled'],
          ['Type "12ab" as WhatsApp number', 'Error "WhatsApp number must contain only digits (6-15 digits)"'],
          ['Type "!!" as Pincode', 'Error "Pincode must be 3–12 letters, digits, spaces or hyphens"'],
          ['Paste 501 characters into Bio', 'Error "Bio must be 500 characters or fewer"'],
          ['Type 81 characters into Zone', 'Error "Zone must be 80 characters or fewer"'],
        ],
      },
      {
        name: 'Update the profile photo',
        description: 'The summary card photo button uses the shared media picker.',
        steps: [
          ['Click "Update Photo" on the summary card', 'The media dialog opens with tabs "Upload from device", "Pexels photos" and "Pexels videos"'],
          ['Upload an image from the device and click "Use this image"', 'The button reads "Updating...", then a snackbar "Profile photo updated" shows'],
          ['Look at the avatar', 'It now shows the uploaded image and the Profile photo URL field holds the new URL'],
        ],
      },
      {
        name: 'Block, unblock, deactivate and activate an account',
        description: 'Header status buttons write updateUser with only the status; a suspension notifies the member by email and WhatsApp.',
        steps: [
          ['Open an ACTIVE user', 'Header shows Deactivate and Block (no Activate or Unblock)'],
          ['Click Block', 'Snackbar "Status set to Blocked", the status chip turns red "Blocked"; the member is sent the suspension email and WhatsApp'],
          ['Read the header buttons', 'Activate, Deactivate and Unblock are shown'],
          ['Click Unblock', 'Snackbar "Status set to Active" and the chip returns to green "Active"'],
          ['Click Deactivate', 'Snackbar "Status set to Inactive"; header now shows Activate and Block'],
          ['Click Activate', 'Snackbar "Status set to Active"'],
        ],
      },
      {
        name: 'Delete a user',
        description: 'Soft delete behind a destructive confirmation.',
        steps: [
          ['Click Delete in the header', 'Dialog "Delete this user?" says "This action permanently removes the account. It cannot be undone." with Cancel and "Delete User"'],
          ['Click Cancel', 'The dialog closes and the user is untouched'],
          ['Click Delete again and confirm with "Delete User"', 'The browser navigates to /users; the account is soft-deleted (deleted_at set, marked inactive) and a DELETE change log is written'],
          ['Open your own admin account and confirm delete', 'The server refuses a self-delete (returns false); the page still returns to /users and your account remains listed'],
          ['As ZONAL_ADMIN try to delete a user', 'The dialog stays open and the Profile tab shows the error "Access Denied"; only SUPER_ADMIN and CITY_ADMIN may delete'],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Roles & Host Categories',
    description: 'The Access tab and the "Portal Access" roles dialog: one role per console, the mandatory USER role and host categories stored on the host profile. assignUserRoles is SUPER_ADMIN only.',
    sub_flows: [
      {
        name: 'View assigned roles',
        description: 'The Roles card on the Access tab.',
        steps: [
          ['Open the Access tab', 'Card "Roles" with "Roles determine what this user can do." and a "Manage Roles" button'],
          ['Read the chips', 'One outlined chip per role using the role name (e.g. "Super Admin")'],
          ['Open a user with no roles', 'A warning alert "No roles assigned." is shown instead of chips'],
        ],
      },
      {
        name: 'Grant and revoke portal roles',
        description: 'Switches per portal card.',
        steps: [
          ['Click "Manage Roles"', 'Dialog "Portal Access" says "Choose which portals this user can access. Granting a portal gives full access to it." and lists portal cards'],
          ['Read the Duncit App card', 'Links "mWeb · mweb.duncit.com" and "Native · native.duncit.com"; roles User (switch on, disabled, "Default" chip), Host, Venue Owner, E-commerce Manager, Club Admin, Regional Club Admin'],
          ['Scroll the cards', 'Admin (Super Admin), Ads, CRM, Finance, Tech, Support, Website, Legal, AI, Products, Marketing, HR, Employee, Onboarding, Challenges, Developers, Regional Club Admin, Venues, Clubs, Club Admins, Hosts, Pods'],
          ['Switch on CRM Manager and switch off an existing Tech Manager role', 'The switches flip; nothing is saved yet'],
          ['Click Save', 'Button reads "Saving…", the dialog closes, snackbar "Roles updated" and the role chips update; USER is always kept'],
          ['Grant Host to a user who did not have it and save', 'The member receives the partner-access email for the new partner role and a change log row is written'],
        ],
      },
      {
        name: 'Open a portal from the roles dialog',
        description: 'Each surface link opens in a new tab.',
        steps: [
          ['Hover the open-in-new icon on the CRM card', 'Tooltip reads "Open https://crm.duncit.com/"'],
          ['Click it', 'The CRM console opens in a new browser tab; the dialog stays open'],
        ],
      },
      {
        name: 'Edit host categories',
        description: 'Categories live on the host profile, not the role; incomplete rows are dropped on save.',
        steps: [
          ['Open Manage Roles for a user with a host profile and switch Host on', 'A "Host categories" card appears: "Which Super → Category → Sub this host may create pods in. A host can hold several."'],
          ['Read the card when no categories are stored', 'Text "No categories yet — this host cannot create pods until one is added."'],
          ['Click "Add category" and choose Super, Category and Sub in the cascade', 'A complete row is shown with a delete icon (aria "Remove category")'],
          ['Add a second row but choose only a Super', 'The partial row is kept on screen'],
          ['Click Save', 'Roles save, then adminSetHostCategories saves only the complete row; reopening the dialog shows one category'],
          ['Remove the row with its delete icon and save', 'The host profile has no categories left'],
        ],
      },
      {
        name: 'Grant Host to a user without a host profile',
        description: 'The role can be granted but there is nothing to attach categories to.',
        steps: [
          ['Open Manage Roles for a user who never onboarded as a host and switch Host on', 'An info alert says the user has no host profile yet and the profile must be created in the Onboarding portal'],
          ['Click Save', 'Snackbar "Roles updated"; the HOST chip appears and no categories are written'],
        ],
      },
      {
        name: 'Cancel role edits',
        description: 'The dialog re-hydrates from saved state every time it opens.',
        steps: [
          ['Open Manage Roles, toggle several roles and add a category row', 'The dialog reflects the unsaved changes'],
          ['Click Cancel and reopen Manage Roles', 'Switches match the saved roles and host categories match the stored profile'],
        ],
      },
      {
        name: 'Non-super admin cannot assign roles',
        description: 'Only SUPER_ADMIN may assign roles.',
        steps: [
          ['Sign in as CITY_ADMIN, open a user, click Manage Roles, change a role and click Save', 'The dialog stays open and no roles change'],
          ['Close the dialog and open the Profile tab', 'An error alert "Access Denied" is shown'],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Interests, Badges & Surveys',
    description: 'Read-only tabs on user details showing signup interests, earned badges and onboarding survey answers.',
    sub_flows: [
      {
        name: 'Review signup survey interests',
        description: 'Interests tab.',
        steps: [
          ['Open the Interests tab', 'Card "Signup Survey Interests" with one chip per interest reading "<name> · Super", "· Category" or "· Subcategory"; Super chips are primary coloured'],
          ['Read the caption under the chips', '"Stored by category ID for dynamic category updates."'],
          ['Open a user who skipped the survey', 'Text "No survey interests saved yet."'],
        ],
      },
      {
        name: 'Review earned badges',
        description: 'Badges tab.',
        steps: [
          ['Open the Badges tab', 'Heading "Badges (N)" and a grid of badge images (a trophy icon when a badge has no image) with titles'],
          ['Open a user with no badges', 'Text "No badges earned yet."'],
        ],
      },
      {
        name: 'Review onboarding survey answers',
        description: 'Surveys tab shows venue and host onboarding answers.',
        steps: [
          ['Open the Surveys tab for a venue owner', 'A card with chip "Venue survey", "Submitted <date time>" in the admin date format, and each question label with its answer (— when blank)'],
          ['Open a user who answered both surveys', 'Separate "Venue survey" and "Host survey" cards are shown'],
          ['Open a survey response with no items', 'The card reads "No answers."'],
          ['Open a user who never submitted a survey', 'Text "This user hasn\'t submitted any onboarding survey yet."'],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Verification Review',
    description: 'Verification tab: Identity (document) and Address rows are approved or rejected by admins; Email is verified by the app.',
    sub_flows: [
      {
        name: 'Browse verification rows',
        description: 'One row per verification type.',
        steps: [
          ['Open the Verification tab', 'Table rows Identity, Address and Email with columns Type, Status, Details and Review'],
          ['Read the Status chips', 'Values are Not Verified, Under Review (amber), Approved (green), Rejected (red) or Verified by the App (green)'],
          ['Click "View" in the Identity Details cell', 'The uploaded document opens in a new tab'],
          ['Read the Address Details cell', 'Line 1, line 2, city/state/pincode and country joined with commas, or — when empty'],
          ['Filter Status by "Under Review" and search "Search type or status"', 'Only matching rows remain; "No verifications yet." shows when none match'],
        ],
      },
      {
        name: 'Approve a pending identity document',
        description: 'Only pending Identity or Address rows show review controls.',
        steps: [
          ['Find the Identity row with status Under Review', 'The Review cell shows a "Reject reason" input, Approve and Reject buttons'],
          ['Click Approve', 'Both buttons disable while saving; the table refetches'],
          ['Read the Identity row', 'Status is Approved and the Review cell now reads "No review needed"; the reviewer and time are stored'],
        ],
      },
      {
        name: 'Reject an address with a reason',
        description: 'The reason is stored only for rejections.',
        steps: [
          ['On the pending Address row type "Proof does not match address" into Reject reason', 'The text appears in the cell input'],
          ['Click Reject', 'The row refetches with status Rejected and the reason saved on the verification record'],
        ],
      },
      {
        name: 'Settled and app-verified rows are locked',
        description: 'No second verdict on a decided document.',
        steps: [
          ['Look at an Approved or Rejected row', 'Review cell reads "No review needed" with no buttons'],
          ['Look at the Email row in any state', 'Review cell reads "No review needed" because email is verified by the app'],
        ],
      },
      {
        name: 'Review failure message',
        description: 'Server errors surface as an error toast.',
        steps: [
          ['Sign in as FINANCE_USER and open the Verification tab', 'The table shows its error alert "Access Denied"'],
          ['Trigger a review failure (e.g. the server rejects the call)', 'An error toast shows the server message (fallback "Could not save review") and the row keeps its previous status'],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Account Health',
    description: 'Health tab: the member account health score, admin adjustments with remarks the member can read, and their edit/delete history (SUPER_ADMIN and CITY_ADMIN).',
    sub_flows: [
      {
        name: 'Read the health score',
        description: 'Score card and adjustment history.',
        steps: [
          ['Open the Health tab', 'Heading "Account Health" with "Default score is 100. Use the Adjust action to decrease or increase it with a remark — remarks are visible to the user when they tap their meter."'],
          ['Read the score card', 'A circle with the total score coloured by band (red, amber, green), a "User" chip and "Base: X · Admin adjustment: +Y · Final: Z/100"'],
          ['Read the history for a user with no adjustments', 'Info alert "No admin adjustments yet. Default score is 100."'],
        ],
      },
      {
        name: 'Add a health adjustment',
        description: 'Adjust dialog with projected score.',
        steps: [
          ['Click Adjust', 'Dialog "Adjust user health" with caption "<name> · current N/100", Decrease/Increase toggle on Increase and Magnitude 5'],
          ['Click Decrease and set Magnitude to 10', 'Helper reads "Applied as -10. Projected score: <N-10>/100."'],
          ['Type a remark', 'The counter reads "<len>/500 · The user sees this when they tap the meter."'],
          ['Click "Save adjustment"', 'Button shows "Saving…", the dialog closes and the score updates'],
          ['Read the history', 'A new row with a red "-10" chip, the remark, the admin name and date time'],
        ],
      },
      {
        name: 'Edit a health adjustment',
        description: 'Editing swaps the old delta for the new one.',
        steps: [
          ['Click the Edit icon on a history row', 'Dialog "Edit user health" opens prefilled with that direction, magnitude and remark'],
          ['Change Magnitude from 10 to 4', 'The projected score is computed from the current score minus the old delta plus the new delta'],
          ['Click "Save adjustment"', 'The row now shows the new value and the final score is recomputed'],
        ],
      },
      {
        name: 'Delete a health adjustment',
        description: 'Destructive confirmation before recomputing.',
        steps: [
          ['Click the Delete icon on a history row', 'Confirm "Delete adjustment" says "This removes the adjustment and recomputes the score. This cannot be undone."'],
          ['Cancel the confirm', 'The row is still listed'],
          ['Delete again and confirm with Delete', 'The row disappears and the final score is recomputed without it'],
        ],
      },
      {
        name: 'Health adjustment validation and access',
        description: 'Client and server guards.',
        steps: [
          ['Open Adjust, set Magnitude to 0 and save', 'Error alert "Enter an adjustment between 1 and 100." and nothing is sent'],
          ['Set Magnitude to 150 and save', 'Server error alert "Delta must be a non-zero integer between -100 and 100"'],
          ['Paste more than 500 characters into the remark', 'Input stops at 500 characters'],
          ['As ZONAL_ADMIN open the Health tab', 'An error alert "Access Denied" is shown instead of the score'],
        ],
      },
    ],
  },
  {
    name: 'Admin: User App Activity',
    description: 'Activity tab: the yearly app-visit heatmap, the per-day clickstream journey and deleting activity data.',
    sub_flows: [
      {
        name: 'Read the yearly activity calendar',
        description: 'Heatmap per year.',
        steps: [
          ['Open the Activity tab', 'Card "App Visit Activity" with "N visits recorded in <year>." and a Year select set to the current year'],
          ['Hover a coloured day', 'Tooltip reads "<count> events on YYYY-MM-DD" ("event" for a single one)'],
          ['Choose another year from the Year select', 'Only years with data are offered; the calendar and visit count reload for that year'],
        ],
      },
      {
        name: 'Open a day journey',
        description: 'Clickstream dialog with page and action filters.',
        steps: [
          ['Click a day block (or focus it and press Enter)', 'Dialog "User Journey · YYYY-MM-DD" shows a spinner and then the events'],
          ['Read an event', 'Event type chip, time in the admin time format, super category chip, target label or title, path, link and a metadata summary'],
          ['Pick a page in the Page filter', 'Only events on that page and a chart of them remain; "All pages" restores the list'],
          ['Pick an Action that has no events on the chosen page', 'Info alert "No events match the selected filters."'],
          ['Open a day with no clickstream', 'Info alert "No clickstream events recorded for this day."'],
        ],
      },
      {
        name: 'Delete one day of activity',
        description: 'Deletes a single date without a confirmation.',
        steps: [
          ['Look at the "Delete day" date field and "Delete Day" button', 'Delete Day is disabled while no date is chosen; future dates cannot be picked'],
          ['Click a day in the calendar and close the journey dialog', 'The Delete day field now holds that date'],
          ['Click "Delete Day"', 'The date is cleared, the calendar refetches and that day has no events'],
        ],
      },
      {
        name: 'Delete a year of activity',
        description: 'Destructive confirmation for a whole year.',
        steps: [
          ['Click "Delete Year"', 'Confirm "Delete activity" asks "Delete all <year> activity for this user?"'],
          ['Cancel', 'The calendar is unchanged'],
          ['Click "Delete Year" again and confirm with Delete', 'The calendar empties and the card reads "0 visits recorded in <year>."'],
        ],
      },
      {
        name: 'Activity access for other roles',
        description: 'Activity queries are SUPER_ADMIN and CITY_ADMIN only.',
        steps: [
          ['As SUPPORT_USER open the Activity tab', 'An error alert "Access Denied" is shown above an empty calendar'],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Call & Email Logs',
    description: 'Logging calls and emails to a member from the user header, Twilio recorded calls, and the Call & Email Logs table.',
    sub_flows: [
      {
        name: 'Log a phone call',
        description: 'Call dialog with call statuses.',
        steps: [
          ['Click Call in the user header', 'Draggable dialog "Call User" with the user name, a disabled Phone field holding code plus number, Status LOGGED, Duration seconds 0, Recording URL and Notes'],
          ['Open Status', 'Options LOGGED, CONNECTED, MISSED and VOICEMAIL'],
          ['Choose CONNECTED, set Duration seconds 180, add notes and click "Save Log"', 'Button reads "Saving...", the dialog closes and a snackbar "Contact log saved" shows'],
          ['Open the Call & Email Logs tab', 'A new CALL row with the phone target, CONNECTED, the notes and "(180s)" after the date time'],
          ['Click "Open Dialer" in the dialog', 'The device dialer is opened with a tel: link for the target'],
        ],
      },
      {
        name: 'Log an email',
        description: 'Email dialog with subject and email statuses.',
        steps: [
          ['Click Email in the user header', 'Dialog "Email User" with a disabled Email field, Subject, Status LOGGED and Notes (no duration or recording fields)'],
          ['Open Status', 'Options LOGGED, SENT, BOUNCED and REPLIED'],
          ['Type a Subject and click "Open Email"', 'The mail client opens with mailto:<email>?subject=<subject>'],
          ['Choose SENT and click "Save Log"', 'Snackbar "Contact log saved" and an EMAIL row with the subject appears in the logs table'],
        ],
      },
      {
        name: 'Start a recorded call',
        description: 'Twilio-backed calls.',
        steps: [
          ['In "Call User" type notes and click "Start Recorded Call"', 'On a configured server the call starts, the dialog closes and the logs table gets a CALL row'],
          ['Try the same on a server without Twilio credentials', 'Error alert "Twilio recorded calls are not configured" inside the dialog'],
        ],
      },
      {
        name: 'Contact log validation',
        description: 'Zod rules for contact actions and missing targets.',
        steps: [
          ['Set Duration seconds to -1 and click Save Log', 'Error "Duration cannot be negative"'],
          ['Set Duration seconds to 90000', 'Error "Duration cannot exceed 24 hours"'],
          ['Type "ftp://file" as Recording URL', 'Error "Recording URL must start with http:// or https://"'],
          ['In the email dialog type 161 characters of Subject', 'Error "Subject must be 160 characters or fewer"'],
          ['Open Call for a user with no phone number', 'Phone helper says "No target available for this contact action." and Save Log, Open Dialer and Start Recorded Call are disabled'],
        ],
      },
      {
        name: 'Browse and delete contact logs',
        description: 'The admin-user-contact-actions table.',
        steps: [
          ['Open the Call & Email Logs tab', 'Heading "Call & Email Logs" with columns Type, Target, Status, Notes, When and Actions, newest first'],
          ['Filter Type to Call and search "Search target, subject or notes"', 'Only matching CALL rows remain'],
          ['Click "Recording" in a Notes cell', 'The call recording URL opens in a new tab'],
          ['Click the delete icon (aria "delete contact log") on a row', 'The row is removed immediately without a confirmation'],
          ['Open a user with no logs', 'Table reads "No contact logs yet."'],
        ],
      },
    ],
  },
  {
    name: 'Admin: User Change Logs',
    description: 'The append-only profile change history for one user, written by every surface that changes profile fields.',
    sub_flows: [
      {
        name: 'Review profile change history',
        description: 'Columns and ordering.',
        steps: [
          ['Open the User Change Logs tab', 'Heading "User Change Logs" with text that entries are append-only, and the table sorted newest first'],
          ['Read the columns', 'Field / Data Name, Old Data, New Data, Action (Created, Updated, Deleted), Created Date, Last Updated Date, Updated By (User, Admin, System), Updated By Name / ID, Source'],
          ['Open a brand new user with no edits', 'Table reads "No profile changes recorded yet." or only the CREATE rows'],
        ],
      },
      {
        name: 'Trace an admin edit',
        description: 'Admin saves are attributed to the Admin Portal.',
        steps: [
          ['On the Profile tab change Bio and click Save Changes', 'Snackbar "User updated"'],
          ['Open User Change Logs', 'A new first row with Field Bio, the old and new text, Action Updated, Updated By Admin, your name and Source Admin Portal'],
          ['Change the user roles in Manage Roles and return to the tab', 'A roles row is appended; earlier rows are unchanged'],
        ],
      },
      {
        name: 'Filter and search change logs',
        description: 'Enum filters use the same labels shown in the cells.',
        steps: [
          ['Filter Source to mWeb', 'Only changes the member made from mWeb remain'],
          ['Add an Updated By filter of User and search "Search field, old or new value, or who changed it" for "email"', 'Only matching member-made email changes remain'],
          ['Click "Clear all"', 'The full history returns; rows expose no edit or delete controls'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Roles & Super Admins',
    description: 'The /rbac/roles page: the role catalogue (one role per portal), custom roles, and granting or revoking Super Admin access. Role writes are SUPER_ADMIN only.',
    sub_flows: [
      {
        name: 'Browse roles',
        description: 'Super Admins card plus the admin-roles table.',
        steps: [
          ['Open /rbac/roles', 'Heading "Roles" with "Each role grants access to one portal. Assign roles to users from User Management." above the Super Admins card and roles table'],
          ['Read the table', 'Columns Key, Name, Portal, Description, Type, Created and Actions; sorted by Key ascending'],
          ['Read the Portal cell for CRM_MANAGER', 'A "CRM" link with an open-in-new icon opening crm.duncit.com; roles with no portal show —'],
          ['Read the Type cell', 'Seeded roles show an info "System" chip; admin-made roles show "Custom"'],
          ['Filter Type and search "Search key, name or description"', 'The list narrows accordingly'],
        ],
      },
      {
        name: 'Create a custom role',
        description: 'Keys are uppercased by the server.',
        steps: [
          ['Click "New Role"', 'Dialog "New Role" with Key (helper "Uppercase, e.g. CITY_ADMIN"), Name and Description; Save disabled'],
          ['Type Key "ops_lead" and Name "Ops Lead"', 'Save becomes enabled'],
          ['Click Save', 'Button reads "Saving…", the dialog closes and the table refetches'],
          ['Search for OPS_LEAD', 'Row Key OPS_LEAD, Name Ops Lead, Portal —, Type Custom'],
        ],
      },
      {
        name: 'Duplicate role key is refused',
        description: 'Keys are unique.',
        steps: [
          ['Click "New Role", enter Key "crm_manager" and a Name, then Save', 'Error alert "Role key exists" and the dialog stays open'],
        ],
      },
      {
        name: 'Edit a role',
        description: 'Only name and description can change.',
        steps: [
          ['Click the Edit icon on OPS_LEAD', 'Dialog "Edit Role" with the Key field disabled'],
          ['Change Name and Description and click Save', 'The row shows the new name and description'],
        ],
      },
      {
        name: 'Delete a custom role',
        description: 'System roles cannot be deleted.',
        steps: [
          ['Hover the Delete icon on a System role', 'It is disabled with tooltip "System (locked)"'],
          ['Click Delete on OPS_LEAD', 'Confirm "Delete role" asks \'Delete role "OPS_LEAD"?\''],
          ['Confirm with Delete', 'The row is removed from the table'],
        ],
      },
      {
        name: 'Grant Super Admin access',
        description: 'Search a user and promote them; they are emailed.',
        steps: [
          ['Read the Super Admins card', 'Text "Admins have full access to every Duncit console. Grant carefully." and warning "Never share your admin account. Each admin should sign in with their own login."'],
          ['Type one character into "Search a user by name or email to make admin"', 'The dropdown says "Type at least 2 characters"'],
          ['Type a name that matches nobody', 'The dropdown says "No users found"'],
          ['Type part of an existing non-admin user and pick them', 'Options read "<name> · <email>" and exclude current admins'],
          ['Wait for the result', 'Success toast "<name> is now an admin — a welcome email was sent." and a new admin chip appears'],
        ],
      },
      {
        name: 'Revoke Super Admin access',
        description: 'The root admin is protected.',
        steps: [
          ['Click the x on a non-root admin chip', 'Confirm "Revoke admin access" says "Revoke admin access for <name>? They will be emailed about this change."'],
          ['Confirm with Revoke', 'Toast "Admin access revoked — a notification email was sent." and the chip disappears'],
          ['Look at the root admin chip', 'It is labelled "<name> · root" and has no remove control'],
        ],
      },
      {
        name: 'Role changes refused for non-super admins',
        description: 'createRole and grantAdminAccess require SUPER_ADMIN.',
        steps: [
          ['As CITY_ADMIN click "New Role", fill Key and Name and Save', 'Error alert "Access Denied" inside the dialog'],
          ['As CITY_ADMIN pick a user in the Super Admins search', 'Error toast "Access Denied" and no chip is added'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Partners',
    description: 'The /partners directory of every user holding a partner role (Host, Venue Partner, Product Seller, Club Admin).',
    sub_flows: [
      {
        name: 'Browse partners',
        description: 'The admin-partners table.',
        steps: [
          ['Open /partners', 'Heading "Partners" with "Everyone with partner access — hosts, venue partners, product sellers and club admins."'],
          ['Read the columns', 'Partner (name and email or phone), Partner type chips, Phone and Joined; newest first'],
          ['Check a user with only the USER role', 'They do not appear; only partner-role holders are listed'],
          ['Open the page on an environment with no partners', 'Table reads "No partners yet."'],
        ],
      },
      {
        name: 'Filter partners by type and search',
        description: 'Partner type is an enum filter.',
        steps: [
          ['Filter Partner type to Club Admin', 'Only rows with a "Club Admin" chip remain'],
          ['Search "Search name, email or phone" for a phone number', 'Only matching partners remain'],
          ['Click "Export CSV"', 'admin-partners.csv downloads with the visible rows'],
        ],
      },
      {
        name: 'Open a partner record',
        description: 'Partners share the user details page.',
        steps: [
          ['Click a partner row', 'Navigates to /users/<user_id> showing that partner in the user details page'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Membership',
    description: 'Membership tiers and comparison rows at /membership/plans (feature is "coming soon" and bills nobody) and the read-only subscribers list at /membership/subscribers.',
    sub_flows: [
      {
        name: 'Open the membership plans page',
        description: 'Header, alert and tabs.',
        steps: [
          ['Open /membership/plans', 'Heading "Membership" with a "Coming soon" chip and text about the membership feature flag'],
          ['Read the info alert', '"Nothing here bills anyone yet — every plan\'s button is disabled in the apps." pointing to Membership → Subscribers'],
          ['Click the "Comparison rows" tab and reload', 'The URL carries ?selectedtab=BENEFITS and the Comparison rows tab stays selected'],
        ],
      },
      {
        name: 'Create a membership tier',
        description: 'Tier form (React Hook Form + Zod).',
        steps: [
          ['On the Tiers tab click "New tier"', 'Dialog "New tier" with Key (hint "e.g. access, connect, elite"), Display name, Tagline, Price, Price note, Badge, Accent colour, Button text, Sort order and "Active (shown in the apps)"'],
          ['Fill key "elite", name "Elite", price "₹1,499", note "/ year", badge "Most popular", accent "#B4532A", sort 2', 'No validation errors'],
          ['Click "Create tier"', 'Toast "Tier created", the dialog closes and the table refetches'],
          ['Read the new row', 'A #B4532A accent bar, Elite with its tagline, key code "elite", price with note, an Active chip plus "Most popular" chip and Sort 2'],
        ],
      },
      {
        name: 'Tier validation',
        description: 'Field rules and duplicate keys.',
        steps: [
          ['Click "Create tier" with Key and Display name empty', 'Errors "Key is required" and "Name is required"'],
          ['Type "Elite Plan" as Key', 'Error "Key may contain lowercase letters, digits, dashes and underscores"'],
          ['Type "red" as Accent colour', 'Error "Use a hex colour like #B4532A, or leave blank"'],
          ['Set Sort order to -1, then 1000', 'Errors "Sort order must be 0 or greater" and "Sort order must be 999 or fewer"'],
          ['Create a tier with an existing key', 'Error toast "A plan with this key already exists"'],
        ],
      },
      {
        name: 'Edit and delete a tier',
        description: 'Keys are locked after creation; deleting drops the tier column from every row.',
        steps: [
          ['Click Edit on a tier', 'Dialog "Edit tier" with Key disabled and hint "Locked — every comparison cell references this key."'],
          ['Change Price and click "Save changes"', 'Toast "Tier updated" and the row shows the new price'],
          ['Click Delete on the tier', 'Confirm "Delete tier" says "Delete “<name>”? Its column is removed from every comparison row."'],
          ['Confirm with Delete', 'Toast "Tier deleted"; the Comparison rows table no longer lists that tier key in any row'],
        ],
      },
      {
        name: 'Create a comparison row',
        description: 'One cell input per active tier.',
        steps: [
          ['On Comparison rows click "New row"', 'Dialog "New benefit row" with Section, Benefit, a "What each tier gets" info alert, one input per active tier, Sort order and Active'],
          ['Fill Section "Getting a spot", Benefit "Early booking window" and cells "12h", "✓", blank', 'No errors'],
          ['Click "Create row"', 'Toast "Row created"; the row shows the label with "access: 12h · connect: ✓ · elite: —", its Section, Active and Sort'],
        ],
      },
      {
        name: 'Comparison row validation',
        description: 'Rows need tiers and required fields.',
        steps: [
          ['Deactivate every tier, then open "New row"', 'Warning "Create a tier first — a row needs columns to fill." and "Create row" is disabled'],
          ['With tiers active submit empty Section and Benefit', 'Errors "Section is required" and "Benefit is required"'],
          ['Type 61 characters into a tier cell', 'Error "Each cell must be 60 characters or fewer"'],
        ],
      },
      {
        name: 'Edit and delete a comparison row',
        description: 'A tier added after the row still gets an input.',
        steps: [
          ['Create a new tier on the Tiers tab, then Edit an existing row', 'Dialog "Edit benefit row" shows an empty input for the new tier'],
          ['Fill it and click "Save changes"', 'Toast "Row updated" and the values line includes the new tier'],
          ['Click Delete on the row', 'Confirm "Delete row" asks \'Delete "<label>" from the comparison table?\''],
          ['Confirm', 'Toast "Row deleted" and the row disappears'],
        ],
      },
      {
        name: 'Review membership subscribers',
        description: 'Members who tapped Notify me.',
        steps: [
          ['Open /membership/subscribers', 'Heading "Membership subscribers" explaining rows come from "Notify me" and emails from profiles'],
          ['Read the table', 'Columns Email, Name (— when blank) and Signed up, newest first; no edit or delete actions'],
          ['Search "Search email or name"', 'Only matching subscribers remain'],
          ['Open on an environment with no signups', 'Table reads "Nobody has signed up for membership news yet."'],
        ],
      },
      {
        name: 'Membership writes refused for other roles',
        description: 'Tier and row writes are SUPER_ADMIN and CITY_ADMIN only.',
        steps: [
          ['As ZONAL_ADMIN create a tier with valid values', 'Error toast "Access Denied" and the dialog stays open'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Categories',
    description: 'Category Management at /categories: the three-level Super → Category → Sub tree, per-level options, cascade deletes, the Home "All" tab icon and vibe heading.',
    sub_flows: [
      {
        name: 'Drill into the category tree',
        description: 'Three column panels.',
        steps: [
          ['Open /categories', 'Heading "Category Management", the "All" tab icon card, the Vibe section heading card and three columns: Super Categories, Categories, Sub-Categories'],
          ['Look at the Categories column before selecting', 'Text "Select a super category on the left." and its + button disabled with tooltip "Select a parent first"'],
          ['Click a super category', 'It is highlighted and the Categories column lists its children under "in <Super>"'],
          ['Click a category', 'Sub-Categories lists its children under "in <Category>"'],
          ['Read list items', 'Icon or image avatar, name, "system" chip for seeded items, "inactive" chip for inactive ones, and a 50-character description preview'],
          ['Select a category with no children', 'Sub-Categories column reads "No items yet. Click + to create one."'],
        ],
      },
      {
        name: 'Create a super category',
        description: 'Common fields for every level.',
        steps: [
          ['Click + on Super Categories', 'Dialog "New Super Category" with Name, MUI Icon / Image toggle, Description, Gift card artwork, Images & Videos, Sort order; Save disabled'],
          ['Type a Name, choose MUI Icon and search "Pets" in the icon picker', 'The icon is selected; helper "Search Material icons (e.g. Pets, SportsSoccer) or paste an emoji."'],
          ['Switch to Image', 'The icon value clears and a "Category image" media picker is shown'],
          ['Add gift card front and back images', 'Both faces preview at card proportions with "Buyers can flip between these faces on mWeb and the app."'],
          ['Enter one image URL and one .mp4 URL in Images & Videos and click Save', 'Snackbar "Saved"; the super category appears; the .mp4 is stored as VIDEO and the other as IMAGE'],
        ],
      },
      {
        name: 'Create a category with icon layout',
        description: 'Icon layout is a CATEGORY-level option, separate for mWeb and Native.',
        steps: [
          ['Select a super category and click + on Categories', 'Dialog "New Category" includes an "Icon layout" section with mWeb / Native toggle, Top/Left/Right/Bottom and Width/Height (default Top, 40 × 40)'],
          ['With mWeb selected choose Left and 32 × 32', 'The mWeb layout is edited'],
          ['Switch to Native and choose Bottom and 48 × 48', 'The native layout is edited independently'],
          ['Fill Name and Save', 'Snackbar "Saved"; reopening Edit shows both layouts as saved'],
        ],
      },
      {
        name: 'Create a sub-category with co-hosting and minimum pax',
        description: 'SUB-only fields.',
        steps: [
          ['Select a category and click + on Sub-Categories', 'Dialog "New Sub-Category" with "Min number of pax allowed" and an "Allow Co-Hosts" switch'],
          ['Type 80 into Min number of pax', 'The value clamps to 50 (the helper states 0 = no minimum, Max 50)'],
          ['Switch Allow Co-Hosts on', 'A "Max co-hosts per pod" select appears with options 1 to 5'],
          ['Pick 3, fill Name and Save', 'Snackbar "Saved"; hosts in this sub-category can invite up to 3 co-hosts'],
        ],
      },
      {
        name: 'Edit and deactivate a category',
        description: 'Status is only offered when editing.',
        steps: [
          ['Click the Edit icon (aria "Edit <name>") on a category', 'Dialog "Edit Category" is prefilled and includes a Status select'],
          ['Set Status to Inactive and Save', 'Snackbar "Saved" and the list item shows an "inactive" chip'],
        ],
      },
      {
        name: 'Duplicate sibling name is refused',
        description: 'Slugs are unique under one parent.',
        steps: [
          ['Create a category with the same name as an existing sibling', 'Error alert "A sibling with that name already exists" and the dialog stays open'],
        ],
      },
      {
        name: 'Delete categories with cascade',
        description: 'Deletes remove descendants and related business data.',
        steps: [
          ['Click Delete on a super category', 'Dialog "Delete Super Category?" warns it will also remove all its categories, sub-categories, clubs, pods, FAQs and submissions and cannot be undone'],
          ['Click Cancel', 'Nothing is deleted'],
          ['Click Delete on a category', 'Dialog "Delete Category?" warns "This will also remove its sub-categories, clubs and pods."'],
          ['Confirm Delete', 'Button reads "Deleting…", snackbar "Deleted"; if it was selected, the Sub-Categories column resets to "Select a category on the left."'],
        ],
      },
      {
        name: 'Set the Home "All" tab icon and category visibility',
        description: 'Stored on the Branding singleton.',
        steps: [
          ['Read the "All" tab icon card', 'Text about the leading "All" tab in the home vibe tabber, an "All tab icon" picker, Icon layout controls and "Home page settings"; Save disabled'],
          ['Pick an icon image, choose Left and set 36 × 36', 'Save becomes enabled'],
          ['Switch "Show all categories on Home" on', 'Caption explains every category is shown even with no pods'],
          ['Click Save', 'Snackbar "Saved"; mWeb and the app show the new All icon and every category in the tabber'],
        ],
      },
      {
        name: 'Set the vibe section heading',
        description: 'Empty values fall back to app copy.',
        steps: [
          ['Read the Vibe section heading card', 'Heading placeholder "What\'s your vibe today?", Sub-heading placeholder "Explore experiences that match your mood." and Save disabled'],
          ['Type a heading and sub-heading and click Save', 'Snackbar "Saved"; Home on mWeb and the app shows the new copy'],
          ['As CITY_ADMIN change the heading and Save', 'Error alert "Access Denied" because branding writes are SUPER_ADMIN and TECH_MANAGER only'],
        ],
      },
      {
        name: 'Category writes refused for other roles',
        description: 'Category writes are SUPER_ADMIN and CITY_ADMIN only.',
        steps: [
          ['As ZONAL_ADMIN create a category', 'Error alert "Access Denied" inside the dialog'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Locations',
    description: 'Service coverage at /locations: country, state, city, image and localities with PIN codes, including AI locality fill.',
    sub_flows: [
      {
        name: 'Browse locations',
        description: 'The admin-locations table.',
        steps: [
          ['Open /locations', 'Heading "Locations" with "Country, state, city and locality/PIN coverage served by the platform." and the table sorted by City'],
          ['Read the columns', 'Image, City (with country), State, Localities / Areas, Active, Created and Actions'],
          ['Read a Localities cell with many areas', 'The first two chips "<area> · <PIN>" plus a "+N more" chip whose tooltip lists the rest; "No areas" when empty'],
          ['Search "Search state, city, area or PIN" for a PIN', 'Only locations containing that PIN remain'],
          ['Open an empty environment', 'Table reads \'No locations yet. Click "New Location" to create one.\''],
        ],
      },
      {
        name: 'Create a location',
        description: 'Hierarchy pickers and locality rows.',
        steps: [
          ['Click "New Location"', 'Dialog "New Location" with Country preset India, State, City, "Location image URL" and one empty Locality / Area row; Save disabled'],
          ['Pick State Maharashtra', 'City is cleared and its autocomplete loads Maharashtra cities'],
          ['Pick City Pune and choose a location image', 'Save becomes enabled'],
          ['Fill the first area and PIN, click "Add Area" and fill a second', 'The new row scrolls into view; each row has a remove icon'],
          ['Click Save', 'Snackbar "Saved"; the row appears with both localities and the first area PIN as the primary PIN'],
        ],
      },
      {
        name: 'Location validation',
        description: 'Checks run when Save is clicked.',
        steps: [
          ['Leave the image empty and Save', 'Error alert "Location image URL is required"'],
          ['Leave a named area without a PIN and Save', 'Error alert "PIN code is required for every locality / area"'],
          ['Clear every area name and Save', 'Error alert "At least one locality / area is required"'],
          ['With one area row only, look at its remove icon', 'It is disabled so at least one row remains'],
          ['Change the Country', 'State, City and location name are cleared'],
        ],
      },
      {
        name: 'Fill localities with AI',
        description: 'AI proposes areas and PINs for the chosen city.',
        steps: [
          ['In a new location with no state or city click "Fill with AI"', 'Error alert "Select country, state and city before using AI fill."'],
          ['Choose a state and city and click "Fill with AI"', 'The button reads "Filling…", then the area rows are replaced by AI localities, each with a PIN'],
          ['Run it for a city where the AI returns nothing usable', 'Error alert "AI did not return any localities with PIN codes."'],
        ],
      },
      {
        name: 'Edit and deactivate a location',
        description: 'Active switch is only offered when editing.',
        steps: [
          ['Click Edit on a location', 'Dialog "Edit Location" is prefilled and shows an Active switch'],
          ['Switch it off', 'The label changes to Inactive'],
          ['Click Save', 'Snackbar "Saved" and the Active column shows the location as inactive'],
        ],
      },
      {
        name: 'Delete a location',
        description: 'Destructive confirmation.',
        steps: [
          ['Click Delete on a location', 'Confirm "Delete location" asks \'Delete location "<name>"?\''],
          ['Confirm with Delete', 'Snackbar "Deleted" and the row disappears'],
          ['As ZONAL_ADMIN delete a location', 'Error toast "Access Denied" and the row remains'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Badges',
    description: 'The badge catalogue at /badges that every member Badges section renders from: conditions, thresholds, category and role scopes.',
    sub_flows: [
      {
        name: 'Browse the badge catalogue',
        description: 'Card grid.',
        steps: [
          ['Open /badges', 'Heading "Badges" with a "New badge" button and a grid of badge cards'],
          ['Read a card', 'Image, title, an "Inactive" chip when inactive, "<condition label> ≥ <threshold>", two-line description, Edit and Delete icons (aria "Edit <title>")'],
        ],
      },
      {
        name: 'Create a count badge',
        description: 'Default condition is Pods attended.',
        steps: [
          ['Click "New badge"', 'Dialog "New badge" with Title, Description, Badge image, Condition "Pods attended", Threshold 1, Sort order 0 and "Active (auto-evaluated)" on; "Create badge" disabled'],
          ['Open Condition', 'Options: Pods joined, Pods hosted, Clubs joined, Successful referrals, Pods attended, Pods attended in a category, Pods attended with a +1, Different categories attended, Pods attended in one calendar month, Partner role granted, Awarded by an admin'],
          ['Choose "Pods hosted", Threshold 10, type a Title and upload an image', '"Create badge" becomes enabled'],
          ['Type 0 as Threshold', 'The value is kept at 1 (minimum)'],
          ['Click "Create badge"', 'The dialog closes and a card "Pods hosted ≥ 10" appears'],
        ],
      },
      {
        name: 'Create a category-scoped badge',
        description: 'Category select appears for "Pods attended in a category".',
        steps: [
          ['In New badge choose "Pods attended in a category"', 'A Category select appears with hint "Only pods in this category count toward the badge."'],
          ['Open Category', 'First option "No category selected", then every category as "<name> · <LEVEL>"'],
          ['Pick a category, set a Title and create', 'The badge is stored with that category; leaving "No category selected" stores no category'],
        ],
      },
      {
        name: 'Create a partner-role or manual badge',
        description: 'Threshold is fixed for these conditions.',
        steps: [
          ['Choose "Partner role granted"', 'A "Partner role" select with hint "The badge unlocks the moment this role is granted." appears and Threshold is disabled'],
          ['Pick Host, type a Title and create', 'Card reads "Partner role granted ≥ 1"'],
          ['Create another with "Awarded by an admin"', 'Threshold is disabled and no category or role select is shown'],
        ],
      },
      {
        name: 'Edit and deactivate a badge',
        description: 'Same dialog in edit mode.',
        steps: [
          ['Click Edit on a badge', 'Dialog "Edit badge" prefilled; confirm button reads "Save"'],
          ['Switch Active off, change Sort order and click Save', 'The card shows an "Inactive" chip and moves by sort order'],
        ],
      },
      {
        name: 'Delete a badge',
        description: 'Destructive confirmation.',
        steps: [
          ['Click Delete on a badge', 'Confirm "Delete badge" asks \'Delete the badge "<title>"? It disappears from every member profile.\''],
          ['Confirm with Delete', 'The card disappears'],
        ],
      },
      {
        name: 'Badge writes refused for support users',
        description: 'Badge writes are SUPER_ADMIN, CITY_ADMIN and ZONAL_ADMIN.',
        steps: [
          ['As SUPPORT_USER create a badge with valid values', 'The dialog stays open and no card is added because the server answers Access Denied'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Something For You',
    description: 'The sideways Home rail at /something-for-you, rendered identically by mWeb and the app: cards with image, title, bottom text and a call to action.',
    sub_flows: [
      {
        name: 'Review the Home rail cards',
        description: 'List of cards in sort order.',
        steps: [
          ['Open /something-for-you', 'Heading "Something for you" with "The row that scrolls sideways at the bottom of Home, on mWeb and in the app." and "New card"'],
          ['Read a row', 'Portrait thumbnail, title, a "Hidden" chip when not shown, bottom text or —, and "opens /referral · order 0" (or "does nothing", "screen not chosen", "address not set")'],
          ['Open on an environment with no cards', 'Info alert "No cards yet, so the section is hidden on Home."'],
        ],
      },
      {
        name: 'Create a card that opens an in-app screen',
        description: 'Route picker searchable by label or path.',
        steps: [
          ['Click "New card"', 'Dialog "New card" with Title counter "0/30 — shown over the image, up to three lines", Card image, Bottom text, Call to action toggle on Nothing, Sort order = current card count and "Show on Home" on'],
          ['Type a 30-character title', 'The counter reads 30/30 and further typing is blocked'],
          ['Choose "In-app screen" in Call to action', 'An autocomplete "Opens this screen" appears with helper about the app and mWeb opening the same page'],
          ['Search "referral"', '"Refer and earn" with path /referral is offered'],
          ['Pick it, add an image and bottom text "Refer and Earn", and click Save', 'The dialog closes and the row reads "opens /referral"; mWeb and the app show the card on Home'],
        ],
      },
      {
        name: 'Create a card with a web link',
        description: 'URL cards leave the product.',
        steps: [
          ['In a new card choose "Web link"', 'A field "Opens this address" with placeholder "https://duncit.com/…" and helper "Include https://. The app hands this to the browser; mWeb opens a new tab."'],
          ['Type "duncit.com/blog" and Save', 'The server refuses it ("Use a full address, including https://"); the dialog stays open and no card is added'],
          ['Change it to "https://duncit.com/blog" and Save', 'The row reads "opens https://duncit.com/blog"'],
        ],
      },
      {
        name: 'Card validation',
        description: 'Client and server rules.',
        steps: [
          ['Open New card with an empty Title', 'Save is disabled'],
          ['Choose "In-app screen" without picking a screen and Save', 'The server refuses it ("Choose where this card goes") and the dialog stays open'],
          ['Choose "Web link" with an empty address and Save', 'The server refuses it ("Enter the address this card opens") and nothing is saved'],
        ],
      },
      {
        name: 'Edit, hide and delete a card',
        description: 'Visibility toggle and destructive delete.',
        steps: [
          ['Click the edit icon (aria "Edit card")', 'Dialog "Edit card" prefilled with the saved values'],
          ['Switch "Show on Home" off and Save', 'The row shows a "Hidden" chip and the card disappears from Home on both surfaces'],
          ['Click the delete icon (aria "Delete card")', 'Confirm "Delete card" asks \'Delete "<title>"? It disappears from Home on both mWeb and the app.\''],
          ['Confirm with Delete', 'The row is removed'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Approvals',
    description: 'The cross-portal approval inbox at /approvals (brand/product change requests, portal access, warehouse approvals); reviewable by SUPER_ADMIN, CITY_ADMIN and ZONAL_ADMIN.',
    sub_flows: [
      {
        name: 'Browse approval requests',
        description: 'Status toggle defaults to Pending.',
        steps: [
          ['Open /approvals', 'Heading "Approve/Deny Requests" with "Review approval requests coming in from across the portals." and a status toggle Pending (selected), Approved, Denied, All'],
          ['Read the table', 'Columns Subject (name and email), Kind chip, Source portal, Requested by, Requested at, Status and a "Review" action; newest first'],
          ['Click Approved, then All', 'The table refetches showing only approved requests, then every request'],
          ['Search "Search subject, title or requester" for text matching nothing', 'Table reads "No approval requests match the current filters."'],
        ],
      },
      {
        name: 'Approve a request',
        description: 'Approval applies the request side effect on the server.',
        steps: [
          ['Click a Pending row (or its Review button)', 'Dialog titled with the request title (or "Review Request") shows status, kind and source portal chips, the summary and a Details list; buttons Close, Deny, Approve'],
          ['Click Approve', 'A filled success alert "Request approved" appears, the dialog closes and the row leaves the Pending view'],
          ['Check the target record for an ecomm product change', 'The proposed brand or product changes are applied; a portal access request grants the portal role instead'],
        ],
      },
      {
        name: 'Deny a request with a reason',
        description: 'A reason is required before confirming.',
        steps: [
          ['Open a Pending request and click Deny', 'A required "Reason for denial" field appears (placeholder "Explain why this request is being denied"), Deny becomes "Confirm Deny" and Approve is disabled'],
          ['Leave the reason empty', '"Confirm Deny" stays disabled'],
          ['Type a reason and click "Confirm Deny"', 'Success alert "Request denied", the dialog closes and the request shows under Denied with the reason stored as review notes'],
        ],
      },
      {
        name: 'View a reviewed request',
        description: 'Reviewed requests are read-only.',
        steps: [
          ['Select Denied and open a request', 'An error alert "DENIED by <reviewer> · <date time>" shows the review notes below; the only action is Close'],
          ['Select Approved and open a request', 'A success alert "APPROVED by <reviewer> · <date time>"'],
        ],
      },
      {
        name: 'Request already reviewed elsewhere',
        description: 'Concurrent reviews are refused.',
        steps: [
          ['Open the same Pending request in two browsers and approve it in the first', 'The first shows "Request approved"'],
          ['Click Approve in the second browser', 'Error alert "This request has already been reviewed" inside the dialog'],
          ['As SUPPORT_USER open /approvals', 'The table shows the error alert "Access Denied"'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Portal Access Requests',
    description: 'The Jump to Portal request inbox at /portal-access: who asked for which console, approved (role granted + email) or denied (email).',
    sub_flows: [
      {
        name: 'Browse portal access requests',
        description: 'Only PORTAL_ACCESS approval requests are listed.',
        steps: [
          ['Open /portal-access', 'Heading "Portal Access" with "Jump to Portal requests — who asked for which console, and when." and toggle Pending (selected), Approved, Denied, All'],
          ['Read the table', 'Columns Requested by (name and email), Portal, Requested at, Status and Actions with Approve and Deny buttons'],
          ['Read the Portal cell for a finance request', 'It reads "Finance"; an unknown key such as "field-ops" is humanised to "Field Ops"'],
          ['Search "Search by requester name or email" for nobody', 'Table reads "No portal access requests match the current filters."'],
        ],
      },
      {
        name: 'Approve portal access',
        description: 'Grants the requested portal role.',
        steps: [
          ['Click Approve on a Pending row', 'Confirm "Approve portal access" says "Grant <name> access to the <portal> portal? Their account gets the portal role and they are emailed."'],
          ['Cancel the confirm', 'Nothing changes and the row stays Pending'],
          ['Click Approve again and confirm', 'Toast "Access approved — role granted and the requester emailed." and the row leaves the Pending view'],
          ['Open that user in /users/<id> > Access', 'The portal role (e.g. Finance Manager) is now listed'],
        ],
      },
      {
        name: 'Deny portal access',
        description: 'Destructive confirmation, requester emailed.',
        steps: [
          ['Click Deny on a Pending row', 'Destructive confirm "Deny portal access" says "Deny <name> access to the <portal> portal? They are emailed about the decision."'],
          ['Confirm with Deny', 'Toast "Request denied — the requester was emailed." and the row appears under Denied'],
        ],
      },
      {
        name: 'Reviewed portal access rows',
        description: 'No buttons after a decision.',
        steps: [
          ['Select Approved', 'The Actions cell shows the reviewer name instead of Approve and Deny'],
          ['Approve a request another admin already decided', 'Error toast "This request has already been reviewed"'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Upload Settings',
    description: 'Per-surface upload rules for Portals, the Mobile App and mWeb: size limits, formats, crop presets, compression and AI image monitoring (writes SUPER_ADMIN and TECH_MANAGER).',
    sub_flows: [
      {
        name: 'Open an upload surface',
        description: 'Three pages sharing one layout.',
        steps: [
          ['Open /upload-settings/portals', 'Heading "Portals Upload Setting" with "Upload rules applied to every MUI portal (Admin, Partners, CRM, Support, …)." and a skeleton while loading'],
          ['Read the accordions', '"Maximum upload sizes & formats" (expanded), "Image crop resolution settings", "Compression (sharp images · FFmpeg videos)" and "AI image monitoring"'],
          ['Open /upload-settings/mobile and /upload-settings/mweb', 'Headings "Mobile App Upload Setting" and "mWeb Upload Setting" with their own saved values'],
        ],
      },
      {
        name: 'Change size limits and formats',
        description: 'Saved only for the current surface.',
        steps: [
          ['Read the size fields', '"Max image upload size (MB)" helper "Default 15 MB." and "Max video upload size (MB)" helper "Default 100 MB."'],
          ['Set image max to 10 and add "avif" to Allowed image formats', 'The chip is added in lowercase'],
          ['Type a custom video format "MKV" and press Enter', 'A lowercase "mkv" chip is added'],
          ['Click "Save sizes & formats"', 'Snackbar "Upload settings saved"; the Mobile and mWeb pages keep their own values'],
        ],
      },
      {
        name: 'Size and format validation',
        description: 'Save stays disabled until valid.',
        steps: [
          ['Type 0 in Max image upload size', 'Helper turns red "Enter a whole number of 1 or more." and Save is disabled'],
          ['Type 1.5 in Max video upload size', 'Same error and Save stays disabled'],
          ['Remove every image format chip', 'Save sizes & formats is disabled'],
        ],
      },
      {
        name: 'Configure crop presets',
        description: 'Presets offered by every upload crop step.',
        steps: [
          ['Expand "Image crop resolution settings"', 'One row per preset with an enable switch, usage note (e.g. No Crop "Upload exactly as picked (default)."), Width and Height; No Crop dimensions are disabled'],
          ['Disable the preset currently chosen as Default crop', 'The Default crop select empties and "Save crop presets" is disabled'],
          ['Choose another enabled preset as Default crop', 'The select helper reads "Preselected in every crop step — No Crop keeps uploads untouched by default."'],
          ['Set Width 0 on an enabled preset', 'The field turns red, caption "Enabled presets need a width and height greater than 0." and Save is disabled'],
          ['Fix the width and click "Save crop presets"', 'Snackbar "Upload settings saved"; the crop step on that surface offers only enabled presets'],
        ],
      },
      {
        name: 'Tune server-side compression',
        description: 'sharp for images and FFmpeg for videos.',
        steps: [
          ['Switch image compression off', 'The Image quality slider and "Max image dimension (px)" field are disabled'],
          ['Switch it on, move Image quality to 70 and set dimension 200', 'Caption reads "Image quality: 70"; the dimension helper turns red "Minimum 320px." and Save is disabled'],
          ['Set dimension 1600 and move Video CRF to 30', 'Caption reads "Video CRF: 30 (lower = higher quality, larger file)"'],
          ['Set "Max video height (px)" to 200', 'Helper "Minimum 240px." and Save is disabled'],
          ['Set 720 and click "Save compression"', 'Snackbar "Upload settings saved"'],
        ],
      },
      {
        name: 'Toggle AI image monitoring',
        description: 'Saves immediately on toggle.',
        steps: [
          ['Expand "AI image monitoring"', 'Switch "Review every uploaded image with AI (risk-scored, images only)" and an info alert pointing to AI Portal > AI Monitoring > Logs and Settings'],
          ['Toggle the switch', 'It disables while saving, then snackbar "Upload settings saved"; uploads from this surface are now screened (or not)'],
          ['As CITY_ADMIN toggle it', 'An error alert "Access Denied" appears under the heading and the switch keeps its saved state'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Localization Locales',
    description: 'Languages at /localization/locales: adding from the ISO catalogue, flags, the locked default language and removal (writes SUPER_ADMIN and TECH_MANAGER).',
    sub_flows: [
      {
        name: 'Browse locales',
        description: 'Locale table with coverage.',
        steps: [
          ['Open /localization/locales', 'Heading "Locales" with the intro about the default source language and an "Add locale" button'],
          ['Read the table', 'Columns Code, Language, English name, Translated ("N of M keys" or —), Flags (Default, RTL, Active/Inactive chips) and Actions'],
          ['Open on an environment with no locales', 'Info alert "No locales yet — add one to start translating."'],
        ],
      },
      {
        name: 'Add a locale from the ISO picker',
        description: 'Picking a language fills its names and direction, then offers auto-translate.',
        steps: [
          ['Click "Add locale"', 'Dialog "Add locale" with Locale code picker (helper about the ISO list and BCP-47 tags), Language name, English name, Sort order and switches Active, Right-to-left script, Default'],
          ['Type "Hindi" in Locale code and pick the hi option', 'Code hi, Language name "हिन्दी" and English name "Hindi" fill in; RTL stays off'],
          ['Type "ar" instead', 'The Arabic names fill in and "Right-to-left script" switches on'],
          ['Pick hi and click Save', 'Snackbar "Locale added", the row appears, and the "Auto-translate Hindi" dialog opens for the new language'],
        ],
      },
      {
        name: 'Locale validation',
        description: 'Zod rules and server checks.',
        steps: [
          ['Clear the code and label and click Save', 'Errors "Enter a locale code" and "Enter the language name in its own script"'],
          ['Type "english_1" as the code', 'Error "Use a BCP-47 tag such as en-IN or hi-IN"'],
          ['As CITY_ADMIN save a valid locale', 'Error alert "Access Denied" above the table and the dialog stays open'],
        ],
      },
      {
        name: 'Edit a locale',
        description: 'The code is permanent.',
        steps: [
          ['Click Edit (aria "Edit hi") on a locale', 'Dialog "Edit hi" with a disabled code field and helper "The code is stored on every profile, so it cannot be changed"'],
          ['Switch Active off and click Save', 'Snackbar "Locale updated" and the Flags cell shows "Inactive"; the language is no longer offered in switchers'],
        ],
      },
      {
        name: 'Default locale is locked',
        description: 'The source language cannot be switched off or removed.',
        steps: [
          ['Edit the default locale', 'Info alert "This is the default language — the source every other one falls back to…" and the Active and Default switches are disabled, labelled "Locked while this is the default language"'],
          ['Hover the Delete icon on the default row', 'It is disabled with tooltip "The default language cannot be removed"'],
          ['Hover the Auto-translate icon on the default row', 'It is disabled with tooltip "This is the default language — it is the source everything else is translated from."'],
        ],
      },
      {
        name: 'Move the default language',
        description: 'Promoting one demotes all others.',
        steps: [
          ['Edit a non-default locale, switch Default on and Save', 'Snackbar "Locale updated"'],
          ['Read the Flags column', 'Only the promoted locale shows the Default chip; the previous default can now be edited and removed'],
        ],
      },
      {
        name: 'Remove a locale',
        description: 'Deletes immediately without a confirmation.',
        steps: [
          ['Click Delete on a non-default locale', 'The row disappears at once and a snackbar reads "<code> removed"'],
          ['Read the Translated column of the remaining rows', 'Coverage is refreshed'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Localization Auto-translate',
    description: 'OpenAI translation runs started from the Locales page: scope choice, live progress, stopping and results. Runs live on the server and survive closing the dialog.',
    sub_flows: [
      {
        name: 'Start a run for missing keys',
        description: 'Default scope sends only untranslated keys.',
        steps: [
          ['Click the sparkle icon on a non-default locale', 'Dialog "Auto-translate <Language>" with the OpenAI intro and "What to send" radios; "Only the keys with no text yet" is selected'],
          ['Read the count under the radios', '"N key(s) will be sent"'],
          ['Click "Start translating"', 'Button reads "Starting…", then a progress bar, "<done> of <total> keys" and the hint that closing the window is fine; a Stop button appears'],
          ['Wait a few seconds', 'The progress refreshes about every 3 seconds'],
        ],
      },
      {
        name: 'Close and reopen a running translation',
        description: 'The run carries on server-side.',
        steps: [
          ['Click Close while the run is going', 'The dialog closes and the run is not stopped'],
          ['Reopen Auto-translate for the same locale', 'The same run is shown with its current progress and the Stop button'],
        ],
      },
      {
        name: 'Finish a translation run',
        description: 'Result summary and coverage update.',
        steps: [
          ['Wait for the run to complete', 'Success alert "Finished — N keys translated", "The apps and portals show the new text within a minute." and "Model: <model>"'],
          ['If some keys came back unusable', 'Caption "<failed> key(s) came back unusable and were left untranslated. Run it again to retry just those."'],
          ['Close the dialog and read the Translated column', 'It shows the higher translated count for that locale'],
        ],
      },
      {
        name: 'Stop a translation run',
        description: 'Stopping keeps what was already written.',
        steps: [
          ['Start a run and click Stop', 'The Stop button disables and the run ends'],
          ['Read the result', 'Warning alert "Stopped — N keys were translated first"'],
        ],
      },
      {
        name: 'Nothing to send and replace-all scope',
        description: 'Scope changes the pending count.',
        steps: [
          ['Open Auto-translate for a fully translated locale', 'Text "Nothing to send — every key already has text in this language." and "Start translating" is disabled'],
          ['Select "Every key, replacing what is there"', 'The count updates to the whole catalogue and Start translating is enabled'],
        ],
      },
      {
        name: 'Auto-translate failures',
        description: 'Server refusals are shown in the dialog.',
        steps: [
          ['Start a second run for a locale that already has one going (e.g. from another browser)', 'Error alert "A translation run is already going for this language"'],
          ['Let a run fail (e.g. the AI provider is unavailable)', 'Error alert "The run failed" with the error text below'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Localization Translations',
    description: 'Translations at /localization/translations: namespaces grouped portal-wise and page-wise, per-locale entries, manual keys and "Import app keys".',
    sub_flows: [
      {
        name: 'Browse translation namespaces',
        description: 'Level one shows completeness per locale.',
        steps: [
          ['Open /localization/translations', 'Heading "Translations" with "Import app keys" and "Add translation" buttons above the namespaces table'],
          ['Read the table', 'Columns Portal chip, Page (with namespace id), Keys and one column per active locale showing "translated/ total"'],
          ['Read the locale cells', 'Complete namespaces are green, fully untranslated ones red and partial ones amber'],
          ['Search "Search portal or page" for "admin"', 'Only admin namespaces remain'],
          ['Open with no active locales', 'Warning "No active locales yet — add one under Localization → Locales first." and "Add translation" is disabled'],
        ],
      },
      {
        name: 'Import app keys',
        description: 'Seeds every shipped client and server email key against the default locale without overwriting.',
        steps: [
          ['Hover "Import app keys"', 'Tooltip "Add every key the apps and emails ship, keeping existing translations"'],
          ['Click it', 'Button reads "Importing…", then snackbar "<N> new key(s) imported" and the namespaces table refreshes'],
          ['Click it again', 'Snackbar "Already up to date"; existing translations are unchanged'],
          ['Look at it when no default locale exists', 'The button is disabled'],
        ],
      },
      {
        name: 'Drill into a namespace',
        description: 'Level two lists one namespace entries.',
        steps: [
          ['Click a namespace row', 'Header "Translations / <surface>" titled with the namespace id and a "<N> keys" chip'],
          ['Read the entries table', 'Columns Key (with description), Portal, Page, one column per locale (value or "— not translated") and Updated; sorted by key'],
          ['Search "Search key or description"', 'Only matching keys in this namespace remain'],
          ['Click the back arrow (aria "Back to namespaces")', 'The namespaces table returns'],
        ],
      },
      {
        name: 'Edit a translation',
        description: 'One field per active locale.',
        steps: [
          ['Click an entry row', 'Dialog "Edit translation" with the Key disabled, Description and one field per locale such as "English (en) — default" and "हिन्दी (hi)"'],
          ['Read the locale helpers', 'Default: "Source text — every untranslated locale falls back to this"; others: "Leave blank to fall back to the default language"'],
          ['Type a Hindi value and click Save', 'Snackbar "Translation updated"; the Hindi cell shows the text and the namespace completeness rises'],
        ],
      },
      {
        name: 'Add a translation by hand',
        description: 'Keys must be namespaced.',
        steps: [
          ['Click "Add translation" and type key "emptyState"', 'Helper turns red "Use at least portal.page.name, e.g. mweb.shop.emptyState" and Save is disabled'],
          ['Change the key to "mweb.shop.promoBanner" and fill the default value', 'Helper reads "Namespaced portal-wise then page-wise — this drives the Portal/Page filters" and Save is enabled'],
          ['Click Save', 'Snackbar "Translation added" and the key is listed under its namespace'],
          ['As CITY_ADMIN save a translation', 'Error alert "Access Denied" and nothing is written'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Branding',
    description: 'Platform branding at /branding read live by every app: identity, theme tokens, platform assets, login background, legal links, website assets and app version gate, occasional icons and fonts (writes SUPER_ADMIN and TECH_MANAGER).',
    sub_flows: [
      {
        name: 'Edit brand identity',
        description: 'Identity accordion and the page Save button.',
        steps: [
          ['Open /branding', 'Heading "Branding"; the Identity accordion is expanded with a live preview (logo or first letter on the primary colour, app name, support email)'],
          ['Change App name and Home header tagline', 'The preview name updates; the tagline placeholder is "It All Starts Here!"'],
          ['Pick a Logo URL and set Support email and Support phone', 'Support phone helper explains users tap Call Now in Bouncers → Quick Support'],
          ['Click "Save Branding"', 'Button reads "Saving…", then snackbar "Branding saved"; mWeb and the app show the new name, tagline and logo on next load'],
        ],
      },
      {
        name: 'Primary colour fills both theme token tables',
        description: 'Identity primary writes the primary steps of light and dark tokens.',
        steps: [
          ['Type "#D92D2D" in Primary color', 'The swatch and preview background turn red'],
          ['Open "Theme tokens (mWeb + app)"', 'The primary, primaryHover, primaryActive and onPrimary server values are filled in both the Light mode and Dark mode tables'],
        ],
      },
      {
        name: 'Edit theme tokens',
        description: 'LOCAL or SERVER token source and WCAG contrast.',
        steps: [
          ['Read the Theme tokens accordion', 'Info alert, switch "Take theme tokens from this page (Server)" with its Off/On explanation, and Light mode / Dark mode tables'],
          ['Read a table row', 'Token name, what it colours, local value swatch, a server value colour field (placeholder = local) and a contrast chip'],
          ['Set ink to a light grey in Light mode', 'The contrast chip turns red, e.g. "2.10:1 against surface — needs 4.5:1"; decorative tokens read "Decorative — no minimum"'],
          ['Type "blue!" as a server value', 'Helper "Use #hex, rgb() or rgba()"'],
          ['Switch the source on and click "Save Branding" with valid values', 'Snackbar "Branding saved"; mWeb and the app lay these tokens over their bundled ones'],
        ],
      },
      {
        name: 'Set per-platform favicon, logo and splash',
        description: 'mWeb, Mobile App and Portals accordions.',
        steps: [
          ['Open "mWeb (duncit.com)"', 'Favicon, Logo and Splash screen fields with size guides (e.g. square PNG 512×512 for favicons)'],
          ['Open "Mobile App (Android / iOS / native web)"', 'The same fields plus a note that the store icon and OS launch screen ship inside the binary'],
          ['In "Portals (admin / crm / tech / …)" switch Splash screen to Video and pick an MP4', 'The picker accepts video, shows the landscape size guide and a muted looping preview with controls'],
          ['Click "Save Branding"', 'Snackbar "Branding saved"'],
        ],
      },
      {
        name: 'Configure the login background',
        description: 'Image and video switches; video wins when both are on.',
        steps: [
          ['Open "Login Background (mWeb + app)"', 'Hint about replacing the animated gradient; switches Background image and Background video are off'],
          ['Switch Background image on and pick a portrait image', 'A picker with helper "Portrait JPG/PNG, ~1080×1920px — it is cropped to fill the screen." appears'],
          ['Switch Background video on and pick an MP4', 'A video picker and looping preview appear'],
          ['Save Branding', 'Sign-in on mWeb and the app shows the video backdrop; turning both switches off restores the gradient while the assets stay stored'],
        ],
      },
      {
        name: 'Set legal links',
        description: 'Terms and privacy links for sign-in screens.',
        steps: [
          ['Open "Legal links (sign-in screens)"', 'Fields "Terms & Conditions URL" and "Privacy Policy URL" with helper "Full https:// address. Leave empty to use the default duncit.com page."'],
          ['Type "duncit.com/terms" and Save Branding', 'Error alert "Terms & Conditions URL must start with https:// (or http://)" and nothing is saved'],
          ['Enter "https://duncit.com/terms" and save', 'Snackbar "Branding saved"; sign-in screens on mWeb, the app and portals link there'],
        ],
      },
      {
        name: 'Set website logos, store links and minimum app version',
        description: 'Assets for marketing sites and the force-update gate.',
        steps: [
          ['Open "Website Logos (marketing sites)"', 'Header logo, Footer logo, Favicon, Android app URL (Google Play), iOS app URL (App Store) and "Minimum supported app version" (placeholder "e.g. 1.50.0")'],
          ['Read the minimum version helper', 'It warns older builds are force-updated and to raise it only after the release is live in the stores'],
          ['Fill the Play Store link, set 1.50.0 and Save Branding', 'Snackbar "Branding saved"; mobile builds below 1.50.0 are blocked by the force-update gate'],
        ],
      },
      {
        name: 'Schedule an occasional icon',
        description: 'Festive windows with their own Save.',
        steps: [
          ['Open "Occasional Icons" with none configured', 'Info alert "No occasions yet — add one to schedule a festive icon."'],
          ['Click "Add occasion" and type slug "diwali"', 'Helper "Matches a bundled app icon — used offline, no network needed."'],
          ['Type slug "eid"', 'Helper "No bundled app icon for this slug; the app will load the URL below."'],
          ['Set Label, Starts at and Ends at (MUI date-time pickers), an icon, Fallback icon, Active and Priority', 'Priority helper "Higher wins on overlap"; the Active label toggles Active/Paused'],
          ['Click the section Save', 'Snackbar "Occasional icons saved"; apps show the icon while the app clock is inside the window'],
        ],
      },
      {
        name: 'Occasional icon validation',
        description: 'Invalid rows are dropped on save.',
        steps: [
          ['Clear the slug of a row', 'The slug field turns red'],
          ['Set Ends at before Starts at', 'Helper "Ends before it starts — this row will be dropped."'],
          ['Click Save with a row missing its slug or dates', 'Snackbar "Occasional icons saved"; after reload that row is gone'],
          ['Click the remove icon (tooltip "Remove occasion") and Save', 'The occasion is deleted'],
        ],
      },
      {
        name: 'Choose fonts per platform',
        description: 'Google Font per surface with live preview.',
        steps: [
          ['Open "Fonts"', 'Tabs Mobile App, mWeb and Portals with the hint and "Leave empty for the default font (Quicksand)."'],
          ['On mWeb pick "Poppins" in "mWeb font (Google Fonts)"', 'The preview box renders "It All Starts Here!" and the pangram in Poppins'],
          ['Switch to the Portals tab', 'The URL carries ?selectedtab=portals_font_family and its own value is shown'],
          ['Save Branding', 'Snackbar "Branding saved"; mWeb uses Poppins on next load'],
        ],
      },
      {
        name: 'Branding save refused for other admins',
        description: 'Only SUPER_ADMIN and TECH_MANAGER write branding.',
        steps: [
          ['As ZONAL_ADMIN change App name and click Save Branding', 'Error alert "Access Denied" above the Save button'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Settings',
    description: 'System settings at /settings: appearance, the global date/time display formats, time zone and clock source, minimum signup age and the account deletion grace period and sweep.',
    sub_flows: [
      {
        name: 'Switch console appearance',
        description: 'Per-browser color mode.',
        steps: [
          ['Open /settings', 'Heading "Settings" with "Personalize your admin experience and configure system behavior." and an Appearance card'],
          ['Toggle the switch', 'The label changes from "Light mode" to "Dark mode" and the console switches theme immediately'],
          ['Reload', 'The chosen mode is kept for this browser'],
        ],
      },
      {
        name: 'Change date and time display formats',
        description: 'One pattern pair every surface reads and every date picker uses.',
        steps: [
          ['Read the Display formats card', 'Date format presets (dd MMM yyyy, dd/MM/yyyy, MM/dd/yyyy, yyyy-MM-dd, EEE, dd MMM yyyy) each with a live sample, plus "Custom pattern…"; Save disabled'],
          ['Pick dd/MM/yyyy and time format HH:mm', 'Alerts show "Preview: <date> · <time>", the typed hint and "Clock: 24-hour, 00–23…"'],
          ['Pick hh:mm a', 'The clock hint changes to "Clock: 12-hour with AM/PM…"'],
          ['Click Save', 'Snackbar "Display formats saved"; public app settings refetch so portals, mWeb and the app render dates with the new patterns'],
        ],
      },
      {
        name: 'Unusable date patterns are blocked',
        description: 'Pickers cannot edit some tokens.',
        steps: [
          ['Type "PPP" into "Date pattern (date-fns)"', 'Warning "The date and time pickers cannot edit PPP…" lists the allowed tokens and Save is disabled'],
          ['Type a pattern date-fns cannot format', 'The preview reads "Invalid format pattern"'],
        ],
      },
      {
        name: 'Set time zone and clock source',
        description: 'Where every app reads now from.',
        steps: [
          ['Read the "Time zone & source" card', 'Time zone select with common IANA zones and "Other (type below)…", an "IANA zone" text field and a Time source select'],
          ['Open Time source', 'Options "Sync time with server", "Sync time with browser" and "Custom time", each with an explanation below'],
          ['Choose Europe/London', 'The info alert "Apps now show: <dd MMM yyyy, HH:mm:ss (zone)>" ticks every second in London time'],
          ['Type "Mars/Base" into IANA zone', 'The alert reads "Apps now show: Invalid time zone"'],
          ['Restore a valid zone and click Save', 'Snackbar "Time settings saved"'],
        ],
      },
      {
        name: 'Pin a custom clock',
        description: 'Used for testing date-driven behaviour such as occasional icons.',
        steps: [
          ['Choose "Custom time"', 'A "Custom time" date-time picker appears with helper "Saving sets the clock here; it then runs forward from this instant." and the preview alert turns amber'],
          ['Pick a date inside a scheduled occasion window and Save', 'Snackbar "Time settings saved"; every app reads now from that instant and the occasional icon becomes active'],
          ['Switch back to "Sync time with server" and Save', 'The custom anchor is cleared and apps follow the server clock'],
        ],
      },
      {
        name: 'Set the minimum signup age',
        description: 'Validated on web and app signup and profile edits.',
        steps: [
          ['Read the "Minimum age to use the app" card', 'Field "Minimum age (years)" helper "Whole years, 1–120 (default 18)"; Save disabled'],
          ['Type 0, then 121, then 17.5', 'Each shows warning "Enter a whole number between 1 and 120." and Save stays disabled'],
          ['Type 16 and click Save', 'Snackbar "Minimum age saved"'],
          ['Sign up on mWeb with a date of birth making the person 15', 'The date of birth is rejected as younger than the minimum age'],
        ],
      },
      {
        name: 'Change the account deletion grace period',
        description: 'SUPER_ADMIN only; applies to requests filed after saving.',
        steps: [
          ['As SUPER_ADMIN read the "Account deletion" card', 'Intro text, "Grace period (days)" helper "Whole days, 1–365. Both apps show this number before anyone confirms." and info that it applies to requests filed after saving'],
          ['Enter 400 and click Save', 'Helper turns red "Enter a whole number of days between 1 and 365." and nothing is sent'],
          ['Enter 45 and click Save', 'Button reads "Saving…", then snackbar "Account deletion settings saved"; members already waiting keep their promised date'],
        ],
      },
      {
        name: 'Schedule the account deletion sweep',
        description: 'The irreversible job and its summary.',
        steps: [
          ['Read the schedule fields while the switch is off', '"Runs", "At", "Accounts per run" are visible but disabled; summary chip "No next run — the job is off" and "Last run <date>" or "Never run"'],
          ['Switch on "Carry out due requests automatically"', 'Warning "While this is on, accounts past their date are deleted permanently with nobody watching…" and the fields enable'],
          ['Choose "Once a week"', 'An "On" weekday select appears, Sunday first'],
          ['Enter "25:00" as At and 0 as Accounts per run, then Save', 'Errors "Enter a time as HH:mm, e.g. 03:00." and "Enter a whole number between 1 and 500."'],
          ['Enter 03:00 and 100 and Save', 'Snackbar "Account deletion settings saved" and the chip reads "Next run <date time>"'],
        ],
      },
      {
        name: 'Carry out due deletions now',
        description: 'Manual run behind a destructive confirmation.',
        steps: [
          ['With nothing due, read the alert and Run now button', 'Info "Nothing is past its date right now." and "Run now" is disabled'],
          ['With due requests, read the alert', 'Warning "<N> account(s) are past their date and waiting."'],
          ['Click "Run now"', 'Destructive confirm "Carry out due requests now?" states N accounts are permanently deleted and it cannot be undone'],
          ['Confirm', 'Button reads "Running…", then snackbar "<N> account(s) deleted" and the due count refreshes'],
        ],
      },
      {
        name: 'Review account deletion run history',
        description: 'Audit log including empty runs.',
        steps: [
          ['Click "Deletion runs"', 'Dialog "Deletion runs" with the intro that every sweep is listed newest first'],
          ['Read the table', 'Columns Reference, Started, Trigger (SCHEDULED or MANUAL), Status (RUNNING, SUCCEEDED, FAILED chip), Due and Deleted ("N · M failed" in red when failures)'],
          ['Filter Trigger to MANUAL', 'Only manual runs remain; before any sweep the table reads "The sweep has not run yet."'],
          ['Click Close', 'The dialog closes'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Portal App Settings',
    description: 'Which consoles offer "Chat with a coworker" and the Apps drawer in their header, one row per registered portal (writes SUPER_ADMIN and TECH_MANAGER).',
    sub_flows: [
      {
        name: 'Review portal header features',
        description: 'Registry-backed table.',
        steps: [
          ['Open /portal-app-settings', 'Heading "Portal App Settings" with subtitle and info alert "A change applies the next time that console is opened or reloaded…"'],
          ['Read the table', 'Columns Portal (name, key, Portal/Website/App chip), Link (host with open icon or —), "Chat with a coworker" and "App" switches'],
          ['Read a Website or App row', 'Both feature cells read "No console header" instead of switches'],
          ['Search "Search by name or key" for "crm"', 'Only the CRM row remains'],
        ],
      },
      {
        name: 'Turn coworker chat off for a console',
        description: 'Switch saves immediately.',
        steps: [
          ['Toggle "Chat with a coworker" off on the CRM row', 'The switch disables while saving, then a success toast "Chat Off for CRM"'],
          ['Reload the CRM console', 'The header chat button is gone and chat is removed from its Apps drawer'],
        ],
      },
      {
        name: 'Toggle the Apps drawer',
        description: 'The App column switch.',
        steps: [
          ['Toggle App on for the Finance row', 'Toast "App On for Finance"'],
          ['Hover the switch', 'Tooltip reads On'],
        ],
      },
      {
        name: 'Portal feature change refused',
        description: 'Other admins cannot change portal modes.',
        steps: [
          ['As CITY_ADMIN toggle a chat switch', 'An error toast "Access Denied" shows and the switch keeps its saved state'],
        ],
      },
    ],
  },
  {
    name: 'Admin: City Launch Settings',
    description: 'The Launch Settings group (Launched switch, launch target, city WhatsApp group link, launch page media) on Catalog > Locations add/edit.',
    sub_flows: [
      {
        name: 'Add a city that is not launched yet',
        description: 'A new city starts as a waitlist.',
        steps: [
          ['Open /locations and add a location', 'The dialog groups a Launched switch, Launch target (2000) and City WhatsApp group link under "Launch Settings"; the switch is OFF and reads "Not launched", and the target and link sit in two equal columns with their hints level'],
          ['Set the target to 1500, fill the rest and save', 'The table shows the city with a "Not launched" chip on a yellow-tinted row; launched cities sit on green-tinted rows'],
          ['Open the app location picker', 'The city tile shows "0 people are in" with "Coming soon"'],
        ],
      },
      {
        name: 'Launch page media',
        description: 'The video and backup image behind each screen of the waitlist page, global and per city.',
        steps: [
          ['Click "Launch page media" beside "New Location"', 'A dialog lists Top (live count), Host, Venue Partner and Club Admin, each with a Video and a Backup image picker'],
          ['Pick a video and an image for Top (live count) and save', '"Saved" shows; reopening the dialog shows the picked files'],
          ['Open a not-launched city in the app', 'The first screen plays that video behind "{city}, are you in?"; the image draws while it loads or when it cannot play'],
          ['Edit a city, expand "Override launch page media for this city", pick a different Top video and save', 'That city plays its own video on the first screen; the other screens still play the global media; other cities are unchanged'],
          ['Clear the override and save', 'The city plays the global video again'],
        ],
      },
      {
        name: 'Launch target and WhatsApp link validation',
        description: 'Bad values never reach the server.',
        steps: [
          ['Enter a launch target of 0, then 2.5', 'An inline error asks for a whole number of at least 1 and Save is disabled'],
          ['Enter a WhatsApp group link that is not https://chat.whatsapp.com/…', 'An inline error shows and Save is disabled'],
          ['Clear the WhatsApp link', 'The error clears; an empty link is allowed'],
        ],
      },
      {
        name: 'Launch a city',
        description: 'Turning the switch on makes the city live.',
        steps: [
          ['Edit a not-launched city and turn Launched on', 'The table chip reads "Launched"'],
          ['Reopen the app with that city selected', 'Home shows the pod feed and the tile shows its club count again'],
        ],
      },
    ],
  },
  {
    name: 'Admin: Subscribe for location',
    description: 'The /location-subscriptions page: city waitlist totals, subscribers and the WhatsApp launch message.',
    sub_flows: [
      {
        name: 'Review city waitlists and subscribers',
        description: 'Totals per city and a searchable subscriber list.',
        steps: [
          ['Open Catalog > Subscribe for location', 'A cities table lists each city with subscribers: launched chip, Subscribers, Notified and Pending counts'],
          ['Filter the subscribers table by a city and by status', 'Only that city\'s rows with the chosen status remain, each with name, WhatsApp, status chip and subscribed date'],
          ['Hover a Skipped or Failed chip', 'A tooltip shows the reason'],
        ],
      },
      {
        name: 'Send is locked until the city launches',
        description: 'The launch message says the city is live.',
        steps: [
          ['Hover Send on a city that is not launched', 'The button is disabled and the tooltip says to switch Launched on first'],
          ['Call sendLocationLaunchMessage for it via the API', 'Error "Switch Launched on for {city} before sending the launch message."'],
        ],
      },
      {
        name: 'Send the WhatsApp launch message',
        description: 'Pending and failed subscribers get the City launched template once.',
        steps: [
          ['Create the "City launched" template and campaign from Marketing > WhatsApp > Automation', 'The scenario has no blocker left'],
          ['Launch the city, then press Send launch message on its row', 'A confirm names the city and how many subscribers will be messaged'],
          ['Confirm', 'A toast says the send started for that many subscribers; after it runs the rows turn Sent and Pending drops to 0'],
          ['Press Send again with nobody pending', 'The button is disabled'],
          ['Add a new subscriber and press Send', 'Only the new subscriber is messaged'],
        ],
      },
    ],
  },
];

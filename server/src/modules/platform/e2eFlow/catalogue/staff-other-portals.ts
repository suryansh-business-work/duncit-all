import type { CatalogueFlow } from './catalogue.types';

/** The shared portal shell (@duncit/shell) plus the HR, Employee, Ads, AI, Challenges, Developers and Website consoles. */
export const STAFF_OTHER_PORTAL_FLOWS: readonly CatalogueFlow[] = [
  // ───────────────────────────── Portal Shell ─────────────────────────────
  {
    name: 'Portal Shell: Sign in',
    description:
      'The shared login screen every MUI console mounts at /login (PortalLoginPage over LoginScreen): password sign-in, the emailed one-time code door, the server role gate and the safe post-login redirect.',
    sub_flows: [
      {
        name: 'Sign in with email and password',
        description: 'A staff member with the console role signs in with their Duncit credentials.',
        steps: [
          ['Open any console (e.g. hr.duncit.com) while signed out', 'The browser lands on /login; the card shows the console logo, "duncit.com", a chip with the portal name and the heading "Log in"'],
          ['Read the tagline strip and promo card beside the form', 'The tagline and promo copy come from shell.portal.<portal>.* (e.g. HR: "Manage people, attendance and HR operations."); the promo card is hidden below the md breakpoint'],
          ['Type a registered email into the "e-mail address" field and the account password into "password"', 'Both fields accept input; the eye button toggles the password between hidden and visible'],
          ['Press the round arrow button labelled "Sign in"', 'The button shows a spinner and is disabled while the ConsoleLogin mutation runs with the portal_key of this console'],
          ['Wait for the response', 'The token is stored under the console token key (e.g. hr_token), the header and sidebar fill in with the user, and the app navigates to / (the dashboard)'],
          ['Check the server record', 'The user document has auth.last_login_provider = EMAIL and a fresh auth.last_login_at; a sign-in notice email is queued best-effort'],
        ],
      },
      {
        name: 'Login form validation errors',
        description: 'Client-side Yup rules on the login form before any request is sent.',
        steps: [
          ['On /login press "Sign in" with both fields empty', 'No request is sent; helper text shows "E-mail address is required" and "Password is required"'],
          ['Type "not-an-email" in the email field and blur it', 'Helper text shows "Enter a valid e-mail address"'],
          ['Enter a valid email but leave password empty and submit', 'Only "Password is required" remains; the form does not submit'],
          ['Click "Forgot password?"', 'A snackbar at the bottom says "Contact your administrator to reset your password." and disappears after about 4 seconds'],
        ],
      },
      {
        name: 'Wrong credentials and blocked accounts',
        description: 'Server refusals for the password door are shown in a red alert above the form.',
        steps: [
          ['Submit a registered email with a wrong password', 'A red alert shows "Invalid email or password"; no token is stored and the page stays on /login'],
          ['Submit an email that has no Duncit account', 'The same "Invalid email or password" alert shows, so the screen never reveals which addresses exist'],
          ['Submit the credentials of an account whose status is not ACTIVE', 'The alert shows "Account is not active"'],
          ['Submit the email of an account that only ever used Google sign-in', 'The alert shows "This account uses Google sign-in. Continue with Google."'],
          ['Submit the credentials of an account that asked for deletion (sealed)', 'The alert shows "Invalid email or password" exactly like a wrong password'],
        ],
      },
      {
        name: 'Account without this console role is refused',
        description: 'A valid Duncit account that lacks the portal role (e.g. HR_MANAGER for HR) cannot get a session; SUPER_ADMIN passes every console.',
        steps: [
          ['On the HR console sign in with correct credentials of an account holding only EMPLOYEE', 'The server login gate refuses with "You do not have access to this portal"; the alert shows it and no hr_token is written'],
          ['Sign in on the same console with a SUPER_ADMIN account', 'Sign-in succeeds and the dashboard opens even though the account has no HR_MANAGER role'],
          ['Open /login?denied=1 directly', 'The alert shows "You do not have access to Duncit HR. Please contact your administrator." before any attempt'],
        ],
      },
      {
        name: 'Sign in with an emailed one-time code',
        description: 'The "Login with OTP" panel: request a 6-digit code for this console, then trade it for the same session a password gives.',
        steps: [
          ['On /login click "Login with OTP" under the password form', 'The panel expands with the divider "sign in with a code", an e-mail address field and a disabled "Email me a code" button'],
          ['Type a malformed address', '"Email me a code" stays disabled until the value looks like name@domain.tld'],
          ['Type the email of an active account with this console role and click "Email me a code"', 'The button shows "Sending…"; then the email field locks and the status line reads "If that address can sign in here, a 6-digit code is on its way. It expires in a few minutes and only works for this portal."'],
          ['Open the mailbox', 'A portal login code email arrives naming this console; the code is valid for 10 minutes'],
          ['Type letters and more than six digits into the code field', 'Non-digits are stripped and the value is capped at 6 digits; "Sign in" enables only when exactly 6 digits are present'],
          ['Enter the emailed code and click "Sign in"', 'The button shows "Signing in…", the token is stored and the console opens on the redirect target or /'],
          ['Check the user document', 'The portal_login_otp hash, expiry and portal fields are cleared (single use) and last_login_at is updated'],
        ],
      },
      {
        name: 'One-time code negative paths',
        description: 'The OTP door never confirms an account exists and rejects wrong, expired, reused or cross-portal codes.',
        steps: [
          ['Request a code for an address with no account', 'The same "a 6-digit code is on its way" status shows, but no email is sent'],
          ['Request a code for an active account that lacks this console role', 'The same neutral status shows and no email is sent'],
          ['Request a second code within 9 minutes of the first on the same console', 'The neutral status shows again but no new email is sent; the earlier code still works'],
          ['Enter a wrong 6-digit code and click "Sign in"', 'A red alert shows "Invalid or expired code" and the stored code is cleared, so the correct code no longer works either'],
          ['Enter a code that is older than 10 minutes', 'The alert shows "Invalid or expired code"'],
          ['Enter a code emailed for the HR console into the Employee console login', 'The alert shows "Invalid or expired code" because the code is bound to the portal it was issued for'],
          ['Click "Use a different address"', 'The code field is cleared and the email field unlocks'],
          ['Click "Use my password instead"', 'The panel collapses back to the "Login with OTP" button'],
        ],
      },
      {
        name: 'Return to the requested page after sign in',
        description: 'Deep links survive the login bounce through ?redirect=, with an open-redirect guard.',
        steps: [
          ['While signed out open /expenses/new on the Employee console', 'The app redirects to /login?redirect=%2Fexpenses%2Fnew'],
          ['Sign in with valid credentials', 'The app lands on /expenses/new, not on the dashboard'],
          ['Sign out, then open /login?redirect=//evil.example.com and sign in', 'The unsafe value is ignored and the app lands on /'],
          ['Open /login?redirect=/login and sign in', 'The auth page is rejected as a target and the app lands on /'],
        ],
      },
      {
        name: 'Login screen extras',
        description: 'Colour mode toggle, legal links, the support email and the Other portals launcher on the login card.',
        steps: [
          ['Click the moon/sun button in the top-right of the login screen', 'The screen switches between light and dark; the tooltip reads "Switch to dark" or "Switch to light"'],
          ['Click "Privacy Policy" and "Terms of Use"', 'Each opens in a new tab: the Branding privacy/terms URL, or duncit.com/policy/privacy-policy and /policy/terms-and-conditions by default'],
          ['Read the line under the links', 'It reads "Trouble signing in? Email admin@duncit.com and our team will help you get back in." with a mailto link'],
          ['Click "Other portals"', 'A dialog "Other portals" opens with the subtitle "One Duncit account — jump to any console below.", a search box and category chips All, Content & AI, Growth, Operations, Partners, People'],
          ['Pick the People chip, then type "zzz" in "Search portals…"', 'The grid narrows to People consoles; with no match it shows "No portals match “zzz”."'],
          ['Clear the search and click the Developers card', 'The browser navigates in the same tab to the Developers console URL for the current environment'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Session, boot and access gates',
    description:
      'What mountPortal does before and around the chrome: the auth guard, the me load and recovery dialog, the in-session role gate, portal maintenance / under-development modes, branding and global loading indicators.',
    sub_flows: [
      {
        name: 'Returning with a stored session',
        description: 'A reload with a token in storage restores the signed-in chrome without a login.',
        steps: [
          ['Sign in to any console, then reload the page', 'A full-page loader shows while the me query runs, then the dashboard renders with the name and email in the header'],
          ['Watch the top of the window during any request', 'A thin top progress bar appears while GraphQL requests are in flight, including on the login screen'],
          ['Leave the tab hidden for more than 5 minutes and return to it', 'The me query is refetched in the background; the page is not reloaded'],
          ['Open a second tab of the same console', 'It is already signed in (same origin storage) and shows the same user'],
        ],
      },
      {
        name: 'Unauthenticated access to protected routes',
        description: 'Every route except /login is wrapped in RequireAuth.',
        steps: [
          ['Clear the console token from local storage and open /profile', 'The app redirects to /login?redirect=%2Fprofile'],
          ['Open an unknown path such as /does-not-exist while signed in', 'The catch-all route redirects to /'],
          ['Open /login while signed in', 'The login screen renders (it is not guarded); signing in again replaces the token'],
        ],
      },
      {
        name: 'Role revoked during a session',
        description: 'If the loaded user no longer holds the console role, the shell drops the token and bounces to the denied banner.',
        steps: [
          ['Sign in to the HR console as an HR_MANAGER', 'The dashboard opens'],
          ['From the Admin console remove HR_MANAGER from that account, then reload the HR tab', 'As soon as me loads without the role, hr_token is cleared and the app replaces the URL with /login?denied=1'],
          ['Read the login card', 'The red alert shows "You do not have access to Duncit HR. Please contact your administrator."'],
        ],
      },
      {
        name: 'User data not loaded recovery dialog',
        description: 'A token is present but the server returns no user after retries (expired session, stale cache).',
        steps: [
          ['With a token that the server rejects, open the console', 'A non-dismissable dialog "User data not loaded" appears with "Please reload the application so your latest account data can load correctly."'],
          ['Press Escape or click the backdrop', 'The dialog stays open'],
          ['Click "Reload Application"', 'The page reloads and the me query is attempted again'],
          ['When it appears again click "Logout"', 'All local and session storage is cleared and the user lands on the login screen'],
        ],
      },
      {
        name: 'Portal maintenance and under-development modes',
        description: 'PortalModeGate polls the public portalMode query every 60 seconds and blocks the console when Tech sets it off Live; it fails open on errors.',
        steps: [
          ['In Tech set the HR portal mode to MAINTENANCE, then open the HR console', 'A full-screen page shows a wrench icon, "We’ll be back soon" and "HR is temporarily down for maintenance. Please check back in a little while." — the login screen is not reachable'],
          ['Set the mode to DEVELOPMENT', 'Within a minute the screen changes to "Under development" and "HR is being built and isn’t available yet. It will go live soon."'],
          ['Set the mode back to LIVE and wait up to 60 seconds', 'The console renders again without a manual reload'],
          ['Block the GraphQL endpoint in dev tools and reload', 'The gate fails open: the console renders normally instead of a blocking screen'],
        ],
      },
      {
        name: 'Branding, splash and page titles',
        description: 'Admin Branding drives favicon, splash and font; the tab title follows the current page.',
        steps: [
          ['Configure a portals favicon and a portals splash image in Admin Branding, then open a console in a new session', 'The favicon links point to the configured URL and the splash covers the screen for about 1.8 seconds (3.2 seconds for a video), once per browser session'],
          ['Configure a portals font family', 'The console text renders in that Google Font with Quicksand as fallback'],
          ['Navigate to a nested page (e.g. /openai/logs in AI)', 'The browser tab title is the leaf nav label (e.g. "Logs"); on / it is the full product name (e.g. "Duncit AI")'],
          ['Press Tab once on page load', 'A "Skip to main content" link appears at the top-left and moves focus to the main region when activated'],
        ],
      },
      {
        name: 'Account ended from another device',
        description: 'The realtime session socket signs the tab out when the account is deleted elsewhere.',
        steps: [
          ['Sign in to a console, then file account deletion for the same account from the member app', 'The session socket reports the account ending and the console clears the cached user and token'],
          ['Try to use any page', 'The user is back at the login screen and can no longer sign in with that account'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Sidebar navigation',
    description:
      'The config-driven sidebar (AppSidebar) every console renders from its nav config: tree with groups, menu search, expand/collapse all, the minimised icon rail, the mobile drawer and breadcrumbs.',
    sub_flows: [
      {
        name: 'Navigate with the sidebar tree',
        description: 'Leaf items route, groups expand, the active item is highlighted.',
        steps: [
          ['Sign in to the AI console and look at the sidebar', 'It shows the branding logo with "AI", the items Welcome, AI Library, and groups OpenAI and AI Monitoring, the signed-in user card and the caption "© Duncit"'],
          ['Click the OpenAI group', 'It expands to Dashboard and Logs'],
          ['Click Logs', 'The app routes to /openai/logs, the item is highlighted and the breadcrumb reads AI / OpenAI / Logs'],
          ['Reload the page', 'The OpenAI group is open and Logs is still highlighted'],
        ],
      },
      {
        name: 'Search the menu and expand all',
        description: 'The "Search menu…" box filters the tree; Expand all toggles every group.',
        steps: [
          ['Type "set" in "Search menu…"', 'Only matching entries remain (e.g. AI Monitoring > Settings) with their groups opened'],
          ['Type "zzzz"', 'The list shows "No menu items match."'],
          ['Clear the box and click "Expand all"', 'Every group opens and the button label changes to "Collapse all"'],
          ['Click "Collapse all"', 'Every group closes, even groups that were opened by hand'],
        ],
      },
      {
        name: 'Minimise the sidebar to an icon rail',
        description: 'The rail state is saved in the server workspace state and follows the user into every console.',
        steps: [
          ['On a desktop-width window click the chevron at the bottom of the sidebar ("Minimise the menu")', 'The sidebar animates to a 72px icon rail; labels move into right-side tooltips'],
          ['Click a group icon on the rail (e.g. OpenAI)', 'A popover opens beside the rail titled with the group name and listing its children'],
          ['Pick a child in the popover', 'The app navigates and the popover closes'],
          ['Open a different console (e.g. Challenges) with the same account', 'The sidebar is already minimised there because sidebar_collapsed was saved server-side'],
          ['Click "Expand the menu"', 'The full sidebar returns and the preference is saved again'],
        ],
      },
      {
        name: 'Mobile navigation drawer',
        description: 'Below the md breakpoint the sidebar becomes a temporary drawer.',
        steps: [
          ['Resize the window to phone width (about 400px)', 'The permanent sidebar is hidden and a hamburger button ("open navigation") appears at the left of the header'],
          ['Tap the hamburger', 'A full sidebar drawer slides in (never the icon rail)'],
          ['Tap any leaf item', 'The app navigates and the drawer closes'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Header, search and theme',
    description:
      'The console AppBar: brand title, global page search with the "/" shortcut, colour mode toggle, apps and chat buttons and the account menu.',
    sub_flows: [
      {
        name: 'Global page search',
        description: 'HeaderSearch lists every nav leaf with its section and path.',
        steps: [
          ['On any page press "/" while not typing in a field', 'Focus jumps into the header "Search" box'],
          ['Type "logs"', 'Suggestions list each matching page with its section and path (e.g. "OpenAI · /openai/logs")'],
          ['Pick a suggestion', 'The app navigates to that page and the search box clears'],
          ['Type a word that matches no page', 'The dropdown shows "No matches"'],
          ['Press "/" while the cursor is inside another text field', 'A slash is typed into that field and focus does not move'],
        ],
      },
      {
        name: 'Mobile search overlay',
        description: 'On xs screens the search opens as a header overlay.',
        steps: [
          ['At phone width tap the search icon ("open search")', 'The header is replaced by a back arrow and a focused search box'],
          ['Pick a result', 'The app navigates and the overlay closes'],
          ['Tap the back arrow ("close search")', 'The normal header returns'],
        ],
      },
      {
        name: 'Toggle light and dark mode',
        description: 'The colour mode is stored per console under its colorModeKey.',
        steps: [
          ['Click the moon icon in the header (tooltip "Switch to dark mode")', 'The whole console switches to the dark palette and the icon becomes a sun'],
          ['Reload the page', 'The console stays in dark mode'],
          ['Open a different console', 'It keeps its own saved mode, independent of the first console'],
        ],
      },
      {
        name: 'Brand title returns home',
        description: 'The product name in the header links to the console root.',
        steps: [
          ['From a nested page click the header title (e.g. "Duncit Challenges")', 'The app navigates to / and the dashboard renders'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Profile and sign out',
    description:
      'The account menu, the shared /profile page mounted by every console (identity, name edit, access roles, linked Gmail, language) and both sign-out paths.',
    sub_flows: [
      {
        name: 'Open the profile from the account menu',
        description: 'The avatar button opens Profile and Logout.',
        steps: [
          ['Click the avatar block in the header (name and email beside a 28px avatar)', 'A menu opens with "Profile" and "Logout"'],
          ['Click "Profile"', 'The app routes to /profile with the heading "Your profile"'],
          ['Read the card', 'It shows the avatar or initials, full name, email, "Signed in to <app name>", an "Edit" button and the section "ACCESS ROLES" with one chip per role (e.g. "Hr Manager")'],
          ['Open the profile of an account that has a linked Gmail', 'A Google icon line shows that Gmail address under the email, read-only'],
          ['Open the profile of an account with no roles', 'The roles section reads "No roles assigned."'],
        ],
      },
      {
        name: 'Edit first and last name',
        description: 'updateMyProfile from the shared profile page.',
        steps: [
          ['On /profile click "Edit"', 'Fields "First name" and "Last name" appear prefilled with "Save changes" and "Cancel"'],
          ['Change the first name and click "Save changes"', 'The button reads "Saving…", then the fields close and a green "Profile updated." alert shows'],
          ['Look at the header and sidebar user card', 'The new name appears without a reload'],
          ['Click "Edit", change a value and click "Cancel"', 'The edit closes and nothing is saved'],
          ['Force the mutation to fail (e.g. offline) and save', 'A red alert under the fields shows the server or network error message and the fields stay open'],
        ],
      },
      {
        name: 'Sign out from the header menu',
        description: 'Logout clears the portal token and user context.',
        steps: [
          ['Open the account menu and click "Logout"', 'The console token is removed, cached user data is cleared and the app replaces the URL with /login'],
          ['Press the browser Back button', 'The protected page redirects back to /login?redirect=…'],
        ],
      },
      {
        name: 'Sign out from the profile page',
        description: 'The red "Log out" button at the bottom of /profile.',
        steps: [
          ['On /profile click "Log out"', 'All local and session storage is cleared and the login screen is shown'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Language switch',
    description:
      'Changing the console language from the profile page or the taskbar clock tray via setMyLocale; gated by the language_preference feature flag and the number of active locales.',
    sub_flows: [
      {
        name: 'Change language on the profile page',
        description: 'Visible only when the language_preference flag is on and at least two locales are active.',
        steps: [
          ['With the flag on and two or more active locales open /profile', 'A "LANGUAGE" section shows a "Language" select with the hint "Choose the language for this portal."'],
          ['Pick another language', 'The console copy switches immediately (sidebar, header, page text) and a green "Language updated" alert shows'],
          ['Check the user record', 'profile.locale holds the chosen locale code'],
          ['Open another console with the same account', 'It renders in the chosen language'],
        ],
      },
      {
        name: 'Language control hidden when not configured',
        description: 'No dead control before languages are set up.',
        steps: [
          ['Turn the language_preference flag off in Tech and open /profile', 'No LANGUAGE section renders'],
          ['Turn the flag on while only one locale is active', 'The profile page still shows no LANGUAGE section'],
        ],
      },
      {
        name: 'Change language from the clock tray',
        description: 'The tray offers the same switcher, shown even with a single locale.',
        steps: [
          ['Click the clock at the right of the taskbar', 'The tray opens and, with the flag on, shows a "Language" select under a divider'],
          ['Pick a different language', 'The console switches language and "Language updated" appears in the tray'],
        ],
      },
      {
        name: 'Language save fails',
        description: 'The switch happens first; the write failure is reported.',
        steps: [
          ['Go offline and pick a different language', 'The screen still switches language'],
          ['Look under the select', 'A red alert shows the network error or "Could not save your language"; after a reload the old saved language returns'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Taskbar and clock',
    description:
      'The strip along the bottom of every console: running windows (staff chat, calls) on the left, the admin-formatted clock and its tray (time zone, seconds) on the right; state saved server-side per user.',
    sub_flows: [
      {
        name: 'Set the clock time zone and seconds',
        description: 'Workspace clock_zone and clock_seconds are saved via saveShellWorkspaceState.',
        steps: [
          ['Look at the taskbar clock', 'It shows the time above the date in the admin-configured formats and the workspace time zone'],
          ['Click the clock ("Date and time")', 'A tray opens with the full date and time, a "Time zone" picker (hint "The zone every date and time in this console is read in.") and a "Count seconds" switch'],
          ['Open the picker', 'The first options are "Follow the workspace (<zone>)" and "This device (<zone>)", then every zone as "(GMT+05:30) Asia/Calcutta · IST" ordered by offset'],
          ['Pick a different zone', 'The taskbar clock re-renders in that zone immediately'],
          ['Turn on "Count seconds"', 'The clock shows and ticks seconds'],
          ['Open a different console with the same account', 'The clock uses the same zone and seconds setting'],
        ],
      },
      {
        name: 'Minimise and restore running windows',
        description: 'The staff chat panel and a call window appear as taskbar buttons.',
        steps: [
          ['Open the staff chat panel', 'A "Coworkers" button with a chat icon appears on the left of the taskbar, raised and underlined'],
          ['Click that taskbar button ("Minimise Coworkers")', 'The docked panel hides, the page regains its width and the button turns flat'],
          ['Click it again ("Restore Coworkers")', 'The panel returns with the same conversation open'],
          ['Reload the console while the chat is minimised', 'It stays minimised because the minimised list is saved server-side'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Apps drawer',
    description:
      'The nine-dots apps drawer in every console header holding tools that open over the current page: File Manager, Chat with a coworker, Jump to Portal and Ask Bot; controlled per console by Admin > Portal App Settings.',
    sub_flows: [
      {
        name: 'Open and search the apps drawer',
        description: 'Tools are matched on name, description and keywords.',
        steps: [
          ['Click the apps icon in the header ("open apps")', 'A right drawer titled "Apps" opens with a focused "Search apps" box and File Manager, Chat with a coworker, Jump to Portal and Ask Bot'],
          ['Type "imagekit"', 'Only File Manager remains (matched by keyword)'],
          ['Type "qwerty"', 'The list shows "Nothing matches “qwerty”."'],
          ['Click the close button ("Close apps")', 'The drawer closes and the search text is cleared for next time'],
        ],
      },
      {
        name: 'Apps and chat turned off for a console',
        description: 'portalMode.apps_enabled and chat_enabled hide the header buttons; the query fails open.',
        steps: [
          ['In Admin > Portal App Settings turn "App" off for the Website console, then reload it', 'The apps icon is gone from the Website header'],
          ['Turn "App" back on and "Chat with a coworker" off, then reload', 'The apps icon returns, the chat button is hidden and the drawer no longer lists "Chat with a coworker"'],
          ['Sign in with an account whose roles are not staff chat roles (e.g. only SUPPORT_USER on a console that allows it)', 'No chat button is drawn even when chat is enabled'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: File Manager',
    description:
      'The ImageKit media library opened from the apps drawer: browse, search, filter, sort, page, upload, copy links, and — for SUPER_ADMIN or TECH_MANAGER only — rename, tag and delete.',
    sub_flows: [
      {
        name: 'Browse, search and page files',
        description: 'mediaFiles with a debounced search, type filter, sort and 40-per-page paging.',
        steps: [
          ['Open Apps and click "File Manager"', 'A wide dialog "File Manager" opens with "Every file uploaded to ImageKit. Upload, find one, copy its link at any size." and a grid of thumbnails'],
          ['Type part of a file name in "Search by file name"', 'After a short pause the grid reloads with matching files and paging resets to the first page'],
          ['Search for a name that does not exist', 'The grid shows "Nothing matches “<query>”."'],
          ['Set Type to "Images", then "Other files"', 'The grid shows only images, then only non-image files'],
          ['Set Sort to "Name A–Z"', 'Files are ordered alphabetically'],
          ['Click "Next" under the grid', 'The range label advances (e.g. 41–80); "Next" is disabled when a page has fewer than 40 files and "Previous" is disabled on the first page'],
          ['Click the reload icon ("Reload files")', 'The current page is refetched'],
        ],
      },
      {
        name: 'Upload files and copy a link',
        description: 'Any signed-in staff user can upload into /file-manager.',
        steps: [
          ['Click "Upload" and pick two files', 'The button reads "Uploading…" with a progress bar, then a toast says "Uploaded 2 files" and the grid refetches'],
          ['Click a file tile to open its details', 'A side panel shows the name, "Copy", Info and Edit tabs, and the Info tab lists Name, Path, Type, Size, Dimensions, Uploaded, Updated, File ID and Version'],
          ['Click "Copy"', 'The file URL is on the clipboard and a toast says "Link copied"'],
        ],
      },
      {
        name: 'Rename, tag and delete as a write role',
        description: 'SUPER_ADMIN and TECH_MANAGER can change files.',
        steps: [
          ['As a TECH_MANAGER open a file and choose the Edit tab', 'Fields "File name" (hint "Renaming purges the CDN copy so the link updates.") and "Tags" appear, each with a Save button'],
          ['Change the file name and click its Save', 'renameMediaFile runs with purgeCache; the panel shows the new name and a "Saved" toast'],
          ['Type a tag, press Enter and click the tags Save', 'The tag chip is saved to ImageKit and "Saved" shows; a failure shows "Could not save tags"'],
          ['Tick two tiles', 'A "Delete 2" button appears in the toolbar and the details panel offers previous/next stepping "1 of 2 selected"'],
          ['Click "Delete 2"', 'deleteMediaFiles removes both, the toast says "Deleted 2 files" and the grid refetches'],
          ['Open one file and click "Delete" in its panel', 'The panel closes and the toast says "Deleted <name>"'],
        ],
      },
      {
        name: 'Read-only file access',
        description: 'Staff without a write role can browse, upload and copy only.',
        steps: [
          ['As an HR_MANAGER open File Manager and tick a tile', 'No "Delete" button appears in the toolbar'],
          ['Open a file', 'Only "Copy" is offered; there is no Delete button and the Edit tab shows no rename or tag fields'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Jump to Portal',
    description:
      'The apps drawer dialog listing every staff console split into the ones the caller can open and the ones they can request; requests go to Admin > Portal Access as PORTAL_ACCESS approvals.',
    sub_flows: [
      {
        name: 'Open an accessible console',
        description: 'myPortalAccess reads live DB roles, not the token snapshot.',
        steps: [
          ['Open Apps and click "Jump to Portal"', 'A dialog "Jump to Portal" opens with "Every Duncit console, one click away." and a spinner while loading'],
          ['Read the first accordion "Portals you can access"', 'It is expanded, shows a count chip, and lists each console name with its URL'],
          ['Click a console row', 'That console opens in a new browser tab'],
          ['Sign in as SUPER_ADMIN and open the second accordion "Portals you don\'t have access to"', 'It reads "You can open every portal."'],
        ],
      },
      {
        name: 'Request access to a locked console',
        description: 'Creates a PENDING PORTAL_ACCESS approval request.',
        steps: [
          ['As an EMPLOYEE-only account expand "Portals you don\'t have access to"', 'The hint "Request access and a super admin will review it from the Admin console." shows above rows with a lock icon and a "Request access" button'],
          ['Click "Request access" on the HR row', 'The button disables while sending, then the row shows a "Requested" chip and "Waiting for an admin decision."'],
          ['Check the server', 'An approval request of type PORTAL_ACCESS with target_id hr, status PENDING and "Grants role: HR_MANAGER" exists for the user'],
          ['After an admin approves it, reopen the dialog', 'HR moves into "Portals you can access" without signing out, and the requester receives an approval email'],
        ],
      },
      {
        name: 'Declined and non-requestable consoles',
        description: 'Rows reflect the latest request status and the admin console exception.',
        steps: [
          ['After an admin denies the HR request, reopen the dialog', 'The HR row shows "Your last request was declined — you can ask again." with "Request access" enabled again'],
          ['Find the Admin console row', 'It shows "Granted personally by a super admin." instead of a button'],
        ],
      },
      {
        name: 'Request and load errors',
        description: 'Server refusals surface in a dismissable alert.',
        steps: [
          ['Send a requestPortalAccess for a console that already has a PENDING request (e.g. from a second tab)', 'A red alert shows "You have already requested access to this portal"'],
          ['Request a console the user already holds a role for', 'The alert shows "You already have access to this portal"'],
          ['Open the dialog while the API is unreachable', 'The dialog shows "Could not load the portal list. Please try again."'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Ask Bot',
    description:
      'The apps drawer Ask Bot: a server-provided bot list and the Navigation Knowledge Bot chat that answers where anything lives across Duncit with environment-resolved, role-aware links (askBots / askBotChat).',
    sub_flows: [
      {
        name: 'Ask the navigation bot where something lives',
        description: 'Happy path with an OpenAI key configured.',
        steps: [
          ['Open Apps and click "Ask Bot"', 'A dialog "Ask Bot" shows "Pick a bot to talk to. More will appear here as they are built." and the "Navigation Knowledge Bot" row'],
          ['Click "Navigation Knowledge Bot"', 'The title becomes the bot name, the greeting "Ask me where anything lives on Duncit…" shows with "Try asking" chips: "Where do I approve a venue?", "Where can I see failed emails?", "Where does a member change their language?"'],
          ['Click "Where do I approve a venue?"', 'The question appears as a message, "Looking it up…" shows, then an answer bubble arrives with up to 4 link buttons showing label and "Surface · path"'],
          ['Click a link button', 'The page opens in a new tab at the URL for the current environment (localhost in development)'],
          ['Read below the answer', 'Up to 3 "Then ask" follow-up chips are offered; clicking one sends it'],
          ['Type a question in "Ask where something is…" and press Send', 'Send is disabled while empty or loading; the question is sent with the last 8 turns as history'],
        ],
      },
      {
        name: 'Links to consoles the user cannot open',
        description: 'Links are checked against the caller role keys; app-only pages have no local address.',
        steps: [
          ['As an EMPLOYEE-only account ask where to approve a venue', 'Links to consoles without access render as locked chips "<label> — You cannot open this console yet"'],
          ['Hover a locked chip', 'The tooltip says "Ask for it under Jump to Portal in this same drawer."'],
          ['Locally ask about a member app screen', 'The link renders as a phone chip "<label> — Open this one in the Duncit app — it has no local address."'],
        ],
      },
      {
        name: 'Start over and go back',
        description: 'Nothing is persisted; the thread lives only in the dialog.',
        steps: [
          ['In a conversation click the restart icon ("Start over")', 'The thread clears and the starter chips return'],
          ['Click the back arrow ("All bots")', 'The bot list returns'],
          ['Close and reopen the dialog', 'It opens on the bot list with no previous conversation'],
        ],
      },
      {
        name: 'Bot not configured or failing',
        description: 'Missing OpenAI key and upstream errors.',
        steps: [
          ['Remove the OpenAI key in Tech env variables and open Ask Bot', 'The bot row is disabled with "Not ready yet — a tech admin needs to add the OpenAI key in the Tech portal." and an "Unavailable" chip'],
          ['With a key set, make the OpenAI call fail and ask a question', 'A red dismissable alert shows "Could not get an answer. Please try again."'],
          ['Open Ask Bot while the API is unreachable', 'The dialog shows "Could not load the bots. Please try again."'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Agent console assistant',
    description:
      'The draggable Agent tab on every console that creates pods or clubs from a sentence (agentAvailability / agentChat). Anyone signed in can talk to it; only SUPER_ADMIN, CITY_ADMIN and ZONAL_ADMIN can make it create things, capped at 10 per run.',
    sub_flows: [
      {
        name: 'Create pods from a sentence',
        description: 'An admin asks the Agent to create pods; the reply lists what was actually created.',
        steps: [
          ['Sign in as SUPER_ADMIN and look at the right edge of the screen', 'A vertical "Agent" tab with a sparkle icon is stuck to the edge (tooltip "Open the Agent — drag to move this tab")'],
          ['Click the tab', 'A right drawer "Agent" opens with "Tell me what to create and I will set it up.", the greeting, chips "Create 5 pods", "Create 10 book club pods", "Create 3 clubs for photography" and "The agent creates up to 10 at a time. Ask again for more."'],
          ['Click "Create 5 pods"', 'The request shows in the thread, "Working on it…" appears, then an answer like "Created 5 of 5 pods."'],
          ['Read "What was created"', 'Each item shows a green tick, title, reference chip and the booked slot time in the admin date format with a detail line'],
          ['Open the Pods console', 'The five pods exist with booked venue slots and cover images'],
          ['Ask "create 25 badminton pods"', 'At most 10 are created and the summary says how many of the requested count were made'],
        ],
      },
      {
        name: 'Partial failures and missing resources',
        description: 'Items that could not be created are listed with the reason; a missing prerequisite becomes the answer.',
        steps: [
          ['Ask for more pods than there are free venue slots', 'The answer reads "Created X of Y pods. N could not be created — see the list." and failed items show a red icon and a "Not created" chip with the reason'],
          ['With no active club in the database ask for pods', 'The answer is "There is no active club to attach pods to. Create a club first." and nothing is created'],
          ['With no approved active venues ask for pods', 'The answer is "There are no approved, active venues, so no slot can be booked."'],
          ['With an empty ImageKit library ask for pods', 'The answer explains that every pod needs a cover image and to upload one from any portal’s File Manager'],
          ['Send a message that is not a creation request', 'The Agent replies conversationally or "I could not tell what to create." and nothing is created'],
        ],
      },
      {
        name: 'Read-only role',
        description: 'A staff role outside AGENT_ACT_ROLES can chat but not create.',
        steps: [
          ['Sign in as HR_MANAGER and open the Agent', 'A blue info alert reads "You can ask the agent questions, but your role cannot create things yet."'],
          ['Ask "Create 5 pods"', 'The answer is "You do not have permission to create these, so nothing was made." and no pods exist'],
        ],
      },
      {
        name: 'Agent not configured or unreachable',
        description: 'No OpenAI key, or a failed turn.',
        steps: [
          ['Remove the OpenAI key and open the Agent', 'A warning reads "Not ready yet — a tech admin needs to add the OpenAI key in the Tech portal.", the suggestion chips are hidden and the composer is disabled'],
          ['With a key set, make agentChat fail and send a message', 'A dismissable red alert shows "Could not reach the agent. Please try again." and the request stays in the thread'],
          ['Send an empty message via the API', 'The server refuses with "Type what you would like the agent to do"'],
        ],
      },
      {
        name: 'Move the tab, start over and close',
        description: 'The dock position is per person and follows them across consoles.',
        steps: [
          ['Drag the Agent tab down the right edge', 'The tab follows the pointer vertically'],
          ['Drag it across the middle of the screen and release', 'It sticks to the left edge with its rounded side facing the page'],
          ['Open a different console', 'The tab is on the left edge at the same height (agent_edge and agent_offset saved server-side)'],
          ['Open the Agent, send a message, then click "Start over"', 'The thread clears and the suggestions return'],
          ['Close the drawer and reopen it', 'The tab is hidden while the drawer is open, and a reopened Agent starts with an empty thread'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Staff chat',
    description:
      'The docked "Coworkers" chat panel in every console header for staff roles: threads and directory, messaging with attachments, voice notes and locations, replies, reactions, pins, edits, deletes, search, presence, settings, export and clear.',
    sub_flows: [
      {
        name: 'Open the panel and find a coworker',
        description: 'Conversations first, then the directory, filtered by search and team.',
        steps: [
          ['Sign in with a staff role (e.g. TECH_MANAGER) and click the chat bubble in the header ("Chat with a coworker")', 'A 380px "Coworkers" panel docks at the right and the page narrows; the unread badge shows the unread count'],
          ['Read the list', 'Existing conversations appear first with unread badges and "You: " before your own last message, then "Everyone else" with role chips per coworker'],
          ['Type part of a name in "Search coworkers"', 'Conversations hide and "Matching coworkers" lists matches'],
          ['Pick "HR" in the "Team" select', 'Both conversations and directory narrow to people holding HR_MANAGER'],
          ['Search for a name that nobody has', 'The list shows "Nobody matches that."'],
          ['Click the info button on a coworker row', 'A popover "About <name>" shows their consoles and local time, or "No staff console assigned."'],
        ],
      },
      {
        name: 'Send, fail and retry a message',
        description: 'Optimistic send with a visible retry path.',
        steps: [
          ['Open a coworker and type in "Write a message", then press Enter', 'The message appears immediately with a sending clock, then Sent/Delivered/Read ticks as the other side receives and opens it'],
          ['Start typing while the coworker has the thread open', 'They see "<your name> is typing…"'],
          ['Go offline and send a message', 'The bubble stays and shows "Not sent — tap to retry"'],
          ['Reconnect and tap the failed message', 'It is resent and replaced by the delivered message'],
          ['Send only spaces through the API', 'The server refuses with "Write something, or attach a file"'],
          ['As the other person, receive a message with the panel closed', 'A ping sound plays and the header badge count increases; opening the thread marks it read and clears the badge'],
        ],
      },
      {
        name: 'Attach files, voice notes and locations',
        description: 'Uploads go to ImageKit /staff-chat; locations are sent as a place message.',
        steps: [
          ['Click "Attach a file" and pick a PDF', 'A determinate upload bar shows progress, then an attachment row with name, size and "Download <name>" appears'],
          ['Drag an image onto the conversation', 'The drop zone says "Drop to attach" and the image is uploaded and sent with a preview'],
          ['Force an upload failure', 'A failure alert "That file could not be uploaded" appears with "Show details" and "Copy"'],
          ['Click "Record a voice note", speak, then click "Send voice note"', 'A voice note bubble with a waveform, play button and playback speed control is sent'],
          ['Record again and click "Discard voice note"', 'Nothing is sent'],
          ['Open "More options" > "Search a place", search an address and click "Send this place"', 'A location message with the place name is sent; without a Google Maps key the dialog notes "The map preview needs a Google Maps key in the Tech portal. You can still send the place."'],
        ],
      },
      {
        name: 'Reply, react, pin, forward and copy',
        description: 'Per-message actions behind the "Message actions" menu.',
        steps: [
          ['Open "Message actions" on a message and choose "Reply"', 'A strip "Replying to <name>" appears above the composer with "Cancel reply"; the sent message shows the quoted original'],
          ['React to a message with an emoji', 'The reaction chip appears under the bubble for both people with a tooltip naming who reacted'],
          ['Choose "Pin"', 'The message shows a "Pinned" badge and the menu item becomes "Unpin"'],
          ['Choose "Forward"', 'A copy of the message is posted as a new message in the open conversation marked as forwarded'],
          ['Choose "Copy text"', 'The message text is on the clipboard'],
          ['Type "@" and part of the coworker name, or ":" and an emoji name', 'A suggestion popup offers the mention or emoji and inserts it at the caret'],
        ],
      },
      {
        name: 'Edit and edit history',
        description: 'Only your own words can be edited; SUPER_ADMIN can read earlier wordings.',
        steps: [
          ['Open "Message actions" on your own message and choose "Edit"', 'The bubble becomes an inline editor with the current text'],
          ['Change the text and save', 'The bubble shows the new text with an "edited" label for both people'],
          ['Open the menu on the other person’s message', 'No "Edit" item is offered'],
          ['As SUPER_ADMIN open the menu on an edited message and choose "Edit history"', 'A dialog "Edit history" lists "Current" and "Earlier" versions, or "No earlier version was recorded."'],
          ['As a non-super-admin open the same menu', '"Edit history" is not offered'],
        ],
      },
      {
        name: 'Delete messages and select many',
        description: 'Delete for me is local; delete for everyone is only for your own messages.',
        steps: [
          ['Choose "Delete for me" on any message', 'The message disappears from this device only; the other person still sees it'],
          ['Choose "Delete for everyone" on your own message', 'The bubble becomes a deleted placeholder for both people'],
          ['Choose "Select messages" on a message', 'A selection bar replaces the header showing "1 selected" with Copy, Hide and "Delete for everyone"'],
          ['Tap two more messages (or focus one and press Space)', 'The count reads "3 selected"'],
          ['Click "Clear selection"', 'The normal conversation header returns'],
        ],
      },
      {
        name: 'Search inside a conversation',
        description: 'Ctrl+K opens the conversation search with sender, type and date filters.',
        steps: [
          ['In an open conversation press Ctrl+K', 'The search panel "Search this conversation" opens'],
          ['Type a word and run the search', 'Matching messages list with their time; clicking one scrolls the thread to it and highlights it'],
          ['Filter by "From you", then by "Files", then "Links", and set After/Before dates', 'Results narrow accordingly; no hits shows "Nothing matched."'],
          ['Click a hit older than the loaded messages', 'A note says "Older than the messages loaded — open Earlier messages first"'],
          ['Scroll to the top and click "Earlier messages"', 'The previous 50 messages load above without renumbering the visible ones'],
        ],
      },
      {
        name: 'Presence status',
        description: 'Your own availability and how coworkers see it.',
        steps: [
          ['Open the status menu in the panel header', 'Options Online ("At your desk"), Away ("Connected, not looking"), Busy ("Please do not disturb") and "Appear offline" ("Still connected, shown as away")'],
          ['Choose "Busy"', 'Your dot turns busy and coworkers see Busy next to your name'],
          ['Leave the console idle for 10 minutes with status Online', 'Your status changes to Away automatically'],
          ['Set Busy and stay idle for 10 minutes', 'The status stays Busy because a chosen status overrides the idle timer'],
          ['Open a conversation with someone who is offline', 'The header shows "offline" or "last seen <when>"'],
        ],
      },
      {
        name: 'Chat settings',
        description: 'Per-user settings saved server-side via staffChatState.',
        steps: [
          ['Open "Chat settings" from the panel header', 'Options: View Compact/Comfortable, "Your bubbles" colour, "Message text size", "Times shown in" (This device, India, UTC, London, New York) and "Enter sends"'],
          ['Switch to Compact and choose "Purple bubbles"', 'The thread tightens and your bubbles turn purple immediately'],
          ['Change "Times shown in" to UTC', 'Message times re-render in UTC'],
          ['Turn "Enter sends" off', 'The hint reads "Ctrl+Enter sends; Enter starts a new line." and Enter inserts a newline'],
          ['Open chat in another console', 'The same settings apply'],
        ],
      },
      {
        name: 'Download and clear a conversation',
        description: 'Export to a text file and the destructive clear.',
        steps: [
          ['Open the conversation "More" menu and choose "Download this conversation"', 'A file named chat-<peer-name>-<yyyy-mm-dd>.txt downloads with messages and calls'],
          ['Choose "Clear all messages"', 'A confirm dialog "Clear this conversation?" says every message is deleted for both people while calls and recordings stay'],
          ['Click "Clear messages"', 'The thread empties for both people; call rows remain'],
          ['Choose "Clear all messages" and cancel', 'Nothing is deleted'],
        ],
      },
      {
        name: 'Close, minimise and restore the panel',
        description: 'The panel stays mounted so calls still ring; its state survives reloads.',
        steps: [
          ['Click "Minimise the chat panel" in the panel header', 'The panel hides and remains on the taskbar as "Coworkers"'],
          ['Click "Close chat"', 'The panel closes and the page takes full width; the header chat button remains'],
          ['Open the panel on a conversation, then reload the console', 'The panel reopens on the same conversation'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Staff calls',
    description:
      'One-to-one WebRTC audio and video calls from a staff chat conversation, shown in a movable floating window: ringing, answer/decline, mute, camera, screen share, recording to MP4 and device settings.',
    sub_flows: [
      {
        name: 'Place and cancel an audio call',
        description: 'The caller side of a call.',
        steps: [
          ['In a conversation click "Start audio call"', 'A floating window "Call with <name>" opens with the subtitle "Calling…" and a "Cancel" button; it also appears on the taskbar'],
          ['Click "Cancel" before it is answered', 'The call ends, the window closes and the thread shows an outgoing audio call row marked "Cancelled"'],
        ],
      },
      {
        name: 'Answer or decline an incoming call',
        description: 'The callee side; an incoming call opens the chat panel on its own.',
        steps: [
          ['Have a coworker call you while your chat panel is closed', 'The ringtone plays, the chat panel opens and a window shows "<name> is calling" with "Answer" and "Decline"'],
          ['Click "Answer"', 'The subtitle changes to "On a call", both sides hear each other and the controls row shows Mute and Record'],
          ['Click "Hang up"', 'The call ends for both people and a call row with its duration appears in the thread'],
          ['On a new incoming call click "Decline"', 'The caller sees the call end and both threads show a "Declined" row'],
          ['Let an incoming call ring out', 'The thread shows the call as "Missed"'],
        ],
      },
      {
        name: 'Video call controls',
        description: 'Camera, fullscreen and screen share exist only on video calls.',
        steps: [
          ['Click "Start video call" and have the coworker answer', 'The window "Video with <name>" shows remote video large and your preview small'],
          ['Click "Mute microphone"', 'The other side stops hearing you and the control becomes "Unmute microphone"'],
          ['Click "Turn camera off"', 'Your video stops for the other side and the control becomes "Turn camera on"'],
          ['Click "Share your screen" and pick a window', 'Your screen replaces the camera; the header adds " · sharing your screen"; "Stop sharing" restores the camera'],
          ['Click "Full screen video"', 'The remote video fills the screen'],
          ['Try to share the screen on an audio call via the API', 'An error says "Start a video call first — screen sharing replaces the camera."'],
        ],
      },
      {
        name: 'Record a call and share the recording',
        description: 'Records both sides, uploads, converts to MP4 and attaches it to the call.',
        steps: [
          ['During a connected call click "Record this call"', 'A red recording indicator shows "Recording <mm:ss> — both sides" and the control becomes "Stop recording"'],
          ['Click "Stop recording"', 'The status goes "Uploading the recording…" then "Converting to MP4…" and Record is disabled meanwhile'],
          ['Wait for "Recording saved as MP4"', 'Buttons "Download", "Send to chat" and "Dismiss" appear and the call row in the thread shows a "Recording" link'],
          ['Click "Send to chat"', 'A "Call recording.mp4" video attachment is sent in the conversation'],
          ['Click "Play the recording" on the call row', 'A player window opens and plays the MP4'],
          ['Close the panel while the recording is converting', 'The close tooltip says the recording keeps saving in the background and the upload still completes'],
        ],
      },
      {
        name: 'Audio and video device settings',
        description: 'Choose and test microphone and camera.',
        steps: [
          ['Open "Audio & video settings" from the call window', 'A dialog "Audio & video" lists Microphone and Camera selects (System default first)'],
          ['Pick a microphone and click "Test", then speak', 'The "Input level" bar moves ("Say something — the bar should move."); "Stop test" ends it'],
          ['Unplug the chosen microphone and start a new call', 'A notice says the chosen device is not available and the default one is used'],
          ['Click "Done"', 'The choice is saved for future calls'],
        ],
      },
      {
        name: 'End a call by closing the window',
        description: 'Closing a live call window asks first.',
        steps: [
          ['During a call click the window close button', 'A confirm "End this call?" says closing hangs up on <name> and any uploading recording will finish'],
          ['Click "End call"', 'The call ends for both sides and the window closes'],
          ['Use the window minimise and maximise buttons', 'Minimise rolls it to the taskbar with "Still running — this window is minimised."; maximise fills the viewport and Restore returns it'],
        ],
      },
      {
        name: 'Call failure messages',
        description: 'Errors are shown in the call window.',
        steps: [
          ['Open a console over plain http (non-localhost) and start a call', 'The window shows "This browser will not open the microphone or camera here. Calls need a secure (https) connection."'],
          ['Deny microphone permission and start a call', 'The window shows the browser’s own permission error text and "Could not start the call"'],
          ['Drop the network during a connected call', 'The window shows "The connection dropped. Neither side could reach the other."'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Dashboard layout customisation',
    description:
      'Every console dashboard renders through @duncit/dashboard: widgets can be dragged, resized, saved per user per dashboard id, cancelled or reset. Includes the shared WelcomeDashboard greeting and account card.',
    sub_flows: [
      {
        name: 'Rearrange and save a dashboard',
        description: 'saveDashboardLayout for this user and dashboard id only.',
        steps: [
          ['Open a console dashboard and click "Customise layout"', 'A bar shows "Editing layout — Drag widgets by their handle, or drag a corner to resize." with "Save layout", "Cancel" and "Reset to default"; "Save layout" is disabled until something moves'],
          ['Drag a widget by its header grip to another position and resize another from its corner', 'The grid reflows live and "Save layout" enables'],
          ['Click "Save layout"', 'The button reads "Saving…", then edit mode ends silently'],
          ['Reload the page, then sign in as a different user', 'The first user sees their saved arrangement; the second user sees the default layout'],
        ],
      },
      {
        name: 'Cancel and reset',
        description: 'Discard unsaved moves or delete the saved arrangement.',
        steps: [
          ['Enter edit mode, move a widget and click "Cancel"', 'The widget snaps back and edit mode ends'],
          ['Enter edit mode and click "Reset to default"', 'A confirm "Reset this dashboard?" says the saved arrangement is deleted and it affects only you'],
          ['Click "Reset layout"', 'The default layout returns and stays after reload'],
        ],
      },
      {
        name: 'Layout load and save failures',
        description: 'Failures render inline above the grid.',
        steps: [
          ['Make the layout query fail and open the dashboard', 'The default arrangement shows with "Could not load your saved layout — showing the default arrangement."'],
          ['Make the save fail and click "Save layout"', 'An inline error "Could not save your layout. Please try again." shows and edit mode stays on'],
          ['Make the reset fail', 'An inline error "Could not reset your layout. Please try again." shows'],
        ],
      },
      {
        name: 'Welcome dashboard greeting and account card',
        description: 'The me-driven welcome header used by HR, Employee and Ads.',
        steps: [
          ['Open the HR dashboard', 'A spinner shows while me loads, then "Welcome back, <first name>", the portal tagline and one outlined chip per role (underscores replaced by spaces)'],
          ['Read the "Your account" card', 'It shows Name, Email, Phone (extension and number) and Member since as a date, with "—" for missing values'],
          ['Make the me query fail', 'The dashboard shows a red alert with the parsed API error'],
        ],
      },
    ],
  },

  // ───────────────────────────── HR ─────────────────────────────
  {
    name: 'HR: Console access and dashboard',
    description:
      'The HR console (hr.duncit.com, key hr, role HR_MANAGER) is currently a shell-only console: /login, a welcome dashboard at / and the shared /profile. Its nav has a single Dashboard entry and no modules.',
    sub_flows: [
      {
        name: 'HR manager opens the dashboard',
        description: 'Sign in and land on the welcome dashboard.',
        steps: [
          ['Open hr.duncit.com while signed out', 'The login card shows the "HR" chip, tagline "Manage people, attendance and HR operations." and promo "People, organised"'],
          ['Sign in with an HR_MANAGER account', 'The app opens / titled "Duncit HR" with "Welcome back, <name>" and the account card'],
          ['Look at the sidebar', 'Only "Dashboard" is listed; there is no modules section on the dashboard'],
          ['Open /profile from the account menu', 'The shared profile page shows the HR_MANAGER role chip'],
          ['Type any other path such as /leave', 'The app redirects to /'],
        ],
      },
      {
        name: 'Non-HR account is refused',
        description: 'Only HR_MANAGER or SUPER_ADMIN can open the HR console.',
        steps: [
          ['Sign in to the HR console with a FINANCE_MANAGER account', 'The login alert shows "You do not have access to this portal" and the dashboard never renders'],
          ['Ask for HR access from Jump to Portal in another console', 'An HR access request is created for the Admin > Portal Access inbox'],
        ],
      },
    ],
  },

  // ───────────────────────────── Employee ─────────────────────────────
  {
    name: 'Employee: Console access and dashboard',
    description:
      'The Employee console (employee.duncit.com, key employee, role EMPLOYEE): welcome dashboard at /, My Expenses at /expenses and the shared /profile.',
    sub_flows: [
      {
        name: 'Employee opens the dashboard',
        description: 'Sign in and navigate the two-item sidebar.',
        steps: [
          ['Sign in to employee.duncit.com with an EMPLOYEE account', 'The dashboard shows "Welcome back, <name>", tagline "Your profile, requests and workplace tools." and the "Your account" card'],
          ['Look at the sidebar', 'It lists "Dashboard" and "My Expenses"'],
          ['Click "My Expenses"', 'The app routes to /expenses'],
          ['Sign in with an account that has no EMPLOYEE role', 'The login alert shows "You do not have access to this portal"'],
        ],
      },
    ],
  },
  {
    name: 'Employee: My Expenses',
    description:
      'Employees file out-of-pocket expense claims for Finance to review: KPI tiles, status tabs held in the URL, the claim table, the full-page claim form (RHF + Zod) and withdraw. Claims are scoped to the caller and editable only while PENDING.',
    sub_flows: [
      {
        name: 'Review claims, tiles and tabs',
        description: 'myEmployeeExpenseSummary and myEmployeeExpensesTable.',
        steps: [
          ['Open /expenses', 'The header "My Expenses" reads "Claim back what you paid out of pocket. Finance reviews every claim before it is paid."'],
          ['Read the tiles', 'Total claimed ("N claim(s) filed"), Awaiting review ("N awaiting a decision", warning colour when above 0), Approved and Rejected, each in the Finance currency symbol'],
          ['Click the "Awaiting review" tab', 'The URL gains ?selectedtab=pending and the table shows only PENDING claims'],
          ['Reload the page', 'The Awaiting review tab is still selected'],
          ['Read a row', 'Columns Claim (DUN-EXP-XXXXXX with the description below), Spend date, Category, Paid to, Amount, Bill, Status and actions'],
          ['Search "Uber" in "Search claim id, merchant or reference"', 'Only matching claims remain'],
          ['Open the list with no claims filed', 'The table says "You have not filed an expense claim yet."'],
        ],
      },
      {
        name: 'File a new expense claim',
        description: 'createEmployeeExpense with status PENDING.',
        steps: [
          ['Click "New claim" in the table toolbar', 'The app routes to /expenses/new with "Back to my expenses", the title "New claim" and the info alert that filing is a request subject to Finance approval'],
          ['Read the defaults', 'Spend date is today, Category is Travel, How you paid is Upi, and other fields are empty'],
          ['Fill Amount 1250, Paid to "Uber", Bill / invoice number, Reference / transaction id and "What it was for"', 'The Amount field shows the currency symbol adornment'],
          ['Click "Upload" under "Bill or receipt" and pick a PDF', 'The file uploads to /employee-expenses and its URL fills the field'],
          ['Click "File claim"', 'The button reads "Saving…", then the app returns to /expenses and the new claim is listed as "Awaiting review"'],
          ['Check the tiles', 'Total claimed and Awaiting review include the new amount'],
        ],
      },
      {
        name: 'Expense claim validation',
        description: 'Zod rules on the claim form and server guards.',
        steps: [
          ['Clear the Amount and submit', 'The field shows "Enter an amount greater than 0" and nothing is sent'],
          ['Enter 0 or a negative amount and submit', 'The same "Enter an amount greater than 0" message shows'],
          ['Clear the spend date and submit', 'The date shows "Pick the day you paid"'],
          ['Try to pick a future date in the date picker', 'Future days are disabled'],
          ['Type more than 200 characters in "Paid to" or more than 1000 in "What it was for"', 'The field shows "Too long"'],
          ['Submit without a bill', 'The claim is accepted; the list shows "Not attached" in the Bill column in warning colour'],
          ['Send an amount of 0 directly to createEmployeeExpense', 'The server refuses with "Claim amount must be greater than 0"'],
        ],
      },
      {
        name: 'Edit a pending claim',
        description: 'updateEmployeeExpense, only while PENDING and only your own.',
        steps: [
          ['Click edit on a claim awaiting review', 'The app routes to /expenses/<id>/edit, skeletons show while loading, then the form is prefilled with the title "Edit claim" and the breadcrumb reads "Edit claim"'],
          ['Change the amount and click "Save"', 'The app returns to /expenses and the row shows the new amount'],
          ['Click "Back to my expenses" without saving', 'Nothing changes'],
          ['Open /expenses/<id>/edit with an id that belongs to another employee or was withdrawn', 'A warning alert shows the server message ("Expense claim not found") or "This claim could not be found. It may have been withdrawn already."'],
        ],
      },
      {
        name: 'Decided claims are locked',
        description: 'Once Finance approves or rejects, the claim cannot be changed.',
        steps: [
          ['Find an Approved or Rejected claim in the table', 'Its edit and withdraw buttons are visible but disabled'],
          ['Hover the disabled buttons', 'The tooltip reads "A claim can only be changed while it is still awaiting review."'],
          ['Call updateEmployeeExpense on a decided claim', 'The server refuses with "This claim has already been reviewed and can no longer be changed"'],
        ],
      },
      {
        name: 'Withdraw a pending claim',
        description: 'deleteEmployeeExpense behind a destructive confirm.',
        steps: [
          ['Click withdraw ("Withdraw claim") on a pending claim', 'A confirm "Withdraw this claim?" reads "Claim DUN-EXP-… for <amount> will be removed. You can always file it again."'],
          ['Click "Withdraw claim"', 'The claim disappears from the list and the tiles refresh'],
          ['Withdraw a claim that Finance decided a moment earlier', 'A red alert above the tiles shows the server error and the row stays'],
        ],
      },
    ],
  },

  // ───────────────────────────── Ads Portal ─────────────────────────────
  {
    name: 'Ads Portal: Dashboard',
    description:
      'The Ads console home (ads, role ADS_MANAGER): welcome header plus the live advertiser overview from myAdsDashboard — KPI tiles, next go-live hint, empty state and recent requests.',
    sub_flows: [
      {
        name: 'Advertiser overview with existing ads',
        description: 'KPIs and the recent requests section.',
        steps: [
          ['Sign in to the Ads console with an ADS_MANAGER account', 'The dashboard shows the welcome header, the "Your account" card and an "Ads overview" section with a "Create Ad" button'],
          ['Read the KPI tiles', 'Total Ads, Pending Review, Live Now, Upcoming Approved, Rejected, Expired, Total Approved Spend and Live Spend (money in the pricing currency symbol)'],
          ['With an approved ad starting in the future, read the info alert', 'It says "Next ad goes live: <title> on <date and time>."'],
          ['Look under the tiles', '"Recent requests" lists the latest ad requests with a "View all" button'],
          ['Click "View all"', 'The app routes to /ads'],
        ],
      },
      {
        name: 'Brand-new advertiser empty state',
        description: 'No ad requests yet.',
        steps: [
          ['Open the dashboard with an account that has never submitted an ad', 'All counts are 0 and a card shows "No ads yet" with the estimate explanation'],
          ['Click "Create your first ad"', 'The app routes to /ads/new'],
        ],
      },
    ],
  },
  {
    name: 'Ads Portal: My Ads',
    description: 'The advertiser’s own ad requests at /ads (myAdRequestsTable), with search, filters and row navigation to details.',
    sub_flows: [
      {
        name: 'Browse and filter my ad requests',
        description: 'Server-paged table scoped to the signed-in submitter.',
        steps: [
          ['Open Create Ads > My Ads', 'The page "My Ads" reads "Track your ad requests — quotes, review status and live placements."'],
          ['Read the columns', 'Trace ID (AD-000123), Title, Position, Type, Starts, Days, Est. Cost, Status chip and Submitted, newest first'],
          ['Search a trace ID in "Search trace ID or title"', 'Only that request remains'],
          ['Filter Status to Live and Position to Home Bottom', 'Only matching rows remain'],
          ['Click a row', 'The app routes to /ads/<id>'],
          ['Click "New Ad"', 'The app routes to /ads/new'],
          ['Open My Ads with no requests', 'The table says "No ad requests yet — create your first ad"'],
        ],
      },
    ],
  },
  {
    name: 'Ads Portal: Create Ad',
    description:
      'Submitting an ad request at /ads/new with the shared @duncit/ad-request-form (RHF + Zod) and the live estimate card; the server prices it from the rate card and emails the advertiser.',
    sub_flows: [
      {
        name: 'Submit an image ad request',
        description: 'submitAdRequest creates a PENDING request with a trace ID and estimated cost.',
        steps: [
          ['Open Create Ads > Create Ad', 'The page "Create Ad" shows the form and an "Estimated Cost" card; defaults are Ad Type Image, Ad Position "Auto (all placements)", start today and 7 days'],
          ['Enter an Ad Title of 3–120 characters and an Ad Description of 10–1000 characters', 'Hints read "3–120 characters" and "What the ad promotes (10–1000 characters)"'],
          ['Choose Ad Position "Home Bottom" and move the duration slider to 14', 'The label reads "Ad Duration: 14 days (1 day – <max>)" and the estimate card updates the per-day rate, duration and total'],
          ['Click "Upload image" and pick an image', 'The preview appears and the button becomes "Replace image"'],
          ['Enter Redirect URL https://duncit.com and a Target Audience', 'Both fields accept the values'],
          ['Click "Submit Ad Request"', 'A success toast says "Ad request submitted · Trace ID AD-…" and the app opens /ads/<id> with status Pending'],
          ['Check the advertiser mailbox', 'An "Your Duncit ad is in review" email arrives'],
        ],
      },
      {
        name: 'Ad request validation',
        description: 'Client schema plus server checks; Submit stays disabled while the form is invalid.',
        steps: [
          ['Type 2 characters in Ad Title', 'The field shows "Ad Title must be at least 3 characters" and Submit is disabled'],
          ['Type 9 characters in Ad Description', 'The field shows "Ad Description must be at least 10 characters"'],
          ['Leave media empty', 'The media field shows "Upload the ad media" and Submit stays disabled'],
          ['Upload an image, then switch Ad Type to Video', 'The uploaded media is cleared ("Changing the type clears the uploaded media") and the upload button becomes "Upload video" (up to 100MB)'],
          ['Enter Redirect URL "ftp://example.com"', 'The field shows "Redirect URL must be a valid http(s) link"'],
          ['Try to pick a past date in Ad Start Date', 'Past days are disabled; a past value shows "Ad start date must be today or later"'],
          ['Send duration_days above the Marketing maximum to the API', 'The server refuses with "Duration must be between <min> and <max> days"'],
          ['Send a submission without an https media URL', 'The server refuses with "Ad media must be uploaded before submitting"'],
        ],
      },
      {
        name: 'Access to ad submission',
        description: 'Role gates on the Ads endpoints.',
        steps: [
          ['Sign in to the Ads console as a user without ADS_MANAGER', 'Login is refused with "You do not have access to this portal"'],
          ['Call myAdRequestsTable as an ECOMM_MANAGER', 'The request is refused as forbidden (only SUPER_ADMIN and ADS_MANAGER can list), while submitAdRequest is allowed for ECOMM_MANAGER'],
        ],
      },
    ],
  },
  {
    name: 'Ads Portal: Ad request details',
    description: 'One ad request at /ads/:id: status, submitted time, Marketing remarks, media and the full summary including approved cost.',
    sub_flows: [
      {
        name: 'View a pending request',
        description: 'The advertiser reads back what they submitted.',
        steps: [
          ['Open a pending request from My Ads', 'The header shows a back arrow ("Back to My Ads"), "Trace ID · AD-…", the ad title and a Pending status chip, with "Submitted <d MMM yyyy, HH:mm>"'],
          ['Read the media card', 'The uploaded image or video is shown'],
          ['Read "Request Details"', 'Description, Position, Starts, Ends, Duration ("14 days"), Redirect URL link, Target audience, Submitted by, Submitted on, Estimated cost and "Approved cost: Pending review"'],
          ['Click the back arrow', 'The app returns to /ads'],
        ],
      },
      {
        name: 'View a reviewed request',
        description: 'After Marketing approves or rejects.',
        steps: [
          ['Open a request that Marketing approved with remarks', 'An info alert "Marketing Remarks · Reviewed <date time>" shows the remarks and Approved cost shows the frozen amount'],
          ['Open a rejected request', 'The status chip reads Rejected and the remarks alert explains why'],
        ],
      },
      {
        name: 'Missing or foreign request',
        description: 'Not found and forbidden reads.',
        steps: [
          ['Open /ads/000000000000000000000000', 'The page shows "Ad request not found." or the server error "Ad request not found"'],
          ['Open the id of another advertiser’s request', 'The server refuses with "You do not have access to this ad request" and the page shows the error'],
        ],
      },
    ],
  },

  // ───────────────────────────── AI ─────────────────────────────
  {
    name: 'AI: Welcome page',
    description:
      'The AI console home (ai.duncit.com, key ai, role AI_MANAGER): a greeting widget on the shared dashboard grid. The Agent tab and Ask Bot are shell tools available here as in every console.',
    sub_flows: [
      {
        name: 'AI manager lands on Welcome',
        description: 'Sign in and read the welcome card.',
        steps: [
          ['Sign in to the AI console with an AI_MANAGER account', 'The page title reads "Welcome to Duncit AI" with the tagline "Operate AI tools and model configuration."'],
          ['Read the greeting widget', 'It shows "Hi <first name>", "This is the AI Portal. Your console is set up and ready — features will appear here soon." and chips "AI Portal" and "Coming soon"'],
          ['Look at the sidebar', 'It lists Welcome, AI Library, OpenAI (Dashboard, Logs) and AI Monitoring (Logs, Settings)'],
          ['Sign in with a TECH_MANAGER-only account', 'Login is refused with "You do not have access to this portal"'],
        ],
      },
    ],
  },
  {
    name: 'AI: AI Library',
    description:
      'The Prompt Library at /library (@duncit/ai-prompts): Code Prompts that shipped features read on every call (edit body/model, reset, never delete) and AI Prompts written here and served by the public unauthenticated GET feed. Gated to SUPER_ADMIN and AI_MANAGER.',
    sub_flows: [
      {
        name: 'Browse code prompts',
        description: 'The CODE tab is the default and cannot create rows.',
        steps: [
          ['Open AI Library', 'The page "AI Library" shows tabs "Code Prompts" and "AI Prompts"; Code Prompts is selected and the URL holds ?selectedtab=CODE'],
          ['Read the blurb and feed bar', 'The CODE blurb explains code prompts can only be edited or reset; a warning box "Public GET API" shows the list URL …/ai-prompts/prompts.json?kind=CODE with copy and open buttons'],
          ['Read the table', 'Columns Name with a System/User turn chip, Key (monospace), Category, Model ("Default" when empty), Tokens (≈ N), Status, date and actions; there is no "Add AI prompt" button'],
          ['Hover the disabled delete button on a code row', 'The tooltip reads "Code prompts power a shipped feature — reset instead of deleting"'],
          ['Search "moderation" in "Search by name, key, category or content…"', 'Only matching prompts remain'],
        ],
      },
      {
        name: 'Edit a code prompt body',
        description: 'Only content, description and target model are operator-owned; required placeholders must stay.',
        steps: [
          ['Click edit on a code prompt (e.g. one using {{pod_fields}})', 'A dialog "Edit prompt" shows the form with Name, Key and Category disabled, plus the prompt URL bar, the role hint, "Where this runs", "Placeholders" and "Preview"'],
          ['Type into "Prompt content"', 'The token chip updates live ("≈ N tokens") and the Preview renders the body with example values filled in'],
          ['Delete a required placeholder from the body', 'The field shows "Keep {{name}} in the body — the feature fills them in, and without them it runs with the facts missing." and "Save changes" is disabled'],
          ['Click the placeholder chip in the Placeholders panel', 'The braced placeholder is copied to the clipboard for pasting back'],
          ['Restore the placeholder, change Model to gpt-4o-mini and click "Save changes"', 'The dialog closes, the table refreshes and the Model column shows gpt-4o-mini; the next call of that feature uses the new text'],
          ['Send an update without the required placeholder directly to the API', 'The server refuses with "This prompt needs {{name}} in the body — …"'],
        ],
      },
      {
        name: 'Reset a code prompt to its shipped default',
        description: 'resetAiPrompt restores the catalogue definition.',
        steps: [
          ['Click the reset icon ("Restore the shipped default") on an edited code prompt', 'A confirm "Reset prompt" asks to restore the shipped default and warns edits will be lost'],
          ['Click "Reset"', 'The button shows "Working…", then the row content, name, category and model return to the catalogue values and it is active'],
          ['Call resetAiPrompt on an AI prompt id', 'The server refuses with "Only code prompts can be reset"'],
        ],
      },
      {
        name: 'Create an AI prompt',
        description: 'createAiPrompt with a key slugged from the name when left blank.',
        steps: [
          ['Switch to the "AI Prompts" tab', 'The URL shows ?selectedtab=AI, the feed URL changes to kind=AI and an "Add AI prompt" button appears'],
          ['Click "Add AI prompt"', 'A dialog "Add an AI prompt" opens with Category "General", Active on and an "Add" button disabled until valid'],
          ['Enter Name "Weekly digest writer", leave Key blank and add content with {{city}}', 'The token chip counts the content'],
          ['Click "Add"', 'The row appears with key weekly-digest-writer, category General, Active, and its Placeholders list {{city}}'],
          ['Open …/ai-prompts/prompt.json?key=weekly-digest-writer&vars[city]=Pune in a browser without signing in', 'The JSON shows the prompt with Pune substituted and no created_by or usage fields'],
        ],
      },
      {
        name: 'AI prompt validation',
        description: 'Zod schema and server key uniqueness.',
        steps: [
          ['Enter a one-character Name', 'The field shows "Name must be at least 2 characters"'],
          ['Enter Key "Weekly Digest"', 'The field shows "Use lowercase letters, numbers, dots and dashes — it goes in a URL"'],
          ['Enter fewer than 10 characters of content', 'The field shows "Add at least 10 characters of prompt content"'],
          ['Enter more than 20000 characters of content', 'The field shows "Prompt is too long (max 20000 characters)"'],
          ['Create a second prompt with an existing key', 'A red alert says "<key>" is already taken — the public feed addresses prompts by key, so two rows cannot share one'],
        ],
      },
      {
        name: 'Edit, deactivate and delete an AI prompt',
        description: 'The key is fixed once saved; inactive prompts leave the public feed.',
        steps: [
          ['Edit an AI prompt', 'The Key field is disabled and the rest are editable'],
          ['Turn "Active" off and save', 'The row shows Inactive and GET …/prompt.json?key=<key> now returns 404 with the message "No active prompt named "<key>"."'],
          ['Click delete on the AI prompt', 'A confirm "Delete prompt" warns anything fetching it by key stops finding it'],
          ['Click "Delete"', 'The row is removed from the table'],
          ['Call deleteAiPrompt on a code prompt id', 'The server refuses with "Code prompts power a shipped feature and cannot be deleted"'],
        ],
      },
      {
        name: 'Public prompt feed errors',
        description: 'The unauthenticated JSON endpoints.',
        steps: [
          ['Open …/ai-prompts/prompt.json with no key', 'HTTP 400 with error KEY_REQUIRED and the message to pass ?key='],
          ['Click the copy icon on the feed bar', 'The URL is copied and the tooltip changes to "Copied" briefly'],
          ['Click "Open feed in a new tab"', 'The feed JSON opens with count and prompts, served with no-store caching'],
        ],
      },
    ],
  },
  {
    name: 'AI: OpenAI Dashboard',
    description:
      'Platform-wide OpenAI spend at /openai (openAiUsageDashboard): range picker, KPI tiles, cost per task, by area, by model, daily spend and the model rate card (upsertOpenAiModelPrice). SUPER_ADMIN and AI_MANAGER only.',
    sub_flows: [
      {
        name: 'Read spend for a range',
        description: 'The dashboard widgets for the chosen window.',
        steps: [
          ['Open OpenAI > Dashboard', 'The header "OpenAI Dashboard" and a "Range" select set to "Last 7 days"; a spinner shows until data arrives'],
          ['Read the KPI tiles', 'SPEND (with "<amount> all time"), CALLS ("<ms> ms average"), TOKENS ("<in> in · <out> out") and NO ANSWER ("<failed> failed · <skipped> not configured")'],
          ['Change Range to "Last 30 days"', 'All widgets refetch for 30 days'],
          ['Read "Cost per task", "By area", "By model" and "Daily spend"', 'Tables and bars show calls, tokens and cost; empty ranges say "No calls in this range."'],
          ['Customise and save the dashboard layout', 'The arrangement is saved for dashboard id ai.openai for this user'],
        ],
      },
      {
        name: 'Unpriced models warning',
        description: 'Calls on a model without a rate are costed at zero.',
        steps: [
          ['Have calls recorded on a model that has no rate card row', 'A warning above the widgets says "No rate card entry for <models> — those calls are counted but costed at zero. Add a rate below and future calls will be priced."'],
          ['Add a rate for that model', 'After refetch the warning no longer lists it for new calls; earlier rows keep their original cost'],
        ],
      },
      {
        name: 'Add and edit a model rate',
        description: 'The rate card dialog (RHF + Zod).',
        steps: [
          ['In "Model rates" click "Add a model"', 'A dialog "Add a model rate" opens with Model (hint "Exactly as OpenAI names it, e.g. gpt-4o-mini"), "Input — USD per 1M tokens" and "Output — USD per 1M tokens"'],
          ['Leave Model empty and click Save', 'The field shows "Model is required"'],
          ['Enter a negative input price', 'The field shows "Cannot be negative"'],
          ['Enter gpt-4o-mini, 0.15 and 0.6 and click Save', 'A toast says "Rate saved for gpt-4o-mini", the dialog closes and the list shows "in $0.15 · out $0.6 — per 1M tokens"'],
          ['Click the edit icon ("Edit rate for gpt-4o-mini")', 'A dialog "Rate for gpt-4o-mini" opens with the Model field disabled'],
          ['Force the mutation to fail and save', 'An error toast shows the parsed API error and the dialog stays open'],
        ],
      },
    ],
  },
  {
    name: 'AI: OpenAI Logs',
    description: 'Every OpenAI request at /openai/logs (openAiUsageLogsTable), including failed and not-configured calls, with a detail drawer of the prompt sent and answer returned; rows kept 180 days.',
    sub_flows: [
      {
        name: 'Filter the call log',
        description: 'Task and area filters come from the server task catalogue.',
        steps: [
          ['Open OpenAI > Logs', 'The page "OpenAI Logs" lists When, Status, Task (label with detail), Area, Model, Tokens (in · out), Cost, Took and Reason, newest first'],
          ['Filter Status to "Not configured"', 'Only SKIPPED rows remain, shown with a warning chip'],
          ['Filter Task to a catalogue task and Area to a module', 'Only matching rows remain'],
          ['Search a model name in "Search task, model, detail or reason"', 'Matching rows remain'],
          ['Find a row on a model without a rate', 'The Cost cell reads "unpriced" with the tooltip "No rate card entry for this model — add one on the Dashboard."'],
          ['Find a FAILED row', 'The Reason column shows the full error text'],
        ],
      },
      {
        name: 'Open one call',
        description: 'The OpenAI call drawer.',
        steps: [
          ['Click a row', 'A right drawer "OpenAI call" opens with the status chip'],
          ['Read the facts', 'Task (label and key), Area, Detail, Model, Tokens, Cost (or "unpriced model"), Took, HTTP (or "never sent") and When in the admin date format'],
          ['Read the text blocks', '"Prompt sent" and "Answer returned" show the stored previews; an error message shows in red for failures'],
          ['Click Close', 'The drawer closes'],
        ],
      },
    ],
  },
  {
    name: 'AI: AI Monitoring logs',
    description: 'Every uploaded image screened by AI Monitoring at /monitoring (aiMonitoringLogsTable), from portals, mWeb and the app, with a detail drawer. Readable by SUPER_ADMIN, AI_MANAGER and TECH_MANAGER.',
    sub_flows: [
      {
        name: 'Filter uploaded image checks',
        description: 'Status, risk, action and source filters.',
        steps: [
          ['Open AI Monitoring > Logs', 'The page "Uploaded Image Logs" lists Uploaded image, User / Entity, Uploaded, Monitoring status, AI result, Reason / comment, Action taken and Source / module'],
          ['Filter AI result to "High risk"', 'Only HIGH rows remain with red result chips'],
          ['Filter Action taken to "Flagged for review" and Source to "mWeb"', 'Only matching rows remain'],
          ['Filter Monitoring status to "Not configured"', 'Only SKIPPED checks remain, coloured as warnings rather than failures'],
          ['Open the page before any upload has been checked', 'The table says "No images have been checked yet."'],
        ],
      },
      {
        name: 'Inspect one check',
        description: 'The monitoring log drawer.',
        steps: [
          ['Click a row', 'A drawer shows the file name, the image, and chips for status, risk and action'],
          ['Read the details', 'User / entity (or "Signed-out upload"), Account id, Uploaded, Checked (or "Not yet"), Source, Module / folder, Model, Took and "Reason / comment"'],
          ['Open a FAILED check', 'A "Failure detail" block shows the raw error text'],
          ['Click "Open image"', 'The image opens in a new tab'],
        ],
      },
    ],
  },
  {
    name: 'AI: AI Monitoring settings',
    description:
      'The notice shown beside every upload field on every surface and the live image scan prompt, edited at /monitoring/settings (updateAiMonitoringSettings, SUPER_ADMIN and AI_MANAGER).',
    sub_flows: [
      {
        name: 'Edit the upload notice copy',
        description: 'Blank fields fall back to the shipped translated wording.',
        steps: [
          ['Open AI Monitoring > Settings', 'The page loads the saved values into "What people are told" and "Image upload prompt" cards'],
          ['Turn off "Show the AI Monitoring chip on upload fields" and save', 'A toast says "AI Monitoring settings saved"; upload fields on mWeb, app and portals stop showing the chip within a minute'],
          ['Turn the chip back on and set "Chip label" to "Safety check"', 'Upload fields show the chip labelled "Safety check"'],
          ['Enter three lines in "Dialog bullets" and save', 'The notice dialog shows three bullets; blank lines are dropped'],
          ['Clear "Dialog title" and save', 'The dialog title falls back to "This upload is checked by AI"'],
        ],
      },
      {
        name: 'Notice and prompt validation',
        description: 'Zod limits on the settings form; Save disabled while invalid.',
        steps: [
          ['Type more than 80 characters in Chip label', 'The field shows "Keep the chip label under 80 characters"'],
          ['Enter 13 bullet lines', 'The field shows "Twelve bullets is the maximum a reader will take in"'],
          ['Clear the image prompt', 'The field shows "The image prompt is required" and "Save settings" is disabled'],
          ['Enter a 10-character prompt', 'The field shows "Give the model at least 20 characters of instruction"'],
          ['Force the mutation to fail and save', 'An error toast shows the API error or "Could not save AI Monitoring settings"'],
        ],
      },
      {
        name: 'Edit the image scan prompt',
        description: 'The same Prompt Library row the AI Library edits.',
        steps: [
          ['Read the warning above the prompt', 'It names the Prompt Library key (e.g. upload.image_scan) and the required JSON shape {"risk":"LOW|MEDIUM|HIGH","summary":string}'],
          ['Edit the prompt text', 'The "≈ N tokens" chip updates and the scan model chip is shown'],
          ['Click "Save settings" and upload an image anywhere', 'The next check uses the new prompt and the AI Library shows the same updated content'],
        ],
      },
    ],
  },

  // ───────────────────────────── Challenges ─────────────────────────────
  {
    name: 'Challenges: Dashboard',
    description: 'The Challenges console home (key challenge, role CHALLENGE_MANAGER) with total and active challenge counts from challengeStats.',
    sub_flows: [
      {
        name: 'Read challenge totals',
        description: 'Two clickable stat widgets.',
        steps: [
          ['Sign in to the Challenges console with a CHALLENGE_MANAGER account', 'The page "Challenges Dashboard" reads "An overview of challenges across the platform."'],
          ['Read the widgets', '"Total challenges" and "Active challenges" show counts (skeleton while loading)'],
          ['Click "Total challenges"', 'The app routes to /challenges'],
          ['Look at the sidebar', 'It lists Dashboard, Challenges and Leaderboard (Boards, Points Ledger, Settings & Rewards)'],
        ],
      },
    ],
  },
  {
    name: 'Challenges: Challenge management',
    description: 'Create, edit, filter and delete challenges scoped by super category, category and sub-category at /challenges (SUPER_ADMIN, CHALLENGE_MANAGER).',
    sub_flows: [
      {
        name: 'Create a challenge',
        description: 'createChallenge with the cascading category scope.',
        steps: [
          ['Open Challenges and click "New challenge"', 'A dialog "New challenge" opens with focus in "Challenge name", a Description field and the Super → Category → Sub category pickers'],
          ['Leave the name empty', 'The Save button is disabled'],
          ['Enter a name, a description and pick a super category, category and sub-category', 'Each picker only offers children of the level above'],
          ['Click Save', 'The button reads "Saving…", the dialog closes and the table shows the new challenge with its category names and an Active chip'],
          ['Return to the dashboard', 'Total and Active counts increased by one'],
        ],
      },
      {
        name: 'Edit a challenge',
        description: 'updateChallenge.',
        steps: [
          ['Click edit ("Edit challenge") on a row', 'The dialog "Edit challenge" opens prefilled with name, description and category scope'],
          ['Change the category and click Save', 'The row shows the new category name'],
          ['Force a server error and save', 'A red alert inside the dialog shows the error message and the dialog stays open'],
        ],
      },
      {
        name: 'Filter and search challenges',
        description: 'Category level filters use live category options.',
        steps: [
          ['Search in "Search challenges by name…"', 'Only matching challenges remain'],
          ['Filter "Super category" to one value', 'Only challenges in that super category remain; rows without one show "—"'],
          ['Open the page with no challenges', 'The table says "No challenges yet. Create one with “New challenge”."'],
        ],
      },
      {
        name: 'Delete a challenge',
        description: 'deleteChallenge behind a confirm.',
        steps: [
          ['Click delete ("Delete challenge") on a row', 'A dialog "Delete challenge?" says "Permanently delete “<name>”. This cannot be undone."'],
          ['Click Cancel', 'Nothing is deleted'],
          ['Click delete again and confirm', 'The button reads "Deleting…", the row disappears and the dashboard counts drop'],
          ['Call deleteChallenge with an id that no longer exists', 'The server refuses with "Challenge not found"'],
        ],
      },
    ],
  },
  {
    name: 'Challenges: Leaderboard boards',
    description: 'Live leaderboard rankings at /leaderboard: per-board stat cards (leaderboardAdminStats) and a board viewer by category and window.',
    sub_flows: [
      {
        name: 'View a board by category and period',
        description: 'The board viewer widget.',
        steps: [
          ['Open Leaderboard > Boards', 'The header "Leaderboard Boards" explains points are awarded on joins, completed pods and product sales; five stat cards show Users, Hosts, Club Admins, Venues and Brands with Total points, Awards written and Participants'],
          ['Read the board viewer', 'Board is "Users" and the window toggle is "This month"; rows show Rank, User with avatar, and Points'],
          ['Choose Board "Hosts" and window "All time"', 'The table reloads with host rankings for all time'],
          ['Choose a board with no awards in the window', 'An info alert says "No points on this board yet."'],
          ['Make the board query fail', 'An error alert says "The board could not be loaded."'],
        ],
      },
    ],
  },
  {
    name: 'Challenges: Points Ledger',
    description: 'The insert-only list of every points award at /leaderboard/points (leaderboardPointsTable).',
    sub_flows: [
      {
        name: 'Browse and filter points awards',
        description: 'Server sort and filter on stored fields only.',
        steps: [
          ['Open Leaderboard > Points Ledger', 'The header reads "Every points award, newest first — the insert-only source of truth."'],
          ['Read the columns', 'Date (admin date-time format), Board, User (name and email), Points, Action (POD_JOIN, POD_HOSTED, CLUB_POD_COMPLETED, VENUE_POD_COMPLETED, PRODUCT_SALE), Source and Pod'],
          ['Filter Action to PRODUCT_SALE and Board to Brands', 'Only matching awards remain'],
          ['Try to sort by User or Pod', 'Those columns are not sortable or filterable'],
        ],
      },
    ],
  },
  {
    name: 'Challenges: Settings and rewards',
    description:
      'Points per action and the rewards list at /leaderboard/settings (updateLeaderboardSettings; write roles SUPER_ADMIN, CITY_ADMIN, CHALLENGE_MANAGER). Each card saves on its own.',
    sub_flows: [
      {
        name: 'Change points per action',
        description: 'The five scalar settings; changes apply to future awards only.',
        steps: [
          ['Open Leaderboard > Settings & Rewards', 'The "Points per action" card shows five number fields: per successful join, per completed pod, per completed club pod, per pod completed at a venue and per product sale'],
          ['Set "Points per successful join (Users board)" to 15 and click Save', 'The button reads "Saving…", then a toast says "Leaderboard settings saved"'],
          ['Enter -5 or leave a field blank and save', 'The value is saved as 0, which switches that action off'],
          ['Complete a pod join after saving', 'The new ledger row awards 15 points; older rows keep their original points'],
          ['Make the save fail', 'An error toast says "Leaderboard settings could not be loaded."'],
        ],
      },
      {
        name: 'Add, edit and remove rewards',
        description: 'The whole rewards list is replaced on save.',
        steps: [
          ['In the "Rewards" card with none saved', 'An info alert says "No rewards yet. Add the first one."'],
          ['Click "Add reward"', 'A new row appears with Board Users, Window "End of month", Rank from 1, Rank to 1, empty Reward (highlighted as an error), Description and Active on'],
          ['Set Board Hosts, Window "End of year", ranks 1 to 3 and Reward "Gold kit", then click Save', 'A toast says "Leaderboard settings saved" and after reload the reward row is still there'],
          ['Enter 0 or a negative Rank from', 'The value snaps to 1'],
          ['Add a row, leave its Reward title blank and save', 'The blank-title row is dropped and does not come back after reload'],
          ['Click "Remove reward" on a row and save', 'The reward is gone from the list and from the apps’ board screens'],
          ['Turn a reward’s Active switch off and save', 'The reward is kept but no longer shown as active in the apps'],
        ],
      },
      {
        name: 'Settings load failure',
        description: 'The page cannot load leaderboardSettings.',
        steps: [
          ['Open the page while the settings query fails', 'An error alert says "Leaderboard settings could not be loaded." and neither card renders'],
        ],
      },
    ],
  },

  // ───────────────────────────── Developers ─────────────────────────────
  {
    name: 'Developers: Dashboard',
    description: 'The Developers console home (key developers, role DEVELOPERS_MANAGER) with tiles into API Keys and API Reference.',
    sub_flows: [
      {
        name: 'Navigate from the dashboard tiles',
        description: 'Two clickable widgets.',
        steps: [
          ['Sign in to the Developers console with a DEVELOPERS_MANAGER account', 'The page "Developers" reads "Build on Duncit — venue APIs for slots, availability and bookings."'],
          ['Click the "API Keys" tile', 'The app routes to /keys'],
          ['Go back and click the "API Reference" tile', 'The app routes to /docs'],
        ],
      },
    ],
  },
  {
    name: 'Developers: API keys',
    description:
      'Create and revoke dk_live_ keys for the public /api/v1 venue API at /keys (SUPER_ADMIN, TECH_MANAGER, DEVELOPERS_MANAGER). Only a SHA-256 hash is stored and the raw key is shown once.',
    sub_flows: [
      {
        name: 'Create a key and copy it once',
        description: 'createApiKey returns the raw key a single time.',
        steps: [
          ['Open API Keys and click "Create key"', 'A dialog "Create API key" opens with "Key name" (placeholder "e.g. Staging integration") and a disabled "Create key" button'],
          ['Enter "Staging integration" and click "Create key"', 'The button reads "Creating…", then the dialog title becomes "API key created" with the warning "Copy this key now — it is shown only once and cannot be recovered."'],
          ['Click "Copy API key"', 'The full key is copied and "Copied to clipboard" shows'],
          ['Click "Done"', 'The dialog closes; the table lists the key with a 10-character prefix followed by "…", scopes venues:read, slots:read, bookings:write and an Active chip'],
          ['Reopen "Create key"', 'The dialog starts empty; the previous raw key is no longer shown anywhere'],
        ],
      },
      {
        name: 'Key name validation',
        description: 'Client disable plus server checks.',
        steps: [
          ['Type only spaces in Key name', '"Create key" stays disabled'],
          ['Enter a name longer than 80 characters and create', 'A red alert in the dialog shows "Key name must be 80 characters or less"'],
        ],
      },
      {
        name: 'Revoke a key',
        description: 'revokeApiKey is owner-scoped and immediate.',
        steps: [
          ['Click "Revoke" on an active key', 'The row status becomes "Revoked", the Revoke button disappears and "Revoked at" is filled (hidden column)'],
          ['Call GET /api/v1/venues with the revoked key', 'HTTP 401 with error invalid_api_key'],
          ['Revoke the same key again through the API', 'The page shows "API key not found or already revoked"'],
        ],
      },
      {
        name: 'Browse my keys',
        description: 'myApiKeysTable only ever returns the caller’s keys.',
        steps: [
          ['Search a key prefix in "Search name or key prefix"', 'Only that key remains'],
          ['Use a key once and reload', '"Last used" shows the time of that request'],
          ['Open API Keys as a new developer with no keys', 'The table says "No API keys yet — create one to start calling the venue APIs."'],
          ['Sign in as another DEVELOPERS_MANAGER', 'Keys created by the first user are not listed'],
        ],
      },
    ],
  },
  {
    name: 'Developers: API reference and Try-It',
    description:
      'The /docs page documents the five venue endpoints (list venues, get venue, slot availability, book a slot, cancel a booking) with curl samples and a live Try-It console that sends real requests with the pasted key.',
    sub_flows: [
      {
        name: 'Read an endpoint reference',
        description: 'Accordion per endpoint with method, path, scope and samples.',
        steps: [
          ['Open API Reference', 'The subtitle reads "Venue APIs, versioned under <host>/api/v1. Authenticate every request with the x-api-key header." and five accordions show GET /venues, GET /venues/{venueId}, GET /venues/{venueId}/slots, POST and DELETE /venues/{venueId}/slots/{slotId}/book'],
          ['Expand "List venues"', 'It shows the description, a curl sample with an x-api-key header placeholder, "SAMPLE RESPONSE" JSON and a "TRY IT" section'],
          ['Paste a key into "Your API key (used by Try-It, never stored)"', 'The field masks the value and every curl sample now contains that key'],
        ],
      },
      {
        name: 'Send a live request',
        description: 'Try-It runs the real request against the environment API.',
        steps: [
          ['Clear the API key field and open Try-It on "List venues"', '"Send request" is disabled and "Paste an API key above to send live requests." shows'],
          ['Paste a valid key and click "Send request"', 'The button reads "Running…", then "HTTP 200" in green with the pretty-printed venues JSON'],
          ['Open "Get a venue" and leave venueId empty', '"Send request" is disabled because a required path parameter is missing'],
          ['Enter an unknown venueId and send', '"HTTP 404" in red with {"error":"venue_not_found"}'],
          ['Open "Slot availability", enter a venueId and a to value of "not-a-date"', '"HTTP 400" with {"error":"to must be a valid date"}'],
          ['Send any request with a made-up key', '"HTTP 401" with {"error":"invalid_api_key"}'],
        ],
      },
      {
        name: 'Book and cancel a slot',
        description: 'Atomic external booking with a caller reference.',
        steps: [
          ['On "Book a slot" enter a venueId, an AVAILABLE slotId and external_ref "order-1042", then send', '"HTTP 200" with a booking whose status is BOOKED and external_ref order-1042'],
          ['Send the same booking again', '"HTTP 409" with {"error":"slot_unavailable"}'],
          ['On "Cancel a booking" send the booked slot with the same key', '"HTTP 200" with {"released": true} and the slot becomes available again'],
          ['Try to cancel a slot booked by a different key', '"HTTP 409" because keys can only cancel their own bookings'],
          ['Force a network failure while sending', 'A red alert shows the browser error or "Request failed"'],
        ],
      },
    ],
  },

  // ───────────────────────────── Website Portal ─────────────────────────────
  {
    name: 'Website Portal: Dashboard',
    description: 'The Website console home (key website-app, role WEBSITE_MANAGER): counts of Career, Newsroom and Blog entries, newsletter subscribers and contact submissions, each linking to its section.',
    sub_flows: [
      {
        name: 'Read website totals',
        description: 'Five linked stat widgets.',
        steps: [
          ['Sign in to the Website console with a WEBSITE_MANAGER account', 'The header reads "Hi <name>, welcome back" with "A live overview of the content and submissions across duncit.com."'],
          ['Read the widgets', 'Career ("Published & draft posts"), Newsroom ("Published & draft entries"), Blog ("Published & draft articles"), Newsletter ("N active") and Contact ("N new")'],
          ['Click the Contact widget', 'The app routes to /contact-submissions'],
          ['Look at the sidebar', 'It lists Dashboard, Career, Newsroom, Blog, Newsletter Submission, Contact Submission, Job Applications and Navigation'],
        ],
      },
    ],
  },
  {
    name: 'Website Portal: Career, Newsroom and Blog content',
    description:
      'One content manager per page type (CAREERS at /careers, NEWSROOM at /newsroom, BLOG at /blog) for entries published on duncit.com; create/edit via the website-content form (RHF + Zod) and delete behind a confirm.',
    sub_flows: [
      {
        name: 'Create a blog entry',
        description: 'createWebsiteContent scoped to the page type.',
        steps: [
          ['Open Blog', 'The header "Blog" reads "Manage blog articles published on duncit.com." and the table is sorted by sort order'],
          ['Click "New entry"', 'A dialog "New Blog entry" opens with Published at set to now, Published on and Sort order 0'],
          ['Enter Title "Hosting your first pod", leave Slug blank, fill Category, Summary and Body', 'Slug hint reads "Leave blank to generate from the title."'],
          ['Upload an Image and set CTA label "Start hosting" and CTA URL https://duncit.com/earn', 'The image URL fills the Image field'],
          ['Click Save', 'The dialog closes, a snackbar says "Blog entry saved" and the row shows the thumbnail, title, "/hosting-your-first-pod", category, Published chip and published date'],
          ['Open Career and Newsroom', 'The new entry is not listed there; each page only shows its own type'],
        ],
      },
      {
        name: 'Content form validation',
        description: 'Zod rules and server slug uniqueness.',
        steps: [
          ['Clear Title and blur the field', 'The field shows "Title is required"'],
          ['Enter a title longer than 160 characters', 'The field shows "Title must be 160 characters or fewer"'],
          ['Enter CTA URL "www.duncit.com"', 'The field shows "Use a valid URL, mailto, or tel link"'],
          ['Enter Sort order -1', 'The field shows "Sort order must be 0 or greater"'],
          ['Enter a summary longer than 500 characters', 'The field shows "Summary must be 500 characters or fewer"'],
          ['Save a second Blog entry with an existing slug', 'A red alert in the dialog shows "Slug already exists for this page type"'],
        ],
      },
      {
        name: 'Edit and unpublish an entry',
        description: 'updateWebsiteContent.',
        steps: [
          ['Click the edit icon on a Career entry', 'A dialog "Edit Career entry" opens prefilled'],
          ['Turn off "Published" and click Save', 'A snackbar says "Career entry saved" and the row chip shows "Draft"'],
          ['Change Published at with the date-time picker and save', 'The Published column shows the new date in the admin date format'],
          ['Search "hosting" in "Search title, slug or category"', 'Matching entries remain'],
        ],
      },
      {
        name: 'Delete an entry',
        description: 'deleteWebsiteContent behind the shared confirm.',
        steps: [
          ['Click the delete icon on a Newsroom entry', 'A confirm "Delete entry" asks "Delete “<title>”?"'],
          ['Cancel the confirm', 'Nothing is deleted'],
          ['Delete again and confirm', 'A snackbar says "Newsroom entry deleted" and the row disappears'],
          ['Open a content page with no entries', 'The table says "No entries yet."'],
        ],
      },
    ],
  },
  {
    name: 'Website Portal: Website navigation',
    description:
      'Header and footer links for each marketing site (duncit.com, partners.duncit.com, ads.duncit.com, earnwith.duncit.com) at /navigation; sites bake links in at build time so changes go live on the next deploy.',
    sub_flows: [
      {
        name: 'Add a footer link',
        description: 'createWebsiteNavItem for the active site tab.',
        steps: [
          ['Open Navigation', 'The page "Website Navigation" shows site tabs with duncit.com selected (?selectedtab=MAIN) and links sorted by area'],
          ['Click the "partners.duncit.com" tab', 'The table reloads for PARTNERS and paging resets'],
          ['Click "Add link"', 'A dialog "Add navigation link" opens with Website preset to partners.duncit.com and Area FOOTER'],
          ['Enter Group "Support", Label "Help centre", URL "/help", Sort order 2 and keep Active on', 'Helper texts read "Visible link text", "Site-relative (/about) or absolute (https://…)" and "Lower shows first"'],
          ['Click Save', 'The dialog closes and the table lists FOOTER · Support · Help centre · /help · 2 · Active'],
        ],
      },
      {
        name: 'Navigation link validation',
        description: 'Zod rules on blur.',
        steps: [
          ['Clear Label and blur', 'The field shows "Label is required"'],
          ['Enter URL "duncit.com/about"', 'The field shows "Use an http(s) link, a site-relative path, mailto or tel"'],
          ['Enter a group heading longer than 60 characters', 'The field shows "Max 60 characters"'],
          ['Enter Sort order -3', 'The field shows "Must be 0 or more" and Save does not close the dialog'],
        ],
      },
      {
        name: 'Edit, hide and delete a link',
        description: 'updateWebsiteNavItem and deleteWebsiteNavItem.',
        steps: [
          ['Click edit on a link', 'A dialog "Edit navigation link" opens prefilled'],
          ['Turn Active off and save', 'The row status chip shows "Hidden"'],
          ['Move the link to HEADER on duncit.com and save', 'The row leaves the current tab and appears under the duncit.com tab as HEADER'],
          ['Click delete on a link', 'A dialog "Delete this link?" says the quoted label will disappear from the site on the next deploy'],
          ['Click Delete', 'The link is removed from the table'],
          ['Open a site tab with no links', 'The table says "No links for this site yet."'],
        ],
      },
    ],
  },
  {
    name: 'Website Portal: Contact submissions',
    description: 'The duncit.com contact form inbox at /contact-submissions: read messages with attachments and move them through NEW, IN_PROGRESS, RESOLVED and ARCHIVED.',
    sub_flows: [
      {
        name: 'Read and triage a contact submission',
        description: 'updateContactStatus from the details dialog.',
        steps: [
          ['Open Contact Submission', 'The table lists Name, Email, Subject ("—" when blank), Status chip and Received time, newest first'],
          ['Filter Status to NEW and search an email in "Search name, email or subject"', 'Only matching NEW submissions remain'],
          ['Click a row', 'A dialog titled with the subject (or "(no subject)") shows "From <name> (<email>) · <date time>", the message and "Attachments (N)" thumbnails'],
          ['Click an attachment thumbnail', 'The image opens in a new tab'],
          ['Change Status to IN_PROGRESS and click Save', 'The dialog closes and the row chip shows IN_PROGRESS; the dashboard Contact "N new" count drops'],
          ['Open a row, change the status and click Close', 'The status is not changed'],
          ['Open the page with no submissions', 'The table says "No submissions."'],
        ],
      },
    ],
  },
  {
    name: 'Website Portal: Job applications',
    description: 'Careers page applications at /job-applications: read the candidate details and move them through NEW, SHORTLISTED, REJECTED and HIRED.',
    sub_flows: [
      {
        name: 'Review and update an application',
        description: 'updateJobApplicationStatus applies as soon as a status is picked.',
        steps: [
          ['Open Job Applications', 'The table lists Role, Name, Email, Status and Received, newest first'],
          ['Search a role title in "Search role, name or email"', 'Only matching applications remain'],
          ['Click a row', 'A dialog titled with the role and status chip shows Name, Email (mailto), Phone (tel), Resume and Portfolio links (new tab) and Note, with "—" for missing values'],
          ['Pick SHORTLISTED in the Status select', 'The dialog closes immediately and the row chip shows SHORTLISTED'],
          ['Open the page with no applications', 'The table says "No applications."'],
          ['Call the status mutation with an unknown id', 'The server refuses with "Application not found"'],
        ],
      },
    ],
  },
  {
    name: 'Website Portal: Newsletter subscribers',
    description: 'Newsletter sign-ups at /newsletter with Total and Active counts and a read-only, server-paged subscriber table.',
    sub_flows: [
      {
        name: 'Review newsletter subscribers',
        description: 'newsletterSubscribers for KPIs and newsletterSubscribersTable for the list.',
        steps: [
          ['Open Newsletter Submission', 'Cards show Total and Active subscriber counts above the table'],
          ['Read the columns', 'Email, Source (WEBSITE_FOOTER, WEBSITE_PAGE, MWEB, ADMIN, OTHER), Status (Active or Unsubscribed) and Subscribed time; Unsubscribed is a hidden column'],
          ['Filter Source to MWEB', 'Only subscribers who joined from mWeb remain'],
          ['Show the Unsubscribed column and sort by it', 'Unsubscribed people show their unsubscribe time and Active ones show "—"'],
          ['Subscribe from the duncit.com footer and reload', 'Total and Active increase by one and the new row shows Source WEBSITE_FOOTER'],
          ['Open the page before anyone subscribes', 'The table says "No subscribers yet."'],
        ],
      },
    ],
  },
];

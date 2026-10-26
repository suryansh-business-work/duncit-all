import type { CatalogueFlow } from './catalogue.types';

/**
 * Gap scenarios for the "other" area: the smaller consoles' login and API
 * gates, the portal shell profile, AI automation and Reel Studio, the Website
 * CMS and its renderer, the websites' consent banner, and the server's
 * webhooks, REST routes, schedulers and money guarantees. Sub flows land under
 * existing flows where one fits; the catalogue merges flows by name.
 */
export const OTHER_GAP_FLOWS: readonly CatalogueFlow[] = [
  /* ------------------------------------------------------------------ */
  /* Console login gates and API authorization                           */
  /* ------------------------------------------------------------------ */
  {
    name: 'HR: Console access and dashboard',
    description: 'hr.duncit.com sign-in, gated server-side by PORTAL_ROLE_REQUIREMENTS.hr.',
    sub_flows: [
      {
        name: 'HR portal: login refused for accounts without HR_MANAGER',
        description:
          'assertPortalLogin (portals/portal.gate.ts) refuses login, loginWithPortalOtp and Google/Apple console sign-ins with portal_key "hr" unless the account holds HR_MANAGER or SUPER_ADMIN; no hr_token is written.',
        steps: [
          ['POST /graphql mutation login(input: {email, password, portal_key: "hr"}) with correct credentials of a plain USER account', 'GraphQL error "You do not have access to this portal" with code FORBIDDEN; no token is returned'],
          ['Repeat with a FINANCE_MANAGER-only account on the HR login page', 'The login alert shows "You do not have access to this portal" and localStorage has no hr_token'],
          ['Call requestPortalLoginOtp(input: {email: <USER email>, portal_key: "hr"})', 'Returns {ok: true} exactly as for a real account, but no code is minted and no email is sent'],
          ['Sign in with an HR_MANAGER account', 'AuthPayload with a token; hr_token is stored and the welcome dashboard renders'],
          ['Sign in with a SUPER_ADMIN account', 'Login succeeds; SUPER_ADMIN passes every portal gate'],
        ],
      },
    ],
  },
  {
    name: 'Employee: Console access and dashboard',
    description: 'employee.duncit.com sign-in and the EMPLOYEE-only expense API.',
    sub_flows: [
      {
        name: 'Employee portal: login refused for accounts without EMPLOYEE',
        description:
          'Console sign-in with portal_key "employee" succeeds only for EMPLOYEE or SUPER_ADMIN (PORTAL_ROLE_REQUIREMENTS.employee); everyone else gets "You do not have access to this portal" and no employee_token.',
        steps: [
          ['POST /graphql login(input: {email, password, portal_key: "employee"}) with a plain USER account', 'Error "You do not have access to this portal" (FORBIDDEN); no token'],
          ['Repeat with a FINANCE_MANAGER-only account from the Employee login page', 'The alert shows the same message and localStorage has no employee_token'],
          ['requestPortalLoginOtp for the same account with portal_key "employee"', '{ok: true} with no code minted and no email sent'],
          ['Sign in with an EMPLOYEE account', 'Login succeeds, employee_token is stored and the dashboard renders'],
          ['Sign in with a SUPER_ADMIN account', 'Login succeeds'],
        ],
      },
      {
        name: 'Employee portal: protected operations refuse other roles and anonymous callers',
        description:
          'createEmployeeExpense and myEmployeeExpensesTable call requireRole(EMPLOYEE_RW = EMPLOYEE, SUPER_ADMIN) in employeeExpense.resolver.ts, so the server, not the UI, is the gate.',
        steps: [
          ['POST /graphql myEmployeeExpensesTable with no Authorization header', 'Error "Not authenticated" with code UNAUTHENTICATED'],
          ['Call createEmployeeExpense with a valid input and a plain USER token', 'Error "Access Denied" with code FORBIDDEN; no expense row is created'],
          ['Call it with a FINANCE_MANAGER token', 'Error "Access Denied" (FORBIDDEN); nothing written'],
          ['Call signOutEverywhere as the EMPLOYEE, then reuse the old token', 'The sealed token is dropped by the context and the call fails with "Not authenticated"'],
          ['Sign in again as the EMPLOYEE and call createEmployeeExpense', 'The expense is created and appears in myEmployeeExpensesTable'],
        ],
      },
    ],
  },
  {
    name: 'Ads Portal: Dashboard',
    description: 'ads console sign-in and the ad request API gates.',
    sub_flows: [
      {
        name: 'Ads portal: login refused for accounts without ADS_MANAGER',
        description:
          'Console sign-in with portal_key "ads" succeeds only for ADS_MANAGER or SUPER_ADMIN; others get "You do not have access to this portal" and no ads_token.',
        steps: [
          ['POST /graphql login with portal_key "ads" and a plain USER account', 'Error "You do not have access to this portal" (FORBIDDEN); no token'],
          ['Sign in on the Ads login page with a MARKETING_MANAGER-only account', 'The alert shows the same message; localStorage has no ads_token'],
          ['requestPortalLoginOtp with portal_key "ads" for that account', '{ok: true}; no code is minted or sent'],
          ['Sign in with an ADS_MANAGER account, then with SUPER_ADMIN', 'Both succeed and the Ads dashboard renders'],
        ],
      },
      {
        name: 'Ads portal: protected operations refuse other roles and anonymous callers',
        description:
          'submitAdRequest uses requireRole(ADS_SUBMIT_ANY = SUPER_ADMIN, ADS_MANAGER, ECOMM_MANAGER) (ads/ads.resolver.ts:45-46), so a brand partner may also submit; every other role is refused.',
        steps: [
          ['POST /graphql submitAdRequest with a valid input and no token', 'Error "Not authenticated" (UNAUTHENTICATED); no ad request row'],
          ['Call it with a plain USER token', 'Error "Access Denied" (FORBIDDEN); nothing written'],
          ['Call it with a token sealed by signOutEverywhere', '"Not authenticated"'],
          ['Call it with an ADS_MANAGER token', 'The ad request is created and listed in My Ads'],
          ['Call it with an ECOMM_MANAGER (Partner Brand) token', 'Also accepted, by design of ADS_SUBMIT_ANY'],
        ],
      },
    ],
  },
  {
    name: 'AI: Welcome page',
    description: 'ai.duncit.com sign-in and the AI_MANAGER API gates.',
    sub_flows: [
      {
        name: 'AI portal: login refused for accounts without AI_MANAGER',
        description:
          'Console sign-in with portal_key "ai" succeeds only for AI_MANAGER or SUPER_ADMIN; others get "You do not have access to this portal" and no ai_token.',
        steps: [
          ['POST /graphql login with portal_key "ai" and a plain USER account', 'Error "You do not have access to this portal" (FORBIDDEN)'],
          ['Sign in on the AI login page with a TECH_MANAGER-only account', 'The alert shows the same message; no ai_token is stored'],
          ['requestPortalLoginOtp with portal_key "ai" for that account', '{ok: true}; no code is minted or sent'],
          ['Sign in with AI_MANAGER, then with SUPER_ADMIN', 'Both succeed and the welcome page renders'],
        ],
      },
      {
        name: 'AI portal: protected operations refuse other roles and anonymous callers',
        description:
          'createAiPrompt (AI_RW), saveAutomationFlow (AUTOMATION_ROLES) and createReelProject (REEL_ROLES) all require SUPER_ADMIN or AI_MANAGER on the server.',
        steps: [
          ['POST /graphql createAiPrompt with no token', 'Error "Not authenticated" (UNAUTHENTICATED); no prompt created'],
          ['Call saveAutomationFlow with a plain USER token', 'Error "Access Denied" (FORBIDDEN); no flow saved'],
          ['Call createReelProject with a MARKETING_MANAGER token', '"Access Denied" (FORBIDDEN); no project'],
          ['Repeat any of them with a sealed token', '"Not authenticated"'],
          ['Call all three with an AI_MANAGER token', 'Each succeeds and the row appears in its AI portal list'],
        ],
      },
    ],
  },
  {
    name: 'Challenges: Dashboard',
    description: 'challenge console sign-in and the CHALLENGE_MANAGER API gates.',
    sub_flows: [
      {
        name: 'Challenge portal: login refused for accounts without CHALLENGE_MANAGER',
        description:
          'Console sign-in with portal_key "challenge" succeeds only for CHALLENGE_MANAGER or SUPER_ADMIN; others get "You do not have access to this portal" and no challenge_token.',
        steps: [
          ['POST /graphql login with portal_key "challenge" and a plain USER account', 'Error "You do not have access to this portal" (FORBIDDEN)'],
          ['Sign in on the Challenge login page with a CITY_ADMIN-only account', 'The alert shows the same message; no challenge_token'],
          ['requestPortalLoginOtp with portal_key "challenge" for that account', '{ok: true}; no code is minted or sent'],
          ['Sign in with CHALLENGE_MANAGER, then SUPER_ADMIN', 'Both succeed'],
        ],
      },
      {
        name: 'Challenge portal: protected operations refuse other roles and anonymous callers',
        description:
          'createChallenge and updateChallengeTool require RW (SUPER_ADMIN, CHALLENGE_MANAGER); upsertChallengeCategoryMapping requires MAPPING_RW, which also admits CITY_ADMIN (challengeTool.resolver.ts:14).',
        steps: [
          ['POST /graphql createChallenge with no token', '"Not authenticated" (UNAUTHENTICATED); nothing created'],
          ['Call updateChallengeTool with a plain USER token', '"Access Denied" (FORBIDDEN); the tool is unchanged'],
          ['Call updateChallengeTool with a CITY_ADMIN token', '"Access Denied" (FORBIDDEN)'],
          ['Call upsertChallengeCategoryMapping for a sub-category with a CITY_ADMIN token', 'Accepted: MAPPING_RW includes CITY_ADMIN'],
          ['Call upsertChallengeCategoryMapping with a USER token', '"Access Denied" (FORBIDDEN)'],
          ['Call createChallenge with a CHALLENGE_MANAGER token', 'The challenge is created'],
        ],
      },
    ],
  },
  {
    name: 'Developers: Dashboard',
    description: 'developers console sign-in gate.',
    sub_flows: [
      {
        name: 'Developers portal: login refused for accounts without DEVELOPERS_MANAGER',
        description:
          'Console sign-in with portal_key "developers" succeeds only for DEVELOPERS_MANAGER or SUPER_ADMIN; others get "You do not have access to this portal" and no developers_token.',
        steps: [
          ['POST /graphql login with portal_key "developers" and a plain USER account', 'Error "You do not have access to this portal" (FORBIDDEN)'],
          ['Sign in on the Developers login page with a TECH_MANAGER-only account', 'Refused with the same message: the login gate lists only DEVELOPERS_MANAGER'],
          ['requestPortalLoginOtp with portal_key "developers" for that account', '{ok: true}; no code is minted or sent'],
          ['Sign in with DEVELOPERS_MANAGER, then SUPER_ADMIN', 'Both succeed'],
        ],
      },
    ],
  },
  {
    name: 'Developers: API keys',
    description: 'Creating and revoking public API keys.',
    sub_flows: [
      {
        name: 'Developers portal: protected operations refuse other roles and anonymous callers',
        description:
          'createApiKey and revokeApiKey require API_KEY_MANAGE = SUPER_ADMIN, TECH_MANAGER, DEVELOPERS_MANAGER (apiKey.resolver.ts:5); revoke acts on the caller\'s own keys.',
        steps: [
          ['POST /graphql createApiKey(name: "e2e") with no token', '"Not authenticated" (UNAUTHENTICATED); no key'],
          ['Call it with a plain USER token', '"Access Denied" (FORBIDDEN); no key'],
          ['Call it with a sealed DEVELOPERS_MANAGER token', '"Not authenticated"'],
          ['Call it with a fresh DEVELOPERS_MANAGER token', 'Returns api_key and raw_key once; the key is listed in myApiKeys'],
          ['Call revokeApiKey(id) for that key with a USER token', '"Access Denied"; the key stays active'],
          ['Call revokeApiKey(id) as the owner', 'The key is revoked'],
        ],
      },
    ],
  },
  {
    name: 'Website Portal: Dashboard',
    description: 'website-app console sign-in and the Website portal API gates.',
    sub_flows: [
      {
        name: 'Website portal: login refused for accounts without WEBSITE_MANAGER',
        description:
          'Console sign-in with portal_key "website-app" succeeds only for WEBSITE_MANAGER or SUPER_ADMIN; others get "You do not have access to this portal" and no website_app_token.',
        steps: [
          ['POST /graphql login with portal_key "website-app" and a plain USER account', 'Error "You do not have access to this portal" (FORBIDDEN)'],
          ['Sign in on the Website portal login page with a MARKETING_MANAGER-only account', 'The alert shows the same message; no website_app_token'],
          ['requestPortalLoginOtp with portal_key "website-app" for that account', '{ok: true}; no code is minted or sent'],
          ['Sign in with WEBSITE_MANAGER, then SUPER_ADMIN', 'Both succeed'],
        ],
      },
      {
        name: 'Website portal: protected operations refuse other roles and anonymous callers',
        description:
          'createCmsSite requires CMS_ROLES (SUPER_ADMIN, WEBSITE_MANAGER); createWebsiteContent requires WRITE_ROLES and createWebsiteReel ADMIN_ROLES, both of which also admit CITY_ADMIN and ZONAL_ADMIN.',
        steps: [
          ['POST /graphql createCmsSite with no token', '"Not authenticated" (UNAUTHENTICATED); no site'],
          ['Call createCmsSite with a CITY_ADMIN token', '"Access Denied" (FORBIDDEN): the CMS is WEBSITE_MANAGER and SUPER_ADMIN only'],
          ['Call createWebsiteContent with a plain USER token', '"Access Denied" (FORBIDDEN); nothing written'],
          ['Call createWebsiteReel with a SUPPORT_USER token', '"Access Denied" (FORBIDDEN)'],
          ['Call all three with a WEBSITE_MANAGER token', 'Each succeeds'],
        ],
      },
    ],
  },
  {
    name: 'Targets: Console access and dashboard',
    description:
      'targets.duncit.com ships as the shared shell only (mountWelcomePortal): login, the welcome dashboard at / and /profile, gated to TARGETS_MANAGER and SUPER_ADMIN.',
    sub_flows: [
      {
        name: 'Targets portal: login refused for accounts without TARGETS_MANAGER',
        description:
          'Console sign-in with portal_key "targets" succeeds only for TARGETS_MANAGER or SUPER_ADMIN; others get "You do not have access to this portal" and no targets_token.',
        steps: [
          ['POST /graphql login with portal_key "targets" and a plain USER account', 'Error "You do not have access to this portal" (FORBIDDEN)'],
          ['Sign in on the Targets login page with a FINANCE_MANAGER-only account', 'The alert shows the same message; no targets_token'],
          ['requestPortalLoginOtp with portal_key "targets" for that account', '{ok: true}; no code is minted or sent'],
          ['Sign in with TARGETS_MANAGER, then SUPER_ADMIN', 'Both succeed'],
        ],
      },
      {
        name: 'Targets manager signs in and sees the welcome dashboard and profile',
        description: 'The shell-only console: / renders the welcome dashboard, /profile the shared profile page, and any other path redirects to /.',
        steps: [
          ['Open https://targets.duncit.com/ signed out', 'Redirected to /login'],
          ['Sign in as TARGETS_MANAGER', 'The welcome dashboard renders with the Targets name and tagline; the sidebar has only Dashboard'],
          ['Open /profile', 'The shared profile page renders with Profile, Security and Notifications tabs'],
          ['Open /anything-else', 'Redirected to /'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Portal shell: sign-in, 2FA, sessions and profile                    */
  /* ------------------------------------------------------------------ */
  {
    name: 'Portal Shell: Sign in',
    description: 'Console sign-in shared by every portal.',
    sub_flows: [
      {
        name: 'Console login with 2FA: code, recovery code, wrong code',
        description:
          'A console sign-in (portal_key set) on an account with an authenticator app returns TWO_FACTOR_REQUIRED instead of a session; completeTwoFactorLogin trades the challenge and a code for it. Five wrong codes lock the step 15 minutes (account-level; the IP sign-in rate rule does not list this mutation).',
        steps: [
          ['Sign in to any console with the correct password of an account that has 2FA on', 'GraphQL error "Enter the code from your authenticator app." code TWO_FACTOR_REQUIRED with challenge_token and expires_in_seconds 300; no token stored, the code dialog opens'],
          ['Submit a current six-digit code from the app', 'completeTwoFactorLogin returns the AuthPayload; the token is stored and the dashboard opens'],
          ['Sign in again and submit the same six-digit code within its window', 'Refused as a replay: "Incorrect code — 4 attempts left" (BAD_USER_INPUT); no token'],
          ['Submit an unused recovery code (XXXX-XXXX)', 'Signs in; two_factor_recovery_codes_left drops by 1'],
          ['Sign in again and submit that same recovery code', 'Refused with "Incorrect code — N attempts left"'],
          ['Submit five wrong codes', 'The fifth answers "Too many wrong codes. Try again after 15 minutes." (TOO_MANY_REQUESTS); even a correct code is refused until the lock ends'],
          ['Wait more than 5 minutes after the first step, then submit a code', '"This sign-in has expired. Sign in again." (TWO_FACTOR_CHALLENGE_EXPIRED)'],
          ['Sign in to mWeb (no portal_key) with the same account', 'No code is asked; 2FA guards console doors only'],
        ],
      },
    ],
  },
  {
    name: 'Portal Shell: Profile and sign out',
    description: 'The shared /profile page: Profile, Security and Notifications tabs (?selectedtab=).',
    sub_flows: [
      {
        name: 'Enable authenticator 2FA from Profile > Security and get recovery codes',
        description:
          'startTwoFactorSetup parks a pending secret; enableTwoFactor with a valid TOTP turns 2FA on and returns ten one-time recovery codes; the next console login asks for a code.',
        steps: [
          ['Open /profile?selectedtab=security and click Set up (profile-two-factor-setup)', 'startTwoFactorSetup returns a QR code and a base32 secret shown in the setup dialog'],
          ['Enter a wrong six-digit code', '"That code does not match. Check the app and try again."; 2FA stays off'],
          ['Scan the QR code and enter the current code', 'enableTwoFactor returns 10 recovery codes shown once; the section shows On with 10 recovery codes left'],
          ['Close the dialog and reload', 'Codes are not shown again; myConnectedAccounts.two_factor_enabled is true'],
          ['Call startTwoFactorSetup again', 'CONFLICT "Authenticator app sign-in is already on. Turn it off first to set up a new app."'],
          ['Sign out and sign in to the console with the password', 'TWO_FACTOR_REQUIRED: the code dialog opens'],
        ],
      },
      {
        name: 'Sign out of all devices ends every existing token',
        description:
          'signOutEverywhere writes security.sessions_invalidated_at and seals the in-process map; every token issued before it (the caller\'s too) is dropped by the context; other replicas pick it up within the 60-second refresh.',
        steps: [
          ['Sign in to the same console in browsers A and B', 'Both work'],
          ['In A open /profile?selectedtab=security, click Sign out of all devices (profile-sign-out-all) and confirm', 'signOutEverywhere returns true and A is signed out'],
          ['In B trigger any GraphQL call', 'Error "Not authenticated" (UNAUTHENTICATED); B returns to /login'],
          ['On a two-replica deployment, call with B\'s old token against the other replica after 60 seconds', 'Also refused'],
          ['Sign in again in A', 'A fresh token works'],
        ],
      },
      {
        name: 'Change password with OTP from Profile > Security',
        description:
          'requestPasswordChangeOtp checks the current password and emails a 6-digit code valid 10 minutes; changePasswordWithOtp sets the new one. It does not end other sessions.',
        steps: [
          ['Click Change password and submit a wrong current password', '"Current password is incorrect"; no code is sent'],
          ['Submit the right current password', 'A 6-digit code is emailed (expires in 10 minutes)'],
          ['Submit a wrong code with a new password', '"Invalid OTP"'],
          ['Submit the right code with the current password as the new one', '"New password must be different from your current password"'],
          ['Submit the right code with a new password', 'true; the success alert shows and a password-changed email is sent'],
          ['Sign out and sign in with the old password', '"Invalid email or password"'],
          ['Sign in with the new password', 'Succeeds'],
        ],
      },
      {
        name: 'Notifications tab: mail, WhatsApp and OTP channel preferences',
        description:
          'setMyMailPreference, setMyWhatsappPreference and setMyOtpChannel persist per category; required categories are locked on; sendEmail skips a category the recipient turned off.',
        steps: [
          ['Open /profile?selectedtab=notifications', 'Mail, WhatsApp and OTP channel cards render; required categories show locked on'],
          ['Turn off a marketing mail category', 'setMyMailPreference saves and the switch stays off'],
          ['Reload the page', 'The category is still off'],
          ['Send that category of email to this account', 'Tech > Emails > Logs shows the mail SKIPPED with reason "Recipient opted out of <category> email"'],
          ['Turn off a WhatsApp category, reload', 'It stays off'],
          ['Try to switch off email OTP while it is the only reachable channel', 'The switch cannot be turned off (otp_can_disable false)'],
        ],
      },
      {
        name: 'Details tab: about, links and visibility',
        description:
          'The details form (RHF + Zod, the same name, bio and link schemas mWeb uses from @duncit/forms) saves via updateMyProfile; the privacy switch saves via updateMyProfileVisibility.',
        steps: [
          ['Open /profile and edit the about section', 'The form shows first and last name, photo, bio and link rows'],
          ['Enter a link with an invalid URL and save', 'The field shows the validation error and nothing is sent'],
          ['Enter a bio longer than the allowed maximum', 'The bio field shows the length error'],
          ['Enter valid values and save', 'updateMyProfile returns the new values and the view shows them; blank link rows are dropped'],
          ['Toggle the private profile switch and reload', 'profile_visibility persists'],
        ],
      },
      {
        name: 'Sign-in activity list shows recent logins',
        description:
          'Premise differs from the code: SignInActivitySection shows only the LAST sign-in (auth.last_login_at and provider) and the linked Google address, not a list of logins.',
        steps: [
          ['Sign in to a console with the password and open /profile?selectedtab=security', 'profile-last-sign-in shows the time just now with "via password"'],
          ['Sign out and sign in with an emailed code', 'The line now shows the new time with the code provider label'],
          ['Look at the Google line', 'profile-google-link shows the linked Gmail, or the not-linked text'],
          ['Open the page for an account that never signed in', 'The no-sign-in text renders'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* AI portal: automation flows and Reel Studio                         */
  /* ------------------------------------------------------------------ */
  {
    name: 'AI: Automation flows',
    description:
      'AI portal /automation/:channel and /automation/:channel/:flowId: build WhatsApp and email automation graphs, test them, and run them live. Every operation requires AUTOMATION_ROLES (SUPER_ADMIN, AI_MANAGER).',
    sub_flows: [
      {
        name: 'Build, save and activate a WhatsApp automation flow',
        description:
          'saveAutomationFlow persists the graph; setAutomationFlowStatus ACTIVE validates the graph first; duplicate creates a DRAFT copy and delete removes the flow with its runs.',
        steps: [
          ['As AI_MANAGER open /automation/whatsapp, create a flow and draw a start, message and end node', 'saveAutomationFlow saves; the flow is listed as DRAFT'],
          ['Save without a name', '"Give the flow a name"'],
          ['Leave a node unconnected and set the flow ACTIVE', 'BAD_USER_INPUT "The flow is not ready: ..." listing each issue; status stays DRAFT'],
          ['Fix the graph and set it ACTIVE', 'Status ACTIVE'],
          ['Duplicate the flow', 'A new DRAFT named "<name> (copy)" with the same nodes and edges'],
          ['Delete the copy', 'It disappears and its runs are deleted'],
          ['Call saveAutomationFlow with a USER token', '"Access Denied" (FORBIDDEN)'],
        ],
      },
      {
        name: 'Test-run a flow (startAutomationTest / resumeAutomationTest)',
        description:
          'A TEST run walks the graph drawn on the canvas, previews messages without handing them to a provider unless deliver is true, parks at a wait-for-reply step and resumes on a simulated reply or timeout.',
        steps: [
          ['Open the test window and start a test with a contact name and number, deliver off', 'startAutomationTest returns a TEST run with the transcript so far; message rows have delivered false'],
          ['Let the run reach a wait-for-reply step', 'Run status WAITING_REPLY'],
          ['Send a simulated reply', 'resumeAutomationTest continues down the matching branch'],
          ['Start another test and resume with timed_out true', 'The run takes the No reply exit'],
          ['Call resumeAutomationTest on a run that is not waiting', '"This run is not waiting for a reply"'],
          ['Call resumeAutomationTest on a LIVE run id', '"Only a test run can be driven from the test window"'],
        ],
      },
    ],
  },
  {
    name: 'AI: Reel Studio',
    description: 'AI portal /reels and /reels/:projectId: reel projects built from Google Drive footage with an AI director. REEL_ROLES = SUPER_ADMIN, AI_MANAGER.',
    sub_flows: [
      {
        name: 'Create a reel project, add Drive footage, chat and save spec',
        description:
          'createReelProject, addReelDriveAssets, sendReelMessage and saveReelSpec persist; restoreReelVersion puts back the spec an earlier reply produced.',
        steps: [
          ['As AI_MANAGER open /reels and create a project', 'createReelProject returns it and the studio opens at /reels/<id>'],
          ['Pick clips from the connected Drive folder', 'addReelDriveAssets attaches them to the project with thumbnails'],
          ['Send a chat message asking for a cut', 'sendReelMessage returns the reply with a spec version'],
          ['Edit the timeline', 'saveReelSpec saves the new spec_json'],
          ['Restore an earlier reply\'s version', 'restoreReelVersion returns the project with that spec'],
          ['Restore a reply that carried no spec', '"That reply has no version of the reel to put back."'],
          ['Call createReelProject with a USER token', '"Access Denied" (FORBIDDEN)'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Server: automation webhook + scheduler                              */
  /* ------------------------------------------------------------------ */
  {
    name: 'Server: AI automation inbound webhook and scheduler',
    description:
      'POST /automation/whatsapp/inbound (automation.router.ts), where AiSensy posts incoming WhatsApp messages, and startAutomationScheduler, the one-minute sweep that wakes delayed runs and times out unanswered waits.',
    sub_flows: [
      {
        name: 'AiSensy inbound WhatsApp message starts/advances a run',
        description:
          'A request with the right secret answers 200 {ok:true} at once and the work runs after: a run WAITING_REPLY on that number resumes, otherwise matching ACTIVE WhatsApp flows start. Receipts without text are ignored.',
        steps: [
          ['Set AISENSY_WEBHOOK_SECRET in Tech > Environment and activate a WhatsApp flow', 'Saved'],
          ['POST /automation/whatsapp/inbound?secret=<secret> with a text message body from a number', '200 {"ok":true} immediately; a LIVE run starts for that contact'],
          ['Send the secret in the x-webhook-secret header instead of the query', '200 {"ok":true}'],
          ['POST a reply from a number whose run is WAITING_REPLY', 'That run resumes on its reply branch'],
          ['POST a delivery or read receipt with no text', '200 {"ok":true,"ignored":true}; no run moves'],
        ],
      },
      {
        name: 'Inbound webhook with wrong or missing secret is refused',
        description: 'secretMatches uses a timing-safe compare and an unset secret refuses everything.',
        steps: [
          ['POST /automation/whatsapp/inbound with no secret', '403 {"ok":false,"error":"Webhook secret missing or wrong"}; no run starts, no message is sent'],
          ['POST with ?secret=<wrong value>', 'Same 403'],
          ['Clear AISENSY_WEBHOOK_SECRET and POST with any secret, even an empty header', 'Same 403: no secret configured means the door is shut'],
        ],
      },
      {
        name: 'Automation scheduler wakes delayed runs and times out unanswered waits',
        description:
          'runAutomationSweep (first tick ~45s, then every 60s, batch 50 each) resumes WAITING_DELAY runs whose resume_at passed and takes the No reply exit for WAITING_REPLY runs whose wait_until passed; it runs only on the scheduler-lease holder.',
        steps: [
          ['Start a live run that parks on a delay step with resume_at in the past', 'Within a minute the run moves to the next node with the system note "Waited — moving on"'],
          ['Park a run on a wait-for-reply step and let wait_until pass', 'Within a minute it records "No reply in time — took the No reply exit" and follows that exit'],
          ['Watch the next ticks', 'The run is not woken a second time'],
          ['Run two server replicas', 'Only the scheduler-lease holder sweeps; each run is woken once'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Challenges                                                         */
  /* ------------------------------------------------------------------ */
  {
    name: 'Challenges: Challenge management',
    description: 'Challenge portal tools, presets, category mapping and pod challenge monitoring.',
    sub_flows: [
      {
        name: 'Enable a tool and map it to sub-categories',
        description:
          'updateChallengeTool (RW) changes a tool; setChallengeToolCategories maps it to SUB-level categories only; mappings never inherit from a parent category.',
        steps: [
          ['Open /tools, set a tool INACTIVE then ACTIVE', 'updateChallengeTool saves the status'],
          ['Send status "PAUSED" through the API', '"Unknown status" (BAD_USER_INPUT)'],
          ['Map the tool to two sub-categories', 'setChallengeToolCategories saves; mapped_category_ids lists both'],
          ['Upsert a mapping for a parent (non-SUB) category', '"Challenge tools are chosen per sub-category"'],
          ['Open a sub-category under a mapped parent that has no row of its own', 'challengeCategoryMapping shows no tools: no inheritance'],
        ],
      },
      {
        name: 'Create, edit and duplicate a tool preset',
        description: 'createChallengeToolPreset, updateChallengeToolPreset and duplicateChallengeToolPreset require RW and list under /tools/presets.',
        steps: [
          ['Open /tools/presets and create a preset for a tool with a config', 'The preset is listed'],
          ['Edit its name and config', 'Saved and shown'],
          ['Set is_active false', 'The preset shows inactive'],
          ['Duplicate it', 'A copy is listed'],
          ['Call createChallengeToolPreset as CITY_ADMIN', '"Access Denied": presets are RW only'],
        ],
      },
      {
        name: 'Upsert and clear a category mapping',
        description: 'upsertChallengeCategoryMapping then clearChallengeCategoryMapping change which tools the app offers for that sub-category.',
        steps: [
          ['Open /category-mapping and enable challenges for a sub-category with two allowed tools', 'upsertChallengeCategoryMapping returns the effective mapping'],
          ['Set max competitors to -1', '"Maximum competitors cannot be negative"'],
          ['As a host, create a pod in that sub-category', 'The challenge setup offers only the two allowed tools'],
          ['Clear the mapping', 'clearChallengeCategoryMapping removes the row; challenges are off for that sub-category'],
          ['Reopen the host challenge setup', 'No tools are offered'],
        ],
      },
      {
        name: 'List pod challenges and open one',
        description: 'podChallengesTable (CHALLENGE_STAFF = SUPER_ADMIN, CHALLENGE_MANAGER) lists every pod challenge with its status.',
        steps: [
          ['Open /pod-challenges as CHALLENGE_MANAGER', 'The table lists challenges with pod, status and dates'],
          ['Filter by status', 'Only matching rows remain'],
          ['Open a row', 'The challenge details open'],
          ['Call podChallengesTable with a USER token', '"Access Denied" (FORBIDDEN)'],
        ],
      },
      {
        name: 'Live monitor reflects scores in real time',
        description: 'A score write emits "challenge:changed" to the challenge:<id> socket room, so /live updates without a reload.',
        steps: [
          ['Open /live with a LIVE challenge listed', 'The challenge shows current standings'],
          ['From the host app record a score (recordPodChallengeScore)', 'The monitor updates the standing without a reload'],
          ['Void that score from the host app', 'The monitor drops it'],
        ],
      },
      {
        name: 'Publish results, send a notice and read the audit log',
        description:
          'publishPodChallengeResult is conditional on status COMPLETED and the read result_version inside a transaction (unique result indexes); a race loses with CONFLICT. Notices and the result appear in the audit log.',
        steps: [
          ['Publish the result of a LIVE challenge', '"End the challenge before publishing its result"'],
          ['End it and publish', 'Result version 1 is written and a RESULT_PUBLISHED audit row appears'],
          ['Publish twice at the same moment from two tabs', 'One succeeds; the other gets "This challenge changed in the meantime — refresh and try again" (CONFLICT)'],
          ['Publish a correction without a reason', '"A corrected result needs a reason"'],
          ['Send the RESULT notice from /notifications', 'sendPodChallengeNotice sends WhatsApp and email to attendees and returns the count'],
          ['Open /audit-logs', 'The publish and correction rows are listed with actor and reason'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Website portal CMS and the CMS renderer                             */
  /* ------------------------------------------------------------------ */
  {
    name: 'Website Portal: Websites CMS',
    description:
      'Website portal /sites: CMS sites, pages, components (fragments), collections, design, code and DNS. Every CMS operation requires CMS_ROLES (SUPER_ADMIN, WEBSITE_MANAGER); every write bumps the render cache epoch.',
    sub_flows: [
      {
        name: 'Create a site, page and publish it',
        description:
          'createCmsSite, createCmsPage, saveCmsPageDraft and publishCmsPage make the page served by cms-site for that hostname; unpublishCmsPage takes it off.',
        steps: [
          ['Open /sites and create a site with a domain', 'createCmsSite returns it'],
          ['Add a page at /about and save a draft', 'The page is listed unpublished'],
          ['Open https://<domain>/about', 'The CMS 404 renders: drafts are not served'],
          ['Publish the page and reload', 'The published page renders with 200 on the next load'],
          ['Unpublish it and reload', 'The page is gone (404)'],
        ],
      },
      {
        name: 'GrapesJS designer edits blocks and components (fragments)',
        description:
          'The designer at /sites/:siteId/:target/:docId/design saves drafts; publishing a component (createCmsFragment, publishCmsFragment) changes every page that uses it; live blocks render in the cms-site /__block iframe.',
        steps: [
          ['Open a page in the designer and drag a block in', 'The block renders live in its iframe frame'],
          ['Save', 'saveCmsPageDraft stores the draft'],
          ['Create a component used by two published pages and publish a change to it', 'Both pages show the new component on their next load'],
          ['Save a component draft without publishing', 'The live pages still show the published component'],
        ],
      },
      {
        name: 'Restore a page version and a site revision',
        description:
          'restoreCmsVersion puts an old version back into the DRAFT (publishCmsVersion makes it live); restoreCmsSiteRevision saves the old settings, design or code as a new revision.',
        steps: [
          ['Publish a page twice with different text', 'cmsVersions lists both versions'],
          ['Restore the first version', 'The draft holds the first text; the live page is unchanged'],
          ['Publish', 'The live page shows the first text and a new version is recorded'],
          ['Change site settings, then restore the previous revision', 'The settings are back exactly and a new revision is recorded'],
        ],
      },
      {
        name: 'Collections: create, edit, delete entries',
        description: 'createCmsEntry, updateCmsEntry and deleteCmsEntry persist and render on the collection list and entry pages.',
        steps: [
          ['Open a collection and add an entry', 'createCmsEntry saves it; the list page shows it'],
          ['Edit the entry at /sites/:siteId/:collectionSlug/:entryId and save', 'The entry page shows the change'],
          ['Delete it', 'It disappears from the list page'],
        ],
      },
      {
        name: 'Site design, code (HTML/CSS/JS) and SEO fields',
        description: 'updateCmsSiteDesign and updateCmsSiteCode save site revisions that the renderer reads into every page\'s head and styles.',
        steps: [
          ['Change the site design tokens and save', 'updateCmsSiteDesign saves; pages render with the new design'],
          ['Add head HTML and custom JS in the code section', 'Rendered pages carry them in the head'],
          ['Set the site SEO title and description', 'Pages without their own SEO use the site values in their meta tags'],
        ],
      },
      {
        name: 'Point a site A record (DNS)',
        description: 'setCmsSiteARecord requires DNS_ROLES (SUPER_ADMIN, TECH_MANAGER); a WEBSITE_MANAGER is refused. Never run against the production zone.',
        steps: [
          ['As WEBSITE_MANAGER call setCmsSiteARecord for a staging site host', '"Access Denied" (FORBIDDEN); no record changes'],
          ['As WEBSITE_MANAGER call cmsSiteDns', '"Access Denied" (FORBIDDEN)'],
          ['As TECH_MANAGER set the A record on a staging host', 'The record is created and cmsSiteDns lists it'],
        ],
      },
      {
        name: 'Preview link shows draft only to link holders',
        description:
          'cmsPreviewLink returns the page address with ?cms_preview=<signed token> (2-hour TTL). A valid token shows the draft with the preview banner; a forged or expired one shows the live page with the expired banner; previews are private, no-store and noindex.',
        steps: [
          ['Edit a published page draft and copy its preview link', 'The URL is the page address plus ?cms_preview=<token>'],
          ['Open it', 'The draft renders with the active preview banner and a View live link'],
          ['Check the response headers', 'cache-control: private, no-store and x-robots-tag: noindex, nofollow'],
          ['Alter one character of the token', 'The published version renders with the expired-preview banner'],
          ['Open the page without the parameter', 'The published version renders with no banner'],
        ],
      },
    ],
  },
  {
    name: 'Website Portal: Website reels',
    description: 'Website portal /reels and /reels/settings: the Reel Slider reels each website shows.',
    sub_flows: [
      {
        name: 'Manage the website Reel Slider reels and settings',
        description:
          'create/update/deleteWebsiteReel and updateWebsiteReelSettings (max_reels, max_reel_mb) change what publicWebsiteReels serves; a site never holds more than max_reels active reels.',
        steps: [
          ['Add a reel for site MAIN', 'createWebsiteReel saves it'],
          ['Reload duncit.com home', 'The Reel Slider shows the new reel (read at visit time, within the API cache TTL)'],
          ['Set max_reels to the current active count and add another active reel', '"This website already shows <n> reels, the most allowed. Hide or delete one first."'],
          ['Hide a reel (is_active false)', 'It leaves the slider'],
          ['Delete a reel', 'It is removed from the list and the slider'],
        ],
      },
    ],
  },
  {
    name: 'Website: CMS site renderer',
    description:
      'website/cms-site: the Astro SSR server that renders every CMS site. The hostname picks the site and the path picks the page, plus sitemap.xml, robots.txt and the designed error pages.',
    sub_flows: [
      {
        name: 'Hostname selects the site and path selects the page',
        description:
          'A CMS hostname renders its published page with cache-control public, max-age=0, must-revalidate; /sitemap.xml lists indexable published addresses; /robots.txt allows all and points at the sitemap.',
        steps: [
          ['Open https://<cms host>/ and /about', 'Each renders that site\'s published page with status 200'],
          ['Open the same path on another CMS host', 'That host\'s own page renders'],
          ['GET /sitemap.xml', 'application/xml listing published indexable pages only (drafts and noindex pages absent)'],
          ['GET /robots.txt', '"User-agent: *", "Allow: /" and "Sitemap: https://<host>/sitemap.xml"'],
          ['GET /blog/post?slug=<slug>', '301 to /blog/<slug>'],
        ],
      },
      {
        name: 'Unknown path falls back to the old site or designed 404',
        description:
          'When the CMS answers 404 and the site has legacy_site with LEGACY_ORIGIN_<SITE> set, GET/HEAD is proxied to the old site; otherwise the site\'s published /404 page renders with status 404, else the built-in not-found page.',
        steps: [
          ['With LEGACY_ORIGIN_MAIN set, open a path only the old site knows', 'The old site\'s answer is returned'],
          ['Unset it and open the same path', 'The site\'s designed /404 page renders with status 404'],
          ['Unpublish /404 and retry', 'The built-in not-found page renders with status 404 and a link home'],
          ['Open an unknown path with ?cms_preview=<token>', 'No legacy fallback is attempted during a preview'],
        ],
      },
      {
        name: 'API down shows the designed 503 from memory',
        description:
          'After a good visit the renderer keeps each site\'s designed 500 and 503 pages in memory (refreshed at most every 5 minutes). With the API unreachable it renders the cached 503 with retry-after 30; with none cached, the built-in unavailable page with 503.',
        steps: [
          ['Visit a CMS page once so its error pages are cached', '200'],
          ['Stop the API and reload', 'The site\'s designed 503 page renders with status 503 and retry-after: 30'],
          ['Restart cms-site (empty memory) with the API still down', 'The built-in unavailable page renders with status 503'],
          ['Make rendering throw for a page', 'The designed 500 page renders from memory, else the built-in error page'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Websites: consent, analytics, reel slider, earn showcase            */
  /* ------------------------------------------------------------------ */
  {
    name: 'Website: Tracking consent and analytics',
    description:
      'The GDPR consent banner (@duncit/brand consent-banner) on every Astro site plus status and the pet store, and the per-site Google Analytics tag loaded only after consent.',
    sub_flows: [
      {
        name: 'Consent banner: nothing optional before an answer; Reject all as prominent as Accept',
        description:
          'First visit shows the banner with analytics and marketing unticked; Reject all writes the duncit_consent cookie on .duncit.com, deletes _ga cookies and gtag never loads; any [data-consent-open] element reopens it.',
        steps: [
          ['Open duncit.com in a fresh profile', 'The banner shows; analytics and marketing boxes are unticked; Accept all and Reject all are both first-level buttons'],
          ['Click Reject all', 'The banner closes; cookie duncit_consent is set on .duncit.com; no request to googletagmanager.com is made'],
          ['Open partners.duncit.com and mweb', 'No banner: the answer is shared across subdomains'],
          ['Click Privacy choices in the footer', 'The banner reopens with the saved choices'],
          ['Choose Customise, tick analytics only and save', 'The cookie records analytics true, marketing false'],
          ['Withdraw analytics again', '_ga cookies are deleted'],
        ],
      },
      {
        name: 'GA tag loads only after consent and per-site config',
        description:
          'The page asks googleAnalyticsTag(site) for its GA4 id (Tech > Google Analytics) only once analytics is allowed, then installs gtag.js; a site with no id configured loads nothing.',
        steps: [
          ['Configure a GA4 id for MAIN in Tech > Google Analytics', 'Saved'],
          ['Open duncit.com before answering the banner', 'No googleAnalyticsTag request and no gtag.js'],
          ['Click Accept all', 'gtag.js loads with id=<G-...> without a reload'],
          ['Open a site with no id configured and accept', 'googleAnalyticsTag returns null and no gtag.js loads'],
        ],
      },
    ],
  },
  {
    name: 'Website: Home page',
    description: 'The duncit.com landing page.',
    sub_flows: [
      {
        name: 'Home Reel Slider plays muted, one reel with sound, pauses off screen',
        description:
          'The Reel Slider reads publicWebsiteReels at visit time; visible reels play muted and looping, at most one has sound, nothing plays off screen or in a hidden tab, and reduced motion shows posters until play is pressed.',
        steps: [
          ['Open the home page and scroll the slider into view', 'The active reel plays muted and looping'],
          ['Turn sound on for the active reel', 'Its sound button shows pressed; every other reel stays muted'],
          ['Move to the next reel', 'Sound follows to the new reel and the old one mutes'],
          ['Scroll the slider out of view or switch tabs', 'Playback pauses; it resumes when visible again'],
          ['Enable prefers-reduced-motion and reload', 'Posters show and nothing plays until a play button is pressed'],
        ],
      },
      {
        name: 'Earn showcase section renders and links to earn paths',
        description:
          'EarnShowcase renders on every site\'s home except earnwith\'s own, with copy set per page in the Website CMS (falling back to shipped copy) and one CTA to earnwith.duncit.com; it does not link to partners.',
        steps: [
          ['Scroll to the Earn with Duncit section on duncit.com', 'Eyebrow, heading, text and the photo wall render; the wall is hidden from screen readers'],
          ['Click the CTA', 'earnwith.duncit.com opens'],
          ['Change the heading in the Website CMS for that page and reload', 'The new heading renders'],
          ['Open earnwith.duncit.com home', 'The section is not rendered'],
          ['Enable reduced motion and reload', 'The wall is still'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Venue food payments                                                 */
  /* ------------------------------------------------------------------ */
  {
    name: 'Server: Venue food payment reconciliation',
    description:
      'startVenueFoodReconciler (venueFoodOrder.payment.ts): every 5 minutes (first ~2 min) adopt captured food orders the guest never verified and finish owed refunds. Guests pay the venue\'s own Razorpay, never a Payment row.',
    sub_flows: [
      {
        name: 'Sweep adopts a captured food order the guest never verified',
        description:
          'PENDING orders 3 minutes to 24 hours old whose Razorpay order shows a capture of exactly total_paise become PAID once; the coupon use is counted once and the guest and owner WhatsApp messages go once.',
        steps: [
          ['Place a QR food order, pay on Razorpay, then close the sheet before verifyVenueFoodOrderPayment runs', 'The order stays payment_status PENDING'],
          ['Wait up to 5 minutes after the 3-minute grace', 'The order is PAID with razorpay_payment_id and paid_at; an info log "paid" names the order'],
          ['Check the coupon on the order', 'used_count rose by exactly 1'],
          ['Check WhatsApp', 'The guest and the owner each got the paid messages once'],
          ['Leave an order unpaid', 'It stays PENDING with reconcile_checked_at stamped; after 24 hours the sweep no longer checks it'],
        ],
      },
      {
        name: 'Captured amount differs from order total is left for a human',
        description: 'adoptCapture stamps reconcile_checked_at, logs a warning and leaves the order PENDING when the captured amount is not total_paise.',
        steps: [
          ['Create a PENDING order whose Razorpay capture amount differs from total_paise', 'The order is PENDING'],
          ['Wait for the sweep', 'The order stays PENDING, reconcile_checked_at is stamped and a warning "captured amount differs from the order total — left for a human" is logged'],
          ['Check messages and coupon', 'No WhatsApp is sent and no coupon use is counted'],
        ],
      },
      {
        name: 'Concurrent verify, status poll and sweep mark the order paid exactly once',
        description: 'markFoodOrderPaid is one findOneAndUpdate matching payment_status PENDING; only the winner counts the coupon and sends messages; the others read the PAID order.',
        steps: [
          ['Fire verifyVenueFoodOrderPayment, a guest order read and the sweep for one captured order at the same moment', 'All three return the order as PAID'],
          ['Check the coupon', 'used_count +1 only'],
          ['Check WhatsApp logs', 'One guest paid message and one owner message'],
        ],
      },
      {
        name: 'Cancelled paid order is refunded once, retry finds the existing refund',
        description:
          'cancelVenueFoodOrder stamps REFUND_PENDING in the cancel write; settleFoodRefund looks up a refund with receipt refund_<order_no> before creating one, then moves the order to REFUNDED with razorpay_refund_id.',
        steps: [
          ['As the venue owner cancel a PAID order with a reason', 'Status CANCELLED, payment_status REFUND_PENDING, then REFUNDED with razorpay_refund_id once Razorpay answers'],
          ['Make the refund call time out after Razorpay accepted it', 'The order stays REFUND_PENDING and the cancel still answers'],
          ['Wait for the sweep', 'It finds the existing refund by receipt refund_<order_no>, creates no second refund and marks REFUNDED'],
          ['Cancel with a reason under 3 characters', '"Tell the guest why the order is cancelled"'],
          ['Cancel a SERVED order', '"This order can no longer be cancelled"'],
        ],
      },
      {
        name: 'Razorpay failed refund stays REFUND_PENDING and stops after 24h',
        description: 'A refund Razorpay reports as failed is logged as an error and leaves the order unchanged; the sweep retries only orders updated in the last 24 hours.',
        steps: [
          ['Cancel a paid order whose refund Razorpay fails', 'An error log "Razorpay failed the refund — needs a human"; payment_status stays REFUND_PENDING'],
          ['Wait for later sweeps within 24 hours', 'The refund is retried each sweep'],
          ['Move past 24 hours since the order was last updated', 'The sweep no longer picks it up'],
        ],
      },
      {
        name: 'Guest order page rechecks payment at most every 20s',
        description:
          'venueFoodOrder(order_id, access_key) runs recheckOnRead: an unpaid order is asked of Razorpay only when reconcile_checked_at is older than 20 seconds; the mWeb page /venue/:venueId/food-order/:orderId polls while unpaid.',
        steps: [
          ['Open the guest order page for a PENDING order', 'The page shows awaiting payment and polls'],
          ['Read the order three times within 20 seconds', 'Only one Razorpay lookup is made'],
          ['Complete the capture in Razorpay', 'Within the next poll after 20 seconds the page flips to paid'],
          ['Open the order without its access key from another account', 'Access is refused'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Payments, refunds, payouts                                          */
  /* ------------------------------------------------------------------ */
  {
    name: 'App: Pod Booking & Checkout',
    description: 'Booking a pod seat and paying for it.',
    sub_flows: [
      {
        name: 'verifyRazorpayPayment refuses another user\'s payment and mismatched order',
        description: 'verifyRazorpayCheckout checks the owner, then the order id against gateway_ref, before any signature check or finalization.',
        steps: [
          ['Create a Razorpay order as member A, then call verifyRazorpayPayment with A\'s payment_doc_id using member B\'s token', '"Not your payment" (FORBIDDEN); nothing is finalized'],
          ['Call it with no token', '"Not authenticated" (UNAUTHENTICATED)'],
          ['Call it as A with a different razorpay_order_id', '"Payment/order mismatch" (BAD_USER_INPUT); the payment stays PENDING'],
          ['Call it with an unknown payment_doc_id', '"Payment not found" (NOT_FOUND)'],
        ],
      },
      {
        name: 'Dummy checkout refused unless Finance dummy_mode is on',
        description: 'dummyCheckout and dummyProductCheckout throw unless Finance settings dummy_mode is true; when on they create a PENDING payment that the finalizer settles. Must stay off on production.',
        steps: [
          ['With dummy_mode off call dummyCheckout for a pod', '"Live payment gateway is not configured. Enable dummy mode to test." (BAD_REQUEST); no payment row'],
          ['Call dummyProductCheckout with dummy_mode off', 'The same error; no payment, no order'],
          ['Turn dummy_mode on (staging only) and repeat dummyCheckout', 'The payment is settled by the finalizer: SUCCESS with an invoice number and a seat'],
          ['Pass simulate_failure true', 'The payment ends FAILED and no seat is taken'],
        ],
      },
    ],
  },
  {
    name: 'Server: Payment reconciliation',
    description: 'Razorpay verify and the payment reconciler.',
    sub_flows: [
      {
        name: 'Bad signature marks payment FAILED; real capture then recovered?',
        description:
          'Expected: a bad signature must not strand a real capture. Today\'s code meets it: verifyRazorpayAndSettle (payment.service.ts:855-877) leaves the payment PENDING, records metadata.verify_failures and throws, so the reconciler (which scans PENDING) still adopts the capture.',
        steps: [
          ['Pay a Razorpay order, then call verifyRazorpayPayment with a garbled razorpay_signature', '"Payment signature verification failed" (BAD_USER_INPUT)'],
          ['Read the payment', 'Status is still PENDING; metadata.verify_failures is 1 and verify_failed_at is set'],
          ['Wait for the reconciler (5 minutes)', 'The real capture is adopted and the booking finalized'],
          ['Send another bad verify after it settled', 'The settled payment is not touched'],
        ],
      },
      {
        name: 'Double verify / verify racing the reconciler finalizes once',
        description:
          'runCore is idempotent on finalize_state CORE_DONE/COMPLETE inside a transaction, so seat, membership, ticket, coins and coupon are written once with one invoice number. A repeat verify of a settled payment (same order and payment ids, valid signature) returns it unchanged.',
        steps: [
          ['Fire two verifyRazorpayPayment calls with the same valid signature at once', 'One booking: one membership, one ticket, one coin debit, one coupon use and one invoice number'],
          ['Let the reconciler tick while a verify is in flight', 'Still one of each; finalize_attempts shows the replay did nothing'],
          ['Call verifyRazorpayPayment again after the payment is SUCCESS', 'The same SUCCESS payment comes back unchanged and nothing is written; a different payment id or a bad signature is still refused'],
          ['Read the payment', 'Status SUCCESS, finalize_state CORE_DONE or COMPLETE'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Payment Logs',
    description: 'Finance payment logs and payment detail actions.',
    sub_flows: [
      {
        name: 'Admin retries failed deferred steps',
        description:
          'retryPaymentSteps (ADMIN_RW) re-runs only the requested or still-owed deferred steps for a CORE_DONE payment, re-runs the whole core for a FAILED one, and resets the reconciler\'s 6-attempt budget.',
        steps: [
          ['Break SMTP, complete a paid booking, fix SMTP; open the payment detail', 'The receipt step shows FAILED'],
          ['Click Retry on that step', 'retryPaymentSteps returns the detail with the receipt step DONE; other done steps are not re-run'],
          ['Retry a REFUNDED payment', '"This payment has been refunded — there is nothing to re-run"'],
          ['Retry a payment settled before steps were recorded', '"This payment was settled before checkout recorded its steps — there is nothing here to re-run"'],
          ['Call retryPaymentSteps as FINANCE_USER', '"Access Denied" (FORBIDDEN)'],
        ],
      },
      {
        name: 'Admin refundPayment only on SUCCESS, once',
        description:
          'Expected race-safety is met: refund() is one findOneAndUpdate on status SUCCESS (payment.service.ts:1609), so concurrent calls give one REFUNDED and one email. It records the refund only; no gateway refund is issued.',
        steps: [
          ['Call refundPayment on a PENDING payment', '"Only SUCCESS payments can be refunded" (BAD_REQUEST)'],
          ['Call it twice at once on a SUCCESS payment', 'One returns REFUNDED with refund_reason, refunded_at and refunded_by; the other gets "This payment has already been refunded" (CONFLICT)'],
          ['Check email logs', 'Exactly one refund email'],
          ['Call it as FINANCE_USER', '"Access Denied" (FORBIDDEN)'],
          ['Call it as a CITY_ADMIN for another city\'s pod', 'Refused by the pod finance scope check'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Payment Release',
    description: 'Approving pod payout releases.',
    sub_flows: [
      {
        name: 'Two reviewers approving a payment release pay once',
        description:
          'approveGroup claims each release PENDING to APPROVED with a conditional update; creditPodPayout skips a release_id that already has a CREDIT, inside a transaction; a failed credit returns the release to PENDING.',
        steps: [
          ['Two FINANCE_MANAGERs approve the same release group at the same moment', 'Each release is APPROVED once and each wallet gets one CREDIT per release_id'],
          ['Approve a group with nothing pending', '"Nothing on this request is waiting for approval"'],
          ['Make one wallet credit fail and approve', 'Error "Could not pay <release ids>. Nothing was lost — those are still pending, approve again to retry."; those rows are PENDING again'],
          ['Approve again after fixing it', 'The rows are paid once; no duplicate CREDIT'],
          ['Call approvePodPaymentRelease as FINANCE_USER', '"Access Denied" (FORBIDDEN)'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Wallet & Withdrawals',
    description: 'Partner wallet and withdrawal requests.',
    sub_flows: [
      {
        name: 'Concurrent withdrawal requests cannot overdraw the wallet',
        description:
          'requestWithdrawal debits with findOneAndUpdate on balance >= max(amount, minimum) inside a transaction with the withdrawal row and DEBIT ledger, after the role-based minimum check.',
        steps: [
          ['With a balance of 1000 send two requestWithdrawal calls for 1000 at once', 'One succeeds; the other gets "Insufficient wallet balance"; balance is 0, never negative'],
          ['Request 0', '"Withdrawal amount must be greater than 0"'],
          ['Request without UPI or bank details', '"Add the payout account details"'],
          ['Request below the role minimum', '"The minimum withdrawal for a <role> is <floor>."'],
          ['Request with a balance under the minimum', '"A <role> can withdraw once the wallet balance reaches <floor>. Available: <balance>."'],
          ['Call it with no token', '"Not authenticated"'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Withdrawals',
    description: 'Finance review of withdrawal requests.',
    sub_flows: [
      {
        name: 'reviewWithdrawal PAID/REJECTED once; reject returns money',
        description:
          'reviewWithdrawal (FINANCE_RW) reads, refunds and flips status in one transaction; only PENDING rows can be reviewed; REJECTED needs a reason and credits the amount back once.',
        steps: [
          ['Reject a PENDING withdrawal without a reason', '"A reason is required to reject"'],
          ['Reject it with a reason', 'Status REJECTED, the amount is credited back with a CREDIT ledger row and allocations are cleared'],
          ['Review the same row again (PAID)', '"Only pending withdrawals can be reviewed"; no second credit'],
          ['Two reviewers reject one row at once', 'One succeeds; the balance is credited once'],
          ['Send status "HOLD"', '"Select PAID or REJECTED"'],
          ['Call reviewWithdrawal as FINANCE_USER', '"Access Denied" (FORBIDDEN)'],
        ],
      },
    ],
  },
  {
    name: 'Finance: Gift Cards',
    description: 'Gift cards and the coin ledger.',
    sub_flows: [
      {
        name: 'Gift card and coin ledger unique guards prevent double credit',
        description:
          'Gift card payment_id is unique and the gift card leg runs in the finalize transaction; coin rows are unique per payment/source/backout, referral/source, gift_card/source and feedback/source; a card converts to coins once.',
        steps: [
          ['Buy a gift card, then replay the finalization (second verify or reconciler tick)', 'One gift card and one PURCHASE ledger row for that payment_id'],
          ['Redeem the card to coins twice at once', 'One succeeds; the other is refused ("This gift card has already been redeemed" or a CONFLICT); coins credited once'],
          ['Submit pod feedback twice for the coin reward', 'One feedback coin row'],
          ['Apply the same referral code twice in parallel', 'One REFERRAL_EARN and one REFERRAL_SIGNUP row only'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Messaging, queue, lease and background jobs                         */
  /* ------------------------------------------------------------------ */
  {
    name: 'Server: WhatsApp and email reminder sweeps',
    description: 'WhatsApp sends from the server.',
    sub_flows: [
      {
        name: 'Duplicate domain event sends one WhatsApp (unique send log)',
        description:
          'whatsappService inserts a SENDING WaMessageLog row with holds_slot true before sending; the unique partial index {event_key, entity_id, destination} rejects a second claim, which returns SKIPPED "Already sent". A failed send releases the slot.',
        steps: [
          ['Fire the same event for the same entity and number twice at once', 'One SENT row; the other call returns SKIPPED with reason "Already sent"; one message billed'],
          ['Fire it again later', 'Still SKIPPED "Already sent"'],
          ['Make AiSensy fail the first send, then re-trigger', 'The first row is FAILED with holds_slot false; the re-trigger sends'],
        ],
      },
    ],
  },
  {
    name: 'Server: Background queue, scheduler lease and jobs',
    description:
      'The BullMQ notify queue (REDIS_QUEUE_URL), the Mongo scheduler lease that picks one process for cluster-wide sweeps, and resumable background jobs such as bulk delete.',
    sub_flows: [
      {
        name: 'BullMQ notify worker delivers both legs, neither throws',
        description:
          'notifyEach queues one job per recipient (stripped to id, email and numbers) when the queue Redis is ready; the worker runs notifyEvent with global concurrency 1; without REDIS_QUEUE_URL or with Redis down the sends run inline.',
        steps: [
          ['With REDIS_QUEUE_URL set, cancel a pod with three attendees', 'The mutation returns once jobs are queued; each attendee gets WhatsApp and email'],
          ['Make the WhatsApp leg fail for one attendee', 'Their email still sends; the WhatsApp row is FAILED'],
          ['Make the email leg throw', 'WhatsApp still sends; an error log notify mail names the template'],
          ['Unset REDIS_QUEUE_URL and repeat', 'The sends run inline in the request'],
          ['Stop the queue Redis with the variable set', 'A warning "Queue Redis not ready — working inline" and the sends run inline'],
        ],
      },
      {
        name: 'Two server replicas run each cluster job once; failover within 90s',
        description:
          'claimSchedulerLease renews a 90-second lease every 30 seconds; startClusterJob ticks only on the holder and never overlaps a run.',
        steps: [
          ['Run two server processes', 'One logs scheduler-leader lease leader true; schedulerleases holds its owner'],
          ['Let a sweep with a visible effect run (a reminder)', 'It happens once, not twice'],
          ['Kill the leader', 'Within 90 seconds the other process takes the lease and sweeps resume'],
          ['Restart the old process', 'It stays a follower while the lease is held'],
        ],
      },
      {
        name: 'Bulk-delete background job resumes from cursor after restart',
        description:
          'After apollo.start, backgroundJobService.resume reschedules every RUNNING job; each batch of 25 deletes the rows after the stored cursor up to max_id, so finished rows are not deleted again and none are skipped.',
        steps: [
          ['Start a bulk delete over several hundred rows (startBulkDelete)', 'A RUNNING job advances its cursor batch by batch'],
          ['Restart the server mid-job', 'After boot the job continues from its cursor'],
          ['Wait for it to finish', 'Every row in scope is gone; rows added after the job started (above max_id) remain'],
          ['Cancel a running job', 'Status CANCELLED; rows already deleted stay counted'],
        ],
      },
    ],
  },
  {
    name: 'Server: Venue slot request expiry',
    description: 'Slot request expiry tick.',
    sub_flows: [
      {
        name: 'Held partner-request slot with no pod expires at start',
        description:
          'runPartnerRequestExpirySweep (same tick as the slot expiry sweep) moves SLOT_REQUESTED or SLOT_CONFIRMED Pod Requests whose slot started to EXPIRED and frees the slot; each move is conditional on the status read, so a pod created at the same moment wins.',
        steps: [
          ['Hold a slot through a Pod Request, confirm it, and let its start time pass with no pod', 'Within the next tick the request is EXPIRED, is_open false, and the slot is AVAILABLE'],
          ['Repeat but create the pod just as the slot starts', 'The request is POD_CREATED and the slot stays with the pod'],
          ['Leave a request whose slot has not started', 'Untouched'],
        ],
      },
    ],
  },
  {
    name: 'App: Cart',
    description: 'Pod Shop cart.',
    sub_flows: [
      {
        name: 'Cart reminder email sweep respects Cart Settings timing',
        description:
          'startProductCartReminderScheduler (every 15 minutes, first after 3) emails carts unchanged for email_first_delay_hours, then every email_repeat_hours up to email_max_count, only when the product visibility flag and email_enabled are on.',
        steps: [
          ['Set Cart Settings: email on, first delay 1 hour, repeat 24 hours, max 2', 'Saved'],
          ['Leave a cart unchanged for over an hour', 'One reminder email is sent within 15 minutes; mails_sent is 1'],
          ['Wait for the next tick', 'No second email until 24 hours after the first'],
          ['After the second reminder', 'No more are sent'],
          ['Turn email off in Cart Settings', 'No reminders are sent'],
        ],
      },
    ],
  },
  {
    name: 'Server: Pet store back-in-stock and Autoship',
    description:
      'startStoreScheduler for ecomm.duncit.com only (not Partner Brand): every 30 minutes (first after 2) email stock-alert waiters and book or remind due Autoship cycles.',
    sub_flows: [
      {
        name: 'Back-in-stock emails and due Autoship cycles',
        description:
          'sendBackInStock mails each un-notified alert once its PUBLISHED product or variant has stock and stamps notified_at; runDue books ORDER-mode or reminds REMIND-mode subscriptions due now and moves next_run_at; three failures pause one.',
        steps: [
          ['Subscribe to a sold-out product, then restock it', 'Within 30 minutes one back-in-stock email is sent and notified_at is set'],
          ['Wait for the next tick', 'No second email'],
          ['Make an ORDER-mode Autoship due', 'An order is booked, run_count +1 and next_run_at moves by frequency_weeks'],
          ['Make a REMIND-mode subscription due', 'One reminder; reminded_for set so it is not repeated'],
          ['Make booking fail three ticks in a row', 'The subscription is PAUSED with "Paused after repeated failures"'],
          ['Turn autoship_enabled off', 'No cycles run'],
        ],
      },
    ],
  },
  {
    name: 'Server: ShipRocket webhook',
    description: 'ShipRocket shipment updates.',
    sub_flows: [
      {
        name: 'Poll tracking for shipments the webhook has not updated in 6h',
        description:
          'startShiprocketScheduler (every 2 hours, first after 5 minutes) refreshes open SHIP orders with an AWB, return pickups and pod-shop returns whose last sync is over 6 hours old; fresh ones are untouched.',
        steps: [
          ['Leave an open shipment with last_synced_at 7 hours ago', 'On the next sweep its status is updated from ShipRocket tracking and last_synced_at is fresh'],
          ['Leave one synced 1 hour ago', 'Not refreshed'],
          ['Make tracking fail for one order', 'A warning names the order and the rest still refresh'],
        ],
      },
    ],
  },
  {
    name: 'Partners: Your Brands',
    description: 'Partner Brand brands.',
    sub_flows: [
      {
        name: 'Approved brand/product deletion executes only when orders are settled',
        description:
          'runDueDeletions (hourly, first after 5 minutes) handles APPROVED requests whose scheduled_for has passed; open orders or returns block with a WAITING reason; once settled the product is archived or the brand removed and the request is COMPLETED.',
        steps: [
          ['Approve a product deletion scheduled for tomorrow', 'Nothing happens before the date'],
          ['Let the date pass while one order is still running', 'The request records WAITING "1 order(s) still running"'],
          ['Deliver the order and wait for the next run', 'The product is ARCHIVED and the request COMPLETED with a note'],
          ['Approve a brand deletion while a child product request is open', 'Blocked with "<n> product(s) of the brand still waiting to be deleted"'],
        ],
      },
    ],
  },
  {
    name: 'Server: Social accounts sync, publishing and OAuth',
    description:
      'Marketing Social Accounts: GET /social/callback for LinkedIn, Meta, X and Google, the 15-minute sync tick (each account read at most every 3 hours) and the one-minute scheduled post publisher.',
    sub_flows: [
      {
        name: 'Social sync every few hours and scheduled post publishing',
        description:
          'publishDue claims each due post SCHEDULED to PUBLISHING before sending, so it goes once; recoverStuckPosts marks unsent targets of a post left PUBLISHING over 30 minutes as failed rather than re-sending.',
        steps: [
          ['Schedule a post for one minute ahead', 'Within a minute it is PUBLISHED once with permalinks'],
          ['Restart the server while a post is PUBLISHING and wait 30 minutes', 'Its pending targets are FAILED with "Interrupted — the server stopped while this was going out. Check the network before retrying."'],
          ['Connect an account and watch sync', 'It syncs once, then not again for about 3 hours'],
          ['Revoke the network token', 'The account is marked EXPIRED with the error'],
        ],
      },
      {
        name: 'Social account OAuth callback connects the account',
        description:
          'The callback redirects to the Marketing page fixed by the signed state (never an open redirect): connected=<provider>&count=<n> on success, social_error=<reason> otherwise.',
        steps: [
          ['Approve a connection on the network', 'Redirect to <marketing>/social-accounts?connected=<PROVIDER>&count=<n>; the accounts are listed and first sync starts'],
          ['Press Cancel on the network', 'Redirect with social_error=access_denied (or the network\'s error)'],
          ['GET /social/callback?code=x&state=<forged>', 'Redirect to /social-accounts with social_error "This connect link has expired or did not start here. Press Connect again."'],
          ['GET /social/callback with no code', 'Redirect with social_error=missing_code'],
        ],
      },
    ],
  },
  {
    name: 'Server: Analytics report mails and alerts',
    description:
      'startAnalyticsMailScheduler (one-minute tick, first after 3 minutes) and startAnalyticsAlertScheduler (five-minute tick, first after 4), behind Analytics > Settings.',
    sub_flows: [
      {
        name: 'Analytics report mails and hourly alerts',
        description:
          'runIfDue sends each due active subscription once, claimed on last_sent_at, and sends late after downtime; checkDueAlerts reads each active alert at most once an hour, claimed on last_checked_at.',
        steps: [
          ['Subscribe to a daily report and let the send time pass', 'One PDF report email; last_sent_at is set'],
          ['Wait for later ticks the same day', 'No second mail'],
          ['Stop the server across the send time, then start it', 'The report goes out soon after boot'],
          ['Create an alert that trips', 'One alert mail within the hour; it is not re-checked for an hour'],
          ['Disable analytics mails in settings', 'Nothing is sent'],
        ],
      },
    ],
  },
  {
    name: 'Tech: App Builds',
    description: 'App builds and store releases.',
    sub_flows: [
      {
        name: 'App Store push resumes after restart; rejected version opens an issue',
        description:
          'resumeAppStoreReleases (every minute, first after 90s) carries an interrupted push on from its recorded step; pollStoreReleases (every 30 minutes, first after 3) opens one issue per newly rejected or awaiting version with mail and Slack, and re-raises open issues past the reminder window.',
        steps: [
          ['Start an App Store push and restart the server mid-upload', 'After boot the push continues from the recorded step, not from scratch'],
          ['Have App Store Connect mark a version rejected', 'Within 30 minutes one issue opens with advice, a mail and a Slack post'],
          ['Wait for the next poll', 'No duplicate issue'],
          ['Leave the issue open past the reminder window', 'It is raised again'],
        ],
      },
    ],
  },
  {
    name: 'Server: Retention sweeps and samplers',
    description: 'Daily GDPR retention sweeps.',
    sub_flows: [
      {
        name: 'Short-link clicks, analytics (13 months) and contact invites (90 days) are purged',
        description:
          'Daily cluster jobs: short-link clicks older than the admin retention_days (first after 10 minutes), app events and active-user pings older than 395 days (after 15), contact invites not updated for 90 days (after 20).',
        steps: [
          ['Seed short-link clicks older than the configured window and newer ones; wait for the sweep', 'Old clicks are deleted, newer kept; last_purge_at and last_purged_count are set'],
          ['Seed app events and pings older than 395 days', 'They are deleted; newer remain'],
          ['Seed contact invites with updated_at 91 and 89 days ago', 'Only the 91-day one is deleted'],
          ['Change the short-link retention window and rerun', 'The new window is used'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Stress Testing',
    description: 'Stress runs and their guardrails.',
    sub_flows: [
      {
        name: 'Stress run guardrails end a run that breaches limits or is orphaned',
        description:
          'startStressTestSampler (every 5 seconds, per process) records peaks with $max; host memory or CPU over the limit terminates at once; error rate or p95 must persist abort_breach_samples samples; queued, silent or unacknowledged runs are closed with a reason.',
        steps: [
          ['Run with a low p95 limit so latency breaches persist', 'Status STOPPING with "Guardrail tripped — p95 latency <x> ms ≥ <limit> ms"'],
          ['Push host memory over its limit', 'Terminated at once: "Terminated — host memory <x>% ≥ <limit>%"'],
          ['Queue a run no runner picks up for 20 minutes', 'FAILED "No GitHub runner picked the run up within 20 minutes."'],
          ['Stop the runners reporting for 3 minutes', 'FAILED "The runners stopped reporting for three minutes."'],
          ['Let a run pass its planned duration', 'STOPPING "The run went past its planned duration"'],
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* REST endpoints and GraphQL hardening                                */
  /* ------------------------------------------------------------------ */
  {
    name: 'App: Sign In',
    description: 'Member sign-in.',
    sub_flows: [
      {
        name: 'Apple form_post relay redirects only to allowed hosts',
        description:
          'POST /apple/callback (apple.relay.ts) redirects 303 to the state URL with id_token in the fragment only when state is the duncit: app scheme, an https duncit.com host or http localhost; anything else is 400.',
        steps: [
          ['POST /apple/callback with state=https://mweb.duncit.com/login and id_token=<t>', '303 to https://mweb.duncit.com/login#id_token=<t>'],
          ['POST with state=duncit://auth and a user JSON carrying a name', '303 to duncit://auth#id_token=<t>&name=<first last>'],
          ['POST with state=https://evil.example/', '400 "Unknown return address."; no token leaves'],
          ['POST with state=http://mweb.duncit.com', '400: plain http is only allowed for localhost'],
          ['POST with error=user_cancelled_authorize and no id_token', '303 to the state URL with #error=user_cancelled_authorize'],
        ],
      },
    ],
  },
  {
    name: 'Server: Signed and keyed file feeds',
    description: 'Signed and token-keyed GET routes.',
    sub_flows: [
      {
        name: 'Table API token runs as owner with their role checks',
        description:
          'GET /table-api/:tableQueryName with ?token= or x-table-api-token runs only a <name>Table query through Apollo as the token owner, so every resolver role check still applies; responses are no-store JSON.',
        steps: [
          ['GET /table-api/paymentsTable?token=<valid finance token>&page=1&page_size=25', '200 JSON with table, page, page_size, total, total_pages, next_page_url and rows'],
          ['GET with no or an invalid token', '401 {"error":"UNAUTHENTICATED"} telling where to generate a token'],
          ['GET /table-api/createPod?token=<valid>', '404 with error NOT_FOUND and message: "createPod" is not a table query.'],
          ['GET a table the owner\'s role cannot read', '403 {"error":"FORBIDDEN","message":"Access Denied"}'],
          ['Send the token in the x-table-api-token header', '200'],
        ],
      },
      {
        name: 'Signed reel media stream honours Range and refuses bad tokens',
        description:
          'GET /reels/media/:token and /reels/thumbnail/:token verify the signed token before touching Drive, pass Range through and stream Drive\'s 206 back with private caching.',
        steps: [
          ['GET /reels/media/<valid token> with Range: bytes=0-1023', '206 with Content-Range and Accept-Ranges; Cache-Control private'],
          ['GET it without Range', '200 with the whole file streamed'],
          ['GET /reels/media/<tampered token>', '404 "Not found" and no Drive request is made'],
          ['GET a thumbnail with a valid token', '200 image'],
          ['Make Drive unreachable', '502 "Google Drive could not be reached"'],
        ],
      },
    ],
  },
  {
    name: 'Tech: Database Backups',
    description: 'Database backups in the Tech portal.',
    sub_flows: [
      {
        name: 'Backup archive only through a short-lived signed link',
        description:
          'requestDbBackupDownload (SUPER_ADMIN) mints a 5-minute signed link to GET /db-backups/download?token= (or x-backup-token header); every rejection is the same 404 no-store answer.',
        steps: [
          ['As SUPER_ADMIN request a download link for a backup', 'url, fileName and expiresInSeconds 300'],
          ['GET the url within 5 minutes', '200 application/gzip attachment with Cache-Control no-store and X-Robots-Tag noindex, nofollow'],
          ['GET it after 5 minutes', '404 "Not found"'],
          ['Alter the token', '404 "Not found"'],
          ['Call requestDbBackupDownload as TECH_MANAGER', '"Access Denied" (FORBIDDEN)'],
        ],
      },
    ],
  },
  {
    name: 'Server: Twilio call webhooks',
    description: 'Twilio webhooks.',
    sub_flows: [
      {
        name: 'Recording callback attaches the recording to the contact action',
        description:
          'The flagged gap is fixed: recordingWebhook.ts admits only a request signed with TWILIO_AUTH_TOKEN over TWILIO_WEBHOOK_BASE_URL + path (403 otherwise); a signed callback saves RecordingUrl (.mp3 appended) and always answers 204.',
        steps: [
          ['Make a recorded admin call so Twilio posts /twilio/recordings?contactActionId=<id>', '204; the contact action has the recording URL ending .mp3, the call SID, recording SID and duration'],
          ['POST the same body without X-Twilio-Signature', '403 with an empty body; nothing is changed'],
          ['POST with a wrong signature', '403'],
          ['Clear TWILIO_WEBHOOK_BASE_URL and post a signed callback', '403 and a warning that the callback was refused'],
          ['Post a signed callback naming an unknown contact action', '204; an error log "Could not attach the call recording"'],
        ],
      },
    ],
  },
  {
    name: 'Server: GraphQL hardening',
    description: 'Apollo validation rules and error formatting in server/src/index.ts.',
    sub_flows: [
      {
        name: 'Query depth over 10 is rejected',
        description: 'depthLimitRule(MAX_QUERY_DEPTH = 10) rejects deeper operations at validation, following fragment spreads and ignoring introspection fields, before any resolver runs.',
        steps: [
          ['POST /graphql with a query nested 11 levels (pod { club { pods { club { ... } } } })', 'GRAPHQL_VALIDATION_FAILED "Query is 11 levels deep; the limit is 10. Split it into smaller queries."; no resolver runs'],
          ['Reach 11 levels through a fragment spread', 'The same error'],
          ['Send a 10-level query', 'Accepted'],
          ['Send a deep __schema introspection query on staging', 'Not counted against the limit'],
        ],
      },
      {
        name: 'Duplicate-key writes return CONFLICT without Mongo internals',
        description: 'formatError maps an E11000 error to code CONFLICT with a human message from duplicateKeyMessage, never the collection, index or raw key.',
        steps: [
          ['Create a record whose unique field (such as a username) is already taken', 'Code CONFLICT and "That <field> is already in use. Please change it and try again."'],
          ['Inspect the response', 'No "E11000", collection or index name appears'],
          ['Trigger a duplicate on a field with no label', '"Those details are already in use. Please change them and try again."'],
        ],
      },
    ],
  },
  {
    name: 'Server: Rate limiter',
    description: 'Rate limit rules.',
    sub_flows: [
      {
        name: 'Non-GraphQL routes are rate limited by middleware',
        description:
          'rateLimitMiddleware evaluates REST rules for every path except /graphql, /health and /status (and stress traffic); a refused request gets 429 {"error":"rate_limited"} and a breach event.',
        steps: [
          ['Set the Uploads rule (/upload*, token bucket 60/60s burst 20) to ENFORCE and send 100 uploads quickly', 'Requests past the bucket get 429 {"error":"rate_limited","message":...}; a breach is listed in Tech > Rate Limiting > Blocked'],
          ['Exceed the Public API keys rule (120/60s per key) on /api/v1', '429 for that key while another key still works'],
          ['Hammer /health and /status/summary', 'Always 200'],
          ['Make the limiter store throw', 'The request is let through and an error log rateLimit middleware is written'],
        ],
      },
    ],
  },
  {
    name: 'App: Password Recovery',
    description: 'Forgotten-password recovery.',
    sub_flows: [
      {
        name: 'Password reset seals tokens issued before it',
        description:
          'Both reset paths seal: completePasswordReset (sessions_invalidated_at + sealSessions), and the deprecated resetPasswordWithOtp, which now runs on the same password-reset service with its attempt limit.',
        steps: [
          ['Sign in on device A, then on device B complete requestPasswordResetCode, verifyPasswordResetCode and completePasswordReset', 'true; a password-changed email is sent'],
          ['On device A make any authenticated call', '"Not authenticated" (UNAUTHENTICATED); on other replicas within 60 seconds'],
          ['Sign in with the new password', 'Works'],
          ['Complete the reset with the current password', '"Choose a password you have not used on this account before"'],
          ['Repeat the reset through the deprecated resetPasswordWithOtp, then call with device A\'s old token', '"Not authenticated": the legacy reset seals sessions like completePasswordReset'],
        ],
      },
    ],
  },
  {
    name: 'Server: Health, logs ingest and API root',
    description: 'Public REST routes on the API host.',
    sub_flows: [
      {
        name: 'SSE stream refuses missing/invalid/sealed token',
        description:
          'Missing, forged, sealed and locked tokens get 401: GET /notifications/stream authenticates through decodeAuthUser, the same check every GraphQL request uses (notification.stream.ts).',
        steps: [
          ['GET /notifications/stream with no token', '401 and the connection closes'],
          ['GET with a forged token', '401'],
          ['GET with a valid member token', 'text/event-stream opens and the first event is "hello" with unread_count'],
          ['Call signOutEverywhere for that member, then GET with the old token', '401: the stream authenticates through decodeAuthUser, so a sealed token is refused'],
          ['GET with the token of an account that filed a deletion request', '401: a locked (deletion-requested) account cannot open the stream'],
        ],
      },
    ],
  },
];

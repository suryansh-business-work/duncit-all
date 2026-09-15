import type { CatalogueFlow } from './catalogue.types';

/** Customer app account journeys (mWeb + native): signup, sign-in, sessions, recovery, profile, preferences, deletion, legal, support and notification permission. */
export const APP_ACCOUNT_FLOWS: readonly CatalogueFlow[] = [
  {
    name: 'App: Sign Up',
    description:
      'Joining Duncit on mWeb (/register) and the native app (Signup screen, /signup). Four steps: About you, How we reach you, Your password, Verify WhatsApp. Nothing is created until the WhatsApp code is proved.',
    sub_flows: [
      {
        name: 'Sign up with email - happy path',
        description:
          'A new visitor completes all four steps and lands on the interest survey with a live session.',
        steps: [
          ['Open /register while signed out (native: tap "Create one" on the sign-in screen)', 'The "Join Duncit." screen shows a Google button, an "OR EMAIL" divider, a 4-segment step bar titled "About you" and a "Continue" button'],
          ['Enter a valid Name, pick a Date of birth at least the admin minimum age ago, leave Referral code empty, tap "Continue"', 'Step 2 "How we reach you" shows Code (+91), WhatsApp number, a ticked "This is also my mobile number" box and Email'],
          ['Enter a WhatsApp number and an email that are not on any account and wait for the check', '"Checking availability…" shows briefly and then clears; "Continue" is enabled'],
          ['Tap "Continue"', 'Step 3 "Your password" shows Password, Confirm Password and the "I have read and accept the Duncit policies" checkbox; the main button reads "Create account"'],
          ['Enter a valid password twice, tick the policy checkbox and press "Accept all" in the dialog', 'The dialog closes and the checkbox is ticked with no hint under it'],
          ['Tap "Create account"', 'Step 4 "Verify WhatsApp" opens and says "We sent a 6-digit code to {+code number} on WhatsApp."; a code is sent automatically without pressing anything'],
          ['Enter the test code shown by the stubbed OTP (or the WhatsApp code) and tap "Verify number"', 'The button reads "Verifying…" then "Creating your account…"'],
          ['Wait for the account to be created', 'The app lands on /signup-survey (native: Survey screen) signed in; the server stores the user with WhatsApp verified, role USER, an auto-generated @username and one policy acceptance row per policy'],
        ],
      },
      {
        name: 'Step 1 About you validation',
        description: 'Inline Zod errors on the first step; Continue only validates this step.',
        steps: [
          ['On /register tap "Continue" with every box empty', 'Inline errors "Name is required" and "Date of birth is required" show and the step does not change'],
          ['Enter a one-letter name and blur', '"Name must be at least 2 characters" shows under Name'],
          ['Enter a name containing digits or symbols, e.g. "Riya_99"', '"Name can use letters, spaces, apostrophes and periods only" shows'],
          ['Type a half-finished date of birth into the date box', '"Enter a valid date of birth" shows'],
          ['Enter a malformed referral code such as "ABC"', '"Enter a code like DUN-XXXXXX" shows under Referral code (optional)'],
          ['Fix every field and tap "Continue"', 'Step 2 "How we reach you" opens; no error from step 1 remains'],
        ],
      },
      {
        name: 'Minimum age gate on date of birth',
        description:
          'The joining age comes from Admin settings (default 18) and is enforced by the picker, the form and the server.',
        steps: [
          ['Open the Date of birth picker on step 1', 'The picker opens on the year view; days after today minus the minimum age cannot be selected; helper text reads "You must be at least 18 years old" (the configured number)'],
          ['Type a date that makes the person younger than the minimum age and tap "Continue"', '"You must be at least 18 years old to join Duncit" shows and step 1 stays open'],
          ['Change the Admin minimum signup age and reload /register', 'The helper text and the refusal quote the new number'],
          ['Send the register mutation directly with an under-age dob', 'The server refuses with "You must be at least {years} years old to join Duncit" and no account is created'],
        ],
      },
      {
        name: 'Step 2 contact availability checks',
        description:
          'Email and WhatsApp number are checked against the server as they are typed (signupContactAvailability); a taken value blocks Continue.',
        steps: [
          ['On step 2 type an email already registered to another account and wait', 'The email box shows "This email is already registered. Log in instead, or use a different email." and "Continue" is disabled'],
          ['Change the email to an unused one', '"Checking availability…" shows, then the error clears'],
          ['Type a WhatsApp number that is already a phone or WhatsApp number on another account', '"This number is already registered. Log in instead, or use a different number." shows and "Continue" stays disabled'],
          ['Enter a number with letters or fewer than 6 digits and tap "Continue"', '"Enter a phone number — digits only, 6 to 15" shows'],
          ['Clear the country code and tap "Continue"', '"Country code is required" shows; a code like "91x" shows "Use a code like +91"'],
          ['Press Enter inside a box while a contact is taken', 'Nothing advances; the step stays on "How we reach you"'],
        ],
      },
      {
        name: 'WhatsApp number is also my mobile choice',
        description: 'The tick box decides whether the WhatsApp number is also saved as the profile phone.',
        steps: [
          ['On step 2 leave "This is also my mobile number" ticked and finish signup', 'The new account has the number both as its phone and as its verified WhatsApp number'],
          ['Sign up again with a different account and untick the box before finishing', 'The hint "Untick if your mobile number is different — we will leave the phone number on your profile blank." is shown under the box'],
          ['Open Manage Account on the second account', 'The Phone row shows "—" while the WhatsApp number is stored; Edit profile flags the missing phone as required'],
        ],
      },
      {
        name: 'Step 3 password and policy validation',
        description: 'Password rules and the policy gate on the step that creates the account.',
        steps: [
          ['On step 3 enter a 5 character password and blur', '"Min 8 characters" shows under Password'],
          ['Enter a password longer than 128 characters', '"Password is too long" shows'],
          ['Leave Confirm Password empty and tap "Create account"', '"Please confirm your password" shows'],
          ['Enter a different value in Confirm Password', '"Passwords do not match" shows under Confirm Password'],
          ['Fix both passwords but leave the policy checkbox unticked', 'The hint "Accept every policy to continue." shows under the checkbox'],
          ['Tap "Create account"', '"Accept every policy before creating your account" shows and step 4 does not open'],
        ],
      },
      {
        name: 'Policy acceptance dialog at signup',
        description: 'The signup policy list comes from Legal (signupPolicies) and each policy must be accepted.',
        steps: [
          ['On step 3 tick "I have read and accept the Duncit policies"', 'The "Policies you need to accept" dialog opens with one row per policy, each with a tick box and a "Read" button, and a "{done} of {total} accepted" line'],
          ['Tap "Read" on one policy', 'The policy title and full body open without leaving signup (no sign-in bounce)'],
          ['Close the body, tick one policy and press "Close"', 'The dialog closes; the signup checkbox stays unticked and "Accept every policy to continue." still shows'],
          ['Reopen the dialog', 'The earlier tick is kept and the count reads "1 of N accepted"'],
          ['Press "Accept all"', 'The dialog closes and the signup checkbox is ticked'],
          ['Untick the signup checkbox', 'All accepted policies are cleared and the hint returns'],
          ['Deactivate every signup policy in Legal and reload /register', 'The policy checkbox is not rendered on step 3 and signup can finish without it'],
        ],
      },
      {
        name: 'Step 4 WhatsApp code negative paths',
        description: 'Wrong, expired and repeated code requests on the Verify WhatsApp step.',
        steps: [
          ['On step 4 type 5 digits', '"Verify number" stays disabled'],
          ['Enter a wrong 6-digit code and tap "Verify number"', 'An error "Incorrect code — 4 attempts left" shows and the account is not created'],
          ['Enter wrong codes until the attempt limit (5) is used', '"Too many wrong codes — send a new one" shows'],
          ['Tap "Send again" within 30 seconds of the last send', 'An error "Wait {n}s before asking for another code" shows'],
          ['Wait 30 seconds and tap "Send again"', 'The link reads "Sending…" and a new code is issued; the previous one no longer works'],
          ['Wait more than 10 minutes and submit the old code', '"That code has expired — send a new one" shows'],
          ['Close the tab on step 4 and search for the email in Admin', 'No account exists for that email or number'],
        ],
      },
      {
        name: 'Account creation refused by the server',
        description: 'Refusals that can only be decided when the proved code is spent on register.',
        steps: [
          ['Enter a well-formed but non-existent referral code on step 1 and complete signup', 'Step 4 shows "That referral code does not exist" and no account is created'],
          ['Register the same email from another browser while this signup is on step 4, then verify the code here', 'Step 4 shows "Email already in use"'],
          ['Register the same WhatsApp number elsewhere first, then request the code here', '"This phone number is already registered. Please use a different number or login." shows'],
          ['Configure the WhatsApp transport so delivery fails (no stub) and open step 4', '"We could not send your WhatsApp code right now. Please try again in a few minutes." shows and no test code is displayed'],
        ],
      },
      {
        name: 'Referral link prefills signup',
        description: 'A shared referral link carries its code into the signup form.',
        steps: [
          ['Open a referral share link that lands on /register with a referral code in the URL', 'Step 1 shows the Referral code (optional) box already filled with the code in upper case'],
          ['Complete signup with a valid code', 'The account is created and the referral is linked to the referrer on the server'],
        ],
      },
      {
        name: 'Back keeps earlier answers',
        description: 'The stepper holds one form across steps.',
        steps: [
          ['Fill step 1 and step 2, then tap "Back" on step 2', 'Step 1 shows with the Name, Date of birth and referral code still filled'],
          ['Tap "Continue" twice', 'Step 3 opens and step 2 still holds the typed number and email'],
          ['On step 1 confirm no Back button is shown', 'Only the "Continue" button is rendered'],
        ],
      },
      {
        name: 'Sign up with Google',
        description:
          'Google proves the email only, so the flow asks policies, WhatsApp number and date of birth, then a WhatsApp code, before signupWithGoogle creates the account.',
        steps: [
          ['On /register press the Google button and choose a Google account with no Duncit account', 'The "Policies you need to accept" dialog opens with the text that Google has confirmed who you are but the account is not created yet'],
          ['Press "Accept all"', 'The step bar title changes to "A few details" with WhatsApp number, "This is also my mobile number" and Date of birth, and a "Send code" button'],
          ['Enter an unused WhatsApp number and a valid date of birth, tap "Send code"', 'The Verify WhatsApp step opens and a code is sent to that number'],
          ['Enter the test code shown by the stubbed OTP and tap "Verify number"', 'The account is created with the Google email verified and the app lands on /signup-referral (native: referral prompt screen)'],
        ],
      },
      {
        name: 'Google signup cancelled at the policy dialog',
        description: 'Closing the Google policy gate without accepting everything creates nothing.',
        steps: [
          ['On /register press the Google button and pick a new Google account', 'The policy dialog opens'],
          ['Press "Close" without accepting every policy', 'The dialog closes and an error "Accept every policy to continue." shows under the Google button'],
          ['Search Admin for the Google email', 'No account was created'],
          ['Press the Google button again with a Google account that already has a Duncit account and finish the steps', 'Account creation is refused with "Google account already exists. Please login with Google."'],
        ],
      },
      {
        name: 'Referral question after Google signup',
        description: '/signup-referral asks for a code once, and can be skipped.',
        steps: [
          ['Land on /signup-referral after a Google signup', '"Got a referral code?" shows a Referral code box, "Apply code" (disabled while empty) and "Skip for now"'],
          ['Type "ABC"', '"Enter a code like DUN-XXXXXX" shows and "Apply code" stays disabled'],
          ['Enter a non-existent valid-looking code and tap "Apply code"', 'An error "That referral code does not exist" shows'],
          ['Tap "Skip for now"', 'The app opens /signup-survey'],
        ],
      },
      {
        name: 'Onboarding interest survey after signup',
        description: 'New accounts pick interests on /signup-survey before reaching Home.',
        steps: [
          ['Arrive on /signup-survey after signup', '"What\'s your vibe?" lists categories grouped by super category, a progress bar and a footer "Selected 0 / N" with "Find my crew" disabled'],
          ['Pick two interests', 'The count reads 2 and "Find my crew" is still disabled (minimum 3)'],
          ['Pick a third interest and tap "Find my crew"', 'The button reads "Saving…", interests are saved and the app opens Home (or the ?redirect path it was sent with)'],
          ['Sign out and sign back in with this account', 'The survey is not shown again'],
        ],
      },
      {
        name: 'Signed-in visitor opening the signup screen',
        description: 'Auth screens redirect away when a session exists.',
        steps: [
          ['While signed in open /register', 'The app redirects to Home'],
          ['While signed in open /register?redirect=/support', 'The app redirects to /support'],
        ],
      },
    ],
  },
  {
    name: 'App: Sign In',
    description:
      'Signing in to the customer app on mWeb (/login) and the native Login screen. Three doors: Google, Continue with Password (email or phone) and Continue with OTP (email or WhatsApp).',
    sub_flows: [
      {
        name: 'Sign in with email and password',
        description: 'An existing member signs in from /login.',
        steps: [
          ['Open /login while signed out', '"Welcome back." shows a Google button, an "OR" divider, "Continue with Password", "Continue with OTP", "New here? Create one", the Terms/Privacy line and "App version {version}"'],
          ['Tap "Continue with Password"', 'The heading becomes "Sign in with password" with Email/Phone tabs (Email selected), Email and Password boxes, "Log me in", "Forgot password?" and "Back to sign-in options"'],
          ['Enter the E2E test account email and password and tap "Log me in"', 'The button reads "Signing in…" and the app opens Home'],
          ['Check the server user record', 'auth.last_login_provider is EMAIL and auth.last_login_at is updated'],
        ],
      },
      {
        name: 'Sign in with phone number and password',
        description: 'The Phone tab signs in with a phone or WhatsApp number plus the password.',
        steps: [
          ['On the password step tap the "Phone" tab', 'The form remounts with Code (+91) and Phone number boxes; any email error is gone'],
          ['Enter the E2E test account WhatsApp number and its password, tap "Log me in"', 'The app opens Home signed in to the same account'],
          ['Repeat with an unregistered number', '"Invalid email or password" shows in the error alert'],
        ],
      },
      {
        name: 'Password sign-in validation',
        description: 'Client-side rules before any request is sent.',
        steps: [
          ['On the Email tab tap "Log me in" with both boxes empty', '"Email is required" and "Min 8 characters" show inline and no request is sent'],
          ['Enter "riya@" and blur', '"Enter a valid email" shows'],
          ['Enter a 7-character password', '"Min 8 characters" stays under Password'],
          ['Switch to Phone and submit empty', '"Phone number is required" shows'],
          ['Tap the eye icon in the Password box', 'The password becomes visible and the icon label changes from "Show password" to "Hide password"'],
        ],
      },
      {
        name: 'Password sign-in refused by the server',
        description: 'Wrong credentials and account states share deliberate messages.',
        steps: [
          ['Enter a registered email with a wrong password', 'The alert shows "Invalid email or password"'],
          ['Enter an email that has no account', 'The alert shows the same "Invalid email or password"'],
          ['Enter the email of an account that signed up with Google and has no password', '"This account uses Google sign-in. Continue with Google." shows'],
          ['Sign in to an account whose status is not ACTIVE', '"Account is not active" shows and no session starts'],
          ['Sign in to an account with a pending deletion request using the right password', '"Invalid email or password" shows (a sealed account is not revealed)'],
        ],
      },
      {
        name: 'Continue with OTP by email',
        description: 'Passwordless sign-in with a code mailed to the account email.',
        steps: [
          ['On /login tap "Continue with OTP"', '"Sign in with a code" shows Email/Phone tabs, the hint "We’ll email your code to this address.", an Email address box and "Send code" (disabled until valid)'],
          ['Enter the E2E test account email and tap "Send code"', 'The code step says "We sent a 6-digit code to {email}." with a "6-digit code" box and the hint "The code is valid for 10 minutes and can be used once."'],
          ['Enter the test code shown by the stubbed OTP (or the emailed code) and tap "Verify & sign in"', 'The button reads "Signing in…" and the app opens Home; last_login_provider is OTP'],
          ['Try to sign in again with the same code', 'The code is refused because it was already used'],
        ],
      },
      {
        name: 'Continue with OTP by WhatsApp',
        description: 'The Phone tab sends the sign-in code over WhatsApp.',
        steps: [
          ['On the OTP step tap "Phone"', 'The hint reads "We’ll send your code on WhatsApp to this number." with Code and Phone number boxes'],
          ['Enter the E2E test account WhatsApp number and tap "Send code"', 'The code step names the number; a "Test code: …" info alert shows while delivery is stubbed'],
          ['Enter the test code shown by the stubbed OTP and tap "Verify & sign in"', 'The app opens Home signed in'],
          ['Sign in by OTP with a Google-only account email', 'Sign-in succeeds; a code can open accounts that have no password'],
        ],
      },
      {
        name: 'OTP sign-in unknown or unreachable destination',
        description: 'No account, a sealed account or a channel that cannot carry the code.',
        steps: [
          ['Enter an email with no account and tap "Send code"', '"We couldn’t find an account with these details." shows with "New to Duncit?" and a "Create Account" button to /register'],
          ['Switch to the Phone tab', 'The not-found warning clears'],
          ['Use an account whose email authentication messages are switched off and request an email code', '"We couldn’t send your code that way. Try the other option, or check that this is the right address." shows and the code step does not open'],
          ['Request a phone code for a number that has switched off one-time codes on every phone channel', 'The error "This number has switched off one-time codes on every channel we could use." shows'],
        ],
      },
      {
        name: 'OTP sign-in wrong, expired and resent codes',
        description: 'Attempt limit, cooldown and expiry of the LOGIN code.',
        steps: [
          ['On the code step type fewer than 6 digits', '"Verify & sign in" stays disabled'],
          ['Enter a wrong code', 'The error "Incorrect code — 4 attempts left" shows'],
          ['Check the resend link right after sending', 'It reads "Resend in {seconds}s", counts down and is disabled until 0, then reads "Resend code"'],
          ['Use 5 wrong attempts', '"Too many wrong codes — send a new one" shows'],
          ['Tap "Resend code" and submit an older code', 'The older code is refused; the newest one signs in'],
          ['Tap "Back" on the code step', 'The channel step returns with the typed destination kept; "Back to sign-in options" returns to the method chooser'],
        ],
      },
      {
        name: 'Sign in with Google for a linked account',
        description: 'A member whose Google identity is already linked signs in.',
        steps: [
          ['On /login press the Google button (native: "Sign in with Google") and pick the linked Google account', 'A loading state shows (native: "Connecting to Google…") and the app opens Home'],
          ['Check the user record', 'last_login_provider is GOOGLE; the email is marked verified and the Google photo fills an empty profile photo'],
          ['Close the Google popup without choosing', 'No session starts and the sign-in options stay visible'],
          ['Point the server at an unreachable Google tokeninfo endpoint and try again', '"Could not reach Google to verify your sign-in. Please try again." shows'],
        ],
      },
      {
        name: 'Google sign-in with no Duncit account',
        description: 'GOOGLE_ACCOUNT_NOT_FOUND becomes an invite into signup carrying the credential.',
        steps: [
          ['On /login use Google with an account Duncit has never seen', 'A dialog "No Duncit account yet" says "We could not find a Duncit account for {email}. Would you like to create one?" with "Not now" and "Create my account"'],
          ['Press "Not now"', 'The dialog closes and the sign-in options remain; nothing is created'],
          ['Repeat and press "Create my account"', 'The app opens /register (native: Signup) straight on the policy dialog for Google, without asking Google again'],
          ['Reload /register after accepting', 'The Google flow does not restart a second time for the same credential'],
        ],
      },
      {
        name: 'Google sign-in for an email and password account - allow link',
        description: 'EMAIL_LOGIN_REQUIRED opens a consent dialog that links Google to the existing account.',
        steps: [
          ['On /login use Google with the same verified email as an email/password account', 'A non-dismissable dialog "Also sign in with Google?" says "You registered {email} with an email and password. Allow Google to sign you in to this same account?"'],
          ['Press Escape', 'The dialog stays open'],
          ['Press "Allow and continue"', 'The app opens Home; the account now stores google_id and google_linked_at and the password still works'],
          ['Sign out and sign in with the password', 'Password sign-in still succeeds'],
        ],
      },
      {
        name: 'Google link consent denied',
        description: 'Denying leaves the account unchanged.',
        steps: [
          ['Trigger the "Also sign in with Google?" dialog and press "Not now"', 'The dialog closes and an error reads "Google was not connected. Sign in with your email and password, or try Google again to allow it."'],
          ['Open Manage Account after signing in with the password', 'Connected accounts shows Google "Not connected"'],
          ['Trigger consent for an account already linked to a different Google identity and press "Allow and continue"', 'The dialog stays open with "This account is already linked to a different Google account. Disconnect it from your profile first."'],
        ],
      },
      {
        name: 'Protected page while signed out and return after sign-in',
        description: 'RequireAuth parks the target in ?redirect; native parks booking links and replays them.',
        steps: [
          ['While signed out open /support/tickets', 'The app redirects to /login?redirect=%2Fsupport%2Ftickets'],
          ['Sign in with the E2E test account', 'The app opens /support/tickets instead of Home'],
          ['Sign out, open /login?redirect=//evil.example and sign in', 'The app ignores the unsafe redirect and opens Home'],
          ['Sign in with an account that has not finished the interest survey and a redirect', 'The app opens /signup-survey?redirect=… and after "Find my crew" continues to the redirect'],
          ['Native: open a booking deep link while signed out, then sign in', 'The Login screen shows first and the booking screen opens after sign-in'],
        ],
      },
      {
        name: 'New device sign-in notice',
        description: 'The server emails the account on a sign-in from a device it has not seen.',
        steps: [
          ['Sign in to a new account for the first time', 'No "New sign-in" email is sent for that first device'],
          ['Sign in to the same account from a different browser or device', 'An email "New sign-in to your Duncit account" arrives with the time, device label and location'],
          ['Sign in again from the same second device', 'No further notice is sent'],
          ['Switch off every optional email category and sign in from a third device', 'The notice still arrives (authentication mail is always sent)'],
        ],
      },
    ],
  },
  {
    name: 'App: Sessions and Sign Out',
    description:
      'How a session ends on mWeb and the native app: pressing Logout, a token the server refuses, sessions sealed by a password reset or deletion, and marketing short-link landings on mWeb.',
    sub_flows: [
      {
        name: 'Sign out from the account menu',
        description: 'Logout row at the foot of /menu (native: sidebar footer).',
        steps: [
          ['While signed in open /menu', 'The menu page shows the identity card, Manage Account list, settings group and a red "Logout" row with the app version'],
          ['Tap "Logout"', 'The session is cleared immediately (no confirmation) and the app shows /login'],
          ['Press browser Back', 'Protected pages redirect to /login again'],
          ['Native: check push registration after logout', 'The device Expo push token is removed from the server before the token is dropped'],
        ],
      },
      {
        name: 'Sign out from Manage Account',
        description: 'The Logout button on /account.',
        steps: [
          ['Open /account', 'The profile header shows "Edit", "Share" and a red "Logout" button'],
          ['Tap "Logout"', 'The app returns to /login and local storage and session storage are cleared'],
        ],
      },
      {
        name: 'Rejected token ends the session',
        description: 'Duncit tokens never expire; a token the server refuses (blocked or deleted account, rotated secret) is treated as signed out.',
        steps: [
          ['Sign in, then block the account in Admin', 'Nothing changes until the app next asks the server'],
          ['Reload /pod-history', 'The me query returns null, credentials are dropped and the app opens /login?redirect=%2Fpod-history'],
          ['Native: bring the app to the foreground after the block', 'The app returns to the Login screen'],
        ],
      },
      {
        name: 'Password reset seals other sessions',
        description: 'Completing password recovery refuses every token issued before it.',
        steps: [
          ['Sign in on device A and keep it open', 'Device A is on Home'],
          ['On device B complete Forgot password for the same account', 'The success screen says "You’ve been signed out everywhere else."'],
          ['On device A navigate to any page', 'Device A is sent to /login (native: Login screen)'],
          ['Sign in on device A with the new password', 'Sign-in succeeds and the new session is accepted'],
        ],
      },
      {
        name: 'Deletion request revokes sessions in real time',
        description: 'session:revoked is emitted to every open tab and device when a deletion request is filed.',
        steps: [
          ['Sign in to the same account in two tabs', 'Both tabs show the signed-in app'],
          ['In tab 1 file an account deletion request with the emailed code', 'Tab 1 shows the "Deletion request received" dialog and stays on it'],
          ['Look at tab 2 without interacting', 'Tab 2 is signed out immediately and shows the login screen'],
          ['In tab 1 press "Sign out"', 'Tab 1 signs out'],
        ],
      },
      {
        name: 'Marketing short link forces sign in (mWeb)',
        description: 'A marketing short-link landing always starts at sign-in; a member-shared link does not.',
        steps: [
          ['While signed in on mWeb open a marketing campaign short link', 'The stored credentials are cleared and the page opens /login?redirect={target without short-link params}'],
          ['Sign in', 'The app opens the campaign target page and the click stays attributed'],
          ['While signed in open a pod link shared by another member', 'The pod opens without signing out'],
        ],
      },
      {
        name: 'Session start loads the account once',
        description: 'After any sign-in the app loads the account, coins and policy links in one request.',
        steps: [
          ['Sign in and watch network traffic', 'A single USER_INFO request loads me, the coin balance and public policies'],
          ['Open /menu after sign-in', 'The menu renders without new account requests'],
        ],
      },
    ],
  },
  {
    name: 'App: Force Update and App Version',
    description:
      'The native force-update gate driven by appVersionInfo and the Force App Update flag, the version captions on both surfaces, and the mWeb open-in-app banner.',
    sub_flows: [
      {
        name: 'Outdated native build is blocked',
        description: 'Native only: the running version is below the admin minimum supported version.',
        steps: [
          ['In Admin > Branding set the minimum supported version above the installed build and keep Tech > Feature Flags "Force App Update" on', 'appVersionInfo returns the new min_supported_version'],
          ['Launch the native app', 'A full-screen gate "Update required" says "This version is old. Update to the new version to start using the app." with "Current v{x} · Latest v{y}"'],
          ['Try to reach any screen behind the gate', 'Nothing underneath can be tapped and there is no close or skip'],
          ['Tap "Update now"', 'The store URL from appVersionInfo opens (Play Store link fallback if blank)'],
        ],
      },
      {
        name: 'Force update passes through',
        description: 'Cases where the gate must not block.',
        steps: [
          ['Turn the "Force App Update" flag off and relaunch the outdated build', 'The app opens normally'],
          ['Turn the flag on and clear the minimum supported version', 'The app opens normally'],
          ['Set the minimum supported version equal to the installed version', 'The app opens normally'],
          ['Open the web build of the native app with an old version', 'No update gate is shown on web'],
        ],
      },
      {
        name: 'App version captions',
        description: 'The single app version is shown on both login screens and both menus.',
        steps: [
          ['Open /login on mWeb and the native Login screen', 'Both show "App version {version}" matching app.json'],
          ['Open /menu on mWeb and the native sidebar', 'The footer shows the same version under Logout'],
        ],
      },
      {
        name: 'Open in app banner (mWeb)',
        description: 'mWeb on a phone browser offers the native app.',
        steps: [
          ['Open mWeb in an Android or iOS mobile browser', 'A banner "Duncit is better in the app" shows "Open", "Get app" and a dismiss button'],
          ['Tap "Get app"', 'The platform store URL from appVersionInfo opens'],
          ['Dismiss the banner', 'The banner disappears'],
          ['Open mWeb in a desktop browser', 'No banner is shown'],
        ],
      },
    ],
  },
  {
    name: 'App: Password Recovery',
    description:
      'Forgot password on mWeb (/forgot-password) and native (ForgotPassword screen): choose email or WhatsApp, prove the code, set a new password. Uses the shared OTP service (10 minute codes, 5 attempts, 30s resend).',
    sub_flows: [
      {
        name: 'Reset password by email',
        description: 'The three-step recovery with the email channel.',
        steps: [
          ['On /login tap "Continue with Password" then "Forgot password?"', '"Forgot password?" shows Email/Phone tabs, "We’ll email your code to this address.", Email address and "Send code"'],
          ['Enter the E2E test account email and tap "Send code"', '"Enter your code" says "We sent a 6-digit code to {email}." with a 6-digit code box'],
          ['Enter the test code shown by the stubbed OTP and tap "Verify code"', '"Create a new password" shows New password and Confirm new password with one visibility toggle and "Save password"'],
          ['Enter a new valid password twice and tap "Save password"', '"Password changed successfully" says "You’ve been signed out everywhere else. Log in with your new password to continue." with "Continue to Login"'],
          ['Tap "Continue to Login" and sign in with the new password', 'Sign-in succeeds; the old password now returns "Invalid email or password"; a password-changed email is sent'],
        ],
      },
      {
        name: 'Reset password by WhatsApp',
        description: 'The Phone tab sends the reset code on WhatsApp to the phone or WhatsApp number.',
        steps: [
          ['On /forgot-password tap "Phone"', 'The hint reads "We’ll send your code on WhatsApp to this number." with Code and Phone number'],
          ['Enter the E2E test account WhatsApp number and tap "Send code"', 'The code step names the number; a "Test code: …" alert shows while delivery is stubbed'],
          ['Complete the code and new password steps', 'The success screen shows and the new password works'],
        ],
      },
      {
        name: 'Recovery for an unknown or password-less account',
        description: 'No account, a Google-only account and a sealed account all read as not found.',
        steps: [
          ['Enter an email with no account and tap "Send code"', '"We couldn’t find an account with these details." shows with "New to Duncit?" and "Create Account"'],
          ['Enter the email of a Google-only account', 'The same not-found message shows and no code is sent'],
          ['Enter the email of an account with a pending deletion request', 'The same not-found message shows'],
          ['Tap "Create Account"', 'The app opens /register'],
        ],
      },
      {
        name: 'Recovery code cannot be delivered',
        description: 'The account exists but no medium carried the code.',
        steps: [
          ['Request an email reset code for an account whose email authentication messages are off', '"We couldn’t send your code that way. Try the other option, or check that this is the right address." shows'],
          ['Switch to the Phone tab', 'The warning clears so the other channel can be tried'],
        ],
      },
      {
        name: 'Recovery code wrong, expired and resent',
        description: 'Negative paths on step two.',
        steps: [
          ['Type 5 digits', '"Verify code" stays disabled'],
          ['Enter a wrong code', 'The alert shows "Incorrect code — 4 attempts left"'],
          ['Look at the resend link immediately after sending', '"Didn’t get it?" with "Resend in {seconds}s" disabled until the cooldown ends, then "Resend code"'],
          ['Wait past 10 minutes and submit the code', '"That code has expired — send a new one" shows'],
          ['Use 5 wrong attempts', '"Too many wrong codes — send a new one" shows'],
        ],
      },
      {
        name: 'New password rules and reuse refusal',
        description: 'Step three validation and the server check against the current hash.',
        steps: [
          ['On step three type 7 characters', '"Min 8 characters" shows and "Save password" is disabled'],
          ['Type different values in the two boxes', '"Passwords do not match" shows under Confirm new password'],
          ['Enter the account current password twice and tap "Save password"', '"Choose a password you have not used on this account before" shows and the verification is kept for another try'],
          ['Leave the page idle until the grant expires and save', '"That verification has expired — start again" shows'],
        ],
      },
      {
        name: 'Leaving and going back in recovery',
        description: 'Back links inside the single recovery card.',
        steps: [
          ['On the code step tap "Back"', 'The channel step returns with the destination kept'],
          ['Tap "Back to login" under "Remembered it?"', 'The app opens /login'],
          ['Open /forgot-password while signed in', 'The app redirects to Home'],
        ],
      },
    ],
  },
  {
    name: 'App: Password and Connected Accounts',
    description:
      'Signed-in password change or creation and Google connect/disconnect in Manage Account (/account) on mWeb and the native Account screen.',
    sub_flows: [
      {
        name: 'Change password with an email code',
        description: 'An account that already has a password proves the current one, then enters the code and a new one.',
        steps: [
          ['Open /account and find the Password card', 'It reads "Password" with "Change your password with an email verification code." and a "Change password" button'],
          ['Tap "Change password"', 'A "Change password" dialog says "Enter your current password and we’ll email you a one-time code." with Current password and "Send OTP"'],
          ['Enter the current password and tap "Send OTP"', 'Step 2 shows "OTP sent to your email." with 6-digit OTP, New password, Confirm new password and "Update password"'],
          ['Enter the test code shown by the stubbed OTP and a new password twice, tap "Update password"', 'The dialog closes and a snackbar shows "Password updated"'],
          ['Sign out and sign in with the new password', 'Sign-in succeeds'],
        ],
      },
      {
        name: 'Change password negative paths',
        description: 'Wrong current password, reused password, wrong or expired code.',
        steps: [
          ['Submit an empty Current password', '"Enter your current password" shows'],
          ['Submit a wrong current password', '"Current password is incorrect" shows and step 2 does not open'],
          ['On step 2 enter the current password as the new one', '"New password must be different from your current password" shows'],
          ['Enter a wrong code', '"Invalid OTP" shows'],
          ['Wait for the code to expire and submit', '"OTP expired. Request a new OTP." shows'],
          ['Tap "Resend OTP" under "Didn’t get it?"', 'A new code is emailed and the success alert shows again'],
        ],
      },
      {
        name: 'Create a first password for a Google account',
        description: 'An account without a password creates one with an emailed code.',
        steps: [
          ['Sign in with a Google-only account and open /account', 'The Password card reads "You signed in with Google. Create a password so you can also sign in with your email." with "Create password"'],
          ['Tap "Create password"', 'The dialog "Create password" says "We’ll email you a one-time code to confirm it’s you, then you can set your password." with "Send code" and no current password box'],
          ['Tap "Send code", enter the test code shown by the stubbed OTP and a new password twice, tap "Update password"', 'A snackbar shows "Password created"'],
          ['Look at Connected accounts', '"Email and password" now shows "Active"'],
          ['Sign out and sign in with email and the new password', 'Sign-in succeeds'],
        ],
      },
      {
        name: 'Connect Google from Connected accounts',
        description: 'Link a Google identity to a signed-in account.',
        steps: [
          ['On /account find "Connected accounts"', '"Email and password" shows Active, "Google" shows "Not connected" with a Google button'],
          ['Press the Google button and choose a Google account not linked anywhere', 'A snackbar shows "Google connected" and the row shows the Google email and "Connected on {date}"'],
          ['Connect a Google account already linked to another Duncit account', 'An error "This Google account is already connected to another Duncit account." shows'],
          ['Sign out and use Google on /login', 'Sign-in succeeds with the linked Google account'],
        ],
      },
      {
        name: 'Disconnect Google',
        description: 'Unlink Google when a password exists.',
        steps: [
          ['On an account with a password and Google linked, tap "Disconnect"', 'A confirm "Disconnect Google?" says "You will no longer be able to sign in with Google. Your email and password keep working."'],
          ['Confirm with "Disconnect"', 'A snackbar shows "Google disconnected" and the row returns to "Not connected"'],
          ['Sign out and use Google on /login with that Google account', 'The "Also sign in with Google?" consent dialog appears again'],
        ],
      },
      {
        name: 'Disconnect blocked when Google is the only way in',
        description: 'A Google-only account cannot remove its only sign-in method.',
        steps: [
          ['Open /account on a Google-only account', 'The Google row has no Disconnect button and shows "Google is currently the only way to sign in to this account. Set a password before disconnecting it."'],
          ['Call disconnectGoogleAccount directly for that account', 'The server refuses with "Set a password before disconnecting Google — it is currently the only way to sign in to this account."'],
        ],
      },
    ],
  },
  {
    name: 'App: Profile',
    description:
      'Viewing and editing the member profile: Manage Account (/account), the social profile page (/profile) sections, photo, username, privacy, email verification and account health on mWeb and native.',
    sub_flows: [
      {
        name: 'Open Manage Account',
        description: 'Reach the account settings page and see its sections in order.',
        steps: [
          ['Open /menu and tap "Manage Account" in the Manage Account list', 'The app opens /account (native: Account screen)'],
          ['Look at the page', 'In order: avatar, name, bio, role chips with Edit/Share/Logout; Email, Phone, Location, Date of birth rows with the Profile completion meter; Account Health; Private account; Preferences; Communication Preferences; Connected accounts; Password and deletion'],
          ['On /profile tap the settings button', 'The app opens /account'],
        ],
      },
      {
        name: 'Edit profile details',
        description: 'The Edit profile dialog saves names, bio, gender, pet owner, date of birth, location and main address.',
        steps: [
          ['On /account tap "Edit"', 'The "Edit profile" dialog shows Username, First name, Last name, Bio, Gender, Pet Owner, Contact details, Date of birth, Country/State/City, Main address, "Discard changes" and "Save" (disabled)'],
          ['Change Last name and Bio', '"Save" becomes enabled'],
          ['Tap "Save"', 'The dialog closes, a snackbar shows "Profile updated" and the header shows the new name and bio'],
          ['Reopen Edit profile', 'The saved values are loaded'],
        ],
      },
      {
        name: 'Edit profile validation',
        description: 'Inline rules that keep Save disabled.',
        steps: [
          ['Clear First name', '"First name is required" shows and "Save" is disabled'],
          ['Enter a first name with digits', '"First name can use letters, spaces, apostrophes and periods only" shows'],
          ['Enter a bio longer than 500 characters', '"Bio must be 500 characters or fewer" shows (hint "Up to 500 characters")'],
          ['Pick a date of birth younger than the minimum age', '"You must be at least 18 years old to join Duncit" (configured age) shows'],
          ['Enter a main address pincode of "12"', '"Enter a valid 6-digit pincode" shows'],
          ['Leave an existing stored date of birth untouched after the admin raises the age', 'Save is still allowed for other changes'],
        ],
      },
      {
        name: 'Unsaved changes guard',
        description: 'Closing a dirty Edit profile dialog asks first.',
        steps: [
          ['Change Bio and click outside the dialog', '"Discard unsaved changes?" says "You have unsaved changes. Closing now will lose them." with "Keep editing" and "Discard"'],
          ['Tap "Keep editing"', 'The confirm closes and the edited bio is still in the form'],
          ['Close again and tap "Discard"', 'The dialog closes and nothing is saved'],
          ['Change a field and tap "Discard changes"', 'The form reverts and "Save" is disabled again'],
        ],
      },
      {
        name: 'Change username handle',
        description: 'The @handle is checked live and saved before the rest of the profile.',
        steps: [
          ['Open Edit profile and look at Username', 'It shows the current handle, "This is your username." and a "Your profile link" preview'],
          ['Type "AB"', 'The box lowercases input and shows "Use 3–30 lowercase letters, numbers and single hyphens." with Save disabled'],
          ['Type a handle another member holds', '"Checking availability…" then "That username is already taken." and Save disabled'],
          ['Type a reserved word handle', '"That username is reserved." shows'],
          ['Type a free handle', '"@{handle} is available." with a check icon; the link preview updates'],
          ['Tap "Save"', 'The profile saves and /u/{new handle} opens the profile; the old handle link no longer resolves'],
        ],
      },
      {
        name: 'Username taken between check and save',
        description: 'A race on setMyUsername leaves the rest of the profile untouched.',
        steps: [
          ['Type a free handle and also change Bio', 'Save is enabled'],
          ['Take the same handle from another account before tapping Save, then tap "Save"', 'The dialog stays open with "That username could not be saved — somebody may have just taken it. Try another one." and the bio is not saved'],
        ],
      },
      {
        name: 'Profile photo change, view and remove',
        description: 'The avatar edit menu with crop, viewer and remove confirm.',
        steps: [
          ['On /account tap the pencil on the avatar ("Edit photo")', 'A menu shows "View photo", "Change photo" and "Remove photo" (view/remove only when a photo exists)'],
          ['Tap "Change photo" and pick an image', 'The "Adjust photo" dialog shows a round crop with Zoom and Rotation, "Discard" and "Save"'],
          ['Tap "Save"', 'The button reads "Saving…", the image uploads and the avatar updates on /account, /menu and /profile'],
          ['Tap the avatar with no story posted', 'The photo opens full size with a "Close photo" button'],
          ['Choose "Remove photo" and confirm "Remove photo?" with "Remove"', 'The avatar falls back to the initial letter and profile_photo is cleared'],
          ['Tap "Discard" in the crop dialog', 'The photo is unchanged'],
        ],
      },
      {
        name: 'Private account toggle',
        description: 'Switch profile visibility on /account.',
        steps: [
          ['On /account find "Private account"', 'It says "When private, only followers can see your posts and status." with a switch'],
          ['Turn the switch on', 'A spinner shows then the switch stays on; profile_visibility is PRIVATE'],
          ['Turn it off', 'profile_visibility is PUBLIC'],
        ],
      },
      {
        name: 'Profile description and links',
        description: 'The "Your Profile" accordion on /profile edits bio and up to five links.',
        steps: [
          ['Open /profile and expand "Your Profile"', '"Description and links" shows the bio (or "Add a short description so members know more about you.") and an "Edit" button'],
          ['Tap "Edit", enter a description, add a link with Label and URL and tap "Save"', 'The section shows the new description and the link opens in a new tab'],
          ['Add a link with only a label and save', '"URL is required" shows on that row'],
          ['Enter "not a url" as URL', '"Enter a valid URL" shows'],
          ['Add links until five exist', '"Add link" becomes disabled'],
        ],
      },
      {
        name: 'Pet profile',
        description: 'The "Pet Profile" accordion on /profile.',
        steps: [
          ['Expand "Pet Profile" and start editing', 'The form shows Pet name, Species, Age (yrs), Breed (or type your own), About your pet, a photo field, Cancel and Save'],
          ['Save with an empty Pet name', '"Name is required" shows'],
          ['Enter age 41', '"Age cannot exceed 40" shows'],
          ['Fill valid values and tap "Save"', '"Pet profile saved" shows and the summary displays the pet'],
        ],
      },
      {
        name: 'Verify email from the profile',
        description: 'An unverified email can be verified with a code on /profile.',
        steps: [
          ['Open /profile?verifyEmail with an unverified email', 'The page scrolls to "Verify email", sends a code automatically and shows "OTP sent to {email}"'],
          ['Enter a wrong code and tap "Verify"', 'An error "Invalid OTP" shows'],
          ['Tap "Resend OTP", enter the test code shown by the stubbed OTP and tap "Verify"', '"Email verified." shows, the section disappears and a verified tick shows by the name'],
          ['Submit an empty code', '"OTP is required" shows'],
        ],
      },
      {
        name: 'Share profile and copy link',
        description: 'Sharing the @handle profile link.',
        steps: [
          ['On /account tap "Share"', 'The share sheet (or clipboard fallback) offers the /u/{handle} link'],
          ['On /profile tap "Copy profile link"', 'A toast "Profile link copied" shows and the clipboard holds the link'],
        ],
      },
      {
        name: 'Account health',
        description: 'The health summary on /account opens /account/health.',
        steps: [
          ['On /account tap the Account Health card', 'The app opens /account/health (native: AccountHealth screen) titled "Account Health" with a score meter, band and breakdown'],
          ['Tap back', 'The app returns to /account'],
        ],
      },
    ],
  },
  {
    name: 'App: Language and Theme',
    description:
      'Per-user language (profile.locale) from Manage Account and the light/dark theme on auth screens and the menu, on mWeb and native.',
    sub_flows: [
      {
        name: 'Switch app language',
        description: 'The Preferences card saves profile.locale and re-renders the UI.',
        steps: [
          ['With the language_preference flag on and 2+ locales, open /account', 'A "Preferences" card shows a "Language" select with the current locale'],
          ['Pick another locale', 'The UI text changes immediately, a spinner shows, then a snackbar "Language updated"'],
          ['Open the native app on the same account', 'The native app renders in the chosen language'],
          ['Force setMyLocale to fail and pick a locale', 'The UI still switches and an error alert shows "Could not save your language" or the server message'],
        ],
      },
      {
        name: 'Language section hidden',
        description: 'The picker only exists when it can do something.',
        steps: [
          ['Turn the language_preference flag off and open /account', 'No Preferences card is rendered'],
          ['Turn the flag on with only one active locale', 'No Preferences card is rendered'],
        ],
      },
      {
        name: 'Dark mode from the menu',
        description: 'The theme switch in the menu settings group.',
        steps: [
          ['Open /menu', 'The settings group shows a "Dark mode" row with a switch'],
          ['Turn the switch on', 'The app switches to the dark palette and the icon changes to a moon'],
          ['Reload the page (native: relaunch)', 'Dark mode is kept'],
        ],
      },
      {
        name: 'Light and Dark on auth screens',
        description: 'Signed-out screens carry a two-segment theme toggle.',
        steps: [
          ['Open /login', 'A pill with "Light" and "Dark" segments shows at the foot of the screen'],
          ['Tap "Dark"', 'The auth screen switches to dark; "Dark" is the active segment'],
          ['Open /register', 'The dark choice is kept'],
        ],
      },
    ],
  },
  {
    name: 'App: Contact Details Change',
    description:
      'Changing the account email, phone number and WhatsApp number from Edit profile > Contact details on mWeb and native. Email and WhatsApp need a code sent to the new value; the phone number saves directly.',
    sub_flows: [
      {
        name: 'Change email address with a code',
        description: 'requestEmailChangeOtp then confirmEmailChange.',
        steps: [
          ['Open Edit profile and look at "Contact details"', 'Three read-only rows "Email", "Phone number", "WhatsApp number" each with a "Change" or "Add" button'],
          ['Tap "Change" on Email', 'A dialog "Change email address" says "We will email a 6-digit code to the new address to confirm it is yours." with "New email address", "Send code" and the note about why a code is needed'],
          ['Enter an unused address and tap "Send code"', '"We sent a code to {email}." with a 6-digit code box, "Change this" and "Verify and save"'],
          ['Enter the test code shown by the stubbed OTP and tap "Verify and save"', 'The dialog closes, the Email row shows the new address and the account refreshes without pressing Save'],
        ],
      },
      {
        name: 'Change email negative paths',
        description: 'Validation and server refusals for email change.',
        steps: [
          ['Enter "riya@" in New email address', '"Enter a valid email address" shows and "Send code" is disabled'],
          ['Enter the current email and tap "Send code"', '"That is what your account already has." shows'],
          ['Enter an email used by another account', '"That email address is already in use" shows'],
          ['On the code step enter a wrong code', '"Invalid OTP" shows'],
          ['Request two codes within the cooldown', '"Wait {n}s before asking for another code" shows'],
          ['Tap "Change this" on the code step', 'The address box returns with the typed value kept and the earlier code forgotten'],
        ],
      },
      {
        name: 'Change phone number without a code',
        description: 'setContactPhoneNumber stores the contact number straight away.',
        steps: [
          ['Tap "Change" on Phone number', '"Change phone number" says "This is the number Duncit will reach you on. It is saved as soon as you enter it." with Code, New phone number and "Save number"'],
          ['Enter an unused number and tap "Save number"', 'The button reads "Saving…", the dialog closes and the row shows the new number'],
          ['Enter "12ab"', '"Enter a valid phone number" shows and "Save number" is disabled'],
        ],
      },
      {
        name: 'Number already on another account',
        description: 'Live availability check for phone and WhatsApp change.',
        steps: [
          ['In the phone or WhatsApp dialog type a number another account holds', '"Checking availability…" then "This number already exists on another account. Use a different number." and the action button is disabled'],
          ['Force the request past the client for a taken WhatsApp number', 'The server refuses with "That WhatsApp number is already linked to another account"'],
        ],
      },
      {
        name: 'Change WhatsApp number with a code',
        description: 'requestContactPhoneChangeOtp then confirmContactPhoneChange for WHATSAPP.',
        steps: [
          ['Tap "Change" on WhatsApp number', '"Change WhatsApp number" says "We will send a 6-digit code on WhatsApp to confirm the new number is yours."'],
          ['Enter an unused number and tap "Send code"', 'The code step names the number; a "Test code: …" alert shows while delivery is stubbed'],
          ['Enter a wrong code', 'An error like "Incorrect code — 4 attempts left" shows'],
          ['Enter the test code shown by the stubbed OTP and tap "Verify and save"', 'The dialog closes and the WhatsApp row shows the new number'],
        ],
      },
      {
        name: 'Missing contact blocks profile save',
        description: 'All three contact details are required.',
        steps: [
          ['Open Edit profile on an account with no phone number', 'The Phone number row shows "No phone number yet" in red and "Your email address, phone number and WhatsApp number are all required." shows under the rows'],
          ['Change Bio', '"Save" stays disabled'],
          ['Add a phone number through "Add"', 'The warning disappears and "Save" becomes enabled for the bio change'],
          ['Send updateMyProfile with a different phone number directly', 'The server refuses with "Change your phone number from Contact details."'],
        ],
      },
    ],
  },
  {
    name: 'App: Communication Preferences',
    description:
      'The Communication Preferences hub (/account/communication) and its Email (/account/mail-preference), WhatsApp (/account/whatsapp-preference) and SMS (/account/sms-preference) screens on mWeb and native, plus the email unsubscribe link on mWeb.',
    sub_flows: [
      {
        name: 'Open the Communication Preferences hub',
        description: 'The single entry row in Manage Account leads to the channel list.',
        steps: [
          ['On /account tap "Communication Preferences" ("Email, WhatsApp and SMS")', 'The app opens /account/communication titled "Communication Preferences"'],
          ['Look at the list while loading', 'Three skeleton rows show, then Email, WhatsApp and SMS rows each summarising "{destination} · Authentication messages on/off"'],
          ['Look at a channel with no destination', 'The row reads e.g. "Add a WhatsApp number to get messages here."'],
          ['Tap the Email row', 'The app opens /account/mail-preference'],
        ],
      },
      {
        name: 'Email category preferences',
        description: 'Switch optional email categories; required ones are locked.',
        steps: [
          ['Open /account/mail-preference', '"Mail Preference" says "These are the emails we send to {email}." with an Authentication messages card, "You can switch these off" (Marketing, Activity, From our team, Support) and "Always sent" (Confirmations, Security codes, Payments, Legal notices)'],
          ['Look at an "Always sent" row', 'It has an "Always on" chip and a disabled switch'],
          ['Turn Marketing off', 'A spinner shows then a snackbar "Preferences updated We have emailed you a confirmation."; marketing campaigns stop being sent to this address'],
          ['Turn Marketing back on', 'A snackbar "Preferences updated" shows with no confirmation email'],
        ],
      },
      {
        name: 'Unsubscribe from all optional email',
        description: 'Bulk opt-out and opt-back-in while signed in.',
        steps: [
          ['On /account/mail-preference tap "Unsubscribe from everything optional"', 'A confirm "Stop all optional email?" explains campaigns, booking updates and support replies stop while security codes, receipts and legal notices keep coming'],
          ['Confirm', 'Every optional switch turns off and the button becomes "Turn everything back on"'],
          ['Tap "Turn everything back on"', 'Every optional switch turns on without a confirm'],
        ],
      },
      {
        name: 'Authentication messages switch',
        description: 'Per-channel control over where sign-in and attendance codes may be sent.',
        steps: [
          ['On a channel screen find the "Authentication messages" card', 'It says "The messages that prove it is you — signing in, and marking attendance at a pod." and "Sent to {destination}."'],
          ['Turn it off on Email while WhatsApp is reachable and on', 'A snackbar "Preferences updated" shows; the hub summary for Email reads "Authentication messages off"'],
          ['Try to turn it off on the only channel still on', 'The switch is disabled and the note reads "This is the only channel that can reach you, so authentication messages stay on here."'],
          ['Request a sign-in code by email with Email authentication off', 'The OTP screen says the code could not be sent that way'],
        ],
      },
      {
        name: 'WhatsApp message preferences',
        description: 'Optional and required WhatsApp categories, and the no-number state.',
        steps: [
          ['Open /account/whatsapp-preference with a WhatsApp number', '"WhatsApp Preference" names the number and lists optional Activity, Reminders, Feedback, Offers, Support and always-sent Confirmations, Payments and refunds, Your account'],
          ['Tap "Turn off everything optional" and confirm "Stop all optional WhatsApp?"', 'All optional switches turn off and a snackbar "Preferences updated" shows'],
          ['Open the page on an account with no sendable WhatsApp number', 'A card "No WhatsApp number yet" explains nothing is being sent, with "Add a WhatsApp number" linking to /account; the bulk button is disabled'],
          ['Make a save fail', '"Could not save that. Please try again." shows'],
        ],
      },
      {
        name: 'SMS preference',
        description: 'SMS carries authentication messages only.',
        steps: [
          ['Open /account/sms-preference with a phone number', '"SMS Preference" says "These are the texts we send to {number}." with the Authentication messages card and the note that authentication messages are the only texts Duncit sends today'],
          ['Open it on an account with no phone number', 'The subtitle reads "Add a phone number to your account to receive texts." and the card shows no switch'],
        ],
      },
      {
        name: 'Unsubscribe link from an email (mWeb)',
        description: '/unsubscribe is not auth-gated; the signed link identifies the address.',
        steps: [
          ['While signed out open the unsubscribe link from a marketing email footer', 'The "Unsubscribe" page shows the address, the optional and always-sent sections and no Authentication messages card'],
          ['Turn one optional category off', 'A snackbar confirms and a confirmation email is sent'],
          ['Tap "Unsubscribe from everything optional" and confirm', 'All optional categories turn off; no "Turn everything back on" button is offered from the link'],
          ['Open /unsubscribe with a tampered or missing signature', '"This unsubscribe link is no longer valid. Sign in and open Mail Preference from your profile instead." with "Sign in to manage preferences"'],
        ],
      },
    ],
  },
  {
    name: 'App: Address Book',
    description:
      'Saved delivery addresses on /address-book (mWeb) and the native AddressBook screen, reached from the menu Shop section.',
    sub_flows: [
      {
        name: 'Add an address',
        description: 'Create the first saved address.',
        steps: [
          ['With products visible open /menu and tap "Address Book"', 'The app opens /address-book with "Address Book", an "Add address" button and "Save delivery addresses here to pick them quickly at checkout."'],
          ['Tap "Add address"', 'The "Add address" dialog shows Label (prefilled "Home"), Receiver name, Phone, Address line 1, Address line 2, Landmark, City, State, Pincode, Country, "Use as my default address", Cancel and "Save address"'],
          ['Fill required fields, tick default and tap "Save address"', 'The dialog closes and the list shows the label with a "Default" chip and a one-line address'],
        ],
      },
      {
        name: 'Address validation',
        description: 'Shared address schema messages.',
        steps: [
          ['Clear Label and tap "Save address"', '"Give this address a label" shows'],
          ['Leave Address line 1, City and State empty', '"Address line 1 is required", "City is required" and "State is required" show'],
          ['Enter Pincode "12"', '"Enter a valid pincode" shows'],
          ['Enter Receiver name "R2D2" and Phone "abc"', '"Name can use letters, spaces, apostrophes and periods only" and "Enter a valid phone number" show'],
        ],
      },
      {
        name: 'Edit and delete addresses',
        description: 'Row actions on saved addresses.',
        steps: [
          ['Tap the edit icon on an address', 'The "Edit address" dialog opens prefilled'],
          ['Change City and tap "Save address"', 'The row shows the new city'],
          ['Tap the delete icon on the default address while another exists', 'The row disappears immediately and the most recently used remaining address becomes default'],
          ['Delete the last address', 'The empty message returns'],
        ],
      },
      {
        name: 'Use a saved address at checkout',
        description: 'Saved addresses appear in the checkout picker with the default marked.',
        steps: [
          ['Open /product-checkout and open "Deliver to a saved address"', 'Saved addresses are listed and the default one is marked "(default)"'],
          ['Pick an address', 'The billing fields fill from it and the delivery quote uses its pincode'],
          ['Complete payment', 'The shipment is addressed to the picked address\'s receiver name and phone'],
        ],
      },
    ],
  },
  {
    name: 'App: Account Deletion',
    description:
      'Requesting account deletion from Manage Account on mWeb and native: warning, emailed code, request filed with an admin-configured window (default 30 days), immediate sign-out everywhere, and what the account can do afterwards.',
    sub_flows: [
      {
        name: 'Request account deletion',
        description: 'The happy path through the danger corner of /account.',
        steps: [
          ['On /account scroll to the Password card and tap "Request account deletion"', 'A confirm "Request account deletion?" says the account will be deleted {days} days from now, a 6-digit code will be emailed, and entering it signs out every device, with "Send code"'],
          ['Tap "Send code"', 'The confirm closes and "Request account deletion" opens with "Code sent to your email.", "Enter the code to send your deletion request.", 6-digit code, "Why are you leaving?" and "Send deletion request"'],
          ['Enter the test code shown by the stubbed OTP, type a reason and tap "Send deletion request"', 'The button reads "Sending…" then "Deletion request received" shows "Your account and everything on it will be deleted on {date}.", the sign-out explanation, "Reference {code}" and "Sign out"'],
          ['Tap "Sign out"', 'The app shows the login screen; the server holds a PENDING request with scheduled_delete_at = now + retention days and surface MWEB (native: its surface)'],
        ],
      },
      {
        name: 'Deletion code validation and resend',
        description: 'Negative paths inside the code dialog.',
        steps: [
          ['Tap "Send deletion request" with an empty code', '"Enter the 6 digit code" shows'],
          ['Type a reason longer than 1000 characters', '"Please keep this under 1000 characters" shows'],
          ['Enter a wrong code', 'The error "Invalid OTP" shows and nothing is filed'],
          ['Tap "Resend code" under "Didn’t get it?"', 'The link reads "Resending…" and the info alert shows "Code sent to your email." again'],
          ['Submit an expired code', '"OTP expired. Request a new OTP." shows'],
          ['Close the dialog without submitting', 'No request exists and the account keeps working'],
        ],
      },
      {
        name: 'Deletion needs an email address',
        description: 'The code can only be sent to an email.',
        steps: [
          ['On an account without an email tap "Request account deletion" and then "Send code"', 'The error "Add an email address before deleting your account" shows'],
        ],
      },
      {
        name: 'After filing - every door refuses the account',
        description: 'A sealed account cannot sign in again; reversing it needs support.',
        steps: [
          ['Sign in with the email and correct password', '"Invalid email or password" shows'],
          ['Continue with OTP using the account email', '"We couldn’t find an account with these details." shows'],
          ['Use Google with the account email', 'The "No Duncit account yet" invite shows, never the link consent'],
          ['Try Forgot password with the account email', 'The not-found message shows'],
          ['Have Tech withdraw or reject the request in the portal, then sign in', 'Sign-in works again'],
          ['Let the scheduled date pass and run the deletion sweep', 'The account and its data are purged and the request is marked carried out'],
        ],
      },
      {
        name: 'Pending request banner and notice for a live session',
        description: 'Legacy case: a PENDING request filed before sealing, with a session still open.',
        steps: [
          ['Open /account on a session that still has a pending request', 'The deletion button is replaced by "Deletion requested", "Our team is reviewing your request…", "Your account will be deleted on {date}", "Reference {code} · Requested on {date}" and "Withdraw request"'],
          ['Reload Home in a new browser session', 'A dialog "Your account is scheduled for deletion" shows the date, "{count} days left to change your mind.", "Keep the request" and "Withdraw request"'],
          ['Tap "Keep the request"', 'The dialog closes and does not reappear in this browser session'],
          ['Tap "Withdraw request" on /account', 'A toast "Deletion request withdrawn." shows and the "Request account deletion" button returns'],
        ],
      },
    ],
  },
  {
    name: 'App: Policies and Legal',
    description:
      'Reading Legal policies inside the app on mWeb (/policies/:slug from the menu) and native (Policies list and Policy screen), plus Terms and Privacy links on auth screens. Signup acceptance is covered in App: Sign Up.',
    sub_flows: [
      {
        name: 'Read a policy from the menu',
        description: 'The collapsible Policies row in /menu.',
        steps: [
          ['Open /menu and tap "Policies"', 'The row expands into one inset row per active public policy title'],
          ['Tap a policy', 'The app opens /policies/{slug} with the policy title, a "Download PDF" button, the rich-text body and "Last updated {date}"'],
          ['Tap "Policies" again in /menu', 'The list collapses'],
        ],
      },
      {
        name: 'Native Policies list',
        description: 'Native has a /policies list screen; mWeb has no list route.',
        steps: [
          ['On native open Policies from the sidebar', 'The "Policies" screen lists each policy with an icon and chevron, or "No policies available."'],
          ['Tap a policy', 'The Policy screen renders the policy by slug'],
          ['On mWeb open /policies', 'The Not Found page shows (no list route)'],
        ],
      },
      {
        name: 'Policy page states',
        description: 'Hidden, unknown and failing policies.',
        steps: [
          ['Open /policies/{slug} for a policy set inactive in Legal', 'mWeb shows "This policy is currently hidden." (native currently renders the inactive text)'],
          ['Open /policies/does-not-exist', '"No policy found for slug does-not-exist." shows'],
          ['Make policyBySlug fail', '"Could not load policy: {message}" shows'],
          ['Open /policies/{old slug} after Legal renamed the policy', 'The renamed policy still loads'],
        ],
      },
      {
        name: 'Download a policy as PDF',
        description: 'The PDF button on the policy page.',
        steps: [
          ['On /policies/{slug} tap "Download PDF"', 'A PDF of the policy downloads'],
          ['Make PDF generation fail', '"Could not prepare the PDF. Please try again." shows'],
        ],
      },
      {
        name: 'Terms and Privacy links on auth screens',
        description: 'Branding terms_url and privacy_url links under sign-in and signup.',
        steps: [
          ['Open /login', 'The footer reads "By signing in, you agree to our Terms & Conditions and Privacy Policy."'],
          ['Open /register', 'The footer starts "By signing up,"'],
          ['Tap "Terms & Conditions"', 'The Branding terms URL opens in a new tab'],
        ],
      },
    ],
  },
  {
    name: 'App: Help Center and FAQs',
    description:
      'The Support hub (/support) and FAQs page (/faqs) on mWeb and native: FAQ search, top questions, topics and the ways to reach support.',
    sub_flows: [
      {
        name: 'Open the Support hub',
        description: 'The landing page of in-app help.',
        steps: [
          ['Open /menu and tap "Help & Support"', 'The app opens /support titled "Support" with "Have a burning question?" and a search box "Search for topics or questions…"'],
          ['Wait for FAQs to load', '"Frequently Asked" shows up to 6 question cards, "Topics" lists FAQ categories with article counts, then "Start a conversation"'],
          ['Look at "More ways to reach us"', 'Tiles for SOS, Callback Request, Create Support Tickets, All Support Tickets, Raise a grievance and Report a Problem'],
          ['Tap back', 'The app returns to Home'],
        ],
      },
      {
        name: 'Search FAQs from the hub',
        description: 'Debounced server-side FAQ search.',
        steps: [
          ['Type "refund" in the hub search', 'After a short pause matching questions list below the box; Frequently Asked and Topics hide'],
          ['Type a term with no matches', '"No FAQs match “{term}”. Try starting a conversation below." shows'],
          ['Tap the clear button', 'Frequently Asked and Topics return'],
        ],
      },
      {
        name: 'Open an FAQ answer',
        description: 'The FAQ modal with the still-need-help action.',
        steps: [
          ['Tap a Frequently Asked card', 'A modal shows the question, the answer, "Still need help?" and "Start a conversation"'],
          ['Tap "Start a conversation"', 'The modal closes and /live-chat opens'],
          ['Tap a Topics row', 'The app opens /faqs?cat={category id} filtered to that topic'],
        ],
      },
      {
        name: 'FAQs page filters and feedback',
        description: 'Search, category chips and Helpful / Not really on /faqs.',
        steps: [
          ['Open /faqs', 'A search box "Search questions, e.g. refund, host", chips "All" plus each category and accordions of questions'],
          ['Tap a category chip and search for a word in an answer', 'Only matching questions in that category show; with none "No FAQs match your search."'],
          ['Expand a question and tap "Helpful"', 'The chip turns primary with a thumbs-up "You found this helpful"'],
          ['Tap "Not really"', 'A dialog "Still need help?" offers "Chat with Us", which opens /live-chat'],
        ],
      },
    ],
  },
  {
    name: 'App: Support Tickets',
    description:
      'Raising and following support tickets on mWeb (/support/tickets, /tickets/:id, /support/all) and native (SupportTickets, TicketDetails, AllSupportTickets), including pod help entry points.',
    sub_flows: [
      {
        name: 'Create a support ticket',
        description: 'The Create Support Tickets form.',
        steps: [
          ['On /support tap "Create Support Tickets"', 'The page shows "Help squad is ready" (Live), "Maybe answered already?" linking to /faqs, the ticket form and "Your tickets"'],
          ['Look at the form', 'Name and Email are read-only "From your Duncit account"; Category defaults to "Question / How do I…"; Subject, "Tell us what\'s going on", "Add files" and "Send to support"'],
          ['Pick "Payment / Refund", enter a subject and a 10+ character message, tap "Send to support"', 'The button reads "Sending…" and the app opens /tickets/{id} with the new ticket'],
          ['Open /support/tickets again', 'The new ticket is listed under "Your tickets" with an ST- number, category and "Open"'],
        ],
      },
      {
        name: 'Ticket form validation',
        description: 'Zod rules on the ticket form.',
        steps: [
          ['Submit with Subject empty', '"Subject is required" shows'],
          ['Enter a 2-character subject', '"At least 3 characters" shows; over 120 shows "Max 120 characters"'],
          ['Enter a 5-character message', '"Please describe in at least 10 characters" shows; over 2000 shows "Max 2000 characters"'],
          ['Attach 5 files', '"Add files" becomes disabled'],
        ],
      },
      {
        name: 'Contact support about a pod',
        description: 'Pod help entry points prefill the ticket with the pod.',
        steps: [
          ['On a pod details page tap "Contact support about this pod"', 'The app opens /support/tickets with an "About pod: {title}" chip and Subject "Support - {title}"'],
          ['Open Pod History details and tap its support action', 'The ticket form opens with the pod chip, Subject and a prefilled message naming the pod, membership and refund status'],
          ['Pick a Category from the list, then tap "Send to support"', 'The ticket is created with pod_id and pod_title attached and opens /tickets/{id}'],
        ],
      },
      {
        name: 'Filter your tickets',
        description: 'Status tabs in "Your tickets".',
        steps: [
          ['On /support/tickets look at the tabs', '"All (n)", "Open (n)", "Pending (n)", "Resolved (n)", "Closed (n)" with counts'],
          ['Tap "Resolved"', 'The URL gains ?selectedtab=RESOLVED and only resolved tickets show, or "No resolved tickets."'],
          ['Reload the page', 'The Resolved tab is still selected'],
          ['On an account with no tickets', '"You haven\'t raised any tickets yet." shows under All'],
        ],
      },
      {
        name: 'Reply on a ticket',
        description: 'The ticket thread and composer.',
        steps: [
          ['Open /tickets/{id} for an open ticket', 'The header shows the subject, a status chip and a menu; the thread and a composer "Write a reply…" with attachments and a send button'],
          ['Type a reply and tap send', 'The reply appears at the bottom with a Sent tick, turning to Seen when support reads it'],
          ['Attach an image without text and send', 'The message is sent with the attachment'],
          ['Open /tickets/{id} of another user', 'The ticket is not shown ("This ticket could not be found.")'],
        ],
      },
      {
        name: 'Mark a ticket resolved and rate it',
        description: 'Resolve from the header menu and give 1-5 feedback.',
        steps: [
          ['Open the ticket menu and choose "Mark as resolved"', 'A confirm "Mark as resolved?" asks "Are you sure your issue has been resolved?" with "Yes, mark as resolved" and "No, continue conversation"'],
          ['Tap "Yes, mark as resolved"', 'The composer is replaced by "This conversation has been marked as resolved." and "How did we do?" opens'],
          ['Tap "Submit" before choosing', '"Submit" is disabled until an emoji is picked'],
          ['Pick "Satisfied", add a comment and tap "Submit"', 'The dialog shows "Your rating: 🙂 Satisfied" with the thank-you text'],
          ['Reopen the ticket later', 'The feedback dialog shows the read-only rating; a second rating is refused'],
        ],
      },
      {
        name: 'Reopen a resolved ticket',
        description: 'The 3-calendar-day reopen window.',
        steps: [
          ['Open a ticket resolved today', 'A notice says "This ticket is resolved. Re-open it to continue." and "You can reopen this until {date time}" with "Re-open"'],
          ['Tap "Re-open", optionally add a reason and submit', 'The ticket status returns to open and the composer is enabled'],
          ['Open a ticket resolved more than 3 calendar days ago', '"The reopen window has passed — raise a new ticket if you still need help." and "Re-open" is disabled'],
        ],
      },
      {
        name: 'Download or email a ticket transcript',
        description: 'Transcript actions in the ticket menu.',
        steps: [
          ['Choose "Download .txt" from the ticket menu', 'A .txt transcript downloads'],
          ['Choose "Download .docx"', 'A .docx transcript downloads'],
          ['Choose "Email transcript", enter an address and tap "Send"', '"Transcript sent to {email}." shows with "Done"'],
          ['Send to an invalid address', '"A valid email is required" shows'],
        ],
      },
      {
        name: 'All support tickets list',
        description: 'One list across tickets, SOS, callbacks and chat.',
        steps: [
          ['On /support tap "All Support Tickets"', 'Each request shows its prefixed number, a source chip (Support Ticket, SOS, Callback Request, Chat with Us), title, relative time and status'],
          ['Tap a Support Ticket row', 'The app opens /tickets/{id}'],
          ['Tap a Chat with Us row', 'The app opens /live-chat'],
          ['Tap an SOS row', 'The row is not actionable'],
          ['Open it on an account with no requests', '"You have not raised any support requests yet." shows'],
        ],
      },
    ],
  },
  {
    name: 'App: Live Support Chat',
    description:
      'Real-time chat with the Duncit assistant and support agents on mWeb (/live-chat; /support/live and /support/chat route here) and native (LiveChat screen).',
    sub_flows: [
      {
        name: 'Start a support chat',
        description: 'The first message creates the chat session.',
        steps: [
          ['On /support tap "Start a conversation" (or Chat with Us > "Chat live with an agent")', '/live-chat opens with header "Chat with Us" and a composer "Type a message…"'],
          ['Send a first message', 'The message shows immediately, a session starts with a ticket number under the header and "Duncit Assistant is typing…" appears until a reply arrives'],
          ['Wait for an agent to reply from the Support portal', 'The reply appears live and "Support is typing…" shows while they type'],
          ['Open /support/chat on mWeb', 'The app redirects to /support/live'],
        ],
      },
      {
        name: 'Failed chat message retry',
        description: 'Optimistic messages that fail can be re-sent.',
        steps: [
          ['Go offline and send a message', 'The message shows a failed icon with "Retry"'],
          ['Go back online and tap "Retry"', 'The message sends and gets a Sent tick'],
        ],
      },
      {
        name: 'Resolve and rate a chat',
        description: 'Mark resolved from the chat menu.',
        steps: [
          ['Open the chat menu and choose "Mark resolved"', 'The "Mark as resolved?" confirm opens'],
          ['Confirm', 'The status chip shows "Resolved", the composer is replaced by "This conversation has been marked as resolved." with the reopen deadline, and "How did we do?" opens'],
          ['Tap "Skip"', 'The dialog closes without a rating'],
        ],
      },
      {
        name: 'Reopen a resolved chat',
        description: 'Reopen within the 3-day window.',
        steps: [
          ['On a resolved chat open the menu and choose "Re-open chat"', '"Re-open this conversation" asks for an optional reason'],
          ['Submit', 'The status returns to "Open" and the composer is back'],
          ['Try on a chat resolved over 3 calendar days ago', '"Re-open chat" is disabled and the notice says "The reopen window has passed — start a new chat if you still need help."'],
        ],
      },
      {
        name: 'Chat transcript download and email',
        description: 'Transcript actions in the chat menu.',
        steps: [
          ['Before any message check the menu button', 'The menu button is disabled until the chat has a ticket number'],
          ['Choose "Download .txt" and "Download .docx"', 'Both transcript files download'],
          ['Choose "Email transcript" and send to an address', '"Email this chat" confirms "Transcript sent to {email}."'],
        ],
      },
    ],
  },
  {
    name: 'App: SOS and Callback',
    description:
      'Emergency SOS for a joined pod (/support/sos) and phone support with callback requests (/support/callback) on mWeb and native.',
    sub_flows: [
      {
        name: 'Send an SOS for a pod',
        description: 'Raise an SOS with location for the selected pod.',
        steps: [
          ['On /support tap "SOS"', 'The SOS page shows a Pod picker (live and upcoming pods first), a warning "Only tap SOS in a real emergency", "Quick note (optional)" and a red "SEND SOS"'],
          ['Pick a pod, type a note and tap "SEND SOS"', 'The browser asks for location; the button reads "Sending SOS…"'],
          ['Allow or deny location', 'The SOS is raised either way and the page shows "SOS sent. Help is on the way." with "Awaiting response"'],
          ['Acknowledge the SOS from the host or admin console', 'The chip changes to "Acknowledged by team"'],
          ['Check the host', 'The pod host receives an SOS push naming the member and pod'],
        ],
      },
      {
        name: 'SOS with no joined pods',
        description: 'SOS is pod-scoped.',
        steps: [
          ['Open /support/sos on an account with no pod memberships', '"You haven’t joined any pods yet. Join a pod to use live support." and "SEND SOS" is disabled'],
        ],
      },
      {
        name: 'Call support or request a callback',
        description: 'Branding support phone and callback requests.',
        steps: [
          ['On /support tap "Callback Request"', '"Call support now" says "Dial {phone}. We will answer in seconds." with "Call Now", and "Request a callback" with an optional reason and "Request callback"'],
          ['Tap "Call Now"', 'The device dialer opens with the support number'],
          ['Clear the support phone in Branding and reload', '"Support phone is not configured yet — please request a callback below." and "Call Now" is disabled'],
          ['Type a genuine reason and tap "Request callback"', '"Callback requested. We will reach you shortly." shows and "Previous callbacks" lists it as PENDING'],
        ],
      },
      {
        name: 'Callback request refused',
        description: 'Server checks on callback requests.',
        steps: [
          ['Request a callback on an account without a phone number', 'An error "No phone number on profile" shows'],
          ['Type gibberish as the reason and request', 'AI Monitoring refuses with "Please enter a valid reason for your callback request."'],
          ['Mark a callback contacted with duration and conclusion in the Support portal', 'The history row shows "Called {time} · {duration} · {conclusion}"'],
        ],
      },
    ],
  },
  {
    name: 'App: Report a Problem and Grievance',
    description:
      'Report a Problem (/support/feedback, sent to Slack) and Raise a grievance (/support/grievance) with the support-first escalation rule, on mWeb and native.',
    sub_flows: [
      {
        name: 'Report a problem',
        description: 'Admin-configured feedback form.',
        steps: [
          ['On /support tap "Report a Problem"', 'The page shows Category chips from the report problem config, a message box with its label and hint, "Screenshots (optional)" and "Send feedback"'],
          ['Pick a category, describe the problem, add a screenshot and tap "Send feedback"', 'The button reads "Sending…" then "Thanks! Your feedback has been sent to our team." shows'],
          ['Check the feedback Slack channel', 'A message arrives with the member identity, category, text, media, device and source screen'],
        ],
      },
      {
        name: 'Report a problem validation',
        description: 'The minimum length is configuration.',
        steps: [
          ['Submit a message shorter than the configured minimum', '"Please describe it in at least {n} characters" shows'],
          ['Enter more than 2000 characters', '"Please keep it under 2000 characters" shows'],
          ['Disable media in the config and reload', 'The screenshots field is not shown'],
          ['Make the config query fail', 'The form still works with the default categories and a 10 character minimum'],
        ],
      },
      {
        name: 'Raise a grievance',
        description: 'Escalate an existing support ticket to the Grievance Officer.',
        steps: [
          ['On /support tap "Raise a grievance"', '"Support first, grievance after" shows three steps and the warning that a grievance without a support ticket will be rejected, then the form and the Grievance Officer card'],
          ['Look at the form', 'Support ticket dropdown ("Pick the support ticket this grievance is about."), Full name, Email, Phone prefilled from the account, Address (Optional), Subject, "What happened?" and "Submit grievance"'],
          ['Pick a ticket, fill Subject and What happened, tap "Submit grievance"', '"Grievance received" says a copy was emailed and shows "Reference number: {GRV…}" with "Raise another"'],
          ['Tap "Raise another"', 'An empty form returns'],
        ],
      },
      {
        name: 'Grievance without a support ticket',
        description: 'Submitting is blocked until a ticket exists.',
        steps: [
          ['Open /support/grievance on an account with no support requests', 'The ticket field is replaced by "You have not raised a support ticket yet" with "Raise a support ticket", and "Submit grievance" is disabled'],
          ['Tap "Raise a support ticket"', 'The app opens /support/tickets'],
        ],
      },
      {
        name: 'Grievance validation and officer card',
        description: 'Shared grievance rules and the officer details.',
        steps: [
          ['Clear Full name and submit', '"Full name is required" shows'],
          ['Enter an invalid email and phone', '"Enter a valid email address" and "Enter a valid phone number" show'],
          ['Leave Support ticket unselected', '"Support ticket is required" shows'],
          ['Clear the Grievance Officer details in Legal settings', 'The card shows "Our Grievance Officer details will be published here shortly."'],
        ],
      },
    ],
  },
  {
    name: 'App: Report Content',
    description:
      'Reporting a club story to the Legal team from the story viewer on mWeb (club page) and native. Stories are the only reportable content in the app today.',
    sub_flows: [
      {
        name: 'Report a club story',
        description: 'Any signed-in viewer can report an open story.',
        steps: [
          ['Open a club page and open a story in the viewer', 'A story options menu is available on the open story'],
          ['Choose "Report story"', 'The "Report this story" dialog lists reasons (Spam or misleading, Nudity or sexual content, Harassment or bullying, …, Something else), a details box, "Cancel" and "Submit report"'],
          ['Tap "Submit report" with no reason', '"Pick a reason first" shows'],
          ['Pick "Something else" with empty details and submit', '"Tell us what is wrong with this content" shows'],
          ['Pick "Spam or misleading" and submit', 'A toast "Thanks — our Legal team will review this" shows and the report appears in Legal > Report By User as Received'],
          ['Report the same story again', 'The existing report is updated rather than a second one filed'],
        ],
      },
    ],
  },
  {
    name: 'App: Notification Permission',
    description:
      'Allowing push notifications. mWeb uses the "Allow notifications" switch in the notifications screen to request browser permission and save a web push subscription; native requests OS permission at sign-in and the same switch is an in-app preference.',
    sub_flows: [
      {
        name: 'Enable web push on mWeb',
        description: 'Browser permission and subscription from the notifications screen.',
        steps: [
          ['On mWeb in a push-capable browser open the notifications bell', 'The notifications screen shows an "Allow notifications" card with a switch that is off'],
          ['Turn the switch on', 'A confirm "Enable notifications?" says "Get pod, club, chat and account updates on this device." with "Enable"'],
          ['Tap "Enable" and allow the browser prompt', 'The switch turns on and a push subscription is saved on the server for this browser'],
          ['Trigger a notification for this account', 'A push arrives and an in-app toast shows its title and body'],
        ],
      },
      {
        name: 'Web push permission denied or unsupported',
        description: 'mWeb fallbacks when push cannot be enabled.',
        steps: [
          ['Turn the switch on, tap "Enable" and block the browser prompt', 'A toast "Notifications — Permission was not granted." shows and the switch stays off'],
          ['Open the notifications screen in a browser without Push API support', 'No "Allow notifications" card is rendered'],
        ],
      },
      {
        name: 'Disable web push on mWeb',
        description: 'Unsubscribe this browser.',
        steps: [
          ['With push enabled turn the switch off', 'A destructive confirm "Disable notifications?" says you won\'t receive push notifications until you turn them back on'],
          ['Tap "Disable"', 'The push subscription is deleted on the server and unsubscribed in the browser'],
        ],
      },
      {
        name: 'Native push registration and switch',
        description: 'OS permission and Expo token handled at session start.',
        steps: [
          ['Sign in on a fresh native install', 'The OS notification permission prompt appears'],
          ['Allow it', 'The Expo push token is saved to the server for this device'],
          ['Deny it', 'Sign-in still completes and no token is registered'],
          ['Open notifications and turn "Allow notifications" off, then confirm "Disable"', 'The in-app notification preference is stored as off on the device'],
          ['Log out', 'The device push token is removed from the server'],
        ],
      },
    ],
  },
];

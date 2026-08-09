import type { NestedCatalogue } from '../catalogue';

/** Copy shared by mWeb and the native app — one namespace, one source. */
export const MWEB_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageHint: 'Choose the language for the app.',
      languageSaved: 'Language updated',
    },
    account: {
      preferences: 'Preferences',
    },
    // The auth journey — login, signup, forgot password, reset password. mWeb
    // and the native app render the SAME screens (rule 27), so a key here is
    // used by BOTH surfaces unless its comment says which surface renders it.
    // `auth.*` holds the atoms more than one auth screen needs; the four screen
    // groups below hold what only that screen says.
    auth: {
      emailLabel: 'Email',
      emailPlaceholder: 'hello@duncit.com',
      passwordLabel: 'Password',
      passwordHint: 'At least 8 characters',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      dateOfBirth: 'Date of birth',
      or: 'OR',
      orEmail: 'OR EMAIL',
      backToLogin: 'Back to login',
      close: 'Close',
      appVersion: 'App version {version}',
      somethingWentWrong: 'Something went wrong',
      // Google sign-in. mWeb renders Google's OWN button, which Google labels
      // and localises itself — only the native button's label is ours.
      googleContinue: 'Continue with Google',
      googleFailed: 'Google sign-in failed.',
      googleNoIdToken: 'Google did not return an id token.',
      // The Terms & Privacy footer. The lead-in changes per screen and the two
      // links must stay tappable inside the sentence, so it is assembled from
      // parts rather than one template with markup in it.
      legalContinue: 'By continuing,',
      legalSignIn: 'By signing in,',
      legalSignUp: 'By signing up,',
      legalAgree: 'you agree to our',
      legalAnd: 'and',
      terms: 'Terms & Conditions',
      privacy: 'Privacy Policy',
      // mWeb only: the native auth screens follow the device theme, so there is
      // nothing for a light/dark toggle to sit on.
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
      toggleColorMode: 'Toggle color mode',
      // Zod messages. They are copy like any other — the person who reads them
      // is the person filling the form in.
      validation: {
        emailRequired: 'Email is required',
        emailInvalid: 'Enter a valid email',
        passwordMin: 'Min 8 characters',
        passwordTooLong: 'Password is too long',
        passwordsMismatch: 'Passwords do not match',
      },
    },
    login: {
      title: 'Welcome',
      titleAccent: 'back.',
      subtitle: 'Pick up where you left off and find pods around you.',
      avatarsCaption: 'New pods are waiting for your crew today',
      passwordPlaceholder: 'Enter password',
      submit: 'Log me in',
      // mWeb only — the native button swaps its label for a spinner.
      submitting: 'Signing in…',
      forgotPassword: 'Forgot password?',
      // Native only — mWeb's Google button is rendered by Google.
      googleSignIn: 'Sign in with Google',
      newHere: 'New here?',
      createOne: 'Create one',
      // mWeb only: the web Google flow can come back with an account state the
      // native flow never reaches, and says so in a dialog.
      googleNotFoundTitle: 'Google account not found',
      googleNotFoundBody: 'User is not in our system. Please sign up first.',
      googleNotFoundAction: 'Sign up',
      emailLoginTitle: 'Use email login',
      emailLoginBody: 'Please login with email. You registered with us using email and password.',
    },
    signup: {
      title: 'Join',
      titleAccent: 'Duncit.',
      subtitle: 'Create your account to discover pods nearby.',
      nameLabel: 'Name',
      namePlaceholder: 'Riya Sharma',
      emailPlaceholder: 'riya@duncit.com',
      passwordPlaceholder: 'Create a password',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Re-enter password',
      // mWeb only — MUI X's picker carries a helper line, the native field does not.
      dobHint: 'You must be at least {years} years old',
      // Native only — its date of birth is typed as well as picked.
      dobPlaceholder: 'YYYY-MM-DD',
      dobPick: 'Pick date of birth',
      submit: 'Create account',
      // mWeb only — the native button swaps its label for a spinner.
      submitting: 'Creating…',
      haveAccount: 'Already have an account?',
      logIn: 'Log in',
      // The two surfaces enforce slightly different name and date rules, so a
      // few of these are rendered by one surface only.
      validation: {
        nameRequired: 'Name is required',
        namePattern: 'Name can use letters, spaces, apostrophes, periods and hyphens only',
        nameMin: 'Name must be at least 2 characters',
        nameTooLong: 'Name is too long',
        confirmRequired: 'Please confirm your password',
        dobRequired: 'Date of birth is required',
        dobInvalid: 'Enter a valid date of birth',
        dobFormat: 'Use the format YYYY-MM-DD',
        dobMinAge: 'You must be at least {years} years old to join Duncit',
      },
    },
    forgotPassword: {
      title: 'Forgot',
      titleAccent: 'password?',
      subtitle: 'Enter your email and we’ll send you a 6-digit OTP to reset your password.',
      submit: 'Send reset OTP',
      submitting: 'Sending OTP…',
      unregistered: 'Unregistered User',
      newToDuncit: 'New to Duncit?',
      createAccount: 'Create Account',
      remembered: 'Remembered it?',
    },
    resetPassword: {
      title: 'Reset',
      titleAccent: 'password',
      subtitle: 'Enter the OTP sent to {email} and choose a new password.',
      // Stands in for the address when the reset step was reached without one.
      emailFallback: 'your email',
      otpLabel: '6-digit OTP',
      otpHint: '6-digit code',
      otpPlaceholder: '123456',
      newPasswordLabel: 'New password',
      newPasswordPlaceholder: 'Create a new password',
      confirmPasswordLabel: 'Confirm new password',
      confirmPasswordPlaceholder: 'Re-enter new password',
      submit: 'Reset password',
      submitting: 'Resetting…',
      didntGetIt: 'Didn’t get it?',
      resend: 'Resend OTP',
      // mWeb only — the native resend link has no in-flight label.
      resending: 'Resending…',
      successTitle: 'Password reset',
      successTitleAccent: 'successfully',
      successSubtitle:
        'Your password has been updated. You can now log in with your new password.',
      goToLogin: 'Go to login',
      validation: {
        otpInvalid: 'Enter the 6 digit OTP',
      },
    },
    home: {
      closeMenu: 'Close menu',
      seeAll: 'See all',
      morePods: '+{count} more',
      searchPods: 'Search pods…',
      noSearchResults: 'No pods match your search.',
      happeningNearbyTitle: 'Happening nearby',
      happeningNearbySubtitle: 'Curated events around you',
      happeningNearbyEmpty: 'No live pods around you right now.',
      previousPodsTitle: 'Previous Pods',
      previousPodsSubtitle: 'Pods that have already taken place',
      previousPodsEmpty: 'No previous pods to show yet.',
      // Home redesign (mock): greeting subtitle, labelled header actions,
      // super-category promo tiles, vibe heading fallbacks, host CTA, club rec.
      // Plurals ship as explicit One/Many pairs: the key-verification gate needs
      // every leaf rendered via a literal t('…'), which `.one/.other` siblings
      // resolved from a base key would fail.
      greetingSubtitle: 'Discover. Connect. Create memories.',
      actionSearch: 'Search',
      actionCart: 'Cart',
      actionAlerts: 'Alerts',
      forYouSubtitle: 'Personalized for you',
      forPetSubtitle: 'Fun for your furry friend',
      vibeHeading: "What's your vibe today?",
      vibeSubheading: 'Explore experiences that match your mood.',
      vibeFilter: 'Filter',
      vibeAll: 'All',
      vibeAllOf: 'All {name}',
      spotsLeftOne: '1 spot left',
      spotsLeftMany: '{count} spots left',
      joiningNow: '{count} joining now',
      podsNearbyOne: '1 pod nearby',
      podsNearbyMany: '{count} pods nearby',
      hostCtaTitle: 'Host your own pod',
      hostCtaSubtitle: 'Create an event and bring your people together.',
      hostCtaButton: 'Create Pod',
      becomeHostCtaTitle: 'Become a host',
      becomeHostCtaSubtitle: 'Create your own pod and bring people together.',
      becomeHostCtaButton: 'Get started',
      joinClub: 'Join Club',
      joinedClub: 'Joined',
      membersOne: '1 Member',
      membersMany: '{count} Members',
      homeEmpty: 'No pods here yet. Pull to refresh or pick a different vibe.',
      // The rail of promo cards at the bottom of Home. The cards themselves
      // are admin content; only the heading over them is copy.
      somethingForYou: "We've got something for you",
      savePod: 'Save pod',
      savedPod: 'Remove from saved',
    },
    // The bar offering the app. Shown only when the OS did not already hand
    // the link over — a verified App Link never reaches this code at all.
    openInApp: {
      title: 'Duncit is better in the app',
      subtitle: 'Open this page in the app, or get it free.',
      open: 'Open',
      getApp: 'Get app',
      dismiss: 'Dismiss',
    },
    // The booking document. One file: the ticket, then the invoice for what
    // paid for it — a free pod has no payment, so that one is the ticket alone.
    ticket: {
      download: 'Ticket & invoice',
      downloading: 'Downloading…',
    },
    nav: {
      home: 'Home',
      explore: 'Explore',
      clubs: 'Clubs',
      chats: 'Chats',
      following: 'Following',
    },
    shop: {
      title: 'Pod Shop',
      emptyState: 'No products match your filters.',
      featured: 'Featured Products',
      outOfStock: 'Out of stock',
      includeOutOfStock: 'Include out of stock',
      searchPlaceholder: 'Search products or brands…',
    },
    podDetails: {
      spotFilled: 'Spot filled',
      spotFilledBy: 'Spot filled by {name}',
      formerAttendee: 'Former attendee',
      newAttendee: 'A new attendee',
      // One booking can cover several people. The list still shows one face per
      // person — the group size is a label beside their name, never extra
      // avatars, or the same booking gets counted twice on screen.
      otherMembersOne: '+1 other member',
      otherMembersMany: '+{count} other members',
    },
    // Rating a pod after it happens. Each part is asked separately because a
    // guest can love the evening and still have been let down by the room —
    // the aspect labels are keyed from @duncit/utils' POD_FEEDBACK_ASPECT_KEY,
    // so the two apps ask word-for-word the same questions.
    podFeedback: {
      title: 'How was “{title}”?',
      subtitle: 'Rate whichever parts you have an opinion on. Only the first is needed.',
      aspectOverall: 'Overall pod experience',
      aspectHost: 'Host',
      aspectVenue: 'Venue',
      aspectClubAdmin: 'Club admin',
      aspectSafety: 'Safety',
      aspectFood: 'Food',
      aspectOther: 'Anything else',
      comments: 'Comments',
      commentsPlaceholder: 'Tell us more (optional)',
      skip: 'Not now',
      submit: 'Submit',
      submitting: 'Sending…',
      rateAspect: 'Rate {aspect} {stars} out of 5',
      failed: 'That could not be sent. Please try again.',
    },
    // What to say when a payment does not complete. Three outcomes, three
    // answers — a buyer whose money may have left their account must not be
    // told their payment was "cancelled".
    payment: {
      cancelledTitle: 'Payment cancelled',
      cancelledBody: 'You closed the payment before it went through. Nothing has been charged.',
      failedTitle: 'Payment did not go through',
      failedBody: 'Your bank did not approve this payment, so nothing has been charged.',
      timeoutTitle: 'We did not hear back in time',
      timeoutBody:
        'The payment gateway stopped responding, so we cannot confirm whether this went through.',
      // The reassurance, and the reference to hold us to it.
      moneySafe:
        'Your money is safe. If it was deducted it will be refunded within 7–10 business days.',
      ticketRaised: 'Your support ticket is {ticket}',
      ticketPending: 'Opening a support ticket…',
      ticketFailed:
        'We could not open a support ticket automatically — please contact support with this payment.',
      gatewaySaid: 'The gateway said: {reason}',
      retry: 'Retry payment',
      close: 'Close',
    },
    // Plurals ship as explicit One/Many pairs: the key-verification gate needs
    // every leaf rendered via a literal t('…'), which the translator's
    // `.one/.other` siblings would fail.
    checkout: {
      seatsOne: '1 seat',
      seatsMany: '{count} seats',
    },
    // The Follow button's three states. REQUESTED only ever appears on a
    // private profile, whose owner must accept before a follow exists.
    follow: {
      follow: 'Follow',
      requested: 'Requested',
      following: 'Following',
      accept: 'Accept',
      reject: 'Reject',
      accepted: 'Accepted',
      rejected: 'Rejected',
    },
    // The door scanner: one ticket can admit a group, so the host is told how
    // many people that single QR lets in. The count itself is rendered as a
    // badge beside this copy, which is why neither string carries it.
    hostScan: {
      personOnTicket: 'person on this ticket',
      peopleOnTicket: 'people on this ticket',
      // Collecting the rest of the group. A multi-seat ticket is a number until
      // someone writes down who it covers, and the scan is the one moment they
      // are all standing there — so the ticket does not check in until they are.
      companionsTitle: 'Who else is coming in?',
      companionsBody: 'This ticket admits {seats}. Add the other {count} to mark attendance.',
      companionName: 'Full name',
      companionPhone: 'Phone number',
      companionsSubmit: 'Mark attendance',
      companionsIncomplete: 'Fill in every name and phone number.',
      companionsHeading: 'Person {index}',
    },
    // The slot picker's copy. @duncit/slots renders the same two steps on
    // every surface, so `shell.slots` below must stay word-for-word identical —
    // they are written out rather than shared through a const because the
    // key-verification gate parses this file statically and cannot follow a
    // spread. The server stores one row per key path, so the two namespaces
    // cannot collapse into one.
    slots: {
      date: 'Date',
      hint: "From the venue's availability calendar — the slot sets the pod's date & time.",
      availableSlots: 'Available slots',
      free: 'Free',
      today: 'Today',
      tomorrow: 'Tomorrow',
      loading: 'Loading available slots…',
      empty: 'No open slots right now. Try another venue or check back later.',
      emptyDay: 'No slots on this day. Pick another date.',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      pickVenueFirst: 'Select a venue first to see its available slots.',
      currentlyBooked: 'Currently booked for this pod',
      wholeVenue: 'Whole venue',
      // Onboarding meetings render the same calendar, but a booked slot stays
      // visible-and-disabled instead of disappearing, so they get their own hint.
      meetingHint: 'Greyed-out slots are already booked.',
      meetingRescheduleHint:
        'Greyed-out slots are booked; your current slot is marked and can’t be re-selected.',
      current: 'current',
    },
    // Duncit Coins — the loyalty balance shown in User mode only. Placeholders
    // are deliberately NOT named `count`: the translator overwrites that var
    // with its own plural counter, so `{coins}` is what actually renders.
    coin: {
      title: 'Duncit Coin',
      sidebarCaption: 'Earn {pct}% back on every payment',
      balanceLabel: 'Coin balance',
      lifetimeLabel: 'Lifetime earned',
      rateNote:
        'You earn {pct}% back as Duncit Coins on every successful payment. 1 coin = {symbol}1.',
      historyTitle: 'Transaction history',
      historyEmpty: 'No coin activity yet. Rewards from your payments will show up here.',
      earned: 'Earned',
      redeemed: 'Redeemed',
      loadError: 'Could not load your Duncit Coins. Please try again.',
      checkoutTitle: 'Duncit Coins',
      checkoutAvailable: '{coins} coins available',
      checkoutApply: 'Use coins',
      checkoutRemove: 'Remove',
      checkoutApplied: '{coins} coins applied',
      checkoutNone: 'You have no Duncit Coins to redeem yet.',
    },
  },
};

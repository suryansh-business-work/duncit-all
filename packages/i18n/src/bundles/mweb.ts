import type { NestedCatalogue } from '../catalogue';

/** Copy shared by mWeb and the native app — one namespace, one source. */
export const MWEB_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageHint: 'Choose the language for the app.',
      languageSaved: 'Language updated',
      goBack: 'Go back',
    },
    // Android hardware-back exit guard. Native-only copy in the shared bundle,
    // like mweb.openInApp.* below: a browser tab cannot be exited, so mWeb has
    // nothing to render here and rule 27 has no parity to keep.
    exitConfirm: {
      title: 'Leave Duncit?',
      message: 'Pressing back again will close the app.',
      confirm: 'Close app',
      cancel: 'Stay',
    },
    // Server-side meta tags (app/mweb/server) — the <title> and the OG/Twitter
    // card copy a crawler sees for every mWeb page. Entity pages (pod, club,
    // profile, post, venue, product) show the entity's own data; these are the
    // page titles, the templates around entity names, and the fallbacks.
    meta: {
      appName: 'Duncit',
      defaultDescription: 'Discover clubs, pods, and meetups near you.',
      pod: { description: 'Book your spot and meet people over this pod on Duncit.' },
      podFeedback: {
        title: 'Rate {name}',
        description: 'Tell the host how this pod went.',
      },
      club: { description: 'Follow this club to catch its next pods on Duncit.' },
      publicProfile: { description: 'See their posts and pods on Duncit.' },
      post: {
        title: 'Post by {name}',
        description: 'See this post on Duncit.',
      },
      venue: { description: 'See photos, capacity and upcoming pods at this venue.' },
      product: { description: 'Shop this product on Duncit.' },
      home: {
        title: 'Discover pods near you',
        description: 'Find clubs, pods, and meetups happening around you.',
      },
      menu: { title: 'Menu' },
      profile: { title: 'My profile' },
      follow: { title: 'Followers & following' },
      account: { title: 'Account' },
      venues: {
        title: 'Venues',
        description: 'Browse venues that host pods near you.',
      },
      becomeHost: { title: 'Become a host' },
      registerVenue: { title: 'Register your venue' },
      survey: { title: 'Partner survey' },
      hostsVenues: { title: 'Hosts & venues' },
      hostDashboard: { title: 'Host dashboard' },
      verification: { title: 'Verification' },
      hostManage: { title: 'Host studio' },
      hostApply: { title: 'Apply to host' },
      wallet: { title: 'Wallet' },
      createPod: { title: 'Create a pod' },
      podPending: { title: 'Pod under review' },
      earn: {
        title: 'Earn with Duncit',
        description: 'Host pods, list venues, or partner your brand to earn on Duncit.',
      },
      tourGuide: { title: 'Tour guide' },
      productsManage: { title: 'Manage products' },
      venuesManage: { title: 'Manage venues' },
      venueEarnings: { title: 'Venue earnings' },
      slotRequests: { title: 'Slot requests' },
      venueHealth: { title: 'Venue health' },
      clubStudio: { title: 'Club studio' },
      faqs: { title: 'FAQs' },
      policies: { title: 'Policies' },
      podIdeas: {
        title: 'Pod ideas',
        description: 'Vote on pod ideas or pitch your own.',
      },
      referral: {
        title: 'Refer & earn',
        description: 'Invite friends to Duncit and you both earn coins.',
      },
      coin: { title: 'Duncit Coin' },
      leaderboard: { title: 'Leaderboard' },
      membership: {
        title: 'Membership',
        description: 'Duncit membership tiers — what each one gets you, and what it costs.',
      },
      giftCards: {
        title: 'Gift cards',
        description: 'Buy a Duncit gift card for any category or the Pod Shop, and share it by email or link.',
      },
      giftCardsCheckout: { title: 'Gift card checkout' },
      giftCardRedeem: {
        title: 'Redeem a gift card',
        description: 'Enter a gift card code and its full value lands in your Duncit Coins.',
      },
      giftCardClaim: {
        title: 'You received a gift card',
        description: 'Open your Duncit gift card and redeem it into Duncit Coins.',
      },
      podPlans: { title: 'Pod plans' },
      podHistory: { title: 'Pod history' },
      booking: { title: 'Your booking' },
      support: { title: 'Support' },
      sos: { title: 'Emergency SOS' },
      callback: { title: 'Request a callback' },
      supportTickets: { title: 'Support tickets' },
      liveTickets: { title: 'Live tickets' },
      allTickets: { title: 'All tickets' },
      feedback: { title: 'Feedback' },
      grievance: { title: 'Grievance' },
      ticket: { title: 'Ticket' },
      liveChat: { title: 'Live chat' },
      accountHealth: { title: 'Account health' },
      mailPreference: { title: 'Mail preferences' },
      whatsappPreference: { title: 'WhatsApp preferences' },
      signupSurvey: { title: 'Tell us about you' },
      signupWhatsapp: { title: 'WhatsApp updates' },
      signupReferral: { title: 'Referral code' },
      checkout: { title: 'Checkout' },
      cart: { title: 'Cart' },
      shop: {
        title: 'Shop',
        description: 'Shop products from pods and brands on Duncit.',
      },
      orders: { title: 'Orders' },
      addressBook: { title: 'Address book' },
      explore: {
        title: 'Explore',
        description: 'Watch reels from pods happening near you.',
      },
      previousPods: { title: 'Previous pods' },
      happeningNearby: { title: 'Happening nearby' },
      search: { title: 'Search' },
      saved: { title: 'Saved' },
      clubs: { title: 'Clubs' },
      chats: { title: 'Chats' },
      register: {
        title: 'Create your account',
        description: 'Join Duncit to discover clubs, pods, and meetups near you.',
      },
      login: { title: 'Log in' },
      forgotPassword: { title: 'Forgot password' },
      resetPassword: { title: 'Reset password' },
    },
    account: {
      preferences: 'Preferences',
      // Profile > Connected accounts. mWeb and native render the same section
      // (rule 27) over the same myConnectedAccounts query.
      connected: {
        title: 'Connected accounts',
        subtitle: 'Services you can use to sign in to Duncit.',
        emailLabel: 'Email and password',
        emailOn: 'Active',
        emailOff: 'Not set',
        googleLabel: 'Google',
        googleNotConnected: 'Not connected',
        linkedOn: 'Connected on {date}',
        connect: 'Connect',
        disconnect: 'Disconnect',
        connected: 'Google connected',
        disconnected: 'Google disconnected',
        // The lock-out guard: Google is the only way in, so the action is
        // disabled rather than allowed to strand the user.
        onlyMethodHint:
          'Google is currently the only way to sign in to this account. Set a password before disconnecting it.',
        disconnectTitle: 'Disconnect Google?',
        disconnectMessage:
          'You will no longer be able to sign in with Google. Your email and password keep working.',
        connectFailed: 'Could not connect Google. Please try again.',
        disconnectFailed: 'Could not disconnect Google. Please try again.',
      },
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
      // The consent step. An email/password account whose address matches a
      // verified Google account is offered the link rather than turned away —
      // granting it is the user's decision, so it is asked for in plain words.
      linkConsentTitle: 'Also sign in with Google?',
      linkConsentBody:
        'You registered {email} with an email and password. Allow Google to sign you in to this same account?',
      linkConsentDetail:
        'Your password keeps working. You can disconnect Google at any time from Profile → Connected accounts.',
      linkConsentAllow: 'Allow and continue',
      linkConsentDeny: 'Not now',
      linkConsentDenied:
        'Google was not connected. Sign in with your email and password, or try Google again to allow it.',
      linkConsentFailed: 'Could not connect Google. Please try again.',
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
    // The pod page: hero, overview, schedule, the accordion stack, the booking
    // bar in every state it has, the backout/keep-spot dialogs and the comments
    // sheet. mWeb and the native app render the SAME journey (rule 27), so a key
    // here is used by BOTH surfaces unless its comment says which surface
    // renders it.
    //
    // Plurals ship as explicit One/Many pairs: the key-verification gate needs
    // every leaf rendered via a literal t('…'), which the translator's
    // `.one/.other` siblings would fail.
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
      // Page chrome. A pod that cannot be shown says so the same way on both
      // surfaces — the reader cannot act on the difference between "missing"
      // and "unavailable".
      notFound: 'Pod not found.',
      contactSupport: 'Contact support about this pod',
      close: 'Close',
      cancel: 'Cancel',
      delete: 'Delete',
      // The share sheet's title when the pod has none of its own.
      duncitPod: 'Duncit Pod',
      // The hero. mWeb only — the native hero buttons carry testIDs rather than
      // accessible names, and its carousel pages by swipe instead of arrows.
      back: 'Back',
      save: 'Save',
      saved: 'Saved',
      share: 'Share',
      previousImage: 'Previous',
      nextImage: 'Next',
      // Native only — tapping a hero image opens the full-screen viewer.
      viewImage: 'View image',
      // The overview card.
      hostedBy: 'Hosted by {names}',
      // mWeb only — posting a status from the pod is a host affordance the
      // native pod screen does not carry.
      addStatus: 'Add status',
      free: 'Free',
      virtual: 'Virtual',
      physical: 'Physical',
      // The countdown chip. The number is the pod's own, only the words are copy.
      podExpired: 'Pod expired',
      daysRemaining: '{days} days remaining',
      hoursRemaining: '{hours} hours remaining',
      startingSoon: 'Starting soon',
      peopleIn: 'People in',
      spotsLeft: 'Spots left',
      spotsLeftCount: '{count} spots left',
      // Time & venue.
      timeAndVenue: 'Time & Venue',
      when: 'When',
      meeting: 'Meeting',
      // Stands in for a meeting platform we have no name for.
      online: 'Online',
      joinMeeting: 'Join meeting',
      meetingLinkAfterJoin: 'Meeting link will be visible after joining this pod.',
      where: 'Where',
      venueDetails: 'Venue details',
      // Native only — mWeb formats the schedule through the browser's own
      // locale formatter, which has an em dash for a missing date.
      datePending: 'Date pending',
      // mWeb only — the native map is a plain embed with no chrome of its own.
      mapPreview: 'Map preview',
      openInMaps: 'Open in Maps',
      locationMap: 'Pod location map',
      // The accordion stack.
      expandAll: 'Expand all',
      collapseAll: 'Collapse all',
      // mWeb only — its buttons are icon+text and name themselves more fully.
      expandAllSections: 'Expand all sections',
      collapseAllSections: 'Collapse all sections',
      sectionAbout: 'About this pod',
      sectionClub: 'Club details',
      sectionOffers: 'What this pod offers',
      sectionHosts: 'Hosts',
      sectionAttendees: 'Attendees',
      sectionPerks: 'Available perks',
      sectionPayment: 'Payment details',
      sectionTerms: 'Payment terms',
      sectionCharges: 'Place charges',
      aboutEmpty: 'No description provided.',
      offersEmpty: 'Details coming soon.',
      perksEmpty: 'No additional perks listed.',
      // mWeb only — it truncates a long description behind a Read more toggle
      // and gives the pod's extra info a heading of its own.
      readMore: 'Read more',
      showLess: 'Show less',
      whatToExpect: 'What to expect',
      // Club.
      viewClub: 'View club',
      // mWeb only — native falls back to the View club action instead.
      clubUnavailable: 'Club details unavailable.',
      // Hosts.
      host: 'Host',
      hostsEmpty: 'No hosts assigned.',
      // Native only — mWeb's host rows are named by the text inside them.
      viewProfileOf: "View {name}'s profile",
      // Attendees. The whole line is one key: word order around the two numbers
      // is not the same in every language.
      attendeesGoing: '{count} / {total} going',
      attendeesGoingNoTotal: '{count} going',
      attendeesAttended: '{count} / {total} attended',
      attendeesAttendedNoTotal: '{count} attended',
      beFirstToJoin: 'Be the first to join!',
      viewAll: 'View all',
      viewAllAttendees: 'View all attendees',
      attendeesCount: 'Attendees ({count})',
      noAttendeesYet: 'No attendees yet.',
      attendee: 'Attendee',
      viewProfile: 'View profile',
      closeAttendees: 'Close attendees',
      // Payment details. The tax line reuses `checkout.gst` — it is the same
      // sentence about the same tax, and a second copy would drift.
      freeToJoin: 'This pod is free to join. No payment required.',
      pricePerSeat: 'Price per seat',
      inclusiveOfGst: 'Price is inclusive of GST.',
      // mWeb only — the native charges section only renders when there are any.
      noVenueCharges: 'No additional venue charges listed.',
      // The booking bar — host state.
      goToDashboard: 'Go to Dashboard',
      // Native only — its bar pairs every CTA with a caption on the left.
      youreHosting: "You're hosting",
      yourPod: 'Your Pod',
      // Closed state.
      bookingClosed: 'This pod has already taken place — booking is closed.',
      // Backout-in-process state.
      backoutLocked:
        'A replacement has been confirmed — this Backout request can no longer be cancelled. Your refund will be processed as per the backout policy.',
      backoutInProcess: 'Backout in process',
      // mWeb only — it leads its alert with the state as a bold sentence.
      backoutInProcessLead: 'Backout in process.',
      backoutSearchingNote:
        'We are searching for a replacement — you will get the refund only if someone fills your spot.',
      // Native only — the caption above its badge.
      searchingForReplacement: 'Searching for a replacement',
      keepMySpot: 'Keep My Spot',
      // mWeb only — the native bar has no room for a footnote.
      changedYourMind:
        'Changed your mind? Keep your spot to stop the replacement search and restore your booking.',
      // Member state. mWeb states the membership as a disabled button; native
      // pairs a caption with a badge, so each names what it actually shows.
      joined: 'Joined',
      visited: 'Visited',
      youreGoing: "You're going",
      youWent: 'You went',
      podBooked: 'Pod Booked',
      podVisited: 'Pod Visited',
      backout: 'Backout',
      // Native only — its Backout control is a pressable stack.
      backoutFromPod: 'Backout from pod',
      // mWeb only — native has no room for the note under its bar.
      backoutNote:
        'Backing out releases your seat — you will get the refund only if someone fills your spot ({pct}% deduction applies on paid pods).',
      alreadyTakenPlace: 'This pod has already taken place.',
      backoutMaxed: 'You have reached the maximum number of Backout attempts allowed for this Pod.',
      // mWeb only — refilling your own released seat by referral is a web flow;
      // the native bar has no backed-out state.
      backedOutRefundLead: 'You have backed out. Refund status:',
      referFriend:
        'Refer a friend to refill your spot — your refund is initiated once your spot is filled.',
      copyReferralLink: 'Copy referral link',
      // Book state.
      podIsFull: 'Pod is full',
      // The two surfaces size this button very differently — mWeb's is full
      // width and prices the booking, native's sits beside a price column — so
      // each says what fits rather than sharing a label that would overflow.
      joinFreePod: 'Join free pod',
      bookAndPay: 'Book & Pay {amount}',
      join: 'Join',
      bookNow: 'Book now',
      // Native only — its CTA is a pressable stack and needs its own name.
      joinPod: 'Join pod',
      bookPod: 'Book pod',
      entry: 'Entry',
      price: 'Price',
      // The seat picker. mWeb is a labelled select, native a stepper.
      seats: 'Seats',
      numberOfSeats: 'Number of seats',
      oneSeatFewer: 'One seat fewer',
      oneSeatMore: 'One seat more',
      // Native only — mWeb joins a free pod through the same snackbar as the
      // rest of its actions.
      couldNotJoin: 'Could not join this pod.',
      // The social bar. The count sits inside the label, so the whole label is
      // one key rather than a word plus a separator.
      likeCount: 'Like · {count}',
      likedCount: 'Liked · {count}',
      commentCount: 'Comment · {count}',
      // The comments sheet.
      comments: 'Comments',
      commentsEmpty: 'No comments yet. Be the first to comment.',
      addComment: 'Add a comment…',
      signInToComment: 'Sign in to comment',
      // Native only — its input is unlabelled on screen.
      comment: 'Comment',
      sendComment: 'Send comment',
      openProfile: 'Open profile',
      likeComment: 'Like comment',
      // mWeb only — native deletes a comment by long-pressing it.
      deleteComment: 'Delete comment',
      openProfileOf: 'Open {name} profile',
      anon: 'Anon',
      deleteCommentTitle: 'Delete comment?',
      deleteCommentBody: 'This comment will be permanently removed.',
      // The backout dialog, shared by the pod page and Pod History.
      backoutTitle: 'Backout from Pod?',
      backoutRefundOnlyIfFilled: 'You will get the refund only if someone fills your spot.',
      seatsToRelease: 'Seats to release',
      // mWeb only — its release count is a select, native's a stepper.
      seatsOfHeld: '{count} of {held}',
      keepSeatsOne: 'You keep 1 seat and stay in this pod.',
      keepSeatsMany: 'You keep {count} seats and stay in this pod.',
      releasingAll: 'Releasing your whole booking — you leave the pod.',
      refundEstimateOne:
        'If the refund is done, you will get {amount} for 1 seat (after the {pct}% backout deduction).',
      refundEstimateMany:
        'If the refund is done, you will get {amount} for {count} seats (after the {pct}% backout deduction).',
      backingOut: 'Backing out…',
      confirmBackout: 'Confirm Backout',
      backoutTerms: 'Backout Terms & Conditions',
      // mWeb only — its link sits inside a sentence, so the lead-in is its own
      // part rather than markup inside one template.
      readTheFull: 'Read the full',
      // Native only — it renders the policy text itself and links out in full.
      readFullBackoutTerms: 'Read the full Backout Terms & Conditions',
      reviewBackoutTerms: 'Review the backout terms before confirming.',
      viewBackoutTerms: 'View backout terms',
      // The keep-my-spot dialog.
      changeOfPlans: 'Change of plans?',
      keepSpotBody:
        'Do you want us to stop searching for a replacement and keep this spot for you? (NOTE: If you wish you Backout from the Pod again, you can only do it for up to {count} more times)',
      restoring: 'Restoring…',
      // mWeb only — it reports every action through one snackbar; native
      // re-renders the bar instead.
      joinedViaReferral: 'Joined via referral',
      linkCopied: 'Link copied',
      joinedSnack: 'Joined!',
      referralLinkCopied: 'Referral link copied',
      backoutStarted: 'Backout in process — your seat is now open for booking.',
      bookingRestored: 'Your booking is restored.',
      // Zod messages. mWeb only — the native composer sends whatever is typed
      // and lets the server refuse it.
      validation: {
        commentRequired: 'Required',
        commentMax: 'Max 1000 chars',
      },
    },
    // Pod History — the pods the viewer has joined, and everything one booking
    // can still be told or asked. mWeb and the native app render the SAME
    // journey (rule 27), so a key here is used by BOTH surfaces unless its
    // comment says which surface renders it.
    podHistory: {
      // The list page.
      title: 'Pod History',
      // mWeb only — its page carries an overline above the heading.
      overline: 'Pods',
      joinedPods: 'Joined Pods',
      subtitle: 'Tap any pod you joined to view details, actions, refund status, and timeline.',
      searchPlaceholder: 'Search joined pods…',
      searchAria: 'Search joined pods',
      empty: 'Pods you have joined will appear here.',
      noPodsFound: 'No Pods Found',
      noPodsFoundBody:
        "We couldn't find any enrolled Pods matching your search or filters. Try a different search or change your filters to explore more of your Pod history.",
      pod: 'Pod',
      joinedOn: 'Joined {date}',
      notFound: 'Pod history record not found.',
      // mWeb only — the native list is inside a stack screen with its own back.
      backToPodHistory: 'Back to pod history',
      // Filter + sort. mWeb opens popovers, native bottom sheets, so a few of
      // these are rendered by one surface only.
      filter: 'Filter',
      filterCount: 'Filter ({count})',
      sort: 'Sort',
      filterByCategory: 'Filter by category',
      superCategory: 'Super Category',
      category: 'Category',
      // mWeb only — its selects need an explicit "no choice" row.
      none: 'None',
      all: 'All',
      selectSuperFirst: 'Please select a Super Category first.',
      reset: 'Reset',
      // Native only — its sheet controls are pressable stacks.
      resetFilters: 'Reset filters',
      applyFilters: 'Apply filters',
      closeFilters: 'Close filters',
      closeSort: 'Close sort',
      done: 'Done',
      close: 'Close',
      sortDateNewest: 'Date · Newest first',
      sortDateOldest: 'Date · Oldest first',
      sortPriceLowHigh: 'Price · Low to High',
      sortPriceHighLow: 'Price · High to Low',
      // The booking's own state. "Visited" replaces "Joined" once the pod has
      // happened — Joined is a promise about something still ahead.
      statusJoined: 'Joined',
      statusVisited: 'Visited',
      statusBackoutInProcess: 'Backout in process',
      statusBackedOut: 'Backed out',
      // The refund words come from the request rather than the booking.
      refundNotStarted: 'Not started',
      refundPending: 'Criteria pending',
      refundProcessed: 'Refund initiated',
      refundNotEligible: 'Not initiated',
      refundChip: 'Refund: {status}',
      refundStatusToast: 'Refund status: {status}',
      refundPendingNote:
        'Refund is waiting for criteria completion. Support can help if the status looks wrong.',
      // The summary card.
      podDetailsTitle: 'Pod details',
      dateNotAvailable: 'Date not available',
      freePod: 'Free pod',
      paidPod: 'Paid pod {amount}',
      // mWeb only — native shows the seat count inside the backout sheet.
      seatsChip: '{count} seats',
      actions: 'Actions',
      timeline: 'Timeline',
      // mWeb only — the native actions row simply drops to Invoice + Support.
      podRemovedNotice:
        'This pod was removed. Your booking record stays here — download your invoice or contact support.',
      goToPodDetails: 'Go to Pod Details',
      backoutPod: 'Backout Pod',
      backingOut: 'Backing out…',
      rejoinPod: 'Rejoin Pod',
      rejoining: 'Rejoining…',
      invoice: 'Invoice',
      downloading: 'Downloading…',
      contactSupport: 'Contact Support',
      // Native only — mWeb's ticket button says what the file contains.
      ticket: 'Ticket',
      // mWeb only — its ticket query fails before the PDF is even requested.
      ticketNotAvailableForBooking: 'Ticket not available for this booking',
      backoutTerms: 'Backout Terms & Conditions',
      generalTerms: 'General Terms',
      backoutRecorded: 'Backout request recorded',
      rejoinedSuccess: 'Rejoined pod successfully',
      // The rejoin dialog.
      rejoinTitle: 'Rejoin this pod?',
      rejoinBody:
        "You'll rejoin this pod for free — no payment is required. Your spot is restored and stays active until the pod completes.",
      rejoinFree: 'Rejoin for free',
      cancel: 'Cancel',
      // Native only — its confirm control is a pressable stack.
      confirmRejoin: 'Confirm rejoin',
      // The replacement notice beside a released seat.
      findingReplacement: 'We are finding your replacement',
      refundDetails: 'Refund details',
      replacementRefundNote:
        'We are finding your replacement. If someone fills your spot, the refund will be initiated with {pct}% deduction.',
      // Products bought with the booking, and where they are.
      productsAndTracking: 'Products & tracking',
      // mWeb only — the native card is handed its orders already loaded.
      loadingProducts: 'Loading your products…',
      trackingRefreshError: "Couldn't refresh tracking just now.",
      trackShipment: 'Track shipment',
      pickupCode: 'Pickup code:',
      awb: 'AWB {awb}',
      fulfilShip: 'Ship to me',
      fulfilPickup: 'Pick up at venue',
      statusOrderPlaced: 'Order placed',
      statusPreparingShipment: 'Preparing shipment',
      statusCourierAssigned: 'Courier assigned',
      statusPickupScheduled: 'Pickup scheduled',
      statusShipped: 'Shipped',
      statusOutForDelivery: 'Out for delivery',
      statusDelivered: 'Delivered',
      statusReadyForPickup: 'Ready for pickup',
      statusPickedUp: 'Picked up',
      statusCancelled: 'Cancelled',
      statusReturnedToOrigin: 'Returned to origin',
      statusFulfilmentFailed: 'Fulfilment failed',
    },
    // The marketing image shown over the app on open. Only the chrome is
    // localized — the picture and the CTA label are campaign data, written by
    // whoever set the popup up in the Marketing portal.
    appPopup: {
      close: 'Close',
      tapToClose: 'Tap anywhere to close',
    },
    // "Pod Club Admin" in the host's per-pod action menu: who runs the club this
    // pod belongs to, and how to reach them. The contact rows themselves are
    // rendered by the shared ClubAdminCard, so only the chrome is keyed here.
    // `menuItem` is duplicated word-for-word at `shell.podClubAdmin.menuItem`
    // because @duncit/host-pod-actions resolves the label from whichever
    // namespace the calling surface ships.
    podClubAdmin: {
      menuItem: 'Pod Club Admin',
      title: 'Pod Club Admin',
      caption: 'Contact the Club Admin',
      // A club with no admin assigned yet is normal, not an error — the pod
      // still runs, there is just nobody to call.
      none: 'This pod’s club has no admin assigned yet.',
      loadFailed: 'The club admin could not be loaded. Please try again.',
      // Raising a ticket carries the pod through, so support never has to ask
      // which pod this is about.
      support: 'Raise a support ticket',
      close: 'Close',
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
      // The standalone page behind the link a host shares with their guests.
      pageTitle: 'Rate this pod',
      loadFailed: 'That pod could not be opened. Check the link and try again.',
      saved: 'Thanks — your rating has been saved.',
      alreadyRated: 'You already rated this pod. Change anything you like and send it again.',
      update: 'Update rating',
      updating: 'Saving…',
      done: 'Done',
      // The feedback link in the host's pod menu: the row opens the form, and
      // the two icons beside it hand the link to someone else.
      feedbackLink: 'Feedback link',
      shareLink: 'Share feedback link',
      copyLink: 'Copy feedback link',
      shareMessage: 'How was “{title}”? Tell us in a minute:',
      linkCopied: 'Feedback link copied',
      copyFailed: 'Could not copy the link. Copy it from the feedback page instead.',
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
    // The seven postal-address parts. One namespace, because the SAME block is
    // rendered by checkout billing and by the account address book on both
    // surfaces — a second copy per form is exactly the drift rule 40 forbids.
    address: {
      line1: 'Address line 1',
      line2: 'Address line 2 (optional)',
      landmark: 'Landmark (optional)',
      city: 'City',
      state: 'State',
      pincode: 'Pincode',
      country: 'Country',
    },
    // The cart: the products waiting to be paid for, and the header button that
    // leads back to them.
    cart: {
      title: 'Cart',
      empty: 'Your cart is empty',
      emptyBody: 'Add products from any Pod Shop and they will wait for you here.',
      // The empty-cart CTA. The two surfaces send the buyer to DIFFERENT places
      // — mWeb to the Pod Shop, native to Home — so each says where it goes
      // rather than sharing a label that would be wrong on one of them.
      browseShop: 'Browse the Pod Shop',
      findPod: 'Find a pod',
      total: 'Cart total',
      checkout: 'Proceed to checkout',
      clear: 'Clear cart',
      productsTotal: 'Products total',
      // The money is formatted by @duncit/utils and passed in; only the word
      // around it is copy.
      unitEach: '{price} each',
      freeDelivery: 'Free delivery',
      decrease: 'Decrease {name}',
      increase: 'Increase {name}',
      removeItem: 'Remove {name}',
      open: 'Open cart ({count} items)',
    },
    // The money path: the pod-membership checkout, the standalone product
    // checkout, and the confirmation both of them end on. mWeb and the native
    // app render the SAME journey (rule 27), so a key here is used by BOTH
    // unless its comment says which surface renders it.
    //
    // Plurals ship as explicit One/Many pairs: the key-verification gate needs
    // every leaf rendered via a literal t('…'), which the translator's
    // `.one/.other` siblings would fail.
    checkout: {
      seatsOne: '1 seat',
      seatsMany: '{count} seats',
      // Page chrome.
      title: 'Checkout',
      heading: 'Confirm your spot',
      productTitle: 'Product checkout',
      // mWeb only — native's screen title is the whole header.
      productHeading: 'Complete your order',
      // Native only — mWeb renders a skeleton instead of an unavailable state.
      unavailable: 'Checkout is unavailable right now. Please try again later.',
      nothingToCheckout: 'Nothing to checkout',
      noProductsInCart: 'There are no products in your cart.',
      backToCart: 'Back to cart',
      // mWeb only — the pod checkout can be opened with no pod at all.
      backToHome: 'Back to Home',
      // The pod order summary.
      ticket: 'Ticket',
      podBooking: 'Pod booking',
      ticketMultiplier: 'Ticket {price} x {seats} seats',
      // mWeb prices the pod line as the whole payable, native as the pre-GST
      // subtotal, so each labels the number it actually shows.
      ticketPrice: 'Ticket price',
      subtotal: 'Subtotal',
      // mWeb only — it lists the tax as a component of the price above it.
      inclusiveOf: 'Inclusive of:',
      gst: 'GST ({pct}%)',
      // Money taken OFF the bill, listed in the breakdown itself rather than
      // only under the pay button — a total that ignores a discount the buyer
      // can see applied above it reads as the discount having failed. The coin
      // row reuses `mweb.coin.checkoutTitle`, so only the coupon needs a label.
      couponDiscount: 'Coupon {code}',
      totalPayable: 'Total payable',
      // What an account must have before it can pay. The server refuses the
      // payment without these, so the buyer is told BEFORE entering a card
      // rather than being turned away at the end. Keys are looked up by
      // requirement from CHECKOUT_REQUIREMENT_KEYS, so the names must match.
      needTitle: 'Finish setting up your account',
      needIntro: 'We need these before you can pay:',
      needPhone: 'A phone number on your profile',
      needEmailVerified: 'A verified email address',
      needAction: 'Go to profile',
      // Venue charges are settled at the door and are NOT part of the online
      // payment, which is the one thing this copy has to make unmistakable.
      venueCharges: 'Venue Charges',
      venueChargesAbout: 'About venue charges',
      venuePayAtVenue: 'Payable directly at the venue',
      venueChargesIntro: 'Optional venue-side charges to be paid to the Venue.',
      venueChargesTotal: 'Total venue charges',
      venueChargesNote: 'Pay this directly at the venue — it is not included in your online payment.',
      venueChargesPaid: 'Venue charges {amount} are payable directly at the venue.',
      close: 'Close',
      // Coupons.
      couponCode: 'Coupon code',
      couponApply: 'Apply',
      // mWeb only — the native button swaps its label for a spinner.
      couponApplying: 'Applying…',
      // Native only — its controls are pressable stacks and carry their own
      // accessible names; mWeb's are real buttons labelled by their text.
      couponApplyAria: 'Apply coupon',
      couponRemoveAria: 'Remove coupon',
      couponRemove: 'Remove',
      // mWeb only — native states the applied coupon as code · −amount.
      couponApplied: '{code} applied',
      couponsAvailableOne: 'View 1 available coupon',
      couponsAvailableMany: 'View {count} available coupons',
      couponsTitle: 'Available coupons',
      couponsEmpty: 'No coupons available right now.',
      // Native only — the sheet has its own close control.
      couponsClose: 'Close coupons',
      couponPickAria: 'Apply {code}',
      couponPercentOff: '{pct}% off',
      couponForPod: 'For this pod',
      couponAllPods: 'All pods',
      couponMin: 'Min {amount}',
      // The pay step.
      paymentDetails: 'Payment details',
      pay: 'Pay {amount}',
      // Native only — its button needs a label before the total is known.
      payNow: 'Pay now',
      processing: 'Processing…',
      // What the discount did, said once per surface: mWeb strikes the old
      // total and names the saving, native names what is actually charged.
      youSave: 'you save {amount}',
      youPay: 'You pay {amount}',
      // mWeb only.
      receiptNote: 'Receipt and invoice will be sent after successful payment.',
      // Native only — the footer under its pay button.
      dummyGatewayNote: 'Dummy gateway — no real money is charged.',
      razorpayNote: 'Payments secured by Razorpay.',
      // The read-only contact block. It is edited from the profile, never here.
      contactDetails: 'Contact details',
      contactName: 'Name',
      contactEmail: 'Email',
      contactPhone: 'Phone',
      contactEditNote: 'To change these, edit your profile.',
      // Native only — mWeb shows skeleton lines while the profile loads.
      contactLoading: 'Loading your details…',
      // Billing address + GST.
      billingAddress: 'Billing address',
      sameAsMain: 'Same as my main address',
      saveAsMain: 'Save this as my main address',
      billingEmail: 'Billing email (optional)',
      // Native only — mWeb's field carries no helper line.
      billingEmailHint: 'Leave blank to use your contact email.',
      pincodeHint: '4–10 digits',
      gstDetails: 'GST details',
      hasGstin: 'I have a GSTIN (for business invoice)',
      // Native only — its switch needs a name of its own.
      hasGstinAria: 'I have a GSTIN',
      gstin: 'GSTIN',
      gstinHint: '15-character GSTIN',
      // The saved-address picker. mWeb is one labelled select; native is a
      // field that opens a sheet, so it has more parts to name.
      deliverToSaved: 'Deliver to a saved address',
      deliverTo: 'Deliver to',
      selectAddress: 'Select address',
      chooseAddress: 'Choose a saved address',
      addressDefault: '(default)',
      // The blocking overlay while a payment is in flight. The instruction
      // names the thing the buyer must not close, which differs by medium.
      processingTitle: 'Processing your payment…',
      processingNoteWeb: 'Please don’t close this tab.',
      processingNoteApp: 'Please don’t close this screen.',
      // Shown when the verification request itself dies (timeout, dropped
      // connection, a 502 mid-deploy) and the client falls back to asking the
      // server what happened. The money has already moved, so this is progress,
      // not a failure, and it never names the network. Both lines render INSIDE
      // the same blocking overlay, above the "don't close this" note — a buyer
      // who is shown a spinner and nothing else for thirty seconds pays again.
      confirmingTitle: 'Confirming your payment…',
      confirmingPayment:
        'Your payment went through — we’re confirming it with the bank. Please don’t pay again; this can take a minute.',
      // The product order summary.
      orderSummary: 'Order summary',
      yourOrder: 'Your order',
      delivery: 'Delivery',
      deliveryEnterPincode: 'Enter pincode',
      deliveryCalculating: 'Calculating…',
      deliveryTotal: 'Delivery total',
      deliveryFree: 'Free',
      deliveryEstimated: '{courier} (estimated)',
      deliveryEstimatedNote: 'Estimated delivery — final charge confirmed at checkout.',
      viewProduct: 'View {name} details',
      // The confirmation.
      successTitle: 'Payment successful',
      // mWeb only — its confirmation is a full page with room to say more.
      successOverline: 'You are in',
      successSubtitle: 'Your slot is booked. A receipt with the tax invoice has been emailed to you.',
      paymentId: 'Payment ID',
      amountPaid: 'Amount paid',
      paidOn: 'Paid on',
      invoiceLabel: 'Invoice',
      downloadInvoice: 'Download invoice',
      // Native only — its download buttons say so while they work.
      preparing: 'Preparing…',
      yourBooking: 'Your booking',
      home: 'Home',
      goHome: 'Go home',
      viewBookings: 'View bookings',
      myBookings: 'My bookings',
      alreadyBookedTitle: 'Pod already booked',
      alreadyBookedMessage:
        'You have already booked this pod. You can find your booking in Pod History.',
      alreadyBookedStay: 'Stay here',
      alreadyBookedHistory: 'Go to Pod History',
      // mWeb only — its confirmation returns to the profile, not the bookings
      // list, so the label names where it actually goes.
      myProfile: 'My Profile',
      myOrders: 'My orders',
      // mWeb only — passes to a wallet are a browser affordance.
      appleWallet: 'Add to Apple Wallet',
      googleWallet: 'Add to Google Wallet',
      appleWalletUnavailable:
        'Apple Wallet pass is not available yet. Invoice download is separate below.',
      calendarEventFallback: 'Duncit Pod',
      calendarDetails: 'Your Duncit booking is confirmed.',
      // What went wrong. A buyer reads these instead of the payable, so they
      // say what happened to the money and what to do next.
      errorFailed: 'Payment failed. Please try again.',
      errorNotConfigured: 'Online payments are not configured yet. Please try again later.',
      errorNotVerified: 'Payment could not be verified.',
      // The end of the confirmation wait: we still cannot say the payment
      // settled, but the buyer HAS paid. So it says what is true, tells them
      // where their booking will appear, and stops them paying twice — never
      // "timeout", never a raw network message.
      errorConfirmPending:
        'Your payment is being confirmed — please don’t pay again. It will appear in your bookings shortly, and we’ll email your receipt once it’s confirmed.',
      // The other two endings. The poll returns whichever status the server
      // settled on, so a payment that definitively FAILED or was REFUNDED must
      // be told so — sending that buyer to wait for a booking that will never
      // exist is worse than the timeout we are hiding.
      errorConfirmFailed:
        'Your payment did not go through, so nothing has been booked. Any amount debited will be returned by your bank automatically — please try again.',
      errorConfirmRefunded:
        'This payment was refunded, so nothing has been booked. The amount is on its way back to your account — please try again if you still want to book.',
      errorCouponInvalid: 'Invalid coupon code',
      errorInvoiceUnavailable: 'Invoice not available',
      // mWeb only — it creates the gateway order itself and can fail before
      // the sheet ever opens, and it downloads the ticket from this page.
      errorStart: 'Could not start the payment. Please try again.',
      errorTicketUnavailable: 'Ticket not available',
      errorTicketNotReady: 'Ticket not ready yet — check your email shortly.',
      // Native only.
      errorCouponApply: 'Could not apply coupon',
      errorInvoiceDownload: 'Could not download invoice.',
      errorTicketDownload: 'Could not download ticket.',
      // Zod messages. They are copy like any other — the person who reads them
      // is the person filling the form in. Email uses `auth.validation.*`,
      // which already says the same two things.
      validation: {
        nameMax: 'Name must be 160 characters or fewer',
        phoneCodeInvalid: 'Use a code like +91',
        phoneInvalid: 'Phone must contain only digits (6-15 digits)',
        line1Required: 'Address line 1 is required',
        line1Max: 'Address line 1 must be 200 characters or fewer',
        line2Max: 'Address line 2 must be 200 characters or fewer',
        landmarkMax: 'Landmark must be 160 characters or fewer',
        cityRequired: 'City is required',
        cityMax: 'City must be 120 characters or fewer',
        stateRequired: 'State is required',
        stateMax: 'State must be 120 characters or fewer',
        pincodeInvalid: 'Enter a valid pincode',
        pincodeMax: 'Pincode must be 10 characters or fewer',
        countryMax: 'Country must be 80 characters or fewer',
        billingEmailInvalid: 'Enter a valid billing email',
        // The two surfaces cap GSTIN and the billing email at different
        // lengths, so these say "too long" rather than a number that would be
        // wrong on one of them.
        billingEmailMax: 'Billing email is too long',
        gstinInvalid: 'Enter a valid 15-character GSTIN',
        gstinMax: 'GSTIN is too long',
      },
    },
    // Creating a pod — the host's 4-step stepper (Basics → Location/Category/
    // Club → Venue & Slot → Pricing & Publish), its fields, its cover picker
    // and its pricing panel. mWeb and the native app render the SAME journey
    // (rule 27), so a key here is used by BOTH surfaces unless its comment says
    // which surface renders it.
    //
    // Plurals ship as explicit One/Many pairs: the key-verification gate needs
    // every leaf rendered via a literal t('…'), which the translator's
    // `.one/.other` siblings would fail.
    createPod: {
      // Page chrome.
      title: 'Create a Pod',
      // mWeb only — the native screen header is the title alone.
      autosaveNote: 'Your progress saves automatically — finish anytime from Host Management.',
      hostRequired: 'An approved host profile is required before creating pods.',
      becomeHost: 'Become a host',
      createFailed: 'Could not create the pod.',
      // Stepper chrome. The step titles are also the label the Host Management
      // draft cards put on a half-finished pod.
      stepCounter: 'Step {step} of {total}',
      step1Title: 'Pod Basics',
      step2Title: 'Location, Category & Club',
      step3Title: 'Venue & Slot',
      step4Title: 'Pricing & Publish',
      step1Subtitle: 'Start with the core details so people understand what this pod is about.',
      step2Subtitle:
        'Where and what are you playing — location, category and the club it belongs to.',
      step3Subtitle: 'Pick a partner venue and lock in your date & time from its calendar.',
      step4Subtitle: 'Decide how much to charge, then review and publish your pod.',
      back: 'Back',
      next: 'Next',
      createPod: 'Create Pod',
      creating: 'Creating…',
      cancel: 'Cancel',
      done: 'Done',
      remove: 'Remove',
      change: 'Change',
      search: 'Search',
      loading: 'Loading…',
      // The AI content check: the chip on every step, and the guidelines dialog
      // it opens. The rules are listed one per key so a translator edits the
      // same rows an admin sees, rather than one blob.
      aiMonitoring: 'AI monitoring',
      aiMonitors: 'What AI monitors',
      gotIt: 'Got it',
      guidelinesIntro:
        "When you tap Create Pod, our AI (GPT-4o) deep-checks everything you entered — title, description, details, hashtags and uploaded images — against Duncit's community guidelines.",
      guidelinesRule1: 'No phone numbers, emails or personal contact details.',
      guidelinesRule2: 'No external, social or payment links.',
      guidelinesRule3: 'No payment handles (UPI, Paytm, GPay, PhonePe, bank details).',
      guidelinesRule4: 'No abusive, hateful, sexual or offensive wording.',
      guidelinesRule5: 'No nude, explicit or unwanted images.',
      guidelinesRule6: 'Never ask people to contact or pay you off the platform.',
      guidelinesWarning:
        'If your content breaks these rules the pod will not be created, your Account Health can drop, and repeat violations can get your account temporarily or permanently blocked.',
      moderationTitle: 'Fix these before publishing',
      moderationDescription:
        'Our AI check found content that breaks the community guidelines, so the pod was not created. Fix the items below and try again.',
      // Native only — mWeb's dialog is the shared @duncit/ui one, which writes
      // this line itself.
      moderationFixIn: 'Fix in {step}',
      // Step 1 — Pod Basics.
      categoryLabel: 'Select Category',
      categoryHint: 'In which you want to host your session',
      categoryEmpty: 'Assigned after host onboarding',
      noOptions: 'No options available.',
      podTitleLabel: 'Pod title',
      // mWeb only — the native title field carries no placeholder.
      podTitlePlaceholder: 'e.g. Downtown Runners Club',
      podTitleHint: 'What is this pod about? (3–120 characters)',
      podDescriptionLabel: 'Pod description',
      // mWeb only — the native description field carries no placeholder.
      podDescriptionPlaceholder: 'Describe the purpose, vibe, and what members can expect…',
      podDescriptionHint: 'Tell people what to expect — agenda, vibe, who it is for',
      // The cover media field. The two surfaces upload differently — mWeb opens
      // a dropzone over the shared MUI picker, native opens a phone/Pexels
      // sheet — so each names the controls it actually has.
      coverImageLabel: 'Cover image (at least one image)',
      addPodMedia: 'Add pod media',
      addMedia: 'Add media',
      removeMedia: 'Remove media',
      // mWeb only.
      uploadImage: 'Upload an image',
      uploadImageHint: 'Min 800×400px (JPG, PNG)',
      mediaAlt: 'Pod media',
      mediaMaxHint: 'That is the maximum of {max} — remove one to add another.',
      // Native only.
      addPhotosOrVideo: 'Add photos or a video',
      mediaAtMaximum: 'That is the maximum',
      removeOneToAdd: 'Remove one to add another',
      mediaMaxRemoveHint: 'Up to {max} — remove one to add another',
      cropAfterSelecting: 'Crop after selecting',
      uploadFormatsHint: '{formats} · up to {mb} MB · crop after selecting',
      // Chip lists: what the pod offers, its perks, its hashtags.
      offersLabel: 'What this pod offers',
      offersPlaceholder: 'e.g. Coaching, Snacks, Equipment',
      chipPlaceholder: 'Type and press Enter',
      // mWeb only — the native chip field has no helper line.
      chipMaxHint: 'Press Enter to add. Max {max}.',
      // Native only — its chips are pressable stacks and need their own name.
      removeTag: 'Remove {tag}',
      hashtagsLabel: 'Hashtags',
      hashtagsPlaceholder: 'Type a tag and press Enter',
      hashtagsHint: 'Press Enter, space or comma to add a tag.',
      optionalSettings: 'OPTIONAL SETTINGS',
      additionalInfoTitle: 'Additional Info',
      additionalInfoSubtitle: 'Rules, requirements, or what to bring.',
      perksTitle: 'Perks',
      perksSubtitle: 'Member benefits',
      // Native only — mWeb's perks chips sit under the card title, unlabelled.
      perksFieldLabel: 'Available perks',
      perksPlaceholder: 'e.g. Free parking, Goodies',
      summaryAdd: 'Add',
      summaryAdded: 'Added',
      summaryCount: '{count} added',
      podInfoLabel: 'Pod info / additional notes',
      // mWeb only — the native info field carries no helper line.
      podInfoHint: 'Logistics, what to bring, parking notes, etc.',
      // The optional Pod Reel — one short video, uploaded straight to ImageKit.
      podReel: 'Pod Reel',
      // Native only — its card carries a subtitle under the title.
      reelSubtitle: 'A short video shown in Explore.',
      reelHint:
        'Reel video shows in Explore while this pod is live. Optional — one video up to 100 MB.',
      reelUpload: 'Upload video',
      // mWeb only — native replaces a reel by removing it first.
      reelReplace: 'Replace video',
      // Native only — its upload target is a pressable stack.
      reelUploadAria: 'Upload a reel video',
      removeReel: 'Remove reel',
      // mWeb only — the native picker only offers videos, so the wrong file
      // type can never be chosen.
      reelNotVideo: 'Please pick a video file (MP4, MOV or WebM)',
      reelTooLarge: 'That video is over 100MB — pick a smaller reel.',
      // Native only — the OS asks for media permission before the picker opens.
      reelPermission: 'Media access is needed to upload a reel.',
      uploadFailed: 'Upload failed',
      uploading: 'Uploading…',
      compressing: 'Compressing…',
      uploadingPct: 'Uploading… {pct}%',
      compressingPct: 'Compressing… {pct}%',
      // Step 2 — Location, Category & Club.
      podLocation: 'Pod location',
      noLocationSelected: 'No location selected',
      localityLabel: 'Locality: {locality}',
      // Native only — its change control is a pressable stack.
      changeLocation: 'Change location',
      // Native only — mWeb's card has no explanatory line under it.
      locationPickerHint:
        'Pick your city and locality — the picker shows how many clubs each locality has.',
      podMode: 'Pod mode',
      modePhysical: 'Physical',
      modeVirtual: 'Virtual',
      clubLabel: 'Club',
      // mWeb only — its club field is one autocomplete with a helper line.
      clubHint: 'Search and select the club this pod belongs to',
      // Native only — its club field is a search box over a chip list.
      clubSearchPlaceholder: 'Search your clubs',
      clubSearchAria: 'Search clubs',
      clubsEmpty: 'No clubs match your search.',
      venueOne: '1 venue',
      venueMany: '{count} venues',
      viewClubDetails: 'View club details',
      closeClubDetails: 'Close club details',
      noDescription: 'No description yet.',
      // Step 3 — Venue & Slot.
      selectVenue: 'Select venue',
      noVenues: 'No venues match this club yet — pick another club or go virtual.',
      upTo: 'Up to {capacity}',
      totalCapacity: 'Total capacity: {count}',
      spaceCapacity: 'Space & capacity',
      spaceHint: 'Pick a space — its capacity sets No. of spots. Slots show after this.',
      spaceOption: '{label} · {capacity} spots',
      ownVenueNote: 'This is your venue — the slot books instantly and the pod goes live on publish.',
      venueApprovalNote:
        'The pod goes live only after the venue approves this slot. The venue contact below is shared for follow-up.',
      callVenue: 'Call Venue',
      getDirections: 'Get Directions',
      venueContact: 'Venue contact for follow-up',
      podWindow: 'Pod window from slot: {duration}',
      // The virtual branch of step 3 — there is no venue calendar to book, so
      // the schedule is entered by hand.
      meetingPlatform: 'Meeting platform',
      // mWeb only — the native platform field carries no helper line.
      meetingPlatformHint: 'Where attendees will join you',
      // The one option that is copy rather than a product name. Google Meet,
      // Zoom and Microsoft Teams are the same words in every language and are
      // supplied by @duncit/utils, not from here.
      meetingPlatformOther: 'Other (paste link manually)',
      meetingPlatformRequired: 'Choose where the meeting happens',
      // Step 3 reads differently for a virtual pod: there is no venue to pick,
      // only when it happens and what people join with.
      step3TitleVirtual: 'Meeting Time & Medium',
      step3SubtitleVirtual: 'Set when the session runs and where attendees join you.',
      meetingLink: 'Meeting link',
      meetingLinkHint: 'Attendees join through this link',
      meetingNotes: 'Meeting notes',
      startDateTime: 'Start date & time',
      endDateTime: 'End date & time',
      totalDuration: 'Total duration: {duration}',
      // Native only — mWeb schedules with MUI X's picker, which supplies its own
      // placeholder, calendar labels and confirm button.
      dateTimePlaceholder: 'YYYY-MM-DD HH:mm',
      pickDateTime: 'Pick {label}',
      dayAria: 'Day {day}',
      timeHeading: 'TIME',
      hourAria: 'Hour {hour}',
      minuteAria: 'Minute {minute}',
      // Step 4 — Pricing & Publish.
      podTypeFree: 'Free',
      podTypePaid: 'Paid',
      freeCaption: 'No ticket charge',
      paidCaption: 'Charge per person',
      physicalPaidCaption: 'Physical pods are always paid',
      ticketPriceLabel: 'Ticket price (₹ per person)',
      ticketPricePlaceholder: 'Enter ticket price',
      ticketPriceHint: 'Gross ticket price, max 1999.',
      ticketPriceFreeHint: 'Free pods are ₹0.',
      // The suggested-price ladder: the link beside the label, the modal it
      // opens, and one description per rung (cheapest first).
      suggestedPrice: 'Suggested Price',
      suggestedPricesTitle: 'Suggested Ticket Prices',
      whatYouGet: 'What You Get',
      suggestedPricesEmpty:
        'Set the number of spots first — suggestions need the pod size to project your earnings.',
      suggestedPricesError: 'Could not load suggested prices. Please try again.',
      suggestedPricesNote:
        'Choose an optimal ticket price for your Pod to maximize both participation and revenue.',
      priceTier1: 'Most affordable — the easiest price to fill every spot.',
      priceTier2: 'Balanced — a good mix of participation and earnings.',
      priceTier3: 'Better earnings — still comfortable for most guests.',
      priceTier4: 'Premium — fewer but more committed guests.',
      priceTier5: 'Best for high-value pods and exclusive experiences.',
      // The two rules that keep Create Pod disabled: a ₹0 projected payout, and
      // a pod worth less than the venue slot it books.
      zeroEarningsTitle: 'No Earnings Generated',
      zeroEarningsBody:
        'Based on the current Ticket Price, your estimated earnings are ₹0 after applicable deductions. Please increase the Ticket Price to earn from this Pod.',
      venueShortfall:
        'Your venue price is greater than the total Pod value. Please increase the Ticket Price so that the total Pod value is equal to or greater than the Venue Price.',
      earningsEstimateNote:
        'This is an estimate based on the spots you set. When you complete the pod we recalculate it on the people who actually attended — your own spot is always free.',
      totalSpots: 'Total spots',
      spotsHint: 'Number of available tickets.',
      spotsFixedHint: 'Set by the venue space you picked.',
      spotsBoundsHint: 'This activity needs at least {min}, and the space you booked holds {max}.',
      decreaseSpots: 'Decrease spots',
      increaseSpots: 'Increase spots',
      // The earnings panel. Every number on it is a server waterfall value —
      // only the words around them are copy.
      potentialEarnings: 'Potential earnings',
      takeHome: 'Your take-home for the full pod',
      hostFreeNote:
        'Your spot is free — that is why the total calculation is based on the remaining available slots.',
      previewPrompt: 'Set a ticket price and the number of spots to preview your earnings.',
      hostOnlyPod: 'This pod only has your own spot, which is free. Add more spots to earn.',
      totalCollection: 'Total collection ({price} × {spots})',
      govtCharges: 'Govt. and other charges',
      totalDeductions: 'Total deductions',
      reconcileWarning:
        'These figures do not reconcile — refresh, or contact support if this persists.',
      formula: 'Formula: {formula}',
      youWillReceive: 'You will receive',
      payingPax: 'For {count} paying pax',
      shareOfCollection: '{pct}% of collection',
      totalCollectionLabel: 'Total Collection',
      minusTotalDeductions: '− Total Deductions',
      equalsYouWillReceive: '= You will receive',
      estimatesNote:
        "Estimates at today's rates — final settlement happens after the pod completes.",
      paymentTerms: 'Payment terms',
      // mWeb only — the native payment-terms field carries no helper line.
      paymentTermsHint: 'Refund policy, cancellation, tax info.',
      // Venue-side charges settled at the door — never part of the online price.
      placeCharges: 'Place charges',
      // mWeb only — the native charges field carries no helper line.
      placeChargesHint:
        'Optional venue-side charges (entry, table, etc.) shown separately to users.',
      chargeLabel: 'Label',
      chargeAmount: 'Amount (₹)',
      chargeNote: 'Note',
      addCharge: 'Add charge',
      removeCharge: 'Remove charge',
      // Step 4's products block moved to the shared full-page picker, whose copy
      // is the `podProduct.*` namespace — the switch, the dropdown row and their
      // labels are gone with it.
      // The publish gate. The link must stay tappable inside the sentence, so
      // it is assembled from parts rather than one template with markup in it.
      termsLeadIn: 'I agree to the',
      termsLink: 'Organizer Terms of Service',
      termsTail: 'and confirm that I have the right to host this event at the selected venue.',
      termsAria: 'Agree to Organizer Terms of Service',
      // The native cover picker — the Tamagui twin of the MUI media picker,
      // which the app cannot import. mWeb renders the shared dialog instead, so
      // these are native-only.
      tabFromPhone: 'From phone',
      tabPexels: 'Pexels',
      chooseFromPhone: 'Choose from your phone',
      useSelectedImages: 'Use selected images',
      useThisImage: 'Use this image',
      useTheseCount: 'Use these {count}',
      selected: 'Selected',
      selectedCount: '{count} of {max}',
      firstIsCover: 'The first one is the cover.',
      pickUpTo: 'Pick up to {max} — from your phone, from Pexels, or both.',
      searchPhotos: 'Search photos',
      searchPexels: 'Search Pexels',
      noPhotos: 'No photos matched. Try a different word.',
      loadMore: 'Load more',
      photoImportFailed: 'Could not add that photo',
      // Shown instead of the transport's own wording ("The request timed out"),
      // which tells the user what the network did rather than what they can do.
      photoSearchFailed: 'Could not load photos. Check your connection and search again.',
      photoCredit: 'Photo by {name} on Pexels',
      photoBy: 'Photo by {name}',
      pexelsNotice:
        'Photos provided by Pexels. Picked photos are copied into your own media library.',
      // Zod messages. They are copy like any other — the person who reads them
      // is the host filling the stepper in. The two surfaces hold a few fields
      // differently (mWeb keeps real Dates and numbers, native keeps text), so
      // a handful are rendered by one surface only.
      validation: {
        locationRequired: 'Select a location',
        categoryRequired: 'Select a category',
        titleShort: 'Title is too short',
        titleLong: 'Title is too long',
        clubRequired: 'Select a club',
        descriptionShort: 'Add a longer description',
        venueRequired: 'Select a venue',
        spaceRequired: 'Pick a space / capacity',
        slotRequired: 'Pick an available slot from the venue calendar',
        meetingUrlRequired: 'Meeting link is required',
        meetingUrlInvalid: 'Meeting link must be valid',
        // mWeb only — its picker hands back a Date, so a blank one is the only
        // way the start can be wrong.
        startRequired: 'Start date/time required',
        startFuture: 'Start date/time must be in the future',
        endAfterStart: 'End must be after start',
        endMinDuration: 'End must be at least 30 minutes after the start',
        // Native only — its schedule is typed as text and must parse first.
        dateTimeFormat: 'Use YYYY-MM-DD HH:mm',
        // mWeb only — its pod type can be cleared, native's is always one of two.
        podTypeRequired: 'Select a pod type',
        podTypeInvalid: 'Select Free or Paid',
        physicalMustBePaid: 'Physical pods must be paid',
        freeAmountZero: 'Free pods must have amount 0',
        ticketPriceRequired: 'Enter a ticket price to continue',
        ticketPriceMin: 'Ticket price must be more than ₹0',
        // mWeb only — its amount and spots are numbers, so the wrong TYPE is
        // the failure; native holds them as text and checks the RANGE.
        amountNumber: 'Amount must be a number',
        spotsNumber: 'Spots must be a number',
        // Native only.
        amountRange: 'Amount must be 0–1999',
        spotsRange: 'Spots must be 0–10000',
        offersRequired: 'Add at least one thing this pod offers',
        // The product rules moved to `podProduct.*` with the picker: a row can
        // no longer exist without a product, so `podProduct.selectFirst` is the
        // one message left.
        // mWeb only — its quantity input can be emptied.
        quantityRequired: 'Quantity required',
        chargeLabelRequired: 'Label required',
        imageRequired: 'Add at least one image URL',
        termsRequired: 'Accept the Organizer Terms to publish',
      },
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
      companionName: 'Name',
      companionPhone: 'Phone',
      companionsSubmit: 'Mark attendance',
      companionsIncomplete: 'Fill in every name and phone number.',
      companionsHeading: 'Person {index}',
      // Both fields are required, and the form says so rather than only
      // objecting after a failed submit.
      fieldRequired: 'Required',
      nameInvalid: 'Enter the name',
      phoneInvalid: 'Enter a phone number — digits only, 6 to 15',
      // The confirmation. A scan that only swaps one line of text reads as
      // "nothing happened", which is exactly how this was reported.
      attendanceMarked: 'Attendance marked',
      attendanceMarkedOne: '{name} is checked in.',
      attendanceMarkedGroup: '{name} and {count} more are checked in.',
      alreadyMarked: 'Already checked in',
      // The buyer's chip while the rest of the group is still being collected —
      // the old copy said "Marked present" before anyone actually was.
      notMarkedYet: 'Not checked in yet',
      // Heading for the green-tick roster of everyone this ticket let in.
      checkedInList: 'Checked in on this ticket',
      confirmDone: 'Done',
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
      wholeDay: 'Whole day',
      // Onboarding meetings render the same calendar, but a booked slot stays
      // visible-and-disabled instead of disappearing, so they get their own hint.
      meetingHint: 'Greyed-out slots are already booked.',
      meetingRescheduleHint:
        'Greyed-out slots are booked; your current slot is marked and can’t be re-selected.',
      current: 'current',
    },
    /**
     * The shared error module (@duncit/errors) — what a failed server
     * operation says, and the report button beside it. mWeb + native twins.
     */
    issue: {
      fallback: 'Something went wrong. Please try again.',
      report: 'Report issue',
      reporting: 'Reporting…',
      reported: 'Reported — thank you.',
    },
    // Duncit Coins — the loyalty balance shown in User mode only. Placeholders
    // are deliberately NOT named `count`: the translator overwrites that var
    // with its own plural counter, so `{coins}` is what actually renders.
    coin: {
      title: 'Duncit Coin',
      sidebarCaption: 'Earn {pct}% back when you join a pod',
      balanceLabel: 'Coin balance',
      lifetimeLabel: 'Lifetime earned',
      rateNote:
        'You earn {pct}% back as Duncit Coins when you join a pod, and {shopPct}% on shop orders. 1 coin = {symbol}1.',
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
    // The Leaderboard — five boards (Users, Hosts, Club Admins, Venues,
    // Brands), each ranking a different way of showing up for the platform.
    // mWeb and the native app render the SAME journey (rule 27). Point values
    // are never written into copy — they come from `leaderboardConfig`, so an
    // admin edit changes what every surface promises without a release.
    // Placeholders are deliberately NOT named `count` except where a real
    // count is passed: the translator injects its own plural counter there.
    leaderboard: {
      title: 'Leaderboard',
      sidebarLabel: 'View Rankings',
      yourPoints: 'Your points',
      yourRank: 'Rank #{rank}',
      notRanked: 'Not ranked yet',
      notRankedHint: 'Earn your first points to appear on this board.',
      participantsOne: '1 participant in this window',
      participantsMany: '{count} participants in this window',
      pointsShort: 'pts',
      periodMonth: 'This month',
      periodYear: 'This year',
      periodAll: 'All time',
      tabUser: 'Users',
      tabHost: 'Hosts',
      tabClubAdmin: 'Club Admins',
      tabVenue: 'Venues',
      tabBrand: 'Brands',
      emptyBoard: 'No points on this board yet — be the first!',
      loadError: 'The leaderboard could not be loaded. Please try again.',
      howToTitle: 'How to increase your points',
      howToSubtitle: 'Every action below adds points the moment it succeeds.',
      earnJoin: 'Join a pod successfully',
      earnHost: 'Host a pod to completion',
      earnClubAdmin: 'A pod of your club completes',
      earnVenue: 'A pod completes at your venue',
      earnBrand: 'Sell a product from your brand',
      earnPoints: '+{points} pts',
      rewardsTitle: 'Rewards',
      rewardsSubtitle: 'Finish the window inside a rank range to win.',
      rewardsMonthly: 'End of month',
      rewardsYearly: 'End of year',
      rewardRankOne: 'Rank #{from}',
      rewardRankRange: 'Ranks #{from}–#{to}',
      rewardsEmpty: 'Rewards for this board will be announced soon.',
      anonymous: 'Duncit member',
    },
    // Membership — mWeb and native render the SAME screen (rule 27), so every
    // key here is used by BOTH. The tiers, their prices and every comparison
    // row come from Admin > Membership; nothing here quotes a price or a
    // benefit, so editing the catalogue never leaves this copy lying.
    membership: {
      title: 'Membership',
      sidebarLabel: 'See the plans',
      comingSoon: 'Coming soon',
      heading: 'Membership is on its way',
      subheading:
        'Four tiers, built around the one thing that is actually scarce on Duncit — a spot in the pod you want. Here is what each one is shaping up to include.',
      compareTitle: 'Compare the plans',
      compareHint: 'Scroll sideways to see every tier.',
      benefitColumn: 'Benefit',
      included: 'Included',
      notIncluded: 'Not included',
      ctaDisabledHint: 'Plans are not on sale yet.',
      footnote: '* Fair-use limits apply. Every price and benefit here is provisional.',
      notifyTitle: 'Want to know the moment it opens?',
      notifyBody:
        'We will email you when membership goes live — and you will get first pick of the launch tiers.',
      notifyEmailLabel: 'Your email',
      notifyEmailHint: 'Taken from your profile. Change it in Manage Account.',
      notifyCta: 'Notify me',
      notifySubmitting: 'Signing you up…',
      notifyDone: 'You are on the list',
      notifyDoneBody: 'We will email you as soon as membership opens.',
      notifyError: 'We could not sign you up. Please try again.',
      notifyNoEmail: 'Add an email address to your profile first.',
      loadError: 'Membership plans could not be loaded. Please try again.',
      empty: 'Membership plans will be announced soon.',
    },
    // Gift Cards — mWeb and native render the SAME screens (rule 27), so every
    // key here is used by BOTH. Amounts, validity and the category themes come
    // from the server (Finance > Gift Cards + the category tree); nothing here
    // quotes a number, so a policy change never leaves this copy lying.
    giftCards: {
      title: 'Gift Cards',
      sidebarBuyLabel: 'Buy a gift card',
      sidebarBuyCaption: 'For a category or the Pod Shop',
      sidebarRedeemLabel: 'Redeem a gift card',
      sidebarRedeemCaption: 'Turn a code into Duncit Coins',
      // Buy page
      buyTitle: 'Buy a gift card',
      buySubtitle: 'Pick a theme, choose an amount, and send it to someone — or keep it for yourself.',
      themeHeading: 'Pick a theme',
      themeShop: 'Pod Shop',
      themeSuper: 'Super categories',
      themeCategory: 'Categories',
      themeSub: 'Sub categories',
      shopTheme: 'Pod Shop',
      shopThemeCaption: 'One card for everything in the shop',
      amountHeading: 'Choose an amount',
      customAmountLabel: 'Custom amount',
      amountRangeHint: 'Between {min} and {max}',
      forHeading: 'Who is it for?',
      forMyself: 'For myself',
      forSomeone: 'Send as a gift',
      recipientEmailLabel: 'Recipient email',
      recipientEmailHint: 'The card and its code are emailed here.',
      recipientNameLabel: 'Recipient name',
      messageLabel: 'Personal message',
      messageHint: 'Printed on the card and in the email (optional).',
      continueCta: 'Continue to payment',
      loadError: 'Gift cards could not be loaded. Please try again.',
      // My cards
      myCardsTab: 'My cards',
      buyTab: 'Buy',
      myCardsEmpty: 'No gift cards yet. Buy one, or redeem a code someone sent you.',
      giftedHeading: 'Gifted by you',
      statusActive: 'Active',
      statusRedeemed: 'Redeemed',
      statusExpired: 'Expired',
      validUntil: 'Valid until {date}',
      copyCode: 'Copy code',
      codeCopied: 'Code copied',
      shareCard: 'Share',
      shareMessage: '{sender} sent you a Duncit gift card of {amount}! Redeem it here:',
      // Checkout
      checkoutTitle: 'Gift card checkout',
      checkoutTheme: 'Theme',
      checkoutAmount: 'Gift card value',
      checkoutRecipient: 'Recipient',
      checkoutSelf: 'Yourself',
      checkoutTotal: 'Total to pay',
      checkoutNote: 'Gift cards are charged at face value — no fees on top.',
      payCta: 'Pay {amount}',
      successTitle: 'Gift card purchased!',
      successSelfBody: 'Your card and its code have been emailed to you. Redeem it any time from Gift Cards > Redeem.',
      successGiftBody: 'The card and its code have been emailed to {email}. You can also share the link yourself.',
      // The processing backdrop and the failure dialog are the SHARED checkout
      // components, which carry their own copy — only the retry message below
      // is the gift card's own.
      failureBody: 'Nothing was charged. Please try again.',
      viewMyCards: 'View my cards',
      // Redeem page
      redeemTitle: 'Redeem a gift card',
      redeemSubtitle: 'Enter the code from your email or link — the full value lands in your Duncit Coins.',
      codeLabel: 'Gift card code',
      codeHint: 'Looks like XXXX-XXXX-XXXX-XXXX',
      checkCta: 'Check card',
      redeemCta: 'Redeem into coins',
      redeemSuccessTitle: 'Coins added!',
      redeemSuccessBody: '{coins} coins were added to your balance. You now hold {balance} coins.',
      redeemAlreadyBody: 'This card was already redeemed into your coins.',
      goToCoins: 'See my coins',
      redeemError: 'This code could not be redeemed. Check it and try again.',
      // Claim page (opened from the shared link)
      claimFrom: 'From {sender}',
      claimExpiredBody: 'This gift card expired before it was redeemed.',
      claimRedeemedBody: 'This gift card has already been redeemed.',
      // How it works — the instructions block on the buy and redeem pages
      howTitle: 'How gift cards work',
      howStep1: 'Pick a theme — any category, or the Pod Shop — choose an amount, and pay.',
      howStep2: 'The card and its code go out by email, and you can share the link too. Keeping it for yourself works the same way.',
      howStep3: 'Whoever holds the code redeems it once, and the full value is added to their Duncit Coins instantly.',
      howStep4: 'Coins pay for pod bookings and Pod Shop orders at checkout — 1 coin = 1 rupee.',
      howNote: 'A card can be redeemed once, by one person, before its expiry date. Anyone with the code can redeem it, so share it only with the person it is for.',
    },
    // Refer & Earn — mWeb and native render the SAME screen (rule 27), so every
    // key here is used by BOTH unless its comment says otherwise. The reward and
    // the shared message itself come from Finance > Referrals; nothing here
    // quotes a number, so a rate change never leaves this copy lying.
    referral: {
      title: 'Refer & Earn',
      subtitle: 'Share your code, bring friends to Duncit',
      yourCode: 'YOUR CODE',
      copyCode: 'Copy code',
      copyLink: 'Copy link',
      codeCopied: 'Code copied',
      linkCopied: 'Link copied',
      // Native only — its share sheet hands the message to another app.
      share: 'Share',
      // Both sides earn, so the sentence says both. {coins} is the configured rate.
      bothEarn: 'You and your friend each earn {coins} Duncit Coins',
      referredBy: 'You were referred by {name}',
      friendsTitle: 'Friends you referred',
      friendsCount: 'Friends you referred ({count})',
      empty: 'No referrals yet — share your code to get started.',
      newMember: 'New member',
      loadError: 'Could not load your referral details. Please try again.',
      // The signup field, and the step Google signup lands on — the only two
      // places a code can be entered now that Refer & Earn no longer takes one.
      codeLabel: 'Referral code',
      codeOptional: 'Referral code (optional)',
      codePlaceholder: 'DUN-XXXXXX',
      codeHint: 'Have a friend’s code? You both earn Duncit Coins.',
      promptTitle: 'Got a referral code?',
      promptBodyPlain: 'Enter it now and you both earn Duncit Coins. You can only do this once.',
      apply: 'Apply code',
      applying: 'Applying…',
      skip: 'Skip for now',
      applied: 'Referral code applied',
      validation: {
        codePattern: 'Enter a code like DUN-XXXXXX',
      },
    },
    // Wallet — the role-wise Minimum Withdrawal Amount configured in Finance >
    // Withdrawals > Withdrawal Settings. The server decides eligibility and
    // sends the applicable floor on `myWallet`; these keys only word it, so
    // mWeb and native say the same thing about the same number.
    wallet: {
      minimumHint: 'Minimum withdrawal {amount}.',
      minimumBlocked: 'You need at least {amount} in your wallet to withdraw.',
    },
    // The pod sections of the two partner studios: Venue Studio's "Pods hosted
    // on your Venue" and Club Studio's "Your Pods". ONE namespace because both
    // sections show the same figures over the same row shape (VenuePod and
    // ClubPod are field-for-field twins) — only the four scope words differ, so
    // mWeb and native render identical sentences from identical keys (rule 27).
    studioPods: {
      // Club Studio's screen/page title. Venue Studio already has its own.
      clubStudio: 'Club Studio',
      venueTitle: 'Pods hosted on your Venue',
      venueSubtitle: 'Every pod booked at your venues — newest first.',
      venueEmpty: 'No pods have been booked at your venue yet.',
      // Venues these pods are spread across — NOT every venue the owner has
      // listed (Venue Studio already counts those separately), so the word is
      // "booked" rather than a second, contradictory "Venues".
      venues: 'Venues booked',
      clubTitle: 'Your Pods',
      clubSubtitle: 'Every pod across the clubs you administer — newest first.',
      clubEmpty: 'No pods in your clubs yet.',
      clubs: 'Clubs',
      // The figures strip.
      total: 'Total pods',
      spotsFilled: 'Spots filled',
      fillRate: '{pct}% full',
      attendees: 'Attendees',
      nextPod: 'Next pod',
      noneScheduled: 'None scheduled',
      // Collected money. Only the club query exposes it, so the venue strip
      // simply ends without this tile.
      collected: 'Collected',
      // The four lifecycle buckets — the state chip on a row AND the count
      // tiles in the strip, so a chip and its tile can never disagree.
      bucketUpcoming: 'Upcoming',
      bucketLive: 'Live now',
      bucketPast: 'Past',
      bucketCancelled: 'Cancelled',
      // One pod row.
      hosts: 'Hosts',
      hostsNone: 'No host assigned',
      spots: 'Spots',
      people: 'People',
      ticket: 'Ticket',
      // The list is capped server-side while the figures count every pod.
      showingLatest: 'Showing the latest {pods} pods — the figures above count them all.',
      error: 'Could not load these pods. Please try again.',
      retry: 'Try again',
    },
    // The Venues discovery list. Its location bar opens the SAME picker the
    // header uses, so mWeb and native say the same thing about it (rule 27).
    venues: {
      locationIn: 'Venues in {city}',
      // No location applied yet — the server then returns every public venue.
      locationAll: 'Venues from all locations',
      change: 'Change',
      changeAria: 'Change location',
    },
  },
};

import type { NestedCatalogue } from '../catalogue';

/** Copy shared by mWeb and the native app — one namespace, one source. */
export const MWEB_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageHint: 'Choose the language for the app.',
      languageSaved: 'Language updated',
      goBack: 'Go back',
      accountHealth: 'Account Health',
      addAComment: 'Add a comment…',
      addressLine1: 'Address line 1',
      addStory: 'Add story',
      all: 'All',
      allAreas: 'All areas',
      allSupportTickets: 'All Support Tickets',
      amenities: 'Amenities',
      applyFilters: 'Apply filters',
      approved: 'Approved',
      approvedPayoutsByMonth: 'Approved payouts by month.',
      areYouSureYourIssueHas: 'Are you sure your issue has been resolved?',
      back: 'Back',
      bio: 'Bio',
      callbackRequest: 'Callback Request',
      cancel: 'Cancel',
      capacity: 'Capacity',
      category: 'Category',
      changePhoto: 'Change photo',
      chatWithUs: 'Chat with Us',
      city: 'City',
      clearSearch: 'Clear search',
      close: 'Close',
      closeFilters: 'Close filters',
      closeImage: 'Close image',
      closeNotifications: 'Close notifications',
      closeStatus: 'Close status',
      closeViewers: 'Close viewers',
      code: 'Code',
      comments: 'Comments',
      community: 'Community',
      contactTheClubAdmin: 'Contact the Club Admin',
      couldNotCreateTheTicketPlease: 'Could not create the ticket. Please try again.',
      couldNotSubmitYourFeedback: 'Could not submit your feedback.',
      couldNotSubmitYourReview: 'Could not submit your review.',
      country: 'Country',
      createPod: 'Create pod',
      createSupportTickets: 'Create Support Tickets',
      dateOfBirth: 'Date of birth',
      delete: 'Delete',
      deleteComment: 'Delete comment',
      deleteDraft: 'Delete draft?',
      deleteDraft2: 'Delete draft',
      deleteStory: 'Delete story?',
      describeTheProblemOrShareYour: 'Describe the problem or share your idea',
      description: 'Description',
      discard: 'Discard',
      done: 'Done',
      downloadTranscript: 'Download transcript',
      downloadWordTranscript: 'Download Word transcript',
      editPhoto: 'Edit photo',
      email: 'Email',
      emailAddress: 'Email address',
      emailTranscript: 'Email transcript',
      emailVerified: 'Email verified.',
      enterOtp: 'Enter OTP',
      exploreVenues: 'Explore venues',
      facilities: 'Facilities',
      fileIsTooLargeMax: 'File is too large (max {max} MB)',
      filter: 'Filter',
      filterPodsByMonth: 'Filter pods by month',
      filters: 'Filters',
      firstName: 'First name',
      groupChat: 'Group chat',
      guestsPerPodOverTime: 'Guests per pod over time.',
      hostEarnings: 'Host Earnings',
      imageIsTooLargeMax: 'Image is too large (max {max} MB)',
      jumpToLatest: 'Jump to latest',
      lastName: 'Last name',
      lastUpdated: 'Last updated',
      lifetimeEarnings: 'Lifetime earnings',
      live: 'Live',
      location: 'Location',
      logout: 'Logout',
      manageAccount: 'Manage Account',
      markAllAsRead: 'Mark all as read',
      markAsResolved: 'Mark as resolved?',
      message: 'Message',
      monthlyHostEarnings: 'Monthly Host Earnings',
      // What the transport says when it could not reach the API at all, and
      // when it reached it but gave up waiting. Both are shown in place of the
      // library's own wording, which describes the socket rather than the fix.
      networkUnavailable:
        'Unable to connect to server. Please check your internet connection and try again.',
      noContinueConversation: 'No, continue conversation',
      openAccountMenu: 'Open account menu',
      openPod: 'Open pod',
      openPost: 'Open post',
      openYourProfile: 'Open your profile',
      paid: 'Paid',
      participantTrend: 'Participant Trend',
      pending: 'Pending',
      pendingApproval: 'Pending approval',
      perks: 'Perks',
      phone: 'Phone',
      phoneNumber: 'Phone number',
      pincode: 'Pincode',
      pleasePickAStarRating: 'Please pick a star rating.',
      pod: 'Pod',
      podsCompleted: 'Pods completed',
      podStatusDistribution: 'Pod Status Distribution',
      policies: 'Policies',
      previewYourVideoStory: 'Preview your video story',
      previous: 'Previous',
      price: 'Price',
      quickNoteOptional: 'Quick note (optional)',
      raised: 'Raised',
      reason: 'Reason',
      reasonOptional: 'Reason (optional)',
      remove: 'Remove',
      removeAttachment: 'Remove attachment',
      removePhoto: 'Remove photo',
      removePhoto2: 'Remove photo?',
      reportAProblem: 'Report a Problem',
      requestTimedOut: 'This is taking longer than usual. Check your connection and try again.',
      resetFilters: 'Reset filters',
      rotate: 'Rotate',
      screenshotsOptional: 'Screenshots (optional)',
      search: 'Search',
      searchClubs: 'Search clubs',
      searchForTopicsOrQuestions: 'Search for topics or questions…',
      searchQuestionsEGRefundHost: 'Search questions, e.g. refund, host',
      searchSavedPods: 'Search saved pods…',
      searchState: 'Search state',
      seeWhoViewedThisStory: 'See who viewed this story',
      selectedLocationMap: 'Selected location map',
      selectLocation: 'Select location',
      sendImage: 'Send image',
      sendMessage: 'Send message',
      share: 'Share',
      shareProfile: 'Share profile',
      shareYourExperienceOptional: 'Share your experience (optional)',
      shop: 'Shop',
      somethingWentWrong: 'Something went wrong',
      sort: 'Sort',
      startAConversation: 'Start a conversation',
      startAConversationWithSupport: 'Start a conversation with support',
      state: 'State',
      subject: 'Subject',
      superCategory: 'Super category',
      switchRole: 'Switch role',
      tellUsYourCategorySoWe: 'Tell us your category so we can ask the right questions.',
      thisInProgressPodWillBe: 'This in-progress pod will be permanently removed.',
      thisMonth: 'This month',
      thisStoryWillBeRemovedFor: 'This story will be removed for everyone.',
      title: 'Title',
      totalPods: 'Total Pods',
      typeAMessage: 'Type a message',
      upcoming: 'Upcoming',
      upcomingOngoingCompletedAndCancelled: 'Upcoming, ongoing, completed and cancelled.',
      values: 'Values',
      venue: 'Venue',
      venues: 'Venues',
      venueSecurity: 'Venue Security',
      verification: 'Verification',
      verify: 'Verify',
      videoIsTooLargeMax: 'Video is too large (max {max} MB)',
      viewPhoto: 'View photo',
      wallet: 'Wallet',
      whatsappNumber: 'WhatsApp number',
      whatWeDo: 'What We Do',
      whoWeAre: 'Who We Are',
      writeAReply: 'Write a reply…',
      yesMarkAsResolved: 'Yes, mark as resolved',
      yourName: 'Your name',
      yourPods: 'Your Pods',
      yourProfilePictureWillBeRemoved: 'Your profile picture will be removed.',
      zoomImage: 'Zoom image',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      continue: 'Continue',
      tapForDetails: 'Tap for details',
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
      podMedia: {
        title: 'Photos from {name}',
        description: 'Add your photos and videos from this pod.',
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
      autoPodsVenue: { title: 'Auto Pods for your venue' },
      autoPodsHost: { title: 'Auto Pods to host' },
      autoPodsClub: { title: 'Auto Pods for your club' },
      podAttendance: { title: 'Mark attendance' },
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
      badges: {
        title: 'Badges',
        description: 'Every Duncit badge, what it takes to unlock it, and how far along you are.',
      },
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
      commPreference: { title: 'Communication preferences' },
      mailPreference: { title: 'Mail preferences' },
      whatsappPreference: { title: 'WhatsApp preferences' },
      smsPreference: { title: 'SMS preferences' },
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
      // The @handle. It is minted by the server at signup and changed from Edit
      // profile, where the field is debounce-checked against the server and the
      // status line below is whichever of these the answer came back as.
      username: {
        label: 'Username',
        placeholder: 'your-handle',
        hint: 'Lowercase letters, numbers and hyphens. Links you have already shared will stop working if you change it.',
        linkLabel: 'Your profile link',
        checking: 'Checking availability…',
        available: '@{username} is available.',
        current: 'This is your username.',
        format: 'Use 3–30 lowercase letters, numbers and single hyphens.',
        taken: 'That username is already taken.',
        reserved: 'That username is reserved.',
        saveFailed: 'That username could not be saved — somebody may have just taken it. Try another one.',
        copyLink: 'Copy profile link',
        linkCopied: 'Profile link copied',
      },
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
      addAddress: 'Add address',
      addressLine2: 'Address line 2',
      changePassword: 'Change password',
      couldNotSaveProfile: 'Could not save profile.',
      couldNotSaveProfile2: 'Could not save profile',
      couldNotSaveYourLanguage: 'Could not save your language',
      couldNotSendTheOtp: 'Could not send the OTP',
      default: 'Default',
      deleteAccount: 'Delete account',
      deleteYourAccount: 'Delete your account?',
      discardUnsavedChanges: 'Discard unsaved changes?',
      editProfile: 'Edit profile',
      emailVerificationOtp: 'Email verification OTP',
      invalidOtp: 'Invalid OTP',
      keepEditing: 'Keep editing',
      // Prefilled into the label field on a NEW address, so it is copy the user
      // reads and edits before saving — not an enum. What they save is their
      // own text, which is why translating the default is safe here.
      addressLabelDefault: 'Home',
      labelHomeOffice: 'Label (Home, Office…)',
      landmark: 'Landmark',
      passwordUpdated: 'Password updated',
      profileCompletion: 'Profile completion',
      profileSettings: 'Profile Settings',
      receiverName: 'Receiver name',
      resendOtp: 'Resend OTP',
      saveAddress: 'Save address',
      sendCode: 'Send code',
      somethingWentWrong: 'Something went wrong.',
      thisPermanentlyDeletesYourAccountAnd: 'This permanently deletes your account and data. This action cannot be undone.',
      togglePrivateAccount: 'Toggle private account',
      /*
        Account deletion. mWeb and native render the same flow (rule 27) over
        the same two mutations, so the copy is one set of keys.

        The wording is deliberate: nothing here promises an immediate deletion,
        because nothing is deleted immediately any more. The tap files a request
        a person in the Tech portal carries out, and the account keeps working
        until they do — so a member who taps this by mistake loses nothing, and
        one who means it is told what actually happens next.
      */
      deletion: {
        action: 'Request account deletion',
        subtitle: 'Ask us to remove your account and everything on it.',
        confirmTitle: 'Request account deletion?',
        /*
          `confirmSealed` REPLACES the old `confirmMessage` / `confirmMessageDays`
          rather than rewording them, and the rename is the whole point.

          Confirming now ENDS the session and closes the account to further
          sign-ins; the old copy promised the opposite ("you can withdraw it any
          time"). Editing those strings in place would not have fixed anything
          in production: the client prefers the server's Localization data over
          this fallback, "Import app keys" never overwrites a translation that
          already exists, and the old English is already sitting in that table.
          The correction only reaches a screen under a key the seeder has never
          seen before.

          The second variant quotes the window the admin actually configured.
          Quoting the real number matters: it is the date the server stamps on
          the request, and the one the member will be held to.
        */
        confirmSealed:
          'This cannot be undone from the app. We will email you a 6-digit code to confirm it is you, and once you enter it you will be signed out of every device and will not be able to sign in again. To stop the deletion after that you will need to contact support.',
        confirmSealedDays:
          'Your account and everything on it will be deleted {days} days from now. We will email you a 6-digit code to confirm it is you — once you enter it you are signed out of every device and cannot sign in again, so contact support if you change your mind during those {days} days.',
        confirmCta: 'Send code',
        otpSent: 'Code sent to your email.',
        otpIntro: 'Enter the code to send your deletion request.',
        otpLabel: '6-digit code',
        otpHint: 'The code we emailed you',
        otpPlaceholder: '123456',
        reasonLabel: 'Why are you leaving?',
        reasonHint: 'Optional — it goes to the person reviewing your request.',
        reasonPlaceholder: 'Tell us what went wrong…',
        submit: 'Send deletion request',
        submitting: 'Sending…',
        didntGetIt: 'Didn’t get it?',
        resend: 'Resend code',
        resending: 'Resending…',
        // The banner that replaces the button once a request is open.
        pendingTitle: 'Deletion requested',
        pendingBody:
          'Our team is reviewing your request. Your account works normally until they remove it.',
        pendingRef: 'Reference {code}',
        pendingOn: 'Requested on {date}',
        deletesOn: 'Your account will be deleted on {date}',
        withdraw: 'Withdraw request',
        withdrawing: 'Withdrawing…',
        withdrawn: 'Deletion request withdrawn.',
        // Filing the request signs the member out, so this dialog is the last
        // thing they see — it has to carry the date and the reference with it.
        submittedTitle: 'Deletion request received',
        submittedOn: 'Your account and everything on it will be deleted on {date}.',
        // Replaces `submittedBody` under a new name, same reason as
        // confirmSealed above: it used to tell people to sign back in to change
        // their mind, and signing back in is exactly what no longer works.
        // Quote the reference — it is the only handle they have left once the
        // session is gone.
        submittedSealed:
          'You have been signed out of every device and this account can no longer sign in. Keep the reference below: it is what support will ask for if you change your mind before that date.',
        signOutNow: 'Sign out',
        // ...and this is that question, asked on the next sign-in.
        noticeTitle: 'Your account is scheduled for deletion',
        noticeDaysLeft: '{count} days left to change your mind.',
        noticeBody:
          'You asked us to delete your account. Everything on it goes on that date and cannot be brought back. Withdraw the request and nothing changes.',
        noticeKeep: 'Keep the request',
        validation: {
          otpPattern: 'Enter the 6 digit code',
          reasonTooLong: 'Please keep this under 1000 characters',
        },
      },
      youHaveUnsavedChangesClosingNow: 'You have unsaved changes. Closing now will lose them.',
      yourPasswordHasBeenChangedSuccessfully: 'Your password has been changed successfully.',
      enterYourCity: 'Enter your city',
      // The heading over the three read-only contact rows in Edit profile.
      // Read-only because each of them is changed on its own, behind a
      // one-time code sent to the new value.
      contactDetails: 'Contact details',
      yourCityUsedToSurfacePods: 'Your city — used to surface pods and clubs near you.',
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
      // Shown from the tap until the account is settled: the browser hand-off
      // and the token exchange after it are both slow enough to look broken
      // without it.
      googleConnecting: 'Connecting to Google…',
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
      // The redesigned landing step. Sign-in is a CHOICE of method now, so the
      // screen offers the two and the email/password boxes live one step in —
      // which is also where "Forgot password?" belongs, since it is only ever
      // about the password.
      continueWithPassword: 'Continue with Password',
      continueWithOtp: 'Continue with OTP',
      chooseMethod: 'How would you like to sign in?',
      passwordStepTitle: 'Sign in with',
      passwordStepTitleAccent: 'password',
      passwordStepSubtitle: 'Enter the email and password you registered with.',
      backToOptions: 'Back to sign-in options',
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
      // The number box only; its dial code is picked from a list and labelled
      // with mweb.common.code, which every other phone row on both apps uses.
      phonePlaceholder: '9876543210',
      phoneHint: 'We use this to reach you about your bookings.',
      // The stepper asks for the WhatsApp number by name, because step four
      // sends a code to it — 'phone' would not explain why.
      whatsappLabel: 'WhatsApp number',
      whatsappHint: 'We send your booking updates and your sign-up code here.',
      dobYearLabel: 'Birth year',
      dobYearHint: 'You must be at least {years} years old to join.',
      referralLabel: 'Referral code (optional)',
      referralHint: 'Have a friend’s code? Both of you earn coins.',
      passwordPlaceholder: 'Create a password',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Re-enter password',
      // mWeb only — MUI X's picker carries a helper line, the native field does not.
      dobHint: 'You must be at least {years} years old',
      // Native only — its date of birth is typed as well as picked. The shape
      // comes from the admin's configured date pattern, never a literal.
      dobPlaceholder: '{format}',
      dobPick: 'Pick date of birth',
      submit: 'Create account',
      // mWeb only — the native button swaps its label for a spinner.
      submitting: 'Creating…',
      haveAccount: 'Already have an account?',
      logIn: 'Log in',
      // The two surfaces enforce slightly different name-length and date rules,
      // so a few of these are rendered by one surface only. The character rule
      // (namePattern) is shared: both run PERSON_NAME from @duncit/regex.
      validation: {
        nameRequired: 'Name is required',
        namePattern: 'Name can use letters, spaces, apostrophes and periods only',
        nameMin: 'Name must be at least 2 characters',
        nameTooLong: 'Name is too long',
        confirmRequired: 'Please confirm your password',
        dobRequired: 'Date of birth is required',
        dobInvalid: 'Enter a valid date of birth',
        dobFormat: 'Use the format {format}',
        dobMinAge: 'You must be at least {years} years old to join Duncit',
        // Signup asks for a birth YEAR, so the shape rule is about four digits
        // rather than a date pattern. BIRTH_YEAR from @duncit/regex.
        dobYearRequired: 'Birth year is required',
        dobYearInvalid: 'Enter a 4-digit year',
        // Phone is required and unique. The client says what shape is expected;
        // whether the number is already on another account is the server's
        // answer, and it arrives as the form's error line.
        phoneRequired: 'Phone number is required',
        phoneInvalid: 'Enter a phone number — digits only, 6 to 15',
        codeRequired: 'Country code is required',
        codeInvalid: 'Use a code like +91',
      },
    },
    // The four-step Join Duncit flow. Every word is rendered from
    // buildSignupStepperLabels in @duncit/utils, so both apps read one set.
    signupSteps: {
      whoTitle: 'About you',
      whoSubtitle: 'Your name, the year you were born, and a referral code if you have one.',
      contactTitle: 'How we reach you',
      contactSubtitle: 'Your WhatsApp number and email address.',
      securityTitle: 'Your password',
      securitySubtitle: 'Pick something only you would guess.',
      verifyTitle: 'Verify WhatsApp',
      verifySubtitle: 'Type the code we sent, and your number is confirmed.',
      stepOf: 'Step {current} of {total}',
      next: 'Continue',
      back: 'Back',
      createAccount: 'Create account',
      creating: 'Creating your account…',
      sendCode: 'Send code',
      sending: 'Sending…',
      verify: 'Verify number',
      verifying: 'Verifying…',
      codeSentTo: 'We sent a 6-digit code to {destination} on WhatsApp.',
      didntGetIt: 'Didn’t get it?',
      resend: 'Send again',
      skipForNow: 'Skip for now',
      testCode: 'Test code: {code}',
      // The Google door has no form behind it, so it asks for the number on a
      // step of its own before a code can be sent to it.
      numberTitle: 'Your WhatsApp number',
      numberSubtitle: 'We send your booking updates and your sign-up code here.',
      sameAsMobile: 'This is also my mobile number',
      sameAsMobileHint: 'Untick if your mobile number is different — we will leave the phone number on your profile blank.',
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
    // The three-step recovery flow: pick a channel, prove the code, set the
    // password. Its own namespace rather than more keys under forgotPassword,
    // because every word is rendered from `buildPasswordRecoveryLabels` in
    // @duncit/utils and both apps read the same set.
    passwordRecovery: {
      emailName: 'Email',
      emailField: 'Email address',
      emailPlaceholder: 'riya@duncit.com',
      emailHint: 'We’ll email your code to this address.',
      phoneName: 'Phone',
      phoneField: 'Phone number',
      phonePlaceholder: '9876543210',
      phoneHint: 'We’ll send your code on WhatsApp to this number.',
      chooseTitle: 'Forgot',
      chooseTitleAccent: 'password?',
      chooseSubtitle: 'Choose where we should send your reset code.',
      sendCode: 'Send code',
      sending: 'Sending…',
      notFound: 'We couldn’t find an account with these details.',
      notSent:
        'We couldn’t send your code that way. Try the other option, or check that this is the right address.',
      newToDuncit: 'New to Duncit?',
      createAccount: 'Create Account',
      codeTitle: 'Enter your',
      codeTitleAccent: 'code',
      codeSubtitle: 'We sent a 6-digit code to {destination}.',
      codeLabel: '6-digit code',
      codeExpiry: 'The code is valid for {minutes} minutes and can be used once.',
      verify: 'Verify code',
      verifying: 'Verifying…',
      didntGetIt: 'Didn’t get it?',
      resend: 'Resend code',
      resending: 'Resending…',
      resendIn: 'Resend in {seconds}s',
      testCode: 'Test code: {code}',
      passwordTitle: 'Create a new',
      passwordTitleAccent: 'password',
      passwordSubtitle: 'Pick something you haven’t used on this account before.',
      savePassword: 'Save password',
      saving: 'Saving…',
      doneTitle: 'Password changed',
      doneTitleAccent: 'successfully',
      doneSubtitle:
        'You’ve been signed out everywhere else. Log in with your new password to continue.',
      continueToLogin: 'Continue to Login',
      back: 'Back',
      stepOf: 'Step {current} of {total}',
      rememberedIt: 'Remembered it?',
    },
    // Continue with OTP — passwordless sign-in. Only the words that DIFFER from
    // password recovery live here: the flow reuses the recovery steps and their
    // channel/code copy through buildOtpLoginLabels, which overrides these few.
    otpLogin: {
      title: 'Sign in with',
      titleAccent: 'a code',
      chooseSubtitle: 'Choose where we should send your sign-in code.',
      verify: 'Verify & sign in',
      verifying: 'Signing in…',
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
      // The rail between the two: a pod that has started but not finished. It
      // cannot be joined any more, so the rail says what it is rather than
      // inviting a booking.
      ongoingPodsTitle: 'Ongoing Pods',
      ongoingPodsSubtitle: 'Happening right now — joining is closed',
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
      dateEarliestFirst: 'Date · Earliest first',
      dateLatestFirst: 'Date · Latest first',
      happeningNearby: 'Happening nearby',
      priceHighToLow: 'Price · High to Low',
      priceLowToHigh: 'Price · Low to High',
      resetLocation: 'Reset Location',
      searchClubsByNameOrVibe: 'Search clubs by name or vibe…',
      seeAllLivePods: 'See all live pods',
      seeAllPreviousPods: 'See all previous pods',
      sortBy: 'Sort by',
      verifyYourEmail: 'Verify your email',
      when: 'When',
      addAnother: 'Add another',
      storyOptions: 'Story options',
    },
    // The Explore filter sheet — presets, sort, vibe, price and date chips plus
    // the sheet's own chrome. mWeb only: the native Explore tab is a reels feed
    // with no filter sheet, so rule 27 has no twin to pair here. The price chips
    // read mweb.podType.*, and the Vibe row's "All" chip reads mweb.home.vibeAll
    // — it is the same chip Home renders.
    explore: {
      filtersTitle: 'Filters',
      filtersSummary: '{activeCount} active - {resultCount} pods match',
      reset: 'Reset',
      showResults: 'Show {count} pods',
      quickPresets: 'Quick presets',
      presetAll: 'All',
      presetTonight: 'Tonight',
      presetTrending: 'Trending',
      presetNearMe: 'Near me',
      sortBy: 'Sort by',
      sortSoonest: 'Soonest',
      sortTrending: 'Trending',
      sortPriceLow: 'Price low',
      sortPriceHigh: 'Price high',
      vibe: 'Vibe',
      showLess: 'Show less',
      moreVibes: '+{count} more',
      price: 'Price',
      when: 'When',
      dateAnyTime: 'Any time',
      dateToday: 'Today',
      dateTomorrow: 'Tomorrow',
      dateThisWeek: 'This week',
      dateThisMonth: 'This month',
      likedBy: 'Liked by',
      more: 'More',
      moreActions: 'More actions',
      noPodsMatchTheseFilters: 'No pods match these filters.',
      open: 'Open',
      openFilters: 'Open filters',
      refreshFeed: 'Refresh feed',
      save: 'Save',
      verifiedClub: 'Verified club',
      openPodDetails: 'Open pod details',
      // Accessible names of the reel rail's icon buttons (the caption under
      // each is a count, not a name).
      join: 'Join',
      like: 'Like',
      comments: 'Comments',
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
    // The booking deep link (`/booking/:bookingId`) — the receipt email's
    // "View Booking" target. It resolves the booking and forwards to its pod,
    // so the only copy is the screen title and what it says when it cannot.
    booking: {
      // Native only — the mWeb page forwards with no heading of its own.
      title: 'Your Booking',
      notFound: 'This booking could not be found.',
      // mWeb only — native forwards to the pod screen either way.
      podUnavailable: 'This pod is no longer available to view.',
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
      bestPrices: 'Best Prices',
      greatDeals: 'Great Deals',
      hassleFree: 'Hassle Free',
      qualityProducts: 'Quality Products',
      rating: 'Rating',
      safeDelivery: 'Safe Delivery',
      searchProducts: 'Search products',
      trustedPods: 'Trusted Pods',
    },
    // The pod-type words, shared wherever a pod is labelled or filtered by
    // whether it charges: the Home and Explore price chips, the Create Pod
    // option list, the Host Studio row chip and podTypeLabel. One set rather
    // than a copy per screen. (Step 4's PodTypeCards still read the older
    // mweb.createPod.podTypeFree/podTypePaid pair.)
    podType: {
      all: 'All',
      free: 'Free',
      paid: 'Paid',
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
      joiningMeeting: 'Opening…',
      joinMeetingFailed: 'Could not open the meeting link',
      meetingLinkAfterJoin: 'Meeting link will be visible after joining this pod.',
      where: 'Where',
      venueDetails: 'Venue details',
      // Native's pod page and both twins' pod-pending summary — mWeb's own pod
      // page formats the schedule through the browser's locale formatter,
      // which has an em dash for a missing date.
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
      sectionClubAdmins: 'Club Admin Details',
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
      // Club admins. The rows themselves reuse `common.contactTheClubAdmin` and
      // the podPending contact labels — the same card the club page and the
      // host's waiting page already render, so only the empty state is new.
      clubAdminsEmpty: 'No club admins listed for this club.',
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
      // Closed state. A pod that is RUNNING has not "taken place" yet, so it
      // gets its own sentence rather than being told it is over.
      bookingClosed: 'This pod has already taken place — booking is closed.',
      bookingClosedOngoing: 'This pod is happening right now — joining is closed.',
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
      // Partial backout. The member is still going with fewer seats, so they
      // are never in "Backout in process" — the seats they gave back are the
      // only thing on sale, and this is the only way to take them back.
      releasedSeatsOne: 'You released 1 seat — we are finding someone to fill it.',
      releasedSeatsMany: 'You released {count} seats — we are finding someone to fill them.',
      takeSeatsBack: 'Take Seats Back',
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
      // The seat picker — a stepper on both surfaces, so it names the group
      // rather than a field, and the two buttons.
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
      couldNotUploadTheImage: 'Could not upload the image.',
      decreaseQuantity: 'Decrease quantity',
      increaseQuantity: 'Increase quantity',
      review: 'Review',
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
      appPopup: 'App popup',
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
      close: 'Close',
      // Closing the prompt without answering asks one more question, so the
      // pop-up knows whether it is allowed to come back. Without it, "again
      // and again" is the only behaviour a dismiss can have.
      remindTitle: 'Should we ask you again?',
      remindBody:
        'Your rating is how the host, the venue and the club find out how “{title}” actually went.',
      remindLater: 'Remind me next time',
      remindNever: 'Do not remind me again',
      submit: 'Submit',
      submitting: 'Sending…',
      rateAspect: 'Rate {aspect} {stars} out of 5',
      failed: 'That could not be sent. Please try again.',
      // The standalone page behind the link a host shares with their guests.
      pageTitle: 'Rate this pod',
      loadFailed: 'That pod could not be opened. Check the link and try again.',
      // The link gets forwarded. Whoever opens it without having been marked
      // present is told which of the two things is missing, so they know
      // whether to book or to ask the host.
      noAccess:
        'You do not have access to this link because you have not joined this pod, or your attendance has not been marked by the host.',
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
    /**
     * A pod’s own photos and videos — the Upload Pod Media page.
     *
     * The host opens it from Your Pods > ⋮, and the people who came open the
     * same page from the link the host sends them — so the copy speaks to both
     * and the page decides which half to show.
     */
    podMedia: {
      uploadPodMedia: 'Upload Pod Media',
      back: 'Back',
      hostIntro:
        'Add the photos and videos from this pod. Whatever you and your guests add here is what the Complete Pod screen shows.',
      guestIntro: 'Add your photos and videos from this pod so the host and everyone who came can see them.',
      addMedia: 'Add photos or videos',
      uploading: 'Saving to this pod…',
      empty: 'Nothing has been added to this pod yet.',
      itemsHeading: '{count} on this pod',
      byHost: 'Host',
      byGuest: 'Guest',
      uploadedBy: 'Added by {name}',
      remove: 'Remove',
      removed: 'Removed',
      added: '{count} added',
      // The link gets forwarded, so whoever opens it without having been marked
      // present is told why rather than shown a picker that would be refused.
      notInvited:
        'Only the host and the people whose attendance was marked can add media to this pod. Ask the host to mark you present.',
      cancelled: 'This pod was cancelled, so nothing more can be added to it.',
      shareLink: 'Share upload link',
      copyLink: 'Copy upload link',
      linkCopied: 'Upload link copied',
      shareHeading: 'Ask your guests for their photos',
      shareBody:
        'Send this link to the people who came. It opens this same page for anyone you marked present.',
      shareMessage: 'Add your photos from “{title}” here:',
      retry: 'Try again',
      loadFailed: 'That pod could not be opened. Check the link and try again.',
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
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2',
      labelHomeOffice: 'Label (Home, Office…)',
      phone: 'Phone',
      receiverName: 'Receiver name',
      useAsMyDefaultAddress: 'Use as my default address',
      // What a saved address refuses, on mWeb and native alike (rule 27). The
      // shapes behind them are @duncit/regex's, so the two apps cannot drift on
      // what a name, a number or a postal code is.
      validation: {
        labelRequired: 'Give this address a label',
        nameInvalid: 'Name can use letters, spaces, apostrophes and periods only',
        phoneInvalid: 'Enter a valid phone number',
        line1Required: 'Address line 1 is required',
        cityRequired: 'City is required',
        stateRequired: 'State is required',
        pincodeInvalid: 'Enter a valid pincode',
      },
    },
    // The cart: the products waiting to be paid for, and the header button that
    // leads back to them.
    cart: {
      title: 'Cart',
      empty: 'Your cart is empty',
      emptyBody: 'Add products from any Pod Shop and they will wait for you here.',
      // The empty-cart CTA. Both surfaces send the buyer to the Pod Shop, so
      // they share the one label (rule 27).
      exploreShop: 'Explore Pod Shop',
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
        nameInvalid: 'Name can use letters, spaces, apostrophes and periods only',
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
      dummy: 'Dummy',
      failedPayment: 'Failed Payment',
      razorpay: 'Razorpay',
      simulate: 'Simulate',
      successfulPayment: 'Successful Payment',
      dummyGatewayOnly: 'Dummy gateway only',
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
      // The blocking overlay between pressing Create Pod and an answer. The
      // wait IS the check reading the pod, so the screen says so rather than
      // showing a nameless spinner over a form the host must not edit now.
      aiMonitoringTitle: 'AI is monitoring…',
      aiMonitoringNote:
        'Reading your title, description, details, hashtags and photos against the community guidelines.',
      aiMonitoringHold: 'Please stay on this screen.',
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
      // The nudge that sits above the section. A reel is optional and the
      // card is collapsed, so the reason to bother has to be readable
      // WITHOUT opening it — it is dropped once a reel is on the pod.
      reelEngagementTitle: 'Want better engagement for your Pod?',
      reelEngagementBody:
        'Consider adding a Pod Reel to attract more users and increase visibility.',
      // Native only — its card carries a subtitle under the title.
      reelSubtitle: 'A short video shown in Explore.',
      reelCapHint:
        'Reel video shows in Explore while this pod is live. Optional — one video up to {max} MB.',
      reelUpload: 'Upload video',
      // mWeb only — native replaces a reel by removing it first.
      reelReplace: 'Replace video',
      // Native only — its upload target is a pressable stack.
      reelUploadAria: 'Upload a reel video',
      removeReel: 'Remove reel',
      // mWeb only — the native picker only offers videos, so the wrong file
      // type can never be chosen.
      reelNotVideo: 'Please pick a video file (MP4, MOV or WebM)',
      reelOverCap: 'That video is over {max}MB — pick a smaller reel.',
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
      dateTimePlaceholder: '{format}',
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
        // A virtual pod has no slot to take its end from, and the end is what
        // closes the meeting link's attendance window.
        endRequiredVirtual: 'A virtual pod needs an end date and time',
        // Native only — its schedule is typed as text and must parse first.
        dateTimeFormat: 'Use the format {format}',
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
      free: 'Free',
    },
    // The waiting screen a host lands on after creating a pod whose venue slot
    // request is still PENDING — banner, pod summary, the venue's contact card
    // and the club-admin help card. mWeb and native render the SAME journey
    // (rule 27), so every key here serves both unless its comment says which.
    podPending: {
      title: 'Slot Request Sent',
      // Host Studio > Your pods > three dots — reopens this page for a pod the
      // host created earlier.
      menuItem: 'Slot Request Status',
      // The venue decides elsewhere, so the page carries its own way to ask
      // again: a button in the header and a pull-down over the content.
      refresh: 'Refresh',
      // The banner follows the venue's decision — amber while it is pending,
      // green once the slot is approved, red once it is declined.
      bannerTitle: 'Your Pod will go live once the venue accepts your slot request.',
      bannerBody:
        "We've sent your slot request to the venue. You'll be notified as soon as the venue approves or declines your request.",
      bannerApprovedTitle: 'Your slot is confirmed — this Pod is live.',
      bannerApprovedBody: 'People can book their spots now. Track them from Host Studio.',
      bannerDeclinedTitle: 'The venue declined your slot request.',
      bannerDeclinedBody:
        'Edit this pod to pick another venue or another slot, and send the request again.',
      loadFailed: 'This pod could not be loaded.',
      // The pod summary card's rows. A missing date reads mweb.podDetails.datePending.
      dateTime: 'Date & time',
      expectedEarnings: 'Expected earnings',
      location: 'Location',
      category: 'Category',
      currentStatus: 'Current status',
      statusAwaitingVenue: 'Awaiting venue approval',
      statusVenueDeclined: 'Venue declined your slot request',
      statusLive: 'Live',
      // The venue card — the slot-decision badge and the venue's contact rows.
      approvalPending: 'Pending Approval',
      approvalApproved: 'Approved',
      approvalDeclined: 'Declined',
      contactPerson: 'Contact person',
      phone: 'Phone',
      whatsapp: 'WhatsApp',
      email: 'Email',
      address: 'Address',
      approvalStatus: 'Approval status',
      actionViewOnMap: 'View on Map',
      // The club-admin help card — its caption and the contact actions under it.
      clubAdminCaption: 'Need Help? Contact the Club Admin',
      actionCall: 'Call',
      actionMessage: 'Message',
      actionEmail: 'Email',
    },
    // The Follow button's three states. REQUESTED only ever appears on a
    // private profile, whose owner must accept before a follow exists.
    follow: {
      follow: 'Follow',
      requested: 'Requested',
      following: 'Following',
      accept: 'Accept',
      reject: 'Deny',
      accepted: 'Accepted',
      rejected: 'Denied',
      // Offered on any follow row where the viewer does not follow the other
      // person yet — beside Accept/Deny while a request is still open, on an
      // accepted one, and alone on "X started following you". The two follow
      // directions are separate edges, so this never answers their request.
      followBack: 'Follow Back',
      // Above Accept / Deny on a profile whose owner has an OPEN request
      // against the viewer — answered from the relationship itself, not only
      // from the notification about it.
      wantsToFollowYou: 'Wants to follow you',
    },
    // The attendance page (Host Studio > Your Pods > three dots > See Marked
    // Attendance, and the Club Admin's Mark Attendance section). Attendance is
    // what the host is PAID on, which is why the earnings note is not a
    // footnote here — an unmarked attendee is an unpaid seat.
    attendance: {
      pageTitle: 'Mark Attendance',
      menuItem: 'See Marked Attendance',
      summary: '{marked} of {total} attendees marked',
      bookingsSummary: '{marked} of {total} bookings',
      markedHeading: 'Attendance marked',
      unmarkedHeading: 'Not marked yet',
      emptyRoster: 'Nobody has booked this pod yet.',
      allMarked: 'Everyone on this pod is marked. Nothing left to do.',
      markButton: 'Mark Attendance',
      marking: 'Marking…',
      markedChip: 'Marked',
      notMarkedChip: 'Not marked',
      seats: 'Admits {count}',
      companionsNeeded: 'Add the other {count} on this booking at the door first.',
      markedBy: 'Marked by {name}',
      markedAt: 'Marked {when}',
      verifiedPhone: 'Verified {phone}',
      methodScan: 'Ticket scanned',
      methodManual: 'Marked by host',
      methodClubAdmin: 'Marked by Club Admin',
      methodAdmin: 'Marked by Duncit',
      methodVirtualJoin: 'Joined the meeting',
      scanCta: 'Scan Attendee Event Tickets',
      earningsTitle: 'Marking attendance is how you get paid',
      earningsBody:
        'Your earnings are calculated only from the attendees you mark. If someone came but is never marked, their seat is left out of your payout.',
      earningsBodyVirtual:
        'This pod is online, so there is no door to scan at. A member is marked present the moment they open the meeting link from the pod page during the pod — anyone who never opens it is left out of your payout unless you mark them by hand.',
      lockedCompletedTitle: 'Attendance is closed for this pod',
      lockedCompletedBody:
        'This pod is completed and its payout is already split, so attendance can no longer be changed. If somebody is missing, contact your Club Admin below.',
      lockedCancelledTitle: 'This pod was cancelled',
      lockedCancelledBody:
        'A cancelled pod has no attendance to record. Contact your Club Admin below if you think this is wrong.',
      clubAdminTitle: 'Need help? Contact your Club Admin',
      clubAdminBody:
        'They can mark an attendee present after the fact — have the booking details ready.',
      clubAdminNone: 'This pod has no Club Admin assigned yet. Reach out to Duncit support.',
      contactEmail: 'Email',
      contactPhone: 'Call',
      contactWhatsapp: 'WhatsApp',
      retry: 'Try again',
      back: 'Back',
      // Verifying the person before a by-hand mark. The code is not actually
      // delivered yet, so the server hands back a test code and this copy tells
      // the host to type it — the flow is real, only the transport is not.
      otpTitle: 'Verify the attendee',
      otpBody:
        'Send {name} a one-time code and enter it here. Their name and number are verified before attendance can be marked.',
      otpName: 'Attendee name',
      otpExtension: 'Country code',
      otpPhone: 'Phone number',
      otpMediumLabel: 'Send the code by',
      otpMediumWhatsapp: 'WhatsApp',
      otpMediumSms: 'SMS',
      otpMediumRequired: 'Choose at least one way to send the code.',
      otpNameRequired: 'Enter the attendee name',
      otpExtensionInvalid: 'Enter a country code',
      otpPhoneInvalid: 'Enter a phone number — digits only, 6 to 15',
      otpSend: 'Send code',
      otpSending: 'Sending…',
      otpResend: 'Send again',
      otpCode: 'One-time code',
      otpCodeInvalid: 'Enter the 6-digit code',
      otpVerify: 'Verify',
      otpVerifying: 'Verifying…',
      otpVerified: 'Verified — you can mark this attendance now.',
      otpTestCode: 'Codes are not being delivered yet. Enter the test code {code}.',
      otpCancel: 'Cancel',
      // The Club Admin's two doors. They get two different calls — "I could not
      // scan them", and "the host forgot the whole pod, here are the names" —
      // so the board asks which one this is instead of assuming.
      chooseTitle: 'Mark {name} present',
      chooseBody:
        'A ticket scan is the strongest proof, so use it whenever you can. When you cannot, pick how you are marking this attendee.',
      chooseOtpTitle: 'Verify with a one-time code',
      chooseOtpBody:
        'Send the attendee a WhatsApp or SMS code and enter it back. The number that answers is recorded against their ticket.',
      chooseDirectTitle: 'Mark directly, no code',
      chooseDirectBody:
        'Use this when the host missed the pod and read you the attendees. Nothing is sent — you are vouching for the mark.',
      chooseCancel: 'Cancel',
      // The direct mark. It exists for when proof cannot be produced, so the
      // warning is the only thing standing between it and a wrong payout.
      forceTitle: 'Mark attendance without a scan',
      forceWarning:
        'You are marking this person present without a ticket scan. Check their details or ask for valid proof first — a wrong mark changes what the host is paid.',
      forceConfirm: 'Yes, mark present',
      forceCancel: 'Cancel',
      // A multi-seat booking. The host would collect these at the door; an
      // admin is read whichever of them the host or the buyer remembers.
      forceCompanionsTitle: 'Who else did this booking bring?',
      forceCompanionsBody:
        'This booking admits {seats}. Add the {count} you were given a name for — leave a row blank if you were not told, the mark still goes through.',
      forceCompanionName: 'Name',
      forceCompanionPhone: 'Phone number (optional)',
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
      // Proving a companion's own number, one person at a time. Optional by
      // design: a dead phone or a number abroad must never hold a group at the
      // door, so this records who was actually proved rather than gating them.
      companionExtension: 'Country code',
      companionVerifyCta: 'Verify on WhatsApp',
      companionOtpHint:
        'Optional. Send this number a code and type it back — one person at a time.',
      companionVerified: 'Verified',
      companionOtpBlocked: 'Finish verifying the person above first.',
      companionOtpFailed: 'Could not send the code. Try again.',
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
    // Editing a pod runs the same AI content check publishing does. This heads
    // the list of rules an edit broke; each line under it is the server's own
    // explanation, so only the heading is translated here.
    /**
     * The host's pod dialogs — @duncit/host-pod-actions. The menu on a pod row
     * and the four dialogs it opens (scan, complete, edit, cancel), plus the
     * edit-and-resubmit flow for a venue-declined pod.
     */
    // The settlement waterfall in the HOST's voice, on the screen where they
    // complete their own pod. `shell.hostShare` below must stay word-for-word
    // identical — the same component draws both.
    hostShare: {
      customerPaid: 'Customer Paid',
      duncitRevenue: 'Duncit revenue',
      gst: '− GST ({pct}%)',
      platformFee: '− Platform Fee ({pct}%)',
      pool: 'Pool',
      previewHint: 'Enter a bill to preview your share.',
      venueReceives: 'Venue receives',
      venueSlotPrice: 'Venue slot price',
      youReceive: 'You receive',
    },
    hostPodActions: {
      menuTooltip: 'Pod actions',
      menuAria: 'Actions for {title}',
      scanTickets: 'Scan attendee event tickets',
      completePod: 'Complete pod',
      editPod: 'Edit pod',
      cancelPod: 'Cancel pod',
      close: 'Close',
      cancel: 'Cancel',
      saving: 'Saving…',
      saveChanges: 'Save changes',
      fieldTitle: 'Title',
      fieldDescription: 'Description',
      fieldMedia: 'Media',
      titleTooShort: 'Title is too short',
      titleTooLong: 'Title is too long',
      descriptionTooShort: 'Add a longer description',
      imageRequired: 'Add at least one image URL',
      resubmitTitle: 'Edit & resubmit pod',
      resubmitHint:
        'Select a different venue or choose a different time slot — your booking request is sent to the venue again when you resubmit. Your pod is kept, no new pod is created.',
      resubmitting: 'Resubmitting…',
      resubmitCta: 'Resubmit request',
      resubmitTitleLengthHint: '3–120 characters',
      resubmitDescriptionLengthHint: 'At least 10 characters',
      venue: 'Venue',
      venueHint: 'Pick the venue to request',
      completeHint:
        'This pod’s photos and videos are the ones added on the Upload Pod Media page — yours and your guests’. Your payout is credited to your wallet as soon as the pod is completed.',
      venueBillAmount: 'Venue Bill Amount',
      venueBillRequired: 'Enter the venue bill amount',
      podMedia: 'Pod Media',
      completing: 'Completing…',
      cancelIntro: 'You are cancelling {title}. This cannot be undone.',
      cancelNoOthers: 'No one else has joined this pod — it will be cancelled immediately.',
      // Count-driven copy: the translator picks .one or .other from `count`.
      cancelOthers: {
        one: '{count} other attendee joined this pod.',
        other: '{count} other attendees joined this pod.',
      },
      cancelRefund: {
        one: 'Cancelling initiates a refund of {amount} across {count} payment (logged in the Finance portal). All attendees will be emailed.',
        other: 'Cancelling initiates a refund of {amount} across {count} payments (logged in the Finance portal). All attendees will be emailed.',
      },
      cancelEmailOnly: 'All attendees will be emailed about the cancellation.',
      reason: 'Reason',
      reasonRequired: 'Select a reason',
      // The reason dropdown. The VALUE stored on the pod stays the English
      // the server's own list uses; only the wording shown is translated.
      cancelReasons: {
        eventCancelled: 'Event cancelled',
        venueUnavailable: 'Venue unavailable',
        lowAttendance: 'Low attendance',
        rescheduling: 'Rescheduling',
        other: 'Other',
      },
      note: 'Note',
      noteHint: 'Shared with attendees in the cancellation email.',
      noteTooLong: 'Keep the note under 500 characters',
      noteRequired: 'Please describe the reason',
      keepPod: 'Keep pod',
      cancelling: 'Cancelling…',
      initiateRefunds: 'Initiate refunds & cancel',
      pasteTicketCode: 'Or paste the ticket code',
      scanFrameHint: 'Hold the attendee’s ticket QR inside the frame.',
      checkCode: 'Check',
    },
    /**
     * The onboarding-meeting dialogs in @duncit/earn — reschedule and cancel,
     * rendered on mWeb's /earn page and in the Partners console.
     */
    earnMeeting: {
      cancelTitle: 'Cancel this meeting?',
      cancelBody:
        'Your onboarding meeting will be cancelled and the slot freed. You can book a new one anytime.',
      cancelReasonLabel: 'Reason for cancelling',
      cancelReasonHint: 'Tell our onboarding team why you’re cancelling.',
      keepMeeting: 'Keep meeting',
      cancelling: 'Cancelling…',
      cancelCta: 'Cancel meeting',
      cancelFailed: 'Could not cancel — please try again.',
      rescheduleTitle: 'Reschedule your onboarding meeting',
      currentlyBooked: 'Currently booked for {when}. You can reschedule once.',
      noSlots: 'No slots are open right now — please check back soon.',
      movingFromTo: 'Moving from {from} to {to}.',
      rescheduleReasonLabel: 'Reason for rescheduling',
      rescheduleReasonHint: 'Tell our onboarding team why you’re moving the meeting.',
      close: 'Close',
      moving: 'Moving…',
      moveCta: 'Move to this slot',
      pickSlot: 'Please pick an available slot.',
      rescheduleFailed: 'Could not reschedule — please try again.',
      reasonRequired: 'Please tell us a reason.',
      reasonTooLong: 'Keep the reason under 500 characters.',
      // Word-for-word the shared chip's label; this namespace carries its own
      // row because @duncit/earn takes no dependency on @duncit/ai-monitoring.
      aiMonitoring: 'AI Monitoring',
    },
    hostPodEdit: {
      contentCheck: 'Content check',
      // Flexible pod count — the spots control inside the host's Edit Pod dialog.
      spotsVenueHint:
        'The space this pod booked holds {capacity} people. {taken} seats are already taken.',
      spotsFreeHint: 'At least {min} spots. {taken} seats are already taken.',
      spotsIncreaseOnly:
        'A live pod’s spots can only be increased — ask your Club Admin to reduce them.',
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
      // Stated only when Finance is actually paying it — "You earn 0 Duncit
      // Coins" is a promise of nothing, which is worse than saying nothing.
      feedbackRateNote: 'You earn {coins} Duncit Coins on your Attended Pod Feedback.',
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
      // The three coin facts every bill states, in the breakdown itself rather
      // than only on the gold row: what this purchase spends, what is left
      // after it, and what it pays back. The earn line is a PREVIEW at the
      // current rate — the server grants on the amount actually charged.
      checkoutUsed: 'Coins used',
      checkoutRemaining: 'Coins remaining',
      checkoutEarning: 'Coins you will earn',
      // Coins move the other way on a backout: the booking paid with them, so
      // giving the seat up gives them back — less the SAME deduction the cash
      // refund takes, which is why the percentage is named in the line.
      refundCoins: 'Coins refunded',
      refundCoinsEstimate: '+{coins} Duncit Coins back, after the same {pct}% deduction.',
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
      flipCard: 'Flip card',
      cardFront: 'Front of the gift card',
      cardBack: 'Back of the gift card',
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
      accountHolderName: 'Account holder name',
      accountNumber: 'Account number',
      amount: 'Amount',
      amountMax: 'Amount (max {max})',
      couldNotRequestTheWithdrawal: 'Could not request the withdrawal',
      enterAccountNumber: 'Enter account number',
      enterAnAmount: 'Enter an amount',
      enterIfscCode: 'Enter IFSC code',
      enterYourUpiId: 'Enter your UPI ID',
      ifscCode: 'IFSC code',
      maxAmount: 'Max {max}',
      minimumAmount: 'Minimum {min}',
      noWithdrawalsYet: 'No withdrawals yet.',
      payoutMethod: 'Payout method',
      requesting: 'Requesting…',
      requestWithdrawal: 'Request withdrawal',
      upiId: 'UPI ID',
      withdraw: 'Withdraw',
      withdrawFromWallet: 'Withdraw from wallet',
      yourPodPayoutsWillShowUp: 'Your pod payouts will show up here.',
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
      images: 'Images',
      searchVenues: 'Search venues',
      searchVenuesByNameTypeOr: 'Search venues by name, type or area',
      mapPreview: 'Map preview',
    },
    // Auto Pods — an admin writes the pod, then a venue, a host and a club
    // admin each enrol in it. One namespace for mWeb AND native (rule 27), and
    // the portals mirror it word-for-word under shell.autoPods.
    autoPods: {
      venueTitle: 'Auto Pods for your venue',
      hostTitle: 'Auto Pods to host',
      clubTitle: 'Auto Pods for your club',
      // The three enrolments, shown as ticks on every card: amber until that
      // partner enrols, green once they have.
      tickVenue: 'Venue Enroll',
      tickHost: 'Host Enroll',
      tickClubAdmin: 'Club Admin Enroll',
      tickPending: 'Pending',
      tickDone: 'Enrolled',
      needsAction: 'Needs your action',
      claimedByYou: 'You enrolled',
      acceptCta: 'Accept & pick a slot',
      assignMyselfCta: 'Assign Myself',
      claimForClubCta: 'Claim for my club',
      pickVenue: 'Which venue?',
      pickSlot: 'Pick a slot',
      pickClub: 'Which club?',
      confirmAccept: 'Accept this Auto Pod?',
      // Enrolments happen in any order, so the body names "the others" rather
      // than a fixed sequence.
      confirmAcceptAnyOrder:
        'Your slot is booked for this pod straight away. It goes live once everyone else has enrolled too.',
      confirmAssign: 'Host this Auto Pod?',
      confirmAssignAnyOrder:
        'You become the host of this pod. It goes live once everyone else has enrolled too.',
      confirmClaim: 'Claim this Auto Pod?',
      confirmClaimBody: 'The pod is created under this club as soon as everyone has enrolled.',
      priceLabel: 'Ticket',
      spotsLabel: 'Spots',
      expectedEarnings: 'You could earn {amount}',
      waitingVenue: 'Waiting for a venue to accept',
      waitingHost: 'Waiting for a host',
      waitingClub: 'Waiting for a club admin',
      waitingFor: 'Waiting for {roles}',
      roleVenue: 'a venue',
      roleHost: 'a host',
      roleClub: 'a club admin',
      // The filters at the top of every queue page, and the card's city line.
      locationLabel: 'Location',
      allLocations: 'All cities',
      changeLocation: 'Change',
      categoryLabel: 'Category',
      allCategories: 'All my categories',
      noHostCategories: 'You are not an approved host in any category yet.',
      pinnedTo: 'In {city}',
      unpinned: 'Any city — the first partner to enrol sets it',
      virtualPod: 'Virtual pod — no venue needed',
      // The venue queue: which of the owner's venues is looking, and its
      // category (the offers shown are the ones THAT venue could take).
      venueLabel: 'Venue',
      noVenues: 'Add an approved venue to be offered Auto Pods.',
      venueCategory: 'Category: {path}',
      noVenueCategory: 'This venue has no category yet — set one under Manage venue to be offered Auto Pods.',
      pickVenueFirst: 'Pick a venue at the top first.',
      // The card's countdown — Pod Settings decides the window.
      removedIn: 'Removed from your list in {hours}h {minutes}m',
      // The slot picker.
      slotWindow: 'Free slots in the next {days} days, nearest first.',
      potentialEarning: 'You earn {amount} from this slot, after Duncit’s deductions.',
      slotNotViable: 'The pod cannot cover this slot’s price.',
      acceptingWith: 'Accepting with {venue}',
      // The heading over what this partner already enrolled in. Enrolment runs
      // venue → host → club admin, so the club admin's is the final list.
      assignedVenue: 'Assigned slot',
      assignedHost: 'Assigned Auto Pods',
      assignedClub: 'Final assigned Auto Pods',
      // Taking an enrolment back — the warning is the product's own sentence.
      withdrawCta: 'Cancel Auto Pod',
      withdrawTitle: 'Cancel this Auto Pod?',
      withdrawWarning:
        'This Auto Pod is dependent on multiple resources. Please make sure your profile health may be impacted if you cancel this Auto Pod.',
      withdrawPenalty: 'Cancelling deducts {points} Account Health points.',
      withdrawConfirm: 'Yes, cancel',
      withdrawn: 'You have cancelled this Auto Pod. It is back on the list for others.',
      // The host's numbers on the offer, and what they add up to after every deduction.
      ticketPrice: 'Ticket price',
      spotsField: 'Number of spots',
      spotsRange: 'Between {min} and {max} spots.',
      projectionTitle: 'Your potential earning',
      projectionHost: 'You earn {amount}',
      projectionVenue: 'Venue: {amount}',
      projectionClub: 'Club admin: {amount}',
      projectionFees: 'Duncit fee and GST: {amount}',
      projectionNotViable: 'At this price you would earn nothing — raise the ticket price or the number of spots.',
      pickLocationFirst: 'Select your city at the top first — this pod takes its city from you.',
      willPinTo: 'This pod will be set to {city}.',
      noVenueInCity: 'None of your venues is in {city}.',
      noClubInCity: 'None of your clubs is in {city}.',
      liveNow: 'Live',
      viewPod: 'View pod',
      cancelled: 'Cancelled',
      expired: 'Expired',
      // Someone else won the race for this offer.
      claimedElsewhere: 'Someone else took this Auto Pod first.',
      dismiss: 'Cancel',
      emptyVenue: 'No Auto Pods are waiting for a venue right now.',
      emptyHost: 'No Auto Pods need a host right now.',
      emptyClub: 'No Auto Pods need a club right now.',
      noSlots: 'This venue has no free slots. Add availability first.',
      addAvailability: 'Add availability',
      loadFailed: 'Could not load Auto Pods. Please try again.',
      retry: 'Try again',
    },
    accountEdit: {
      discardChanges: 'Discard changes',
      enterCity: 'Enter city',
      nextMonth: 'Next month',
      previousMonth: 'Previous month',
      selectCountry: 'Select country',
      selectState: 'Select state',
      typeAYear: 'Type a year',
      // The character rule is the same PERSON_NAME from @duncit/regex that
      // signup runs, so a profile edit cannot save a name signup would have
      // rejected. mWeb and native render these identically (rule 27).
      validation: {
        firstNamePattern: 'First name can use letters, spaces, apostrophes and periods only',
        lastNamePattern: 'Last name can use letters, spaces, apostrophes and periods only',
      },
    },
    addressBook: {
      addressBook: 'Address Book',
    },
    ads: {
      learnMore: 'Learn more',
      sponsored: 'Sponsored',
    },
    appHeader: {
      changeCityOrZone: 'Change city or zone',
      notifications: 'Notifications',
      searchLocalityOrPinCode: 'Search locality or PIN code',
      searchPods: 'Search pods',
      userDataNotLoaded: 'User data not loaded',
      goToHomeAndRefresh: 'Go to home and refresh',
    },
    badges: {
      badgeDetails: 'Badge details',
      // The Badges section — every badge the platform publishes, each one
      // stating its GOAL and the WINDOW that goal has to happen in, plus how
      // far along the member is. mWeb and native render the same list from the
      // same `@duncit/utils` vocabulary (rules 27/40), and the profile shows
      // the achieved ones underneath the followers row.
      title: 'Badges',
      sidebarLabel: 'Badges',
      intro:
        'Every badge below states its goal and the window it has to happen in. Reach the goal and the badge unlocks on your profile.',
      goalLabel: 'Goal',
      timelineLabel: 'Unlock timeline',
      achieved: 'Achieved',
      locked: 'Locked',
      achievedOn: 'Achieved on {date}',
      progressLabel: 'Progress',
      progressValue: '{current} / {target}',
      summary: '{unlocked} of {total} unlocked',
      empty: 'No badges have been published yet. Check back soon.',
      loadError: 'Your badges could not be loaded. Please try again.',
      profileEmpty:
        'No badges yet — join pods, bring a friend along and explore new categories to start unlocking them.',
      viewAll: 'View all badges',
      // One goal line per condition. {target} is the badge's threshold —
      // deliberately not named `count`, which the translator reserves for its
      // own plural counter and would blank out here.
      goalPodJoin: 'Join {target} pods',
      goalPodHost: 'Host {target} pods',
      goalClubJoin: 'Join pods in {target} different clubs',
      goalPodReferral: 'Bring {target} friends into pods',
      goalPodAttend: 'Attend {target} pods',
      goalCategoryAttend: 'Attend {target} pods in this category',
      goalPlusOne: 'Bring a +1 along to {target} pods',
      goalDistinctCategory: 'Attend pods across {target} different categories',
      goalMonthlyAttend: 'Attend {target} pods inside one calendar month',
      goalRoleGranted: 'Get approved as a Duncit partner',
      goalManual: 'Awarded by the Duncit team',
      windowLifetime: 'Counts everything since you joined Duncit',
      windowCalendarMonth: 'Must all happen inside one calendar month',
      windowOnApproval: 'Unlocks the moment your application is approved',
    },
    beClubAdmin: {
      beAClubAdmin: 'Be a Club Admin',
      runADuncitClubAndManage: 'Run a Duncit club and manage its pods and members.',
    },
    becomeHost: {
      beAHost: 'Be a host',
      startHostingPodsAndBringPeople: 'Start hosting pods and bring people together.',
    },
    callback: {
      callbackRequestedWeWillReachYou: 'Callback requested. We will reach you shortly.',
      callNow: 'Call now',
      requestCallback: 'Request callback',
    },
    changePassword: {
      confirmNewPassword: 'Confirm new password',
      createANewPassword: 'Create a new password',
      currentPassword: 'Current password',
      enterYourCurrentPassword: 'Enter your current password',
      mustDifferFromCurrent: 'New password must be different from your current password',
      newPassword: 'New password',
      reEnterNewPassword: 'Re-enter new password',
    },
    chat: {
      chatMessage: 'Chat message',
      emoji: 'Emoji',
      previousPods: 'Previous Pods',
      upcomingPods: 'Upcoming Pods',
    },
    chatRoom: {
      dismissError: 'Dismiss error',
      ended: 'Ended',
      image: 'Image',
      photoAccessIsNeededToSend: 'Photo access is needed to send an image.',
      podDetailsAreUnavailableForThis: 'Pod details are unavailable for this chat.',
    },
    chats: {
      searchChats: 'Search chats',
      searchChatsByPodName: 'Search chats by pod name…',
    },
    chatsPage: {
      searchChatsByPodName: 'Search chats by pod name',
    },
    chatWithUs: {
      chatLiveWithAnAgent: 'Chat live with an agent',
    },
    clubDetails: {
      addAStoryToThisClub: 'Add a story to this club',
      commentOptional: 'Comment (optional)',
      next: 'Next',
      noPodsScheduledForThisClub: 'No pods scheduled for this club yet.',
      openImage: 'Open image',
      rateThisClub: 'Rate this Club',
      hosts: 'Hosts',
      viewAllClubMembers: 'View all club members',
    },
    clubDetailsPage: {
      clubNotFound: 'Club not found.',
    },
    clubsPage: {
      noClubsFound: 'No clubs found.',
    },
    details: {
      addToSelection: 'Add to selection',
      closeBrand: 'Close brand',
      nextImage: 'Next image',
      openVenueDetails: 'Open venue details',
      previousImage: 'Previous image',
      removeFromSelection: 'Remove from selection',
      showDistance: 'Show distance',
      clubHosts: 'Club Hosts',
    },
    earn: {
      addAShortReason: 'Add a short reason',
      cancelMeeting: 'Cancel meeting',
      cancelThisMeeting: 'Cancel this meeting?',
      earnWithDuncit: 'Earn with Duncit',
      keepMeeting: 'Keep meeting',
      moveToThisSlot: 'Move to this slot',
      pickAnAvailableSlot: 'Pick an available slot',
      pleaseTellUsWhyYouAre: 'Please tell us why you are rescheduling',
      pleaseTellUsWhyYouAre2: 'Please tell us why you are cancelling',
      rescheduleMeeting: 'Reschedule meeting',
      whyAreYouCancelling: 'Why are you cancelling?',
      whyAreYouRescheduling: 'Why are you rescheduling?',
      subtitle: 'Pick a way to start earning on Duncit.',
    },
    errorBoundary: {
      anUnexpectedError: 'An unexpected error occurred. Please try again.',
      somethingWentWrong: 'Something went wrong',
      tryAgain: 'Try again',
    },
    faqs: {
      searchFaqs: 'Search FAQs',
    },
    faqsPage: {
      helpful: 'Helpful',
      noFaqsMatchYourSearch: 'No FAQs match your search.',
      notReally: 'Not really',
    },
    feedback: {
      couldNotSendFeedbackPleaseTry: 'Could not send feedback. Please try again.',
    },
    followList: {
      connections: 'Connections',
      followers: 'Followers',
    },
    followPage: {
      followClubsToSeeTheirPosts: 'Follow clubs to see their posts here',
      followPeopleToSeeTheirPosts: 'Follow people to see their posts here',
      latestPostsFromYourClubsAnd: 'Latest posts from your clubs and people',
      people: 'People',
    },
    forceUpdateGate: {
      updateNow: 'Update now',
    },
    hostApply: {
      aFewQuickQuestionsBeforeYou: 'A few quick questions before you submit.',
      couldNotSubmitYourRequestPlease: 'Could not submit your request — please try again.',
      hostANewCategory: 'Host a new category',
      submit: 'Submit',
    },
    hostDashboard: {
      dashboard: 'Dashboard',
      pods: 'Pods',
      profileHealth: 'Profile health',
      viewProfileHealth: 'View profile health',
      // The Host Studio insight charts. mWeb draws them with @mui/x-charts and
      // the app with gifted-charts, but the labels come from @duncit/utils'
      // host-insights helpers so the two read identically (rule 27). They were
      // English literals inside both copies of that file before it was shared.
      insights: {
        rangeAll: 'All',
        rangeLastYear: 'Last Year ({year})',
        rangeCurrentYear: 'Current Year ({year})',
        rangePast6Months: 'Past 6 Months',
        rangePast3Months: 'Past 3 Months',
        titleAll: 'All Hosted Pods',
        descAll: 'Your complete Pod hosting history.',
        titleYear: 'Pods Hosted in {year}',
        descYear: 'Your hosted Pods during {year}.',
        titlePast6: 'Pods Hosted in Past 6 Months',
        descPast6: 'Your hosted Pods over the last 6 months.',
        titlePast3: 'Pods Hosted in Past 3 Months',
        descPast3: 'Your hosted Pods over the last 3 months.',
        statusUpcoming: 'Upcoming',
        statusOngoing: 'Ongoing',
        statusCompleted: 'Completed',
        statusCancelled: 'Cancelled',
      },
    },
    hostManage: {
      applyNow: 'Apply Now',
      cancelPod: 'Cancel pod',
      commissionPct: '− Commission ({pct}%)',
      completeAPodToSeeYour: 'Complete a pod to see your share here.',
      completePod: 'Complete pod',
      continueDraft: 'Continue draft',
      couldNotCancelThePod: 'Could not cancel the pod',
      couldNotCompleteThePod: 'Could not complete the pod',
      couldNotReadThatTicket: 'Could not read that ticket',
      couldNotResubmitThePod: 'Could not resubmit the pod',
      createAPod: 'Create a Pod',
      customerPaid: 'Customer Paid',
      draftExpiresInHours: 'Deleted in {hours}h',
      draftExpiresWithinHour: 'Deleted within the hour',
      draftPods: 'Draft pods',
      draftRetentionNote:
        'Draft Pods are automatically deleted {days} days after they are created. Publish your Pod before it expires.',
      draftsExpiringSoon: 'Deleted in the next 24 hours',
      draftsExpiringSoonNote:
        'Publish these drafts now. The next cleanup removes them for good.',
      duncitRevenue: 'Duncit revenue',
      duncitTakenPct: 'Duncit Taken ({pct}%)',
      editPod: 'Edit pod',
      eventDate: 'Event date',
      filterCount: 'Filter ({count})',
      filterPods: 'Filter pods',
      gstPct: 'GST ({pct}%)',
      hostDashboardAndInsights: 'Host dashboard and insights',
      hostShare: 'Host Share',
      hostsManagement: 'Hosts Management',
      keepPod: 'Keep pod',
      markAttendance: 'Mark attendance',
      media: 'Media',
      noDraftsYet: 'No drafts yet. Pods you start saving will show up here.',
      noPodsMatchTheseFiltersTry: 'No pods match these filters. Try adjusting or resetting them.',
      noRequestedPods: 'No Requested Pods',
      noteForAttendees: 'Note for attendees',
      noteSharedWithAttendees: 'Note (shared with attendees)',
      otherDrafts: 'Other drafts',
      payout: 'Payout',
      podActions: 'Pod actions',
      podMedia: 'Pod Media',
      podsByMonth: 'Pods by month',
      pool: 'Pool',
      rejectedPods: 'Rejected Pods',
      rejectedPodsSubtitle:
        'The venue turned these slots down. Edit the pod and send the request again.',
      requestedOn: 'Requested on',
      requestedPods: 'Requested Pods',
      requestedPodsEmpty: 'Pods awaiting venue approval will appear here.',
      requestedPodsSubtitle: 'Waiting on the venue to approve the slot you asked for.',
      resubmitRequest: 'Resubmit request',
      saveChanges: 'Save changes',
      scanAttendeeEventTickets: 'Scan attendee event tickets',
      scanNext: 'Scan next',
      time: 'Time',
      type: 'Type',
      untitledPod: 'Untitled pod',
      venueBill: 'Venue bill',
      venueBillAmount: 'Venue Bill Amount',
      venuePrice: 'Venue price',
      venueReceives: 'Venue receives',
      viewProfile: 'View profile',
      yourAmount: 'Your Amount',
      yourAmount2: 'Your amount',
      yourCommission: 'Your Commission',
      yourCommissionPct: 'Your Commission ({pct}%)',
      youReceive: 'You receive',
    },
    hostsVenues: {
      hostsAndVenues: 'Hosts & Venues',
      joinMeeting: 'Join meeting',
    },
    interviewBooking: {
      emailIsRequired: 'Email is required',
      fullName: 'Full name',
      phoneCodeIsInvalid: 'Phone code is invalid',
      phoneMustContainOnlyDigits6: 'Phone must contain only digits (6-15 digits)',
      pickAtLeastOnePreferredTime: 'Pick at least one preferred time slot',
      venueAddress: 'Venue address',
      venueName: 'Venue name',
      yourNameIsRequired: 'Your name is required',
      zoneArea: 'Zone / Area',
      // The page validates as it is filled in rather than only on submit, so
      // every rule below needs a sentence of its own. The shapes come from
      // @duncit/regex, the same ones signup and Edit profile ask for.
      nameInvalid: 'Name can use letters, spaces, apostrophes and periods only',
      emailInvalid: 'Enter a valid email address',
      phoneIsRequired: 'Phone number is required',
      aboutRequired: 'Tell us a bit more (10+ characters)',
      aboutMax: 'This must be 2000 characters or fewer',
      venueNameMax: 'Venue name must be 120 characters or fewer',
      venueAddressMax: 'Venue address must be 500 characters or fewer',
      cityMax: 'City must be 80 characters or fewer',
      zoneMax: 'Zone must be 80 characters or fewer',
      slotsMax: 'Up to 5 time slots',
      typeInvalid: 'Select a valid type',
      slotStartInvalid: 'Start time must be a valid date',
      slotEndInvalid: 'End time must be a valid date',
      slotEndBeforeStart: 'End must be after start',
    },
    listProduct: {
      listYourProduct: 'List your product',
      sellYourProductsToTheDuncit: 'Sell your products to the Duncit community.',
    },
    location: {
      applyLocation: 'Apply location',
      searchAreaOrPinCode: 'Search area or PIN code',
      useMyLocation: 'Use my location',
    },
    mapEmbed: {
      openInMaps: 'Open in Maps',
      podLocationMap: 'Pod location map',
    },
    mediaCrop: {
      noCrop: 'No Crop',
      upload: 'Upload',
    },
    moments: {
      closePreview: 'Close preview',
      momentPreview: 'Moment preview',
      nextMoment: 'Next moment',
      previousMoment: 'Previous moment',
    },
    notFound: {
      goToHome: 'Go to home',
    },
    notifications: {
      allowNotifications: 'Allow notifications',
    },
    ordersHistory: {
      myProductOrders: 'My Product Orders',
    },
    paymentLottie: {
      paymentSuccessful: 'Payment successful',
      processingPayment: 'Processing payment',
    },
    podIdeas: {
      commentOnIdea: 'Comment on idea',
      couldNotSubmitYourIdeaPlease: 'Could not submit your idea. Please try again.',
      deleted: 'Deleted',
      deleteIdea: 'Delete idea',
      deleteThisIdea: 'Delete this idea?',
      ideaNotFound: 'Idea not found.',
      ideaSubmittedItWillAppearPublicly: 'Idea submitted! It will appear publicly once approved.',
      likeIdea: 'Like idea',
      linkCopiedToClipboard: 'Link copied to clipboard',
      noIdeasYetBeTheFirst: 'No ideas yet — be the first to share one!',
      pleaseSelectASuperCategoryCategory: 'Please select a Super Category, Category and Sub Category.',
      pleaseSignInToShareAn: 'Please sign in to share an idea',
      podIdeas: 'Pod Ideas',
      rejected: 'Rejected',
      searchIdeas: 'Search ideas…',
      searchPodIdeas: 'Search pod ideas',
      shareAnIdea: 'Share an idea',
      shareAPodIdea: 'Share a pod idea',
      shareIdea: 'Share idea',
      submitIdea: 'Submit idea',
      thisPermanentlyRemovesTheIdeaIts: 'This permanently removes the idea, its likes, and all comments.',
      thisWillPermanentlyRemoveTheIdea: 'This will permanently remove the idea, its likes, and all comments.',
      titleAndDescriptionAreBothRequired: 'Title and description are both required.',
      describeTheVibeFormatLocationAudience: 'Describe the vibe, format, location, audience…',
    },
    podPlans: {
      browsePlansAndPickWhatFits: 'Browse plans and pick what fits your vibe.',
      podPlans: 'Pod Plans',
    },
    podPlansPage: {
      comingSoon: 'Coming soon',
    },
    policy: {
      downloadPdf: 'Download PDF',
    },
    policyPage: {
      noPolicySpecified: 'No policy specified.',
    },
    policyPdfButton: {
      couldNotPrepareThePdfPlease: 'Could not prepare the PDF. Please try again.',
    },
    productDetailPage: {
      productNotFound: 'Product not found.',
    },
    productsManage: {
      avgPrice: 'Avg price',
      ecommStudio: 'ecomm Studio',
      inStock: 'In stock',
      productFeaturesAreNotAvailableRight: 'Product features are not available right now.',
      products: 'Products',
    },
    commPreference: {
      title: 'Communication Preferences',
      // The line under the single row in Profile Settings, and the line under
      // the hub's own heading. Two places, two sentences: the row says what is
      // behind it, the hub says what the reader is about to choose.
      entryHint: 'Email, WhatsApp and SMS',
      blurb: 'Pick a channel to choose what Duncit sends you there.',
      // Channel names. Rendered by the section AND by each channel's own
      // screen, so they are named once.
      email: 'Email',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
      emailHint: 'Choose which emails we send you',
      whatsappHint: 'Choose which WhatsApp messages we send you',
      smsHint: 'Choose which text messages we send you',
      // "Authentication messages", not "one-time codes": the reader is being
      // asked where a security message may reach them, and half of them have
      // never called the six digits inside it a code.
      authTitle: 'Authentication messages',
      authBody:
        'The messages that prove it is you — signing in, and marking attendance at a pod.',
      authSentTo: 'Sent to {destination}.',
      // The switch is disabled rather than allowed to strand somebody — the
      // same shape as Connected Accounts' only-way-in guard.
      authLocked:
        'This is the only channel that can reach you, so authentication messages stay on here.',
      // The hub's one-line summary per channel.
      authOn: 'Authentication messages on',
      authOff: 'Authentication messages off',
      emailMissing: 'Add an email address to get messages here.',
      whatsappMissing: 'Add a WhatsApp number to get messages here.',
      smsMissing: 'Add a phone number to get messages here.',
      saved: 'Preferences updated',
      saveFailed: 'Could not change that. Please try again.',
      loadFailed: 'Could not load your communication preferences.',
    },
    // Changing the email address, phone number or WhatsApp number on the
    // account. Rendered by mWeb and the native app from ONE label builder in
    // @duncit/utils, so the two screens cannot say different things (rule 27).
    contactChange: {
      // The contact-change form refuses input the same way on mWeb and native —
      // the rules live in @duncit/forms/schemas, so these sentences are shared
      // rather than hard-coded once per surface (rule 38).
      validation: {
        emailTooLong: 'That address is too long',
        emailInvalid: 'Enter a valid email address',
        extensionInvalid: 'Pick a country code',
        phoneInvalid: 'Enter a valid phone number',
        otpInvalid: 'Enter the 6-digit code',
      },
      emailName: 'Email',
      emailField: 'New email address',
      emailEmpty: 'No email address yet',
      emailTitle: 'Change email address',
      emailHint: 'We will email a 6-digit code to the new address to confirm it is yours.',
      phoneName: 'Phone number',
      phoneField: 'New phone number',
      phoneEmpty: 'No phone number yet',
      phoneTitle: 'Change phone number',
      phoneHint: 'We will send a 6-digit code to the new number to confirm it is yours.',
      whatsappName: 'WhatsApp number',
      whatsappField: 'New WhatsApp number',
      whatsappEmpty: 'No WhatsApp number yet',
      whatsappTitle: 'Change WhatsApp number',
      whatsappHint: 'We will send a 6-digit code on WhatsApp to confirm the new number is yours.',
      change: 'Change',
      add: 'Add',
      sendCode: 'Send code',
      sending: 'Sending…',
      codeLabel: '6-digit code',
      codeSentTo: 'We sent a code to {destination}.',
      verifyAndSave: 'Verify and save',
      verifying: 'Verifying…',
      resend: 'Send another code',
      resendIn: 'You can ask for another code in {seconds}s',
      editValue: 'Change this',
      cancel: 'Cancel',
      unchanged: 'That is what your account already has.',
      // Shown only while no SMS or WhatsApp transport is wired, which is when
      // the server hands the code back rather than sending it anywhere.
      testCode: 'Test code: {code}',
      whyOtp:
        'We ask for a code so nobody else can move your account to an address or number you do not use.',
      // All three are required, so Edit profile says so once under the rows
      // rather than three times beside them.
      allRequired:
        'Your email address, phone number and WhatsApp number are all required.',
      saved: '{channelName} updated',
    },
    smsPreference: {
      title: 'SMS Preference',
      subtitle: 'These are the texts we send to {destination}.',
      noNumber: 'Add a phone number to your account to receive texts.',
      // Said plainly rather than implied by an empty list: a screen with one
      // switch on it reads as broken unless it says why.
      authOnly:
        'Authentication messages are the only texts Duncit sends today. There are no marketing or reminder texts to switch off.',
      loadFailed: 'Could not load your SMS preferences.',
    },
    profile: {
      aboutYourPet: 'About your pet',
      accountSettings: 'Account settings',
      addPost: 'Add post',
      addYourFirstPost: 'Add your first post',
      ageYrs: 'Age (yrs)',
      badges: 'Badges',
      breedOrTypeYourOwn: 'Breed (or type your own)',
      deletePost: 'Delete post',
      deleteThisPost: 'Delete this post?',
      dogCat: 'Dog, Cat, …',
      hostApplication: 'Host application',
      label: 'Label',
      likePost: 'Like post',
      links: 'Links',
      petName: 'Pet name',
      petProfile: 'Pet profile',
      petProfile2: 'Pet Profile',
      pickAnImageToShare: 'Pick an image to share.',
      postNotFound: 'Post not found.',
      profileDescription: 'Profile description',
      profileSettings: 'Profile settings',
      removeLink: 'remove link',
      savePhoto: 'Save photo',
      sharePhotos: 'Share Photos',
      sharePost: 'Share post',
      shareYourFirstPhoto: 'Share your first photo',
      species: 'Species',
      thisWillPermanentlyRemoveThePost: 'This will permanently remove the post and all its comments.',
      userHost: 'User Host',
      userVenues: 'User Venues',
      verifyEmail: 'Verify email',
      whenYouSharePhotosTheyWill: 'When you share photos, they will appear on your profile.',
      writeACaption: 'Write a caption…',
      yourProfile: 'Your Profile',
      chooseImageForYourPost: 'Choose image for your post',
      createANewPodIdea: 'Create a new pod idea',
      editMyProfile: 'Edit my profile',
      openAccountSettings: 'Open account settings',
      uploadPetPhoto: 'Upload pet photo',
    },
    profileAvatar: {
      changeProfilePhoto: 'Change profile photo',
      viewYourStory: 'View your story',
      closePhoto: 'Close photo',
      profilePhoto: 'Profile photo',
      rotation: 'Rotation',
      zoom: 'Zoom',
    },
    publicProfile: {
      editMyProfile: 'Edit my profile',
      profile: 'Profile',
      userNotFound: 'User not found.',
    },
    registerVenue: {
      beAVenueOwner: 'Be a Venue Owner',
      listYourVenueAndHostPods: 'List your venue and host pods at your space.',
    },
    saved: {
      noSavedPodsYetTapThe: 'No saved pods yet. Tap the bookmark on a pod to save it.',
      savedItems: 'Saved Items',
      searchSavedPods: 'Search saved pods',
      subCategory: 'Sub Category',
      superCategory: 'Super Category',
    },
    savedItems: {
      filterByCategory: 'Filter by category',
      sortSavedPods: 'Sort saved pods',
      subCategory: 'Sub category',
    },
    search: {
      browseTheFullSetOfCategories: 'Browse the full set of categories and discover communities that match what you love.',
      closeFilter: 'Close filter',
      closeSort: 'Close sort',
      exploreExperiencesHappeningSoon: '🔥 Explore Experiences Happening Soon',
      exploreOtherInterests: 'Explore Other Interests',
      filterByCategory: 'Filter by Category',
      moreClubsWorthExploring: '✨ More Clubs Worth Exploring',
      searchClubsPodsCategoriesOrActivities: 'Search clubs, pods, categories or activities…',
      sortResults: 'Sort Results',
      turnYourPassionIntoSomethingBigger: 'Turn Your Passion Into Something Bigger',
    },
    sidebar: {
      completeYourProfile: 'Complete your profile',
      refreshing: 'Refreshing your menu',
      toggleDarkMode: 'Toggle dark mode',
    },
    sos: {
      sendSos: 'Send SOS',
    },
    status: {
      muteVideo: 'Mute video',
      noOneHasViewedThisStory: 'No one has viewed this story yet.',
      openDetails: 'Open details',
      unmuteVideo: 'Unmute video',
    },
    statusUpload: {
      preparingStatusUpload: 'Preparing status upload...',
      savingStatus: 'Saving status...',
      statusUploaded: 'Status uploaded.',
      trimStart: 'Trim start',
    },
    support: {
      addFiles: 'Add files',
      aShortSummary: 'A short summary',
      closeFaq: 'Close FAQ',
      couldNotSubmitPleaseTryAgain: 'Could not submit. Please try again.',
      dismiss: 'Dismiss',
      name: 'Name',
      pickACategory: 'Pick a category.',
      reOpenTicket: 'Re-open ticket',
      searchHelpTopics: 'Search help topics',
      subjectAndMessageAreRequired: 'Subject and message are required.',
      support: 'Support',
    },
    supportChat: {
      anythingToAddOptional: 'Anything to add? (optional)',
      attachDocument: 'Attach document',
      attachFile: 'Attach file',
      chatOptions: 'Chat options',
      couldNotReOpenThisChat: 'Could not re-open this chat.',
      emailThisChat: 'Email this chat',
      howDidWeDo: 'How did we do?',
      reasonForReOpeningOptional: 'Reason for re-opening (optional)',
      reOpenThisConversation: 'Re-open this conversation',
      retrySending: 'Retry sending',
      skip: 'Skip',
      typeAMessage: 'Type a message…',
    },
    supportHub: {
      callUsOrGetACallback: 'Call us or get a callback',
      describeTheIssue: 'Describe the issue',
      eGMedicalHelpNeeded: 'e.g. medical help needed',
      emergencyHelpAtYourLivePod: 'Emergency help at your live pod',
      everyRequestYouHaveRaisedIn: 'Every request you have raised, in one list',
      haveABurningQuestion: 'Have a burning question?',
      newTicket: 'New Ticket',
      raiseAnIssueWithOurTeam: 'Raise an issue with our team',
      realTimeChatWithOurSupport: 'Real-time chat with our support team',
      searchOurHelpCenterOrTalk: 'Search our help center or talk to us',
      sendFeedbackOrReportAnIssue: 'Send feedback or report an issue — it reaches our team instantly',
      sosSentHangTight: 'SOS sent. Hang tight.',
      thanksYourFeedbackHasBeenSent: 'Thanks! Your feedback has been sent to our team.',
      youHaveNotRaisedAnySupport: 'You have not raised any support requests yet.',
    },
    supportTickets: {
      couldNotEmailTheTranscript: 'Could not email the transcript.',
      couldNotReOpenThisTicket: 'Could not re-open this ticket.',
      emailThisTicket: 'Email this ticket',
      readFaqs: 'Read FAQs',
      ticketOptions: 'Ticket options',
    },
    surveyGate: {
      aFewQuickQuestionsBeforeYou: 'A few quick questions before you continue.',
      anythingWeShouldKnowOptional: 'Anything we should know? (optional)',
      bookYourOnboardingMeeting: 'Book your onboarding meeting',
      change: 'Change',
      couldNotBookTheSlotPlease: 'Could not book the slot — please try again.',
      fromYourProfile: 'From your profile.',
      noSlotsAreOpenRightNow: 'No slots are open right now — please check back soon.',
      pickASlotThatWorksFor: 'Pick a slot that works for you.',
      weLookForwardToMeetingYou: 'We look forward to meeting you.',
      youReBooked: 'You’re booked!',
    },
    surveyOnboarding: {
      backToHome: 'Back to Home',
      changeCategory: 'Change category',
      countryCode: 'Country code',
      goToProfile: 'Go To Profile',
      notes: 'Notes',
      okay: 'Okay',
    },
    ticketDetails: {
      markResolved: 'Mark resolved',
      sendReply: 'Send reply',
      ticketDetails: 'Ticket Details',
    },
    tourGuide: {
      back: 'Back',
      completed: 'Completed',
      intro: 'Take a guided walkthrough of any screen, as often as you like.',
      restart: 'Restart',
      restartAria: 'Restart the {name} tour',
      start: 'Start',
      startAria: 'Start the {name} tour',
      tourGuide: 'Tour Guide',
    },
    // Every guided walkthrough. @duncit/tours holds the structure (anchors,
    // routes, roles) and points at these keys; the copy lives here so both
    // overlays — mWeb's Joyride and the native tour guide — read one wording.
    tours: {
      booking: {
        backout: {
          body: 'You can back out of a pod you have joined. If you paid for it, your refund is released once someone takes the spot.',
          title: 'Changed your mind?',
        },
        caption: 'From holding a spot to holding a ticket — open any booking to start',
        summary: {
          body: 'The pod you booked, when it runs and what the spot cost you.',
          title: 'Your booking',
        },
        ticket: {
          body: 'Download your ticket here. The QR code inside it is what gets scanned at the door.',
          title: 'Your ticket',
        },
        title: 'Booking Flow',
      },
      club: {
        caption: 'Following a club and finding its pods — open any club to start',
        follow: {
          body: 'Following puts this club’s new pods in front of you as they are published.',
          title: 'Follow',
        },
        header: {
          body: 'Who runs it and what it is about, in the club’s own words.',
          title: 'The club',
        },
        pods: {
          body: 'Everything this club has coming up. Tap any pod to book.',
          title: 'Its pods',
        },
        title: 'Club Page',
      },
      close: 'Close',
      createPod: {
        basics: {
          body: 'This is the line people read first. A description and a cover photo follow it, and both are checked before your pod goes live.',
          title: 'Name it well',
        },
        caption: 'Hosting your own pod, step by step',
        publish: {
          body: 'This carries you through to the last step, where you set a ticket price and see what you take home after fees. Nothing is published until you press Create Pod.',
          title: 'Pricing, then publish',
        },
        steps: {
          body: 'The basics, then where it happens, then a venue slot — the slot you pick sets your pod’s date and time. What you type is saved as a draft as you go.',
          title: 'Four steps',
        },
        title: 'Create Pod',
      },
      finish: 'Finish',
      finishTour: 'Finish tour',
      home: {
        caption: 'Pods, clubs, search and everything on your home screen',
        categories: {
          body: 'Browse by interest — sports, music, food and the rest. Picking one narrows everything below.',
          title: 'Categories',
        },
        clubs: {
          body: 'Clubs are the communities that run pods. Follow a club to keep seeing what it puts on.',
          title: 'What are Clubs?',
        },
        filters: {
          body: 'Narrow the list by date, price and distance to find something that actually fits your week.',
          title: 'Filters',
        },
        notifications: {
          body: 'Booking confirmations, reminders and club updates land here.',
          title: 'Notifications',
        },
        pods: {
          body: 'Pods are the meetups you can join — a game, a class, a jam. Tap one to see the details and book a spot.',
          title: 'What are Pods?',
        },
        profile: {
          body: 'Your bookings, saved pods, account settings and the ways to earn with Duncit all live behind this.',
          title: 'Your profile',
        },
        search: {
          body: 'Look for a pod, a club or a place by name whenever you know what you are after.',
          title: 'Search',
        },
        title: 'Home',
      },
      next: 'Next',
      nextStep: 'Next step',
      podDetails: {
        book: {
          body: 'Reserve a place here. You will get a ticket by email with a link straight back to this pod.',
          title: 'Book your spot',
        },
        caption: 'Reading a pod and booking a spot — open any pod to start',
        spots: {
          body: 'How many places are still open. Popular pods fill up, so this moves.',
          title: 'Spots left',
        },
        summary: {
          body: 'When it runs, where it is and what a spot costs.',
          title: 'The essentials',
        },
        title: 'Pod Details',
      },
      previous: 'Previous',
      previousStep: 'Previous step',
      profile: {
        caption: 'Your account, bookings and ways to earn',
        details: {
          body: 'Your name and photo. Tap through for the profile other people see, and to keep your details current.',
          title: 'Your profile',
        },
        earn: {
          body: 'Host a pod, register a venue, list a product or run a club.',
          title: 'Earn with Duncit',
        },
        history: {
          body: 'Everything you have booked, past and upcoming, with your tickets.',
          title: 'Pod history',
        },
        title: 'Profile',
      },
      skip: 'Skip',
      skipTour: 'Skip tour',
    },
    venueDetailsPage: {
      copyLink: 'Copy link',
      venueNotFound: 'Venue not found',
    },
    venueEarnings: {
      earnings: 'Earnings',
      lifetime: 'Lifetime',
      payoutsAppearHereAfterAPod: 'Payouts appear here after a pod at your venue completes.',
      showPayoutBreakdown: 'Show payout breakdown',
    },
    venueHealth: {
      venueHealth: 'Venue health',
    },
    venueManage: {
      venueHealth: 'Venue Health',
      venueStudio: 'Venue Studio',
    },
    venueManagePage: {
      listYourSpace: 'List your space, run events, get discovered',
      listed: 'Listed',
      newVenue: 'New venue',
      status: 'Status',
      switchYourVenue: 'Switch your venue',
      untitledVenue: 'Untitled venue',
      yourVenues: 'Your venues',
    },
    venueMapPreview: {
      mapPreview: 'Map preview',
    },
    venueSlotRequests: {
      allVenues: 'All venues',
      approveThisBooking: 'Approve this booking?',
      awaitingDecision: 'Awaiting decision',
      contact: 'Contact',
      declineThisBooking: 'Decline this booking?',
      host: 'Host',
      requested: 'Requested',
      slot: 'Slot',
      slotPrice: 'Slot price',
      slotRequests: 'Slot Requests',
    },
    verification: {
      addressLine2Optional: 'Address line 2 (optional)',
      apartmentLandmark: 'Apartment, landmark',
      couldNotSubmitTheAddress: 'Could not submit the address.',
      couldNotSubmitTheDocument: 'Could not submit the document.',
      countryOptional: 'Country (optional)',
      eG400001: 'e.g. 400001',
      eGIndia: 'e.g. India',
      eGMaharashtra: 'e.g. Maharashtra',
      eGMumbai: 'e.g. Mumbai',
      houseStreet: 'House / street',
      submitAddress: 'Submit address',
      uploadPdf: 'Upload PDF',
      uploadPhoto: 'Upload photo',
    },
    confirm: {
      areYouSure: 'Are you sure?',
      confirm: 'Confirm',
    },
    health: {
      accountHealth: 'Account Health',
    },
    splash: {
      findYourTribeJoinPodsMeet: 'Find your tribe. Join pods, meet locals, share moments.',
    },
  },
};

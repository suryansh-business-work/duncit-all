import { flattenCatalogue, type NestedCatalogue } from './catalogue';

/**
 * The SHIPPED FALLBACK CATALOGUE — every user-facing key the client surfaces
 * know about, in the same nested shape as the server's Localization entries
 * (CLAUDE.md rule 38).
 *
 * It lives here rather than in each surface for two reasons:
 *  - mWeb and native must be identical (rule 27), and two hand-kept copies of
 *    the same `mweb.*` copy is exactly how they drift apart;
 *  - the admin panel seeds Localization > Translations from this registry, so
 *    a key added here is offered for translation without anyone re-typing it.
 *
 * Each surface still SHIPS its bundle — it re-exports the slice it renders, so
 * the copy is compiled into that build and available offline.
 */

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

/** Chrome rendered by the portal shell, shared by every MUI portal. */
export const SHELL_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageSaved: 'Language updated',
    },
  },
  shell: {
    profile: {
      accessRoles: 'ACCESS ROLES',
      noRoles: 'No roles assigned.',
      // NOT mweb.common.languageHint: the portal wording differs from the app's,
      // and the server stores ONE row per key — a second value for the same key
      // is unrepresentable, so whichever bundle merged last would silently
      // overwrite the other surface's copy.
      languageHint: 'Choose the language for this portal.',
    },
    /** Word-for-word identical to `mweb.slots` — see the note there. */
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
      meetingHint: 'Greyed-out slots are already booked.',
      meetingRescheduleHint:
        'Greyed-out slots are booked; your current slot is marked and can’t be re-selected.',
      current: 'current',
    },
    /**
     * Staff chat — the panel every console renders in its header.
     *
     * Under `shell` rather than a surface of its own because it IS shell
     * chrome: seventeen portals show the same panel, and a key per portal
     * would be seventeen rows an admin has to translate identically.
     */
    chat: {
      panel: {
        title: 'Coworkers',
        close: 'Close chat',
        closeBusy: 'Wait — the recording is still being saved',
        open: 'Chat with a coworker',
      },
      list: {
        searchPlaceholder: 'Search coworkers',
        team: 'Team',
        everyone: 'Everyone',
        everyoneElse: 'Everyone else',
        matching: 'Matching coworkers',
        nobody: 'Nobody matches that.',
        you: 'You: ',
        about: 'About {name}',
        console: 'Console',
        consoles: 'Consoles',
        noConsole: 'No staff console assigned.',
        localTime: '{time} local',
      },
      header: {
        back: 'Back to coworkers',
        audioCall: 'Audio call',
        videoCall: 'Video call',
        startAudio: 'Start audio call',
        startVideo: 'Start video call',
        search: 'Search this conversation',
        searchHint: 'Search this conversation (Ctrl+K)',
        offline: 'offline',
        lastSeen: 'last seen {when}',
      },
      thread: {
        sayHello: 'Say hello.',
        earlier: 'Earlier messages',
        loading: 'Loading…',
        today: 'Today',
        yesterday: 'Yesterday',
        unread: 'New',
        pinned: 'Pinned',
        jumpToLatest: 'Jump to latest',
        newMessages: '{count} new messages — jump to latest',
        typing: '{name} is typing…',
        edited: 'edited',
      },
      composer: {
        placeholder: 'Write a message',
        attach: 'Attach a file',
        emoji: 'Emoji',
        insertEmoji: 'Insert emoji',
        more: 'More',
        moreOptions: 'More options',
        send: 'Send',
        sendMessage: 'Send message',
        recordVoice: 'Record a voice note',
        dropToAttach: 'Drop to attach',
        replyingTo: 'Replying to {name}',
        cancelReply: 'Cancel reply',
        attachment: 'Attachment',
      },
      actions: {
        more: 'More',
        messageActions: 'Message actions',
        reply: 'Reply',
        copyText: 'Copy text',
        select: 'Select messages',
        forward: 'Forward',
        pin: 'Pin',
        unpin: 'Unpin',
        edit: 'Edit',
        editHistory: 'Edit history',
        deleteForMe: 'Delete for me',
        deleteForEveryone: 'Delete for everyone',
        copyCode: 'Copy code',
        moreReactions: 'More reactions',
      },
      status: {
        sending: 'Sending',
        sent: 'Sent',
        delivered: 'Delivered',
        read: 'Read',
        failed: 'Failed to send',
        retry: 'Not sent — tap to retry',
      },
      // Two registers for one failure: a sentence for the person who hit it,
      // and the whole throw for whoever has to fix it.
      failure: {
        showDetails: 'Show details',
        hideDetails: 'Hide details',
        copy: 'Copy',
        copied: 'Copied',
        unknown: 'Something went wrong',
        uploadFailed: 'That file could not be uploaded',
      },
      // Your own availability, and the same words used to describe a coworker's.
      // One set of names for both, so the dot in the header and the menu that
      // sets it can never disagree about what "Away" means.
      presence: {
        online: 'Online',
        onlineHint: 'At your desk',
        away: 'Away',
        awayHint: 'Connected, not looking',
        busy: 'Busy',
        busyHint: 'Please do not disturb',
        appearOffline: 'Appear offline',
        appearOfflineHint: 'Still connected, shown as away',
      },
      selection: {
        count: '{count} selected',
        clear: 'Clear selection',
        copy: 'Copy',
        hide: 'Hide',
        deleteForEveryone: 'Delete for everyone',
      },
      search: {
        label: 'Search this conversation',
        run: 'Run the search',
        close: 'Close search',
        anyone: 'Anyone',
        fromYou: 'From you',
        fromPerson: 'From {name}',
        files: 'Files',
        links: 'Links',
        after: 'After',
        before: 'Before',
        nothing: 'Nothing matched.',
        older: 'Older than the messages loaded — open Earlier messages first',
      },
      call: {
        // What went wrong, in our words. A message thrown by the browser is
        // shown verbatim instead — it names the device, and translating it
        // would mean guessing at text we did not write.
        noMediaDevices:
          'This browser will not open the microphone or camera here. Calls need a secure (https) connection.',
        deviceGone:
          'The microphone or camera you had chosen is not available here, so this call is using the default one.',
        selfCall: 'That call would be to your own account, so there is nobody to reach.',
        startFailed: 'Could not start the call',
        answerFailed: 'Could not answer',
        switchFailed: 'Could not switch device',
        shareFailed: 'Could not share the screen',
        shareNeedsVideo: 'Start a video call first — screen sharing replaces the camera.',
        connectionLost: 'The connection dropped. Neither side could reach the other.',
        audio: 'Audio',
        video: 'Video',
        ringing: 'Ringing…',
        incoming: 'is calling',
        connected: 'Connected',
        sharingScreen: ' · sharing your screen',
        coworker: 'Coworker',
        withName: 'Call with {name}',
        videoWithName: 'Video with {name}',
        calling: 'Calling…',
        incomingCall: 'Incoming call',
        onACall: 'On a call',
        answer: 'Answer',
        decline: 'Decline',
        cancel: 'Cancel',
        hangUp: 'Hang up',
        mute: 'Mute',
        unmute: 'Unmute',
        muteMic: 'Mute microphone',
        unmuteMic: 'Unmute microphone',
        cameraOn: 'Turn camera on',
        cameraOff: 'Turn camera off',
        fullscreen: 'Full screen',
        fullscreenVideo: 'Full screen video',
        share: 'Share your screen',
        stopShare: 'Stop sharing',
        stopShareLabel: 'Stop sharing your screen',
        record: 'Record this call',
        stopRecord: 'Stop recording',
        stopRecordLabel: 'Stop recording this call',
        settings: 'Audio & video settings',
        settingsLabel: 'Audio and video settings',
        incomingAudio: '{name} — incoming audio',
        quality: 'Connection quality',
        endTitle: 'End this call?',
        endMessage:
          'Closing this window hangs up on {name}. Any recording still uploading will finish.',
        endConfirm: 'End call',
      },
      callRow: {
        outgoingAudio: 'Outgoing audio call',
        outgoingVideo: 'Outgoing video call',
        incomingAudio: 'Incoming audio call',
        incomingVideo: 'Incoming video call',
        missed: 'Missed',
        declined: 'Declined',
        cancelled: 'Cancelled',
        recording: 'Recording',
        download: 'Download the recording',
        play: 'Play the recording',
      },
      recorder: {
        recording: 'Recording {clock} — both sides',
        uploading: 'Uploading the recording…',
        converting: 'Converting to MP4…',
        saved: 'Recording saved as MP4',
        download: 'Download',
        sendToChat: 'Send to chat',
        dismiss: 'Dismiss',
        dismissLabel: 'Dismiss the recording',
        failed: 'The recording could not be saved.',
        close: 'Close',
        closeRecording: 'Close the recording',
      },
      devices: {
        title: 'Audio & video',
        microphone: 'Microphone',
        camera: 'Camera',
        systemDefault: 'System default',
        device: 'Device {index}',
        inputLevel: 'Input level',
        saySomething: 'Say something — the bar should move.',
        pressTest: 'Press Test to try these.',
        test: 'Test',
        stopTest: 'Stop test',
        done: 'Done',
      },
      voice: {
        discard: 'Discard',
        discardLabel: 'Discard voice note',
        send: 'Send',
        sendLabel: 'Send voice note',
        play: 'Play the voice note',
        pause: 'Pause the voice note',
        speed: 'Playback speed {rate} times',
      },
      history: {
        title: 'Edit history',
        current: 'Current',
        earlier: 'Earlier',
        none: 'No earlier version was recorded.',
        close: 'Close',
      },
      settings: {
        title: 'Chat settings',
        view: 'View',
        compact: 'Compact',
        comfortable: 'Comfortable',
        bubbles: 'Your bubbles',
        textSize: 'Message text size',
        timesIn: 'Times shown in',
        enterSends: 'Enter sends',
        enterHint: 'Shift+Enter starts a new line.',
        ctrlEnterHint: 'Ctrl+Enter sends; Enter starts a new line.',
        colourPrimary: 'Blue bubbles',
        colourSecondary: 'Purple bubbles',
        colourSuccess: 'Green bubbles',
        colourInfo: 'Teal bubbles',
        zoneDevice: 'This device',
        zoneIndia: 'India',
        zoneUtc: 'UTC',
        zoneLondon: 'London',
        zoneNewYork: 'New York',
      },
      menu: {
        more: 'More',
        download: 'Download this conversation',
        settings: 'Chat settings',
        clear: 'Clear all messages',
        clearTitle: 'Clear this conversation?',
        clearMessage:
          'Every message between you and {name} is deleted, for both of you. Calls and their recordings stay. This cannot be undone.',
        clearConfirm: 'Clear messages',
      },
      location: {
        label: 'Place or address',
        search: 'Search',
        searching: 'Looking…',
        useMyLocation: 'Use my location',
        preview: 'Map of {name}',
        send: 'Send this place',
        cancel: 'Cancel',
        pickOne: 'Search for a place, then send the one you meant.',
        noKey: 'The map preview needs a Google Maps key in the Tech portal. You can still send the place.',
      },
      window: {
        minimise: 'Minimise',
        minimiseLabel: 'Minimise this window',
        maximise: 'Maximise',
        maximiseLabel: 'Maximise this window',
        restore: 'Restore',
        restoreLabel: 'Restore this window',
        close: 'Close',
        closeLabel: 'Close this window',
        minimised: 'Still running — this window is minimised.',
      },
      attachment: {
        download: 'Download',
        downloadNamed: 'Download {name}',
        open: 'Open {name}',
        closePreview: 'Close preview',
      },
    },
  },
};

/**
 * The marketing websites' own chrome. Navigation and footer LINK labels are
 * not here — those are content from the Website portal's Navigation manager,
 * and duplicating them as translation keys would give the same text two
 * owners.
 */
export const WEBSITE_BUNDLE: NestedCatalogue = {
  website: {
    footer: {
      newsletterTitle: 'Get Duncit updates',
      emailPlaceholder: 'Email address',
      notify: 'Notify',
      sending: 'Sending',
      subscribed: 'Subscribed!',
      tryAgain: 'Try again',
      policyHub: 'Policy Hub',
      allPolicies: 'All policies',
      rights: 'All Rights Reserved',
    },
    nav: {
      closeMenu: 'Close menu',
      theme: 'Switch between light and dark',
    },
  },
};

/** Every client bundle, by the surface that ships it. */
/**
 * The media picker's copy — a namespace of its own, not a surface's.
 *
 * @duncit/media-picker renders in the PORTALS (via the shell) and in mWeb, so
 * its strings belong to neither bundle: putting them in both would be two
 * hand-kept copies of the same sentences, which is exactly the drift rule 27
 * exists to stop. One namespace, shipped by whichever build imports the
 * package — the copy is compiled into each all the same.
 *
 * The native app does not use this package, which is why there is no third
 * consumer to keep in step.
 */
export const MEDIA_BUNDLE: NestedCatalogue = {
  media: {
    picker: {
      title: 'Select an image',
      fromDevice: 'Upload from device',
      pexelsPhotos: 'Pexels photos',
      pexelsVideos: 'Pexels videos',
      uploading: 'Uploading…',
      uploadToImagekit: 'Upload to ImageKit',
      useThis: 'Use this image',
      remove: 'Remove',
      removeImage: 'Remove image',
      removeAttachment: 'Remove attachment',
      noImage: 'No image',
      open: 'Open',
      urlPlaceholder: 'Click the icon to upload, or paste a URL…',
      attachFiles: 'Attach files',
      add: 'Add',
      uploadFailed: 'Upload failed',
    },
    crop: {
      title: 'Crop',
      suggested: 'Suggested',
      zoom: 'Crop zoom',
    },
    pexels: {
      credit: 'Pexels',
      importing: 'Importing…',
      searchPhotos: 'Search Pexels (e.g. coffee, sunset, basketball)…',
      searchVideos: 'Search Pexels videos…',
      noPhotos: 'No results — try a different query.',
      noVideos: 'No videos — try a different query.',
      landscape: 'Landscape',
      portrait: 'Portrait',
      square: 'Square',
    },
    device: {
      choosePdf: 'Click to choose a PDF',
      chooseVideo: 'Click to choose a video',
      chooseImage: 'Click to choose an image',
      hintPdf: 'PDF only · max 50 MB · uploads to ImageKit',
      hintVideo: 'MP4, MOV or WebM · max {mb} MB · uploads to ImageKit',
      hintImage: 'PNG, JPG, WebP, GIF · max {mb} MB · uploads to ImageKit',
      change: 'Change',
      uploading: 'Uploading',
      compressing: 'Compressing',
      croppingAndCompressing: 'Cropping & compressing',
    },
  },
};

export const SURFACE_BUNDLES: Record<string, NestedCatalogue> = {
  media: MEDIA_BUNDLE,
  mweb: MWEB_BUNDLE,
  shell: SHELL_BUNDLE,
  website: WEBSITE_BUNDLE,
};

/**
 * Every shipped key as flat `key -> default text`, deduplicated across
 * surfaces. The admin panel imports this to seed missing Translations rows.
 */
export function allFallbackEntries(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const bundle of Object.values(SURFACE_BUNDLES)) {
    Object.assign(merged, flattenCatalogue(bundle));
  }
  return merged;
}

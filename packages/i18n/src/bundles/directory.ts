import type { NestedCatalogue } from '../catalogue';

/**
 * The four directory consoles — venues, clubs, club admins, hosts.
 *
 * ONE bundle rather than four, because the four consoles are the same screen
 * over a different entity: a brief of how many there are and where they stand,
 * then a list, then a row's full detail. Four namespaces would be four copies
 * of "Awaiting review" drifting apart one console at a time (rule 34), and a
 * fifth entity would then be a fifth bundle instead of one more `entity` block.
 *
 * `directory.common.*` is what every console says; `directory.<entity>.*` is
 * only what is genuinely specific to that one.
 */
export const DIRECTORY_BUNDLE: NestedCatalogue = {
  directory: {
    common: {
      total: 'Total',
      active: 'Active',
      inactive: 'Inactive',
      approved: 'Approved',
      awaitingReview: 'Awaiting review',
      declined: 'Declined',
      verified: 'Verified',
      upcoming: 'Upcoming',
      ongoing: 'Running now',
      completed: 'Completed',
      // Every tile is a way in, so the hint says so rather than restating the
      // number the tile already shows.
      openList: 'Open the list',
      openFiltered: 'Open the list, filtered to these',
    },
    venues: {
      title: 'Venues',
      subtitle: 'Every venue Duncit works with — an application awaiting review and a live space taking bookings sit in one list.',
      dashboardTitle: 'Venues at a glance',
    },
    clubs: {
      title: 'Clubs',
      subtitle: 'Every club on Duncit — its admins, its pods, its media and its content.',
      dashboardTitle: 'Clubs at a glance',
    },
    clubAdmins: {
      title: 'Club Admins',
      subtitle: 'Every club admin on Duncit — the clubs they run and the commission they are on.',
      dashboardTitle: 'Club admins at a glance',
      // The detail page a row opens.
      eyebrow: 'Club Admin',
      unnamed: 'Unnamed club admin',
      backToList: 'Back to club admins',
      notFound: 'Club admin not found.',
      contact: 'Contact',
      email: 'Email',
      phone: 'Phone',
      category: 'Category',
      commission: 'Commission',
      commissionDefault: 'Platform default',
      assignedClubs: 'Clubs they run',
      noClubsAssigned: 'No clubs assigned yet — assign them from Review on the list.',
      onboardingRecord: 'Onboarding record',
      clubAdminId: 'Club Admin ID',
      requestNo: 'Meeting request',
      joinedAt: 'Joined',
      reviewerNotes: 'Reviewer notes',
    },
    pods: {
      title: 'Pods',
      subtitle: 'Every pod on Duncit — upcoming, running, and the ones already settled.',
      dashboardTitle: 'Pods at a glance',
    },
    hosts: {
      title: 'Hosts',
      subtitle: 'Every host on Duncit — an application awaiting review and a host already running pods sit in one list.',
      dashboardTitle: 'Hosts at a glance',
    },
    // The change log every console's detail page shows. ONE block, because the
    // trail is one collection with the entity as a column — five copies of
    // "Updated By" is how five consoles start disagreeing about what a column
    // is called (rule 34).
    changeLogs: {
      tab: 'Change Logs',
      title: 'Change logs',
      subtitle:
        'Every change ever made to this record — by the partner from their own console, or by an admin from here. Entries are append-only, so nothing here is overwritten.',
      empty: 'No changes recorded yet.',
      searchPlaceholder: 'Search field, old or new value, or who changed it',
      colRecord: 'Record',
      colField: 'Field / Data Name',
      colOld: 'Old Data',
      colNew: 'New Data',
      colAction: 'Action',
      colWhen: 'Changed On',
      colBy: 'Updated By',
      colByName: 'Updated By Name / ID',
      colSource: 'Source',
      actionCreate: 'Created',
      actionUpdate: 'Updated',
      actionDelete: 'Deleted',
      actorOwner: 'Owner',
      actorAdmin: 'Admin',
      actorSystem: 'System',
      sourceNative: 'Native',
      sourceMweb: 'mWeb',
      sourceAdminPortal: 'Admin Portal',
      sourcePortal: 'Portal',
      sourceServer: 'System',
    },
    // The venue editor — `/venues/new` and `/venues/:id/edit`.
    venueEditor: {
      addVenue: 'Add venue',
      editVenue: 'Edit venue',
      newTitle: 'New venue',
      editTitle: 'Edit venue',
      eyebrowNew: 'Venues · Add',
      eyebrowEdit: 'Venues · Edit',
      backAria: 'Back',
      save: 'Save venue',
      cancel: 'Cancel',
      pickMedia: 'Choose a file',
      upload: 'Upload',

      basics: 'The space',
      venueName: 'Venue name',
      venueType: 'Venue type',
      totalCapacity: 'Total capacity',
      category: 'Category',
      categoryHint: 'What this venue hosts. Clubs auto-match venues on this plus the city.',
      description: 'Description',
      capacityItemsHint:
        'Name each bookable space and what it seats. The total capacity above should be their sum.',
      spaceName: 'Space',
      seats: 'Seats',
      addSpace: 'Add a space',
      removeSpace: 'Remove this space',
      amenities: 'Amenities',
      facilities: 'Facilities',
      security: 'Security',
      tags: 'Tags',
      tagsHint: 'Type a tag and press Enter. Used for internal search.',

      location: 'Where it is',
      cityAndArea: 'City and area',
      locationHint: 'Picked from the admin location list, so clubs can match this venue.',
      addressLine1: 'Address line 1',
      addressLine2: 'Address line 2',

      media: 'Photos',
      coverImage: 'Cover image',
      coverImageHint: 'The first image a member sees on the venue.',
      addImage: 'Add a photo',
      removeImage: 'Remove this photo',
      galleryEmpty: 'No gallery photos yet.',
      galleryItemAlt: 'Venue photo',

      documents: 'Paperwork',
      documentType: 'Document type',
      documentFile: 'File or link',
      addDocument: 'Add a document',
      removeDocument: 'Remove this document',
      gstin: 'GSTIN',
      gstinHint: 'Optional. Looks like 22ABCDE1234F1Z5.',
      pan: 'PAN',
      panHint: 'Optional. Looks like ABCDE1234F.',

      owner: 'Who runs it',
      ownerAccount: 'Owner account',
      ownerAccountHint:
        'Picking an account fills the contact details below from it. The venue is created under that login.',
      ownerLocked:
        'The owning account cannot be changed here — moving a live venue to another login would move its pods, slots and wallet with it.',
      ownerName: 'Owner name',
      ownerEmail: 'Owner email',
      ownerPhone: 'Owner phone',
      ownerDob: 'Owner date of birth',
      ownerAddress: 'Owner address',
      payout: 'Payout details',
      payoutMethod: 'Payout method',
      payoutNone: 'Not set up',
      accountHolder: 'Account holder',
      accountNumber: 'Account number',
      ifsc: 'IFSC code',
      upi: 'UPI ID',

      operations: 'How it operates',
      opensAt: 'Opens at',
      closesAt: 'Closes at',
      clockHint: '24-hour, like 09:00.',
      weeklyOff: 'Weekly off days',
      holidayDate: 'Holiday',
      addHoliday: 'Add',
      noHolidays: 'No holidays added.',
      bookingRules: 'Booking rules',
      bufferMinutes: 'Buffer between slots (min)',
      minNotice: 'Minimum notice (min)',
      maxAdvance: 'Maximum advance (days)',
      maxPerSlot: 'Bookings per slot',
      instantBooking: 'Instant booking allowed',
      waitlist: 'Waitlist allowed',
      approvalRequired: 'Booking needs approval',
      multipleBookings: 'Multiple bookings allowed',
      autoExtend: 'Auto-extend availability',
      autoExtendEnabled: 'Keep availability rolling',
      autoExtendHorizon: 'Publish this many days ahead',
      autoExtendHorizonHint: 'Never further than the maximum advance above.',
      autoExtendUntil: 'Stop on',
      autoExtendUntilHint: 'Leave blank to keep going.',

      cancellation: 'Cancellations',
      rescheduleOnly: 'Bookings may only be rescheduled, never cancelled',
      rescheduleOnlyHint: 'While this is on, the charge bands below do not apply.',
      chargeTiersHint:
        'What the venue keeps when a booking is cancelled late. The TIGHTEST matching band wins, so a cancellation outside every band is free.',
      withinHours: 'Within (hours)',
      chargeType: 'Charge',
      chargePercent: 'Percent of slot',
      chargeAmount: 'Flat amount',
      chargeValue: 'Value',
      addChargeBand: 'Add a charge band',
      removeBand: 'Remove this band',
      autoCancel: 'Duncit auto-cancellation',
      triggerHours: 'Auto-cancel within (hours)',
      triggerHoursHint:
        'How close to the start a loss-making pod at this venue may still be cancelled.',
      refundTiersHint:
        'What an attendee gets back when that auto-cancel fires. The WIDEST matching band wins, so more notice never refunds less. No bands refunds in full.',
      moreThanHours: 'More than (hours)',
      refundPct: 'Refund %',
      addRefundBand: 'Add a refund band',

      statusAndMoney: 'Status and money',
      status: 'Status',
      statusDraft: 'Draft',
      statusSubmitted: 'Awaiting review',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      sharePct: 'Venue share %',
      sharePctHint: "The venue's slice. 0 falls back to the platform default at settlement.",
      commissionPct: 'Venue commission %',
      commissionPctHint: "What Duncit takes from the venue's payout. 0 uses the default.",
      isActive: 'Live and taking bookings',
      deactivateWarning:
        'Saving with this off deactivates the venue and emails the owner. Its existing pods are not cancelled.',

      saved: 'Venue saved',
      created: 'Venue created',
      // The validation messages. Generic ones take the field's own label, so a
      // field added to the form needs a label and nothing else.
      errRequired: '{field} is required',
      errNumber: '{field} must be a number',
      errWhole: '{field} must be a whole number',
      errMin: '{field} must be at least {min}',
      errMax: '{field} must be at most {max}',
      errMinLen: '{field} must be at least {min} characters',
      errMaxLen: '{field} must be {max} characters or fewer',
      errClock: '{field} must be a 24-hour time like 09:00',
      errCloseAfterOpen: 'Closing time must be after the opening time',
      errDuplicateBand: 'Two bands cannot share the same notice window',
      errPercentCeiling: 'A percentage charge cannot exceed 100',
      errPickOwner: 'Pick the account that owns this venue',
      errPickCity: 'Pick the city from the location list',
      errCityField: 'City',
      errPincode: 'Enter a valid postal/ZIP code',
      errGstin: 'GSTIN looks like 22ABCDE1234F1Z5',
      errPan: 'PAN looks like ABCDE1234F',
      errNoId: 'The venue was not saved — no id came back.',
      // Shown to a viewer holding only the console's access role. The values are
      // still visible — knowing a venue's commission is part of reading the
      // record — but the controls are theirs to read, not to move.
      governedBy:
        'Approvals, the percentages and the live switch are set by platform admins and the onboarding desk. Everything else on this page is yours to edit.',
    },
    // The hosts console — its list, its record and `/hosts/new` + `/hosts/:id/edit`.
    // Generic messages and the payout block are borrowed from `venueEditor.*`
    // rather than restated: a host and a venue store the same payout
    // subdocument, and "X is required" is one sentence (rule 34).
    hostEditor: {
      addHost: 'Add host',
      editHost: 'Edit host',
      newTitle: 'New host',
      editTitle: 'Edit host',
      eyebrow: 'Host',
      eyebrowNew: 'Hosts · Add',
      eyebrowEdit: 'Hosts · Edit',
      save: 'Save host',
      saved: 'Host saved',
      created: 'Host created',
      notFound: 'Host not found.',
      unnamed: 'Unnamed host',
      listEmpty: 'No hosts yet.',
      searchPlaceholder: 'Search name, email, phone or host ID',
      tabOverview: 'Overview',
      tabPods: 'Pods',

      colHost: 'Host',
      colContact: 'Contact',
      colCategories: 'Runs',
      colStatus: 'Status',
      colLive: 'Live',
      colCommission: 'Commission',
      colApplied: 'Applied',
      colMode: 'Mode',
      colSeats: 'Booked',
      live: 'Live',
      paused: 'Paused',
      hostId: 'Host ID',
      approvedAt: 'Approved',
      commissionDefault: 'Platform default',
      reviewerNotes: 'Reviewer notes',

      identity: 'Who they are',
      account: 'Duncit account',
      accountHint:
        'Picking an account fills the details below from it. One host record per login.',
      accountLocked:
        'The account cannot be changed here — a host record is one per login, so pointing it at another account would be a different record.',
      fullName: 'Full name',
      email: 'Email',
      phone: 'Phone',
      dob: 'Date of birth',
      address: 'Address',
      tags: 'Tags',

      verification: 'Verification',
      aadhaar: 'Aadhaar number',
      aadhaarHint: '12 digits, no spaces.',
      pan: 'PAN number',
      passportPhoto: 'Passport photo',
      policeVerification: 'Police verification',
      openDocument: 'Open',

      categories: 'What they run',
      categoriesHint:
        'Saving replaces the whole set, so removing a row here is how a category is taken away. A row missing any of its three levels is not saved — finish it or remove it.',
      addCategory: 'Add a category',
      removeCategory: 'Remove this category',
      noCategories: 'No categories yet — this host cannot be assigned a pod until they have one.',

      statusAndMoney: 'Status and money',
      statusDraft: 'Draft',
      statusSubmitted: 'Awaiting review',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      commissionHint: "What Duncit takes from this host's payout. 0 uses the platform default.",
      isActive: 'Live and able to run pods',
      deactivateWarning:
        'Saving with this off pauses the host and notifies them. Pods they already run are not cancelled.',

      podsTitle: 'Pods they run',
      podsSubtitle:
        'Every pod this account hosts. A pod names its hosts by account, which is why pausing the host record does not take these with it.',
      podsEmpty: 'This host has not run a pod yet.',

      errPickAccount: 'Pick the Duncit account this host record belongs to',
      errAadhaar: 'Aadhaar must be 12 digits',
      errCategoryTriple: 'Pick all three levels, or remove the row',
      errNoId: 'The host was not saved — no id came back.',
    },
    // The club-admins console's editor. Its record shares most of its shape with
    // a host's, so the labels it can reuse it reuses (rule 34) and only what is
    // genuinely a Club Admin's own is here.
    clubAdminEditor: {
      addClubAdmin: 'Appoint a club admin',
      editClubAdmin: 'Edit club admin',
      newTitle: 'Appoint a club admin',
      editTitle: 'Edit club admin',
      eyebrowNew: 'Club Admins · Appoint',
      eyebrowEdit: 'Club Admins · Edit',
      save: 'Save club admin',
      saved: 'Club admin saved',
      created: 'Club admin appointed',
      listEmpty: 'No club admins yet.',
      searchPlaceholder: 'Search name, email, phone or club admin ID',
      colAdmin: 'Club admin',

      accountHint:
        'Appointing grants this account the CLUB_ADMIN role — that IS the appointment — and fills the details below from it.',
      accountLocked:
        'The account cannot be changed here — one person is one club admin record, so pointing it at another account would be a different record.',
      categoryHint: 'What they were onboarded for. It decides which clubs they can be given.',

      assignHint:
        'Saving replaces the whole set. Other admins of these clubs are untouched.',
      assignAfterCreate:
        'Clubs can be assigned once the record exists — save this page first, then reopen it.',
      outsideCategory: 'Outside their category — assigned anyway',

      statusDraft: 'Drafted, not reviewed',
      isActive: 'Live and able to run their clubs',
      commissionHint: "What Duncit takes from this admin's payout. 0 uses the platform default.",
      deactivateWarning:
        'Saving with this off suspends the club admin and notifies them. The clubs they run are not reassigned.',
      rejectedFromConsole: 'Rejected from the Club Admins console.',

      errPickAccount: 'Pick the Duncit account to appoint',
      errNoId: 'The club admin was not saved — no id came back.',
    },
  },
};

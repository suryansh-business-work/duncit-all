import type { NestedCatalogue } from '../catalogue';

/**
 * Copy for the shared pod form.
 *
 * Its own namespace rather than a host surface's, because the package renders
 * inside more than one build and a second copy of these sentences is exactly
 * the drift rule 40 exists to stop.
 */
export const POD_FORM_BUNDLE: NestedCatalogue = {
  podForm: {
    /** The form in Auto Pod mode: no club, venue or host — a category instead. */
    autoPod: {
      categoryLegend: 'Pod category',
      categoryHint:
        'Hosts approved in this sub-category and clubs carrying it are the ones offered the pod.',
      categoryRequired: 'Select a category',
      categoryLocked: 'Locked — a host or club has already enrolled on this category.',
      // The same picker, used to NARROW the club list on an ordinary pod rather
      // than to stand in for a club on a template.
      filterHint:
        'Pick the category first — the club list below is narrowed to it. Leave blank to see every club.',
      noClubs:
        'No clubs in this category yet. Clear the category, or create a club for it first.',
      // The template's own rules, mirroring the server's validateTemplate.
      priceRange: 'Ticket price must be between 1 and 1999',
      priceHint: 'GROSS price per person (incl. fee + GST). 1 – 1999 — an Auto Pod is never free.',
      spotsMin: 'An Auto Pod needs at least 2 spots',
      spotsMax: 'An Auto Pod cannot have more than 999 spots',
      mediaRequired: 'At least one image is required',
    },
    aboutSection: {
      logisticsWhatToBringParkingNotes: 'Logistics, what to bring, parking notes, etc.',
      podInfoAdditionalNotes: 'Pod info / additional notes',
    },
    basicSection: {
      club: 'Club',
      hashtagsSpaceOrCommaSeparated: 'Hashtags (space or comma separated)',
      physicalPod: 'Physical pod',
      podMode: 'Pod mode',
      podTitle: 'Pod title',
      virtualPod: 'Virtual pod',
    },
    common: {
      amount: 'Amount (₹)',
      // Offered on create only, and never for an Auto Pod.
      saveAsDraft: 'Save as Draft',
      availablePerks: 'Available perks',
      cancel: 'Cancel',
      description: 'Description',
      endDateAndTime: 'End date & time',
      paymentTerms: 'Payment terms',
      remove: 'Remove',
      startDateAndTime: 'Start date & time',
    },
    /** The free-text chip editor (hashtags, perks). */
    chipArrayField: {
      placeholder: 'Type and press Enter',
    },
    /** The read-only map beside the venue address. */
    mapPreview: {
      title: 'Map preview',
      openMap: 'Open Map',
      keyMissing: 'Add VITE_GOOGLE_MAP_API to preview the map here.',
    },
    hostsField: {
      hosts: 'Hosts',
      searchHosts: 'Search hosts…',
    },
    mediaField: {
      addImage: 'Add image',
      // `{action}` is the Add image button's own name, drawn in bold inside the
      // sentence — so the whole line stays ONE thing to translate rather than a
      // prefix and a suffix a translator cannot reorder.
      empty: 'No images yet. Click {action} to upload or pick from Pexels.',
    },
    mediaRow: {
      moveDown: 'Move down',
      moveUp: 'Move up',
      replace: 'Replace',
    },
    meetingSection: {
      autoGenerateMeetingLink: 'Auto-generate meeting link',
      meetingLink: 'Meeting link',
      meetingNotes: 'Meeting notes',
      meetingPlatform: 'Meeting platform',
      endRequired: 'A virtual pod needs an end date and time',
    },
    offersSection: {
      amenitiesAndFacilities: 'Amenities & facilities',
      eGFreeWifiParkingPet: 'e.g. Free WiFi, Parking, Pet Friendly',
      pressEnterToAddAChip: 'Press Enter to add a chip. Keep each chip short.',
    },
    // The named options the two pickers offer. The stored VALUE stays an
    // enum in @duncit/pod-form; only the words a person reads are here.
    occurrence: {
      alternateDay: 'Alternate day',
      daily: 'Daily',
      monthly: 'Monthly',
      oneTime: 'One time',
      weekends: 'Weekends only',
      weekly: 'Weekly',
    },
    podMode: {
      physical: 'Physical',
      virtual: 'Virtual',
    },
    podType: {
      nativeFree: 'Native · Free',
      nativePaid: 'Native · Paid',
      nativePaidPremium: 'Native · Paid Premium',
      nonNativeFree: 'Non-native · Free',
      nonNativePaid: 'Non-native · Paid',
    },
    // Every message the form's Zod schema can raise. A validation error is the
    // sentence a person is stopped by, so it translates like any other.
    validation: {
      amountMax: 'Amount cannot exceed 1999',
      amountNegative: 'Amount cannot be negative',
      amountNumber: 'Amount must be a number',
      clubRequired: 'Select a club',
      descriptionRequired: 'Description required',
      descriptionShort: 'Add a longer description',
      endAfterStart: 'End must be after start',
      endRequiredVirtual: 'End date/time is required for a virtual pod',
      freeAmountZero: 'Free pods must have amount 0',
      hostRequired: 'Add at least one host',
      imageRequired: 'At least one image is required',
      labelRequired: 'Label required',
      meetingLinkInvalid: 'Meeting link must be a valid http(s) URL',
      meetingLinkRequired: 'Meeting link is required',
      meetingNotesMax: 'Meeting notes must be 1000 characters or fewer',
      meetingPlatformMax: 'Meeting platform must be 80 characters or fewer',
      modeRequired: 'Select pod mode',
      productRequired: 'Please select a product to continue.',
      quantityRequired: 'Quantity required',
      reelInvalid: 'Reel video must be a valid http(s) URL',
      singleHost: 'Select only one host',
      slotRequired: 'Pick an available slot',
      spotsNumber: 'Spots must be a number',
      startInPast: 'Start date/time must be after current date/time',
      startRequired: 'Start date/time required',
      titleRequired: 'Title required',
      titleShort: 'Title is too short',
      venueRequired: 'Select a venue',
      virtualNoProducts: 'A virtual pod cannot carry products',
    },
    paymentSection: {
      // The spots control's hint. The numbers are the activity's own minimum
      // and the booked space's capacity, so they are passed in.
      boundsHintMin: 'This activity needs at least {min} people.',
      boundsHintRange: 'This activity needs at least {min}, and the space booked holds {max}.',
      noOfSpots: 'No. of spots',
      occurrence: 'Occurrence',
      optionalVenueSideChargesEntryTable: 'Optional venue-side charges (entry, table, etc.) shown separately to users.',
      podType: 'Pod type',
      refundPolicyCancellationTaxInfo: 'Refund policy, cancellation, tax info.',
    },
    perksSection: {
      eGFreeDrinkEarlyEntry: 'e.g. Free Drink, Early Entry, VIP Access',
      perksAttendeesUnlockByJoining: 'Perks attendees unlock by joining.',
    },
    placeChargesField: {
      addCharge: 'Add charge',
      label: 'Label',
      note: 'Note',
      title: 'Place charges',
    },
    podSections: {
      aboutThisPod: 'About this Pod',
      approvedProducts: 'Approved Products',
      availablePerks: 'Available Perks',
      basicInformation: 'Basic Information',
      collapseAll: 'Collapse all',
      collapseAllSections: 'Collapse all sections',
      coverImageFirstRestBecomeA: 'Cover image first; rest become a gallery.',
      expandAll: 'Expand all',
      expandAllSections: 'Expand all sections',
      imagesAndVideos: 'Images & videos',
      meetingDetails: 'Meeting Details',
      paymentAndCharges: 'Payment & Charges',
      whatThisPodOffers: 'What This Pod Offers',
      whenWhereAndMap: 'When, Where & Map',
    },
    preview: {
      aboutThisPod: 'About this pod',
      chargesAtTheVenue: 'Charges at the venue',
      goodToKnow: 'Good to know',
      inThePodList: 'In the pod list',
      memberPreview: 'Member preview',
      onThePodPage: 'On the pod page',
      price: 'Price',
      spots: 'Spots',
      whatThisPodOffers: 'What this pod offers',
    },
    /** The admin editor's earnings projection — every figure is the server's
     * potentialPodEarnings waterfall; this copy only names the rows. */
    priceBreakdown: {
      title: 'Earnings projection',
      perPerson: '{price} per person × {spots} payable spots — the host’s own seat is free.',
      prompt: 'Enter a ticket price and at least 2 spots to project the payout.',
      loading: 'Projecting…',
      totalCollection: 'Total collection',
      clubAdminFee: 'Club Admin Fee @{pct}%',
      clubAdminFormula:
        'Set in Finance › Default Deductions — taken off the pool before the venue and the host are paid.',
      venueSlotPrice: 'Venue Slot Price',
      venuePending: 'Deducted once a venue enrols — its booked slot price comes off the pool before the host is paid.',
      venueNotPicked: 'Pick a venue slot — its price is deducted once for the whole pod.',
      productCost: 'Duncit product cost',
      productFormula: 'The products attached below, deducted from the host’s payout.',
      totalDeductions: 'Total deductions',
      hostReceives: 'Host receives',
      hostReceivesBeforeVenue: 'Host receives before the venue',
      finalPayout: 'Final payout',
      venueBudget: 'Venue budget',
      venueBudgetValue: 'up to {amount}',
      venueBudgetHint:
        'A venue can be enrolled with a slot price under {amount}. At or above it the host earns nothing and the enrolment is refused.',
      zeroEarnings:
        'The host earns nothing at this price — the save will be refused. Raise the ticket price or the number of spots.',
      estimateNote:
        'Projected at today’s Finance rates with every payable spot sold. A host’s or a venue’s own commission rate applies once they are on the pod.',
    },
    reelField: {
      // Same shape as mediaField.empty — `{action}` is the Pick video button.
      empty: 'No reel yet. Click {action} to upload or pick from Pexels.',
      helper: 'Shows in Explore while the pod is live.',
      pickVideo: 'Pick video',
      removeReel: 'Remove reel',
      replaceVideo: 'Replace video',
      podReel: 'Pod Reel',
      reelVideoUrl: 'Reel video URL',
    },
    whenWhereSection: {
      venue: 'Venue',
    },
  },
};

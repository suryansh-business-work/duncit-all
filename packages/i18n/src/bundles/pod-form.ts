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
    },
    offersSection: {
      amenitiesAndFacilities: 'Amenities & facilities',
      eGFreeWifiParkingPet: 'e.g. Free WiFi, Parking, Pet Friendly',
      pressEnterToAddAChip: 'Press Enter to add a chip. Keep each chip short.',
    },
    paymentSection: {
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
      label: 'Label',
      note: 'Note',
    },
    podSections: {
      aboutThisPod: 'About this Pod',
      approvedProducts: 'Approved Products',
      availablePerks: 'Available Perks',
      basicInformation: 'Basic Information',
      collapseAllSections: 'Collapse all sections',
      coverImageFirstRestBecomeA: 'Cover image first; rest become a gallery.',
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
    priceBreakdown: {
      finalPayout: 'Final payout',
      payoutBeforeProducts: 'Payout before products',
      productCostPayableSpot: 'Product cost / payable spot',
      userPays: 'User pays',
    },
    reelField: {
      pickVideo: 'Pick video',
      podReel: 'Pod Reel',
      reelVideoUrl: 'Reel video URL',
    },
    whenWhereSection: {
      venue: 'Venue',
    },
  },
};

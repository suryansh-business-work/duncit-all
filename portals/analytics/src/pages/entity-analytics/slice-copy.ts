import { PLATFORM_COPY } from './platform-copy';

/**
 * The words for a breakdown's slices, per breakdown — the same key can mean
 * different things in two charts (a DRAFT host is still filling the form in, a
 * DRAFT club admin is waiting on a review). Slices named by the data (a city,
 * a category) carry their own label and never reach this map.
 */

const STARS: Record<string, string> = {
  '1': 'analytics.slice.star1',
  '2': 'analytics.slice.star2',
  '3': 'analytics.slice.star3',
  '4': 'analytics.slice.star4',
  '5': 'analytics.slice.star5',
};

const PODS: Record<string, string> = {
  pods_0: 'analytics.slice.pods0',
  pods_1: 'analytics.slice.pods1',
  pods_2_4: 'analytics.slice.pods2To4',
  pods_5_9: 'analytics.slice.pods5To9',
  pods_10_plus: 'analytics.slice.pods10Plus',
};

const METHODS: Record<string, string> = {
  HOST_SCAN: 'analytics.slice.methodHostScan',
  HOST_MANUAL: 'analytics.slice.methodHostManual',
  CLUB_ADMIN_FORCE: 'analytics.slice.methodClubAdminForce',
  ADMIN: 'analytics.slice.methodAdmin',
  VIRTUAL_JOIN: 'analytics.slice.methodVirtualJoin',
  UNRECORDED: 'analytics.slice.methodUnrecorded',
};

const REVIEW: Record<string, string> = {
  SUBMITTED: 'analytics.slice.submitted',
  APPROVED: 'analytics.slice.approved',
  REJECTED: 'analytics.slice.rejected',
  INACTIVE: 'analytics.slice.inactive',
};

export const SLICE_COPY: Partial<Record<string, Partial<Record<string, string>>>> = {
  activity_frequency: {
    days_1: 'analytics.slice.days1',
    days_2_3: 'analytics.slice.days2To3',
    days_4_7: 'analytics.slice.days4To7',
    days_8_14: 'analytics.slice.days8To14',
    days_15_plus: 'analytics.slice.days15Plus',
  },
  user_age: {
    age_under_18: 'analytics.slice.ageUnder18',
    age_18_24: 'analytics.slice.age18To24',
    age_25_34: 'analytics.slice.age25To34',
    age_35_44: 'analytics.slice.age35To44',
    age_45_54: 'analytics.slice.age45To54',
    age_55_plus: 'analytics.slice.age55Plus',
  },
  user_gender: {
    FEMALE: 'analytics.slice.female',
    MALE: 'analytics.slice.male',
    OTHER: 'analytics.slice.otherGender',
  },
  pet_owners: {
    yes: 'analytics.slice.petOwner',
    no: 'analytics.slice.notPetOwner',
  },
  sign_in_method: {
    GOOGLE: 'analytics.slice.signInGoogle',
    EMAIL: 'analytics.slice.signInEmail',
    OTP: 'analytics.slice.signInOtp',
  },
  weekday: {
    mon: 'analytics.slice.mon',
    tue: 'analytics.slice.tue',
    wed: 'analytics.slice.wed',
    thu: 'analytics.slice.thu',
    fri: 'analytics.slice.fri',
    sat: 'analytics.slice.sat',
    sun: 'analytics.slice.sun',
  },
  fill_band: {
    fill_empty: 'analytics.slice.fillEmpty',
    fill_1_25: 'analytics.slice.fill1To25',
    fill_26_50: 'analytics.slice.fill26To50',
    fill_51_75: 'analytics.slice.fill51To75',
    fill_76_99: 'analytics.slice.fill76To99',
    fill_full: 'analytics.slice.fillFull',
  },
  price_band: {
    price_free: 'analytics.slice.priceFree',
    price_under_200: 'analytics.slice.priceUnder200',
    price_200_499: 'analytics.slice.price200To499',
    price_500_999: 'analytics.slice.price500To999',
    price_1000_plus: 'analytics.slice.price1000Plus',
  },
  pod_format: {
    PHYSICAL_PAID: 'analytics.slice.physicalPaid',
    VIRTUAL_PAID: 'analytics.slice.virtualPaid',
    VIRTUAL_FREE: 'analytics.slice.virtualFree',
  },
  lead_time: {
    lead_same_day: 'analytics.slice.leadSameDay',
    lead_1_2_days: 'analytics.slice.lead1To2Days',
    lead_3_7_days: 'analytics.slice.lead3To7Days',
    lead_8_14_days: 'analytics.slice.lead8To14Days',
    lead_15_days_plus: 'analytics.slice.lead15DaysPlus',
  },
  booking_source: {
    DIRECT: 'analytics.slice.sourceDirect',
    REFERRAL: 'analytics.slice.sourceReferral',
    PAID: 'analytics.slice.sourcePaid',
    FREE: 'analytics.slice.sourceFree',
    HOST_ADD: 'analytics.slice.sourceHostAdd',
  },
  attendance_method: METHODS,
  host_marks: METHODS,
  pod_rating_stars: STARS,
  club_rating_stars: STARS,
  admin_rating_stars: STARS,
  host_rating_stars: STARS,
  pods_per_club: PODS,
  pods_per_host: PODS,
  admins_per_club: {
    admins_0: 'analytics.slice.admins0',
    admins_1: 'analytics.slice.admins1',
    admins_2_plus: 'analytics.slice.admins2Plus',
  },
  clubs_per_admin: {
    clubs_0: 'analytics.slice.clubs0',
    clubs_1: 'analytics.slice.clubs1',
    clubs_2: 'analytics.slice.clubs2',
    clubs_3_5: 'analytics.slice.clubs3To5',
    clubs_6_plus: 'analytics.slice.clubs6Plus',
  },
  club_status: {
    ACTIVE_VERIFIED: 'analytics.slice.activeVerified',
    ACTIVE_UNVERIFIED: 'analytics.slice.activeUnverified',
    INACTIVE: 'analytics.slice.inactive',
  },
  // A club admin record is drafted when the meeting is approved, so DRAFT is the review queue.
  admin_status: { ...REVIEW, DRAFT: 'analytics.slice.awaitingReview' },
  host_status: { ...REVIEW, DRAFT: 'analytics.slice.draft' },
  ...PLATFORM_COPY.slices,
};

/** What a slice with no name of its own (an unset city or category) is called. */
export const NONE_KEY = 'analytics.slice.none';

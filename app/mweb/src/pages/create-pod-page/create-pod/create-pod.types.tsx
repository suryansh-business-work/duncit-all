/** Shared option lists + form value shape for the host Create Pod form. */

export const POD_TYPES = [
  { value: 'NATIVE_FREE', label: 'Native - Free' },
  { value: 'NATIVE_PAID', label: 'Native - Paid' },
  { value: 'NATIVE_PAID_PREMIUM', label: 'Native - Paid Premium' },
  { value: 'NON_NATIVE_FREE', label: 'Non-native - Free' },
  { value: 'NON_NATIVE_PAID', label: 'Non-native - Paid' },
] as const;

export const OCCURRENCES = [
  { value: 'ONE_TIME', label: 'One time' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ALTERNATE_DAY', label: 'Alternate day' },
  { value: 'WEEKENDS_ONLY', label: 'Weekends only' },
] as const;

export interface CreatePodFormValues {
  pod_title: string;
  club_id: string;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  venue_id: string;
  meeting_platform: string;
  meeting_url: string;
  meeting_notes: string;
  pod_description: string;
  pod_info: string;
  pod_date_time: Date | null;
  pod_end_date_time: Date | null;
  pod_type: string;
  pod_amount: number;
  pod_occurrence: string;
  no_of_spots: number;
  pod_hashtag_text: string;
  media_text: string;
  what_this_pod_offers_text: string;
  available_perks_text: string;
  payment_terms: string;
}

export const blankCreatePodForm: CreatePodFormValues = {
  pod_title: '',
  club_id: '',
  pod_mode: 'PHYSICAL',
  venue_id: '',
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_description: '',
  pod_info: '',
  pod_date_time: null,
  pod_end_date_time: null,
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 0,
  pod_hashtag_text: '',
  media_text: '',
  what_this_pod_offers_text: '',
  available_perks_text: '',
  payment_terms: '',
};

export interface CreatePodClub {
  id: string;
  club_name: string;
  meetup_venues_id?: string[] | null;
}

export interface CreatePodVenue {
  id: string;
  venue_name: string;
  city?: string | null;
  locality?: string | null;
}

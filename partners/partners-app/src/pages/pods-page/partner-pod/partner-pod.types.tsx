export interface PartnerPodProductRequest {
  product_id: string;
  quantity: number;
}

export interface PartnerPodFormValues {
  pod_title: string;
  club_id: string;
  venue_id: string;
  pod_mode: 'PHYSICAL' | 'VIRTUAL';
  meeting_platform: string;
  meeting_url: string;
  meeting_notes: string;
  pod_hashtag_text: string;
  media_text: string;
  pod_description: string;
  pod_date_time: Date | null;
  pod_end_date_time: Date | null;
  pod_type: string;
  pod_amount: number;
  pod_occurrence: string;
  no_of_spots: number;
  pod_info: string;
  what_this_pod_offers_text: string;
  available_perks_text: string;
  payment_terms: string;
  products_enabled: boolean;
  product_requests: PartnerPodProductRequest[];
}

export const blankPartnerPodForm: PartnerPodFormValues = {
  pod_title: '',
  club_id: '',
  venue_id: '',
  pod_mode: 'PHYSICAL',
  meeting_platform: '',
  meeting_url: '',
  meeting_notes: '',
  pod_hashtag_text: '',
  media_text: '',
  pod_description: '',
  pod_date_time: null,
  pod_end_date_time: null,
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 0,
  pod_info: '',
  what_this_pod_offers_text: '',
  available_perks_text: '',
  payment_terms: '',
  products_enabled: false,
  product_requests: [],
};

export const POD_TYPES = [
  { value: 'NATIVE_FREE', label: 'Native - Free' },
  { value: 'NATIVE_PAID', label: 'Native - Paid' },
  { value: 'NATIVE_PAID_PREMIUM', label: 'Native - Paid Premium' },
  { value: 'NON_NATIVE_FREE', label: 'Non-native - Free' },
  { value: 'NON_NATIVE_PAID', label: 'Non-native - Paid' },
];

export const OCCURRENCES = [
  { value: 'ONE_TIME', label: 'One time' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ALTERNATE_DAY', label: 'Alternate day' },
  { value: 'WEEKENDS_ONLY', label: 'Weekends only' },
];
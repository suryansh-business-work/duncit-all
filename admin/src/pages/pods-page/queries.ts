import { gql } from '@apollo/client';

export const PODS = gql`
  query Pods($filter: PodFilterInput) {
    pods(filter: $filter) {
      id
      pod_id
      pod_title
      pod_hosts_id
      location_id
      club_id
      pod_hashtag
      pod_images_and_videos {
        url
        type
      }
      pod_hits
      pod_attendees
      pod_description
      pod_date_time
      pod_end_date_time
      pod_type
      pod_amount
      pod_occurrence
      no_of_spots
      pod_info
      is_active
      zone_name
    }
  }
`;
export const CLUBS = gql`
  query AllClubs {
    clubs {
      id
      club_id
      club_name
      meetup_venues_id
    }
  }
`;
export const FINANCE_FOR_PODS = gql`
  query FinanceForPods {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
    }
  }
`;
export const LOCATIONS = gql`
  query AllLocations {
    locations {
      id
      location_id
      location_name
      location_zones {
        zone_name
      }
    }
  }
`;
export const USERS = gql`
  query AllUsersForPods {
    users {
      user_id
      full_name
      email
    }
  }
`;
export const CREATE = gql`
  mutation CreatePod($input: CreatePodInput!) {
    createPod(input: $input) {
      id
    }
  }
`;
export const UPDATE = gql`
  mutation UpdatePod($id: ID!, $input: UpdatePodInput!) {
    updatePod(pod_doc_id: $id, input: $input) {
      id
    }
  }
`;
export const DELETE = gql`
  mutation DeletePod($id: ID!) {
    deletePod(pod_doc_id: $id)
  }
`;

export const POD_TYPES = [
  { value: 'NATIVE_FREE', label: 'Native · Free' },
  { value: 'NATIVE_PAID', label: 'Native · Paid' },
  { value: 'NATIVE_PAID_PREMIUM', label: 'Native · Paid Premium' },
  { value: 'NON_NATIVE_FREE', label: 'Non-native · Free' },
  { value: 'NON_NATIVE_PAID', label: 'Non-native · Paid' },
];
export const OCCURRENCES = [
  { value: 'ONE_TIME', label: 'One time' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ALTERNATE_DAY', label: 'Alternate day' },
  { value: 'WEEKENDS_ONLY', label: 'Weekends only' },
];

export interface PodForm {
  id?: string;
  pod_id: string;
  pod_title: string;
  pod_hosts_id: string[];
  location_id: string;
  club_id: string;
  zone_name: string;
  pod_hashtag_text: string;
  media_text: string;
  pod_description: string;
  pod_date_time: string;
  pod_end_date_time: string;
  pod_type: string;
  pod_amount: number;
  pod_occurrence: string;
  no_of_spots: number;
  pod_info: string;
  is_active: boolean;
}

export const blankForm: PodForm = {
  pod_id: '',
  pod_title: '',
  pod_hosts_id: [],
  location_id: '',
  club_id: '',
  zone_name: '',
  pod_hashtag_text: '',
  media_text: '',
  pod_description: '',
  pod_date_time: '',
  pod_end_date_time: '',
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  pod_occurrence: 'ONE_TIME',
  no_of_spots: 0,
  pod_info: '',
  is_active: true,
};

export const linesToMedia = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

export const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

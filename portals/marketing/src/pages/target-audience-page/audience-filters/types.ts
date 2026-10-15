import type { Option } from '../helpers';

/** Booleans in the sidebar are tri-state: no opinion, must be true, must be false. */
export type TriState = '' | 'yes' | 'no';

/** Everything the sidebar can ask for. All fields are "unset" by default, and
 * an unset field contributes no filter at all. */
export interface AudienceFilterState {
  ageMin: string;
  ageMax: string;
  country: string[];
  state: string[];
  city: string[];
  zone: string[];
  pincode: string;
  push: string;
  whatsapp: TriState;
  roles: string[];
  interests: string[];
  status: string;
  locale: string;
  emailVerified: TriState;
  phoneVerified: TriState;
  provider: string;
  visibility: string;
  surveyCompleted: TriState;
  firstTimeUser: TriState;
  joinedFrom: string;
  joinedTo: string;
  activeFrom: string;
  activeTo: string;
  hasBooked: TriState;
  bookedFrom: string;
  bookedTo: string;
  attendedMin: string;
  attendedMax: string;
}

export const EMPTY_FILTERS: AudienceFilterState = {
  ageMin: '',
  ageMax: '',
  country: [],
  state: [],
  city: [],
  zone: [],
  pincode: '',
  push: '',
  whatsapp: '',
  roles: [],
  interests: [],
  status: '',
  locale: '',
  emailVerified: '',
  phoneVerified: '',
  provider: '',
  visibility: '',
  surveyCompleted: '',
  firstTimeUser: '',
  joinedFrom: '',
  joinedTo: '',
  activeFrom: '',
  activeTo: '',
  hasBooked: '',
  bookedFrom: '',
  bookedTo: '',
  attendedMin: '',
  attendedMax: '',
};

/** Dropdown values the sidebar needs, fetched by the page. */
export interface AudienceFilterOptions {
  roles: Option[];
  interests: Option[];
  country: Option[];
  state: Option[];
  city: Option[];
  zone: Option[];
}

/** One FAQ question + answer pair (Club Detail page content). */
export interface ClubFaqValue {
  question: string;
  answer: string;
}

/** A pre-assigned Club admin, used to seed labelled chips in the admins picker. */
export interface ClubAdmin {
  id: string;
  name: string;
  avatar_url?: string | null;
}

/**
 * The full admin Club-edit shape. Category + location are kept as flat scalar
 * ids (super_category_id + category_id + location_id + locality) exactly as the
 * Club persists them; the Basic section hydrates the cascade pickers from these.
 * Media is newline-separated URL text; bullets are string arrays; faqs are
 * question/answer pairs.
 */
export interface ClubFormValues {
  /** Mongo doc id — present only when editing an existing club. */
  id?: string;
  /** URL slug (create only; server auto-generates when blank). */
  club_id: string;
  club_name: string;
  club_description: string;
  super_category_id: string;
  category_id: string;
  location_id: string;
  locality: string;
  /** Feature images/videos — one URL per line. */
  feature_text: string;
  /** Club moments — one URL per line. */
  moments_text: string;
  community_link: string;
  group_link: string;
  who_we_are: string[];
  what_we_do: string[];
  perks: string[];
  values: string[];
  faqs: ClubFaqValue[];
  admin_user_ids: string[];
  is_verified: boolean;
  is_active: boolean;
}

/**
 * Feature flags that gate BOTH which sections render and (where relevant) which
 * validation branches run. Admin turns everything on; the partner/club-admin
 * flow turns the governance sections off.
 */
export interface ClubFormConfig {
  /** Club Admins assign-picker + the read-only auto-matched venues panel. */
  showAdmins: boolean;
  /** Verified-badge toggle. */
  showVerified: boolean;
  /** Active/inactive toggle (only meaningful while editing an existing club). */
  showIsActive: boolean;
}

/**
 * Non-form-value data + injected behaviours the club-form sections need. Passed
 * once to `<ClubForm>` and shared with sections via context so props stay flat.
 */
export interface ClubFormData {
  config: ClubFormConfig;
  /** Pre-assigned admins (from Club.club_admins) to seed labelled chips. */
  initialAdmins: ClubAdmin[];
  /**
   * When provided, media fields use a rich picker (returns the picked URL for
   * the given storage folder); otherwise a plain newline textarea is shown.
   */
  onPickImage?: (folder?: string) => Promise<string | null>;
}

export const blankClubFormValues: ClubFormValues = {
  club_id: '',
  club_name: '',
  club_description: '',
  super_category_id: '',
  category_id: '',
  location_id: '',
  locality: '',
  feature_text: '',
  moments_text: '',
  community_link: '',
  group_link: '',
  who_we_are: [],
  what_we_do: [],
  perks: [],
  values: [],
  faqs: [],
  admin_user_ids: [],
  is_verified: false,
  is_active: true,
};

/** Which accordion section each schema field lives in (drives the error chips
 * and auto-expand of a section with a failed validation). */
export const SECTION_OF: Record<string, string> = {
  club_name: 'basic',
  club_description: 'basic',
  super_category_id: 'basic',
  category_id: 'basic',
  location_id: 'basic',
  feature_text: 'media',
  community_link: 'links',
  group_link: 'links',
  who_we_are: 'content',
  what_we_do: 'content',
  perks: 'content',
  values: 'content',
};

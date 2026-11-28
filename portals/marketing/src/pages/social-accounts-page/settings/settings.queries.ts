import { gql } from '@apollo/client';

/** Marketing → Social → Settings, as the server holds it (bounds in social-settings.types). */
export interface SocialSettings {
  sync_every_hours: number;
  backfill_days: number;
  expiry_alert_days: number;
  auto_triage: boolean;
  link_dms_to_leads: boolean;
  default_assignee_user_id: string | null;
  default_assignee_name: string | null;
  opt_out_keywords: string[];
  opt_in_keywords: string[];
  auto_reply_enabled: boolean;
  auto_reply_daily_cap: number;
  auto_reply_requires_approval: boolean;
  ai_reply_guidelines: string;
  /** A person may reply from 24 hours to 7 days on Meta's human agent tag (the app must be approved for it). */
  human_agent_replies: boolean;
}

export type SocialSettingsInput = Omit<SocialSettings, 'default_assignee_name'>;

const SETTINGS_FIELDS = gql`
  fragment SocialSettingsFields on SocialSettings {
    sync_every_hours
    backfill_days
    expiry_alert_days
    auto_triage
    link_dms_to_leads
    default_assignee_user_id
    default_assignee_name
    opt_out_keywords
    opt_in_keywords
    auto_reply_enabled
    auto_reply_daily_cap
    auto_reply_requires_approval
    ai_reply_guidelines
    human_agent_replies
  }
`;

export const SOCIAL_SETTINGS = gql`
  query SocialSettings {
    socialSettings {
      ...SocialSettingsFields
    }
  }
  ${SETTINGS_FIELDS}
`;

export const UPDATE_SOCIAL_SETTINGS = gql`
  mutation UpdateSocialSettings($input: SocialSettingsInput!) {
    updateSocialSettings(input: $input) {
      ...SocialSettingsFields
    }
  }
  ${SETTINGS_FIELDS}
`;

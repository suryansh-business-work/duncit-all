import { gql } from '@apollo/client';

/**
 * Every field Admin > Pods > Pod Settings reads and writes, in one place.
 *
 * The two documents MUST select the same fields: the mutation's result is what
 * Apollo writes back into the cache, so a field present in the query and absent
 * from the mutation reverts to its pre-save value on screen until the refetch
 * lands. Extracted from the page when it passed the 200-line ceiling (rule 9).
 */
const FIELDS = `
  draft_retention_days
  max_backout_attempts
  venue_cancel_health_penalty
  attendance_otp_required
  pod_complete_timeout_hours
  pod_complete_reminder_hours
  pod_reminder_lead_hours
  venue_slot_reminder_lead_hours
  pod_feedback_delay_hours
  pod_cancel_refund_hold
  pod_auto_cancel_enabled
  pod_auto_cancel_lead_hours
  pod_cancel_risk_window_hours
  pod_cancel_risk_alert_hours
  auto_pod_slot_window_days
  auto_pod_venue_expiry_hours
  auto_pod_assignment_expiry_hours
  auto_pod_cancel_health_penalty
  venue_change_request_health_penalty
  host_change_request_health_penalty
  club_admin_change_request_health_penalty
  updated_at
`;

export const POD_SETTINGS = gql`
  query PodSettings {
    appSettings { ${FIELDS} }
  }
`;

export const UPDATE_POD_SETTINGS = gql`
  mutation UpdatePodSettings($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) { ${FIELDS} }
  }
`;

/** What every settings sub-section is handed. */
export interface PodSettingsSectionProps {
  settings: any;
  loading: boolean;
  onSave: (input: Record<string, number | boolean>) => Promise<void>;
}

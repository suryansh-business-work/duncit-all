import { gql } from '@/generated/graphql';

/** A lead's calls and emails, newest first — the portal's Communications tab. */
export const CrmAppCommLogsDocument = gql(`
  query CrmAppCommLogs($filter: CommunicationLogFilter, $limit: Int, $offset: Int) {
    communicationLogs(filter: $filter, limit: $limit, offset: $offset) {
      total
      items {
        id
        type
        direction
        status
        subject
        contact_name
        contact_value
        duration_seconds
        recording_url
        transcript
        transcript_status
        summary { status text key_points follow_ups }
        created_at
      }
    }
  }
`);

/** The offline caller-ID directory, page by page. */
export const CrmAppPhoneDirectoryDocument = gql(`
  query CrmAppPhoneDirectory($cursor: String, $limit: Int) {
    crmPhoneDirectory(cursor: $cursor, limit: $limit) {
      next_cursor
      items { phone_key entity_type lead_id lead_name contact_name city lead_status assigned_to }
    }
  }
`);

export const CrmAppLogDeviceCallDocument = gql(`
  mutation CrmAppLogDeviceCall($input: CrmDeviceCallInput!) {
    logCrmDeviceCall(input: $input) { id recording_url transcript_status }
  }
`);

export const CrmAppAttachRecordingDocument = gql(`
  mutation CrmAppAttachRecording($input: CrmDeviceCallRecordingInput!) {
    attachCrmDeviceCallRecording(input: $input) { id recording_url transcript_status }
  }
`);

/** A one-use upload ticket for the server's /upload route (the same path every app upload takes). */
export const CrmAppUploadTicketDocument = gql(`
  mutation CrmAppUploadTicket($folder: String, $surface: UploadSurface) {
    getImagekitAuth(folder: $folder, surface: $surface) { uploadUrl ticket }
  }
`);

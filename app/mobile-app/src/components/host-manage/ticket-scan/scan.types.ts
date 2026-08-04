/** Attendee shape returned by hostScanPodTicket — identical to mWeb's (rule 27). */
export interface ScannedAttendee {
  user_id: string;
  full_name: string;
  profile_photo: string;
  profile_path: string;
  email: string;
  phone: string;
  whatsapp: string;
  bio: string;
  address: string;
  city: string;
  joined_at: string | null;
}

export interface HostTicketScanResult {
  ok: boolean;
  message: string;
  already_checked_in: boolean;
  ticket: { id: string; ticket_code: string; status: string; checked_in_at: string | null } | null;
  attendee: ScannedAttendee | null;
}

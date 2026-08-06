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
  /** True when the ticket admits more people whose details are not on file yet. */
  requires_companions: boolean;
  /** How many still need a name and phone number. */
  companions_required: number;
  ticket: {
    id: string;
    ticket_code: string;
    status: string;
    /** People this one QR admits. 1 for every single-seat and legacy ticket. */
    seats: number;
    checked_in_at: string | null;
  } | null;
  attendee: ScannedAttendee | null;
}

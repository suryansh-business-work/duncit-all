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

/** A companion already on file — what the green-tick roster renders. */
export interface PodCompanionRecord {
  name: string;
  phone_number: string;
  /** ISO when their own number answered a code, null when it never did. */
  verified_at: string | null;
}

export interface HostTicketScanResult {
  ok: boolean;
  message: string;
  already_checked_in: boolean;
  /** True when the ticket admits more people whose details are not on file yet. */
  requires_companions: boolean;
  /** How many still need a name and phone number. */
  companions_required: number;
  /** The other people on this booking, once recorded. */
  companions: PodCompanionRecord[];
  ticket: {
    id: string;
    ticket_code: string;
    status: string;
    /** People this one QR admits. 1 for every single-seat and legacy ticket. */
    seats: number;
    checked_in_at: string | null;
    /** The booking behind this ticket — what a companion's code is raised on. */
    membership_id: string;
  } | null;
  attendee: ScannedAttendee | null;
}

export interface VenueReleaseValues {
  amount_requested: number;
  bill_url: string;
  notes: string;
}

export interface HostReleaseValues {
  host_user_id: string;
  amount_requested: number;
  evidence_media_text: string;
  notes: string;
}

export interface CompletePodDialogProps {
  open: boolean;
  pod: any | null;
  users: any[];
  busyKind: 'VENUE_BILLING' | 'HOST_PAYMENT' | '';
  errorMessage?: string | null;
  onClose: () => void;
  onVenueSubmit: (values: VenueReleaseValues) => Promise<void> | void;
  onHostSubmit: (values: HostReleaseValues) => Promise<void> | void;
}
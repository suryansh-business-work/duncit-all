export interface OverrideOption {
  /** The id sent to the override mutation (host user_id / venue doc id). */
  id: string;
  label: string;
  sublabel: string;
  /** The entity's current commission override, when the API exposes it. */
  current_pct?: number;
}

export interface OverrideFormValues {
  entity_id: string;
  commission_pct: number;
}

export interface OverrideEditorCardProps {
  title: string;
  subtitle: string;
  pickerLabel: string;
  options: OverrideOption[];
  loading: boolean;
  saving: boolean;
  onSave: (entityId: string, commissionPct: number) => Promise<void>;
}

export interface HostOption {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

export interface VenueOption {
  id: string;
  venue_name: string;
  city: string;
  venue_share_pct: number;
  venue_commission_pct: number;
}

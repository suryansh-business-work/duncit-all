export interface CapacityOverrideFormValues {
  template_id: string;
  occurrence_date: string;
  capacity_override: string;
  is_cancelled: boolean;
  note: string;
}

export interface CapacityOverrideInput {
  template_id: string;
  occurrence_date: string;
  capacity_override: number | null;
  is_cancelled: boolean;
  note: string;
}

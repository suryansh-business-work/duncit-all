export interface GigCategoryRow {
  id: string;
  slug_id: string;
  title: string;
  description: string;
  examples: string[];
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

/** The dialog's values — the roles are edited as one role per line. */
export interface GigCategoryFormValues {
  title: string;
  description: string;
  examples: string;
  sort_order: string;
  is_active: boolean;
}

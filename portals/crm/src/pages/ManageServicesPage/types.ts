export interface EditRow {
  id?: string;
  name: string;
  sort_order: string;
  is_active: boolean;
}

export const blankRow: EditRow = { name: '', sort_order: '0', is_active: true };

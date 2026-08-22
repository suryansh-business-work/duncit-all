/** One person as the Add-user picker reads them — the four fields it shows. */
export interface PickableUser {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface PickerUsersData {
  audienceTable: {
    total: number;
    rows: PickableUser[];
  };
}

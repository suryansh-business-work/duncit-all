export interface RoleEdit {
  id?: string;
  key: string;
  name: string;
  description: string;
}

export const blankRole: RoleEdit = { key: '', name: '', description: '' };

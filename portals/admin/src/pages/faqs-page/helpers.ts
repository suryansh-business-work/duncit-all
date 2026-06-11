export interface FormState {
  super_category_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
}

export const emptyForm: FormState = {
  super_category_id: '',
  question: '',
  answer: '',
  is_active: true,
  sort_order: 0,
};

export interface PromptFormValues {
  name: string;
  description: string;
  category: string;
  target_model: string;
  content: string;
  is_active: boolean;
}

export const promptInitialValues: PromptFormValues = {
  name: '',
  description: '',
  category: 'General',
  target_model: '',
  content: '',
  is_active: true,
};

export interface PromptFormProps {
  initialValues?: Partial<PromptFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: PromptFormValues) => Promise<void> | void;
  onCancel?: () => void;
}

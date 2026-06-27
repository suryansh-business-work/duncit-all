import { z } from 'zod';

/** Validation for a Prompt Library entry. RHF + Zod (migrated from Formik + Yup). */
export const promptSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Keep the name under 80 characters'),
  description: z.string().trim().max(200, 'Keep the description under 200 characters').default(''),
  category: z.string().trim().max(40, 'Keep the category under 40 characters').default(''),
  target_model: z.string().trim().max(60, 'Keep the model under 60 characters').default(''),
  content: z
    .string()
    .trim()
    .min(1, 'Prompt content is required')
    .min(10, 'Add at least 10 characters of prompt content')
    .max(20000, 'Prompt is too long (max 20000 characters)'),
  is_active: z.boolean().default(true),
});

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

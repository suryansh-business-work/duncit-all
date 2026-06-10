import * as yup from 'yup';

export const faqFormSchema = yup.object({
  super_category_id: yup.string().trim().default(''),
  question: yup
    .string()
    .trim()
    .min(5, 'Question must be at least 5 characters')
    .max(300, 'Question must be 300 characters or fewer')
    .required('Question is required'),
  answer: yup
    .string()
    .trim()
    .min(5, 'Answer must be at least 5 characters')
    .max(4000, 'Answer must be 4000 characters or fewer')
    .required('Answer is required'),
  sort_order: yup
    .number()
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(9999)
    .default(0),
  is_active: yup.boolean().default(true),
});

export type FaqFormValues = yup.InferType<typeof faqFormSchema>;

export function toFaqInput(values: FaqFormValues) {
  const cast = faqFormSchema.cast(values, { stripUnknown: true });
  return {
    super_category_id: cast.super_category_id || null,
    question: cast.question,
    answer: cast.answer,
    sort_order: Number(cast.sort_order) || 0,
    is_active: cast.is_active,
  };
}

import * as yup from 'yup';

export const podIdeaFormSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(160, 'Title must be 160 characters or fewer')
    .required('Title is required'),
  description: yup
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2001, 'Description must be 2001 characters or fewer')
    .required('Description is required'),
});

export type PodIdeaFormValues = yup.InferType<typeof podIdeaFormSchema>;

export const podIdeaInitialValues: PodIdeaFormValues = {
  title: '',
  description: '',
};

export function toPodIdeaInput(values: PodIdeaFormValues) {
  return podIdeaFormSchema.cast(values, { stripUnknown: true });
}

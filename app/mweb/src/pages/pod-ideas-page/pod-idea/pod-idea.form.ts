import { z } from 'zod';

export const podIdeaFormSchema = z.object({
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(160, 'Title must be 160 characters or fewer'),
  description: z
    .string({ error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2001, 'Description must be 2001 characters or fewer'),
});

export type PodIdeaFormValues = z.infer<typeof podIdeaFormSchema>;

export const podIdeaInitialValues: PodIdeaFormValues = {
  title: '',
  description: '',
};

export function toPodIdeaInput(values: PodIdeaFormValues) {
  return { title: values.title.trim(), description: values.description.trim() };
}

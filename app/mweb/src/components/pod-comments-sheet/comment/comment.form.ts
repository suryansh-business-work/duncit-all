import { z } from 'zod';

export const commentFormSchema = z.object({
  text: z
    .string({ error: 'Comment is required' })
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be 1000 characters or fewer'),
});

export type CommentFormValues = z.infer<typeof commentFormSchema>;

export const commentInitialValues: CommentFormValues = { text: '' };

export function toCommentInput(values: CommentFormValues) {
  return { text: values.text.trim() };
}

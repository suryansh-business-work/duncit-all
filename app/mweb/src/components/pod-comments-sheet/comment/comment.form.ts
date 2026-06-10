import * as yup from 'yup';

export const commentFormSchema = yup.object({
  text: yup
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be 1000 characters or fewer')
    .required('Comment is required'),
});

export type CommentFormValues = yup.InferType<typeof commentFormSchema>;

export const commentInitialValues: CommentFormValues = { text: '' };

export function toCommentInput(values: CommentFormValues) {
  return commentFormSchema.cast(values, { stripUnknown: true });
}

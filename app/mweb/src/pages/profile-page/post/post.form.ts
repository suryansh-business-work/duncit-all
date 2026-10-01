import { z } from 'zod';

export const POST_VISIBILITY = ['PUBLIC', 'PRIVATE'] as const;
export type PostVisibility = (typeof POST_VISIBILITY)[number];

export const postFormSchema = z
  .object({
    text: z
      .string()
      .trim()
      .max(2000, 'Post must be 2000 characters or fewer')
      .default(''),
    media: z
      .array(z.httpUrl('Invalid media URL'))
      .max(10, 'Up to 10 media items')
      .default([]),
    visibility: z.enum(POST_VISIBILITY, {
      error: (issue) => (issue.input === undefined ? 'Visibility is required' : 'Select a valid visibility'),
    }),
  })
  .refine((values) => values.text.length > 0 || values.media.length > 0, 'Post must have text or media');

export type PostFormValues = z.infer<typeof postFormSchema>;

export function toPostInput(values: PostFormValues) {
  return {
    text: values.text.trim() || null,
    media: values.media.map((url) => url.trim()),
    visibility: values.visibility,
  };
}

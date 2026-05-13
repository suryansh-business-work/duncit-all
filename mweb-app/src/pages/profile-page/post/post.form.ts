import * as yup from 'yup';

export const POST_VISIBILITY = ['PUBLIC', 'PRIVATE'] as const;
export type PostVisibility = (typeof POST_VISIBILITY)[number];

export const postFormSchema = yup.object({
  text: yup
    .string()
    .trim()
    .max(2000, 'Post must be 2000 characters or fewer')
    .default(''),
  media: yup
    .array(yup.string().trim().url('Invalid media URL').required())
    .max(10, 'Up to 10 media items')
    .default([]),
  visibility: yup
    .mixed<PostVisibility>()
    .oneOf([...POST_VISIBILITY], 'Select a valid visibility')
    .required('Visibility is required'),
}).test('has-content', 'Post must have text or media', (values) => {
  return !!values && ((values.text ?? '').trim().length > 0 || (values.media ?? []).length > 0);
});

export type PostFormValues = yup.InferType<typeof postFormSchema>;

export function toPostInput(values: PostFormValues) {
  const cast = postFormSchema.cast(values, { stripUnknown: true });
  return {
    text: cast.text || null,
    media: cast.media,
    visibility: cast.visibility,
  };
}

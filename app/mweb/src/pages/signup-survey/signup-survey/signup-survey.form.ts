import { z } from 'zod';

export const signupSurveySchema = z.object({
  interest_category_ids: z
    .array(z.string().trim().min(1))
    .min(1, 'Pick at least one interest')
    .max(20, 'Pick up to 20 interests'),
  other_interests: z
    .string()
    .trim()
    .max(500, 'Notes must be 500 characters or fewer')
    .default(''),
});

export type SignupSurveyFormValues = z.infer<typeof signupSurveySchema>;

export const signupSurveyInitialValues: SignupSurveyFormValues = {
  interest_category_ids: [],
  other_interests: '',
};

export function toSignupSurveyInput(values: SignupSurveyFormValues) {
  return {
    interest_category_ids: values.interest_category_ids.map((id) => id.trim()),
    other_interests: values.other_interests.trim() || null,
  };
}

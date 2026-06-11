import * as yup from 'yup';

export const signupSurveySchema = yup.object({
  interest_category_ids: yup
    .array(yup.string().trim().required())
    .min(1, 'Pick at least one interest')
    .max(20, 'Pick up to 20 interests')
    .required(),
  other_interests: yup
    .string()
    .trim()
    .max(500, 'Notes must be 500 characters or fewer')
    .default(''),
});

export type SignupSurveyFormValues = yup.InferType<typeof signupSurveySchema>;

export const signupSurveyInitialValues: SignupSurveyFormValues = {
  interest_category_ids: [],
  other_interests: '',
};

export function toSignupSurveyInput(values: SignupSurveyFormValues) {
  const cast = signupSurveySchema.cast(values, { stripUnknown: true });
  return {
    interest_category_ids: cast.interest_category_ids,
    other_interests: cast.other_interests || null,
  };
}

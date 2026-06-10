import type { FormikErrors, FormikTouched } from 'formik';
import type { InterviewFormValues } from '../interview.form';

export function showInterviewError(
  values: InterviewFormValues,
  errors: FormikErrors<InterviewFormValues>,
  touched: FormikTouched<InterviewFormValues>,
  submitCount: number,
  key: keyof InterviewFormValues,
) {
  const value = values[key];
  const hasValue = typeof value === 'number' ? value !== 0 : String(value ?? '').length > 0;
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || hasValue));
}
import * as yup from 'yup';
import { Form, Formik } from 'formik';
import { Button, Chip, FormControlLabel, Stack, Switch } from '@mui/material';
import FormField from '../FormField';
import { estimateTokens } from '../../utils/estimate-tokens';
import { promptInitialValues, type PromptFormProps, type PromptFormValues } from './prompt.types';

/** Validation for a Prompt Library entry. Formik + Yup per this portal's form standard. */
export const promptSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Keep the name under 80 characters')
    .required('Name is required'),
  description: yup.string().trim().max(200, 'Keep the description under 200 characters'),
  category: yup.string().trim().max(40, 'Keep the category under 40 characters'),
  target_model: yup.string().trim().max(60, 'Keep the model under 60 characters'),
  content: yup
    .string()
    .trim()
    .min(10, 'Add at least 10 characters of prompt content')
    .max(20000, 'Prompt is too long (max 20000 characters)')
    .required('Prompt content is required'),
  is_active: yup.boolean(),
});

/**
 * Create / edit a Prompt Library entry. The token size of `content` is shown live
 * (same estimator the server uses) so authors see the budget as they type.
 */
export default function PromptForm({ initialValues, submitting, submitLabel = 'Save', onSubmit, onCancel }: PromptFormProps) {
  return (
    <Formik
      initialValues={{ ...promptInitialValues, ...initialValues } as PromptFormValues}
      validationSchema={promptSchema}
      validateOnChange
      validateOnBlur
      onSubmit={(values) => onSubmit(values)}
    >
      {({ values, isValid, setFieldValue }) => (
        <Form noValidate data-testid="prompt-form">
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <FormField name="name" label="Name" required hint='A short label, e.g. "Article summarizer"' />
            <FormField name="description" label="Description" hint="Optional — what this prompt is for" />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormField name="category" label="Category" hint="e.g. Summarization, Classification" />
              <FormField name="target_model" label="Model" hint="Optional target model, e.g. gpt-4o-mini" />
            </Stack>
            <FormField
              name="content"
              label="Prompt content"
              required
              multiline
              minRows={6}
              hint="The prompt body sent to the model"
            />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`≈ ${estimateTokens(values.content)} tokens`}
                data-testid="prompt-token-count"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={values.is_active}
                    onChange={(e) => setFieldValue('is_active', e.target.checked)}
                    name="is_active"
                  />
                }
                label="Active"
              />
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {onCancel && (
                <Button onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="contained" disabled={submitting || !isValid}>
                {submitting ? 'Saving…' : submitLabel}
              </Button>
            </Stack>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}

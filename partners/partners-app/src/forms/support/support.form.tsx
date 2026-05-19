import { Formik } from 'formik';
import * as yup from 'yup';
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import FormField from '../FormField';
import { validationRules } from '../validation/rules';
import { SUPPORT_CATEGORIES, supportInitialValues, type SupportFormValues } from './support.types';

export const supportSchema: yup.ObjectSchema<SupportFormValues> = yup.object({
  name: validationRules.personName('Name'),
  email: validationRules.email('Email'),
  category: yup.mixed<SupportFormValues['category']>().oneOf(SUPPORT_CATEGORIES.map((item) => item.value), 'Select a valid category').required('Category is required'),
  subject: validationRules.requiredText('Subject', 3, 120),
  message: validationRules.requiredText('Message', 10, 2000),
});

interface Props {
  initialValues?: Partial<SupportFormValues>;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: SupportFormValues) => Promise<void> | void;
}

export default function SupportForm({ initialValues, loading, errorMessage, onSubmit }: Props) {
  return (
    <Formik
      initialValues={{ ...supportInitialValues, ...(initialValues ?? {}) } as SupportFormValues}
      validationSchema={supportSchema}
      enableReinitialize
      validateOnBlur
      onSubmit={async (values, { setStatus }) => {
        setStatus(undefined);
        try {
          await onSubmit(values);
        } catch (error: any) {
          setStatus(error?.message ?? 'Could not submit support request.');
        }
      }}
    >
      {({ values, touched, errors, handleBlur, handleChange, handleSubmit, isSubmitting, status }) => {
        const categoryError = Boolean(touched.category && errors.category);
        return (
          <Stack component="form" noValidate onSubmit={handleSubmit} spacing={2}>
            <FormField name="name" label="Your name" autoComplete="name" />
            <FormField name="email" label="Email" type="email" autoComplete="email" disabled InputProps={{ readOnly: true }} hint="Locked to your Duncit account" />
            <TextField select name="category" label="Category" value={values.category} onChange={handleChange} onBlur={handleBlur} error={categoryError} helperText={categoryError ? errors.category : ' '} fullWidth>
              {SUPPORT_CATEGORIES.map((category) => <MenuItem key={category.value} value={category.value}>{category.label}</MenuItem>)}
            </TextField>
            <FormField name="subject" label="Subject" />
            <FormField name="message" label="Message" multiline minRows={4} />
            {(errorMessage || status) && <Alert severity="error">{errorMessage ?? status}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={loading || isSubmitting}>{loading || isSubmitting ? 'Sending...' : 'Send to support'}</Button>
          </Stack>
        );
      }}
    </Formik>
  );
}

export function toContactInput(values: SupportFormValues) {
  const payload = supportSchema.cast(values, { stripUnknown: true }) as SupportFormValues;
  return { name: payload.name, email: payload.email, subject: `[${payload.category}] ${payload.subject}`, message: payload.message };
}
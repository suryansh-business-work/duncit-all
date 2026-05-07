import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import {
  Alert,
  Button,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import SubjectIcon from '@mui/icons-material/Subject';
import CategoryIcon from '@mui/icons-material/Category';
import FormField from './FormField';

export interface SupportFormValues {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

const DEFAULTS: SupportFormValues = {
  name: '',
  email: '',
  category: 'QUESTION',
  subject: '',
  message: '',
};

const CATEGORIES = [
  { value: 'BUG', label: 'Bug / Something is broken' },
  { value: 'QUESTION', label: 'Question / How do I…' },
  { value: 'FEEDBACK', label: 'Feedback / Suggestion' },
  { value: 'ACCOUNT', label: 'Account / Login' },
  { value: 'PAYMENT', label: 'Payment / Refund' },
  { value: 'OTHER', label: 'Other' },
];

export const supportSchema: Yup.ObjectSchema<SupportFormValues> = Yup.object({
  name: Yup.string().trim().min(2, 'At least 2 characters').required('Name is required'),
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  category: Yup.string().oneOf(CATEGORIES.map((c) => c.value)).required(),
  subject: Yup.string().trim().min(3, 'At least 3 characters').max(120, 'Max 120 characters').required(
    'Subject is required'
  ),
  message: Yup.string().trim().min(10, 'Please describe in at least 10 characters').max(2000, 'Max 2000 characters').required(
    'Message is required'
  ),
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
      initialValues={{ ...DEFAULTS, ...(initialValues ?? {}) } as SupportFormValues}
      validationSchema={supportSchema}
      validateOnBlur
      onSubmit={async (values, { setStatus }) => {
        setStatus(undefined);
        try {
          await onSubmit(values);
        } catch (e: any) {
          setStatus(e?.message ?? 'Could not submit. Please try again.');
        }
      }}
    >
      {({ status, values, setFieldValue, isSubmitting }) => (
        <Form noValidate>
          <Stack spacing={1.5}>
            <FormField name="name" label="Your name" autoComplete="name" />
            <FormField name="email" label="Email" type="email" autoComplete="email" />
            <TextField
              select
              name="category"
              label="Category"
              size="small"
              value={values.category}
              onChange={(e) => setFieldValue('category', e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CategoryIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </TextField>
            <FormField
              name="subject"
              label="Subject"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SubjectIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormField
              name="message"
              label="Describe your issue or feedback"
              multiline
              minRows={4}
            />

            {(errorMessage || status) && (
              <Alert severity="error">{errorMessage ?? status}</Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || isSubmitting}
            >
              {loading || isSubmitting ? 'Sending\u2026' : 'Send to support'}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}

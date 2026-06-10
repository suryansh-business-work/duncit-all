import { Form, Formik } from 'formik';
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
import FormField from '../FormField';
import {
  CATEGORIES,
  DEFAULTS,
  type SupportFormValues,
  supportSchema,
} from './schema';
import AttachmentsField from './AttachmentsField';

interface Props {
  initialValues?: Partial<SupportFormValues>;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: SupportFormValues) => Promise<void> | void;
}

export default function SupportForm({
  initialValues,
  loading,
  errorMessage,
  onSubmit,
}: Readonly<Props>) {
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
              label="Tell us what's going on"
              multiline
              minRows={4}
            />

            <AttachmentsField
              attachments={values.attachments}
              setAttachments={(next) => setFieldValue('attachments', next)}
            />

            {(errorMessage || status) && (
              <Alert severity="error">{errorMessage ?? status}</Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || isSubmitting}
              sx={{ borderRadius: 999, fontWeight: 950 }}
            >
              {loading || isSubmitting ? 'Sending…' : 'Send to support'}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}

export type { SupportFormValues } from './schema';
export { supportSchema } from './schema';

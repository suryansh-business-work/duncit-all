import { Formik } from 'formik';
import * as yup from 'yup';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { PARTNER_FAQ_TOPICS, type PartnerFaqTopic } from './partner-faq.types';

export interface PartnerFaqFormValues {
  partner_topic: PartnerFaqTopic;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  open: boolean;
  editing: boolean;
  initialValues: PartnerFaqFormValues;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: PartnerFaqFormValues) => Promise<void>;
}

export const partnerFaqSchema = yup.object({
  partner_topic: yup.mixed<PartnerFaqTopic>().oneOf(['VENUE', 'HOST', 'PRODUCTS']).required('Topic is required'),
  question: yup.string().trim().min(5, 'Question must be at least 5 characters').max(300).required('Question is required'),
  answer: yup.string().trim().min(5, 'Answer must be at least 5 characters').max(4000).required('Answer is required'),
  sort_order: yup.number().integer().min(0).max(9999).required('Sort order is required'),
  is_active: yup.boolean().required(),
});

export const toPartnerFaqInput = (values: PartnerFaqFormValues) => {
  const cast = partnerFaqSchema.cast(values, { stripUnknown: true }) as PartnerFaqFormValues;
  return {
    audience: 'PARTNERS',
    partner_topic: cast.partner_topic,
    question: cast.question.trim(),
    answer: cast.answer.trim(),
    sort_order: Number(cast.sort_order) || 0,
    is_active: cast.is_active,
  };
};

export default function PartnerFaqForm({ open, editing, initialValues, saving, error, onClose, onSubmit }: Readonly<Props>) {
  return (
    <Formik initialValues={initialValues} enableReinitialize validationSchema={partnerFaqSchema} onSubmit={onSubmit}>
      {({ values, errors, touched, handleChange, setFieldValue, submitForm }) => (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
          <DialogTitle>{editing ? 'Edit Partner FAQ' : 'New Partner FAQ'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField select name="partner_topic" label="Topic" value={values.partner_topic} onChange={handleChange} fullWidth>
                {PARTNER_FAQ_TOPICS.map((topic) => <MenuItem key={topic.value} value={topic.value}>{topic.label}</MenuItem>)}
              </TextField>
              <TextField name="question" label="Question" value={values.question} onChange={handleChange} error={Boolean(touched.question && errors.question)} helperText={touched.question && errors.question} fullWidth required />
              <TextField name="answer" label="Answer" value={values.answer} onChange={handleChange} error={Boolean(touched.answer && errors.answer)} helperText={touched.answer && errors.answer} multiline minRows={4} fullWidth required />
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField name="sort_order" label="Sort order" type="number" value={values.sort_order} onChange={handleChange} sx={{ width: 160 }} />
                <FormControlLabel control={<Switch checked={values.is_active} onChange={(event) => setFieldValue('is_active', event.target.checked)} />} label="Active" />
              </Stack>
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={() => submitForm()} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Formik>
  );
}
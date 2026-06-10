import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Form, Formik } from 'formik';
import AiFillButton from '../../../components/AiFillButton';
import type { SliderForm } from '../queries';
import { sliderFormSchema } from '../slider.form';
import SliderSections from './SliderSections';

interface Props {
  open: boolean;
  onClose: () => void;
  form: SliderForm;
  busy: boolean;
  opError: string | null;
  onSubmit: (values: SliderForm) => void;
  locations: any[];
  superCategories: { id: string; name: string; slug: string }[];
}

export default function SliderFormDialog({ open, onClose, form, busy, opError, onSubmit, locations, superCategories }: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <Formik<SliderForm>
        initialValues={form}
        enableReinitialize
        validationSchema={sliderFormSchema}
        validateOnBlur
        validateOnChange
        onSubmit={(values) => onSubmit(values)}
      >
        {({ values, setValues, submitForm }) => (
          <Form noValidate>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <span>{values.id ? 'Edit Slider' : 'New Slider'}</span>
              <AiFillButton
                entity="SLIDER"
                onFill={(data) =>
                  setValues({
                    ...values,
                    title: data.title ?? values.title,
                    description: data.description ?? values.description,
                    media_url: data.media_url ?? values.media_url,
                    media_type: data.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
                    link_url: data.link_url ?? values.link_url,
                    sort_order: Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : values.sort_order,
                  })
                }
              />
            </DialogTitle>
            <DialogContent>
              <SliderSections locations={locations} superCategories={superCategories} opError={opError} />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={busy}>Cancel</Button>
              <Button variant="contained" onClick={submitForm} disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}
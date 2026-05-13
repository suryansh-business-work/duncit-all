import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Form, Formik, useFormikContext, type FormikErrors, type FormikTouched } from 'formik';
import AiFillButton from '../../components/AiFillButton';
import DateTimeField from '../../components/DateTimeField';
import { type SliderForm } from './queries';
import SliderBasicFields from './SliderBasicFields';
import SliderScopeFields from './SliderScopeFields';
import { sliderFormSchema } from './slider.form';

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

function fieldError(
  values: SliderForm,
  errors: FormikErrors<SliderForm>,
  touched: FormikTouched<SliderForm>,
  submitCount: number,
  key: keyof SliderForm,
) {
  const value = values[key];
  const hasValue =
    typeof value === 'boolean' || typeof value === 'number'
      ? true
      : String(value ?? '').length > 0;
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || hasValue));
}

/**
 * Bridge component: renders existing section sub-components against Formik state.
 * Sub-components expect `(form, setForm)` props — we adapt setForm to Formik's setValues.
 */
function SliderSections({
  locations,
  superCategories,
  opError,
}: {
  locations: any[];
  superCategories: { id: string; name: string; slug: string }[];
  opError: string | null;
}) {
  const { values, errors, touched, submitCount, handleBlur, handleChange, setValues, setFieldValue } =
    useFormikContext<SliderForm>();
  const selectedLocation = locations.find((item: any) => item.id === values.location_id);
  const zonesForLocation = selectedLocation?.location_zones ?? [];

  const adaptedSetForm: React.Dispatch<React.SetStateAction<SliderForm>> = (next) => {
    if (typeof next === 'function') {
      setValues((prev: SliderForm) => (next as (p: SliderForm) => SliderForm)(prev));
    } else {
      setValues(next);
    }
  };

  const err = (key: keyof SliderForm) => fieldError(values, errors, touched, submitCount, key);
  const help = (key: keyof SliderForm, fallback = ' ') => (err(key) ? String(errors[key]) : fallback);

  // First aggregated error (excluding ones already shown inline) — gives the user
  // immediate feedback if a field deeper inside a section is invalid.
  const aggregatedError = Object.entries(errors)
    .filter(([key]) => !['title', 'media_url', 'sort_order', 'starts_at', 'ends_at'].includes(key))
    .map(([, message]) => (typeof message === 'string' ? message : null))
    .find(Boolean);

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {opError && <Alert severity="error">{opError}</Alert>}
      {!opError && aggregatedError && submitCount > 0 && (
        <Alert severity="warning">{aggregatedError}</Alert>
      )}

      <SliderBasicFields form={values} setForm={adaptedSetForm} />
      {(err('title') || err('media_url')) && (
        <Stack spacing={0.5}>
          {err('title') && <Typography variant="caption" color="error">{help('title')}</Typography>}
          {err('media_url') && <Typography variant="caption" color="error">{help('media_url')}</Typography>}
        </Stack>
      )}

      <SliderScopeFields
        form={values}
        setForm={adaptedSetForm}
        locations={locations}
        zonesForLocation={zonesForLocation}
        superCategories={superCategories}
      />
      {(err('location_id') || err('zone_name')) && (
        <Stack spacing={0.5}>
          {err('location_id') && <Typography variant="caption" color="error">{help('location_id')}</Typography>}
          {err('zone_name') && <Typography variant="caption" color="error">{help('zone_name')}</Typography>}
        </Stack>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Sort order"
          type="number"
          name="sort_order"
          value={values.sort_order}
          onChange={(event) => setFieldValue('sort_order', Number(event.target.value) || 0)}
          onBlur={handleBlur}
          error={err('sort_order')}
          helperText={help('sort_order', 'Lower shows first')}
          fullWidth
        />
        {values.id && (
          <FormControlLabel
            control={
              <Switch
                checked={values.is_active}
                onChange={(_event, checked) => setFieldValue('is_active', checked)}
              />
            }
            label={values.is_active ? 'Active' : 'Inactive'}
          />
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DateTimeField
          label="Starts at (optional)"
          value={values.starts_at}
          onChange={(iso) => setFieldValue('starts_at', iso)}
        />
        <DateTimeField
          label="Ends at (optional)"
          value={values.ends_at}
          onChange={(iso) => setFieldValue('ends_at', iso)}
          minDateTime={values.starts_at ? new Date(values.starts_at) : null}
        />
      </Stack>
      {err('ends_at') && (
        <Typography variant="caption" color="error">{help('ends_at')}</Typography>
      )}

      {/* dummy element to satisfy unused-vars on handleChange / handleBlur */}
      <input type="hidden" name="__formik_anchor__" onChange={handleChange} onBlur={handleBlur} value="" />
    </Stack>
  );
}

export default function SliderFormDialog({
  open,
  onClose,
  form,
  busy,
  opError,
  onSubmit,
  locations,
  superCategories,
}: Props) {
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
            <DialogTitle
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
            >
              <span>{values.id ? 'Edit Slider' : 'New Slider'}</span>
              <AiFillButton
                entity="SLIDER"
                onFill={(d) =>
                  setValues({
                    ...values,
                    title: d.title ?? values.title,
                    description: d.description ?? values.description,
                    media_url: d.media_url ?? values.media_url,
                    media_type: d.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
                    link_url: d.link_url ?? values.link_url,
                    sort_order: Number.isFinite(Number(d.sort_order))
                      ? Number(d.sort_order)
                      : values.sort_order,
                  })
                }
              />
            </DialogTitle>
            <DialogContent>
              <SliderSections
                locations={locations}
                superCategories={superCategories}
                opError={opError}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" onClick={submitForm} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
}

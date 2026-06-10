import type { Dispatch, SetStateAction } from 'react';
import { Alert, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { useFormikContext } from 'formik';
import DateTimeField from '../../../components/DateTimeField';
import type { SliderForm } from '../queries';
import SliderBasicFields from '../SliderBasicFields';
import SliderScopeFields from '../SliderScopeFields';
import { fieldError, firstNestedError } from './sliderDialogHelpers';

interface Props {
  locations: any[];
  superCategories: { id: string; name: string; slug: string }[];
  opError: string | null;
}

export default function SliderSections({ locations, superCategories, opError }: Readonly<Props>) {
  const { values, errors, touched, submitCount, handleBlur, setValues, setFieldValue } =
    useFormikContext<SliderForm>();
  const selectedLocation = locations.find((item: any) => item.id === values.location_id);
  const zonesForLocation = selectedLocation?.location_zones ?? [];
  const adaptedSetForm: Dispatch<SetStateAction<SliderForm>> = (next) => {
    if (typeof next === 'function') {
      setValues((prev: SliderForm) => (next as (previous: SliderForm) => SliderForm)(prev));
      return;
    }
    setValues(next);
  };
  const showError = (key: keyof SliderForm) => fieldError(values, errors, touched, submitCount, key);
  const helperText = (key: keyof SliderForm, fallback = ' ') => (showError(key) ? String(errors[key]) : fallback);
  const nestedError = firstNestedError(errors);

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {opError && <Alert severity="error">{opError}</Alert>}
      {!opError && nestedError && submitCount > 0 && <Alert severity="warning">{nestedError}</Alert>}
      <SliderBasicFields form={values} setForm={adaptedSetForm} />
      {(showError('title') || showError('media_url')) && (
        <Stack spacing={0.5}>
          {showError('title') && <Typography variant="caption" color="error">{helperText('title')}</Typography>}
          {showError('media_url') && <Typography variant="caption" color="error">{helperText('media_url')}</Typography>}
        </Stack>
      )}
      <SliderScopeFields
        form={values}
        setForm={adaptedSetForm}
        locations={locations}
        zonesForLocation={zonesForLocation}
        superCategories={superCategories}
      />
      {(showError('location_id') || showError('zone_name')) && (
        <Stack spacing={0.5}>
          {showError('location_id') && <Typography variant="caption" color="error">{helperText('location_id')}</Typography>}
          {showError('zone_name') && <Typography variant="caption" color="error">{helperText('zone_name')}</Typography>}
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
          error={showError('sort_order')}
          helperText={helperText('sort_order', 'Lower shows first')}
          fullWidth
        />
        {values.id && (
          <FormControlLabel
            control={<Switch checked={values.is_active} onChange={(_event, checked) => setFieldValue('is_active', checked)} />}
            label={values.is_active ? 'Active' : 'Inactive'}
          />
        )}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DateTimeField label="Starts at (optional)" value={values.starts_at} onChange={(iso) => setFieldValue('starts_at', iso)} />
        <DateTimeField
          label="Ends at (optional)"
          value={values.ends_at}
          onChange={(iso) => setFieldValue('ends_at', iso)}
          minDateTime={values.starts_at ? new Date(values.starts_at) : null}
        />
      </Stack>
      {showError('ends_at') && <Typography variant="caption" color="error">{helperText('ends_at')}</Typography>}
    </Stack>
  );
}
import type { Dispatch, SetStateAction } from 'react';
import { Alert, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import type { FieldErrors } from 'react-hook-form';
import DateTimeField from '../../../components/DateTimeField';
import type { SliderForm } from '../queries';
import SliderBasicFields from '../SliderBasicFields';
import SliderScopeFields from '../SliderScopeFields';
import { fieldError, firstNestedError } from './sliderDialogHelpers';

interface Props {
  values: SliderForm;
  errors: FieldErrors<SliderForm>;
  submitCount: number;
  setForm: Dispatch<SetStateAction<SliderForm>>;
  locations: any[];
  superCategories: { id: string; name: string; slug: string }[];
  opError: string | null;
}

export default function SliderSections({
  values,
  errors,
  submitCount,
  setForm,
  locations,
  superCategories,
  opError,
}: Readonly<Props>) {
  const showError = (key: keyof SliderForm) => fieldError(values, errors, submitCount, key);
  const helperText = (key: keyof SliderForm, fallback = ' ') =>
    showError(key) ? String(errors[key]?.message ?? '') : fallback;
  const nestedError = firstNestedError(errors);
  const setField = (key: keyof SliderForm, value: SliderForm[keyof SliderForm]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {opError && <Alert severity="error">{opError}</Alert>}
      {!opError && nestedError && submitCount > 0 && <Alert severity="warning">{nestedError}</Alert>}
      <SliderBasicFields form={values} setForm={setForm} />
      {(showError('title') || showError('media_url')) && (
        <Stack spacing={0.5}>
          {showError('title') && <Typography variant="caption" color="error">{helperText('title')}</Typography>}
          {showError('media_url') && <Typography variant="caption" color="error">{helperText('media_url')}</Typography>}
        </Stack>
      )}
      <SliderScopeFields
        form={values}
        setForm={setForm}
        locations={locations}
        superCategories={superCategories}
      />
      {(showError('location_id') || showError('zone_name')) && (
        <Stack spacing={0.5}>
          {showError('location_id') && (
            <Typography variant="caption" color="error">{helperText('location_id')}</Typography>
          )}
          {showError('zone_name') && (
            <Typography variant="caption" color="error">{helperText('zone_name')}</Typography>
          )}
        </Stack>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Sort order"
          type="number"
          name="sort_order"
          value={values.sort_order}
          onChange={(event) => setField('sort_order', Number(event.target.value) || 0)}
          error={showError('sort_order')}
          helperText={helperText('sort_order', 'Lower shows first')}
          fullWidth
        />
        {values.id && (
          <FormControlLabel
            control={
              <Switch checked={values.is_active} onChange={(_event, checked) => setField('is_active', checked)} />
            }
            label={values.is_active ? 'Active' : 'Inactive'}
          />
        )}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <DateTimeField label="Starts at (optional)" value={values.starts_at} onChange={(iso) => setField('starts_at', iso)} />
        <DateTimeField
          label="Ends at (optional)"
          value={values.ends_at}
          onChange={(iso) => setField('ends_at', iso)}
          minDateTime={values.starts_at ? new Date(values.starts_at) : null}
        />
      </Stack>
      {showError('ends_at') && <Typography variant="caption" color="error">{helperText('ends_at')}</Typography>}
    </Stack>
  );
}

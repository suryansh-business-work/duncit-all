import { useFormikContext } from 'formik';
import { Autocomplete, Grid, InputAdornment, TextField } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import PhoneNumberField from '../../components/PhoneNumberField';
import { CITY_NAMES, zonesForCity } from '../../utils/locations';
import type { RegisterFormValues } from './types';

export default function LocationFields() {
  const { values, setFieldValue, touched, errors } = useFormikContext<RegisterFormValues>();
  const zoneOptions = zonesForCity(values.city);
  return (
    <>
      <Grid item xs={4}>
        <PhoneExtensionField
          value={values.phone_extension}
          onChange={(d) => setFieldValue('phone_extension', d)}
          error={Boolean(touched.phone_extension && errors.phone_extension)}
          helperText={touched.phone_extension ? errors.phone_extension : undefined}
        />
      </Grid>
      <Grid item xs={8}>
        <PhoneNumberField
          label="Phone"
          placeholder="98765 43210"
          autoComplete="tel-national"
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={6}>
        <Autocomplete
          freeSolo
          options={CITY_NAMES}
          value={values.city}
          onChange={(_e, v) => {
            setFieldValue('city', v ?? '');
            setFieldValue('zone', '');
          }}
          onInputChange={(_e, v) => setFieldValue('city', v)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="City"
              placeholder="Ghaziabad"
              required
              size="small"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                ...params.InputProps,
                startAdornment: <InputAdornment position="start"><PlaceOutlinedIcon fontSize="small" /></InputAdornment>,
              }}
              inputProps={{ ...params.inputProps, placeholder: 'Ghaziabad' }}
              error={Boolean(touched.city && errors.city)}
              helperText={touched.city ? errors.city : undefined}
            />
          )}
        />
      </Grid>
      <Grid item xs={6}>
        <Autocomplete
          freeSolo
          options={zoneOptions}
          value={values.zone}
          onChange={(_e, v) => setFieldValue('zone', v ?? '')}
          onInputChange={(_e, v) => setFieldValue('zone', v)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Zone"
              placeholder="Raj Nagar"
              required
              size="small"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                ...params.InputProps,
                startAdornment: <InputAdornment position="start"><PlaceOutlinedIcon fontSize="small" /></InputAdornment>,
              }}
              inputProps={{ ...params.inputProps, placeholder: 'Raj Nagar' }}
              error={Boolean(touched.zone && errors.zone)}
              helperText={touched.zone ? errors.zone : undefined}
            />
          )}
        />
      </Grid>
    </>
  );
}

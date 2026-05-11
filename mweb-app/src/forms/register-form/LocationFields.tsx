import { useFormikContext } from 'formik';
import { Autocomplete, Grid, TextField } from '@mui/material';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import PhoneNumberField from '../../components/PhoneNumberField';
import { COUNTRIES, type Country, findCountryByIso } from '../../utils/countries';
import { CITY_NAMES, zonesForCity } from '../../utils/locations';
import type { RegisterFormValues } from './types';

export default function LocationFields() {
  const { values, setFieldValue, touched, errors } = useFormikContext<RegisterFormValues>();
  const country = findCountryByIso(values.country) ?? null;
  const zoneOptions = zonesForCity(values.city);
  return (
    <>
      <Grid item xs={12}>
        <Autocomplete<Country>
          value={country}
          onChange={(_e, c) => {
            setFieldValue('country', c?.iso ?? '');
            if (c) setFieldValue('phone_extension', c.dial);
          }}
          options={COUNTRIES}
          autoHighlight
          getOptionLabel={(c) => `${c.flag}  ${c.name}`}
          isOptionEqualToValue={(a, b) => a.iso === b.iso}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Country"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          )}
        />
      </Grid>
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
              required
              size="small"
              InputLabelProps={{ shrink: true }}
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
              required
              size="small"
              InputLabelProps={{ shrink: true }}
              error={Boolean(touched.zone && errors.zone)}
              helperText={touched.zone ? errors.zone : undefined}
            />
          )}
        />
      </Grid>
    </>
  );
}

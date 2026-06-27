import { useEffect, useState } from 'react';
import { Autocomplete, Grid, TextField } from '@mui/material';
import {
  findState,
  getStatesForCountry,
  loadCitiesForState,
  type GeoCity,
  type GeoState,
} from '../../utils/geo';

const COUNTRY_CODE = 'IN';

interface FieldError {
  error: boolean;
  helperText: string;
}

interface Props {
  state: string;
  city: string;
  pincode: string;
  stateError: FieldError;
  cityError: FieldError;
  pincodeError: FieldError;
  setFieldValue: (field: string, value: string) => void;
}

const cityLabel = (option: string | { name: string }) =>
  typeof option === 'string' ? option : option.name;

/**
 * Structured State → City → Pincode cascade for the admin profile form (B15).
 * Keeps Formik as the source of truth; only the async city list is local state.
 */
export default function AddressFields({
  state,
  city,
  pincode,
  stateError,
  cityError,
  pincodeError,
  setFieldValue,
}: Readonly<Props>) {
  const states = getStatesForCountry(COUNTRY_CODE);
  const selectedState = findState(COUNTRY_CODE, undefined, state) ?? null;
  const stateCode = selectedState?.isoCode;
  const [cities, setCities] = useState<GeoCity[]>([]);

  // Cities for the chosen state load lazily (the dataset is its own chunk).
  useEffect(() => {
    let active = true;
    loadCitiesForState(COUNTRY_CODE, stateCode).then((next) => {
      if (active) setCities(next);
    });
    return () => {
      active = false;
    };
  }, [stateCode]);

  return (
    <>
      <Grid item xs={12} sm={6}>
        <Autocomplete<GeoState>
          options={states}
          value={selectedState}
          autoHighlight
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(a, b) => a.isoCode === b.isoCode}
          onChange={(_event, value) => {
            setFieldValue('state', value?.name ?? '');
            setFieldValue('city', '');
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="State"
              error={stateError.error}
              helperText={stateError.helperText}
              fullWidth
            />
          )}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Autocomplete<GeoCity | string, false, false, true>
          freeSolo
          disabled={!state}
          options={cities}
          value={city}
          getOptionLabel={cityLabel}
          onChange={(_event, value) =>
            setFieldValue('city', typeof value === 'string' ? value : value?.name ?? '')
          }
          onInputChange={(_event, value, reason) => {
            if (reason !== 'reset') setFieldValue('city', value);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="City"
              error={cityError.error}
              helperText={cityError.helperText}
              fullWidth
            />
          )}
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Pincode"
          name="pincode"
          value={pincode}
          onChange={(event) => setFieldValue('pincode', event.target.value)}
          error={pincodeError.error}
          helperText={pincodeError.helperText}
          fullWidth
        />
      </Grid>
    </>
  );
}

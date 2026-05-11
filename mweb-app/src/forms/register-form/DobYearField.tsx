import { useFormikContext } from 'formik';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { subYears } from 'date-fns';
import type { RegisterFormValues } from './types';

export default function DobYearField() {
  const { values, setFieldValue, touched, errors, setFieldTouched } =
    useFormikContext<RegisterFormValues>();
  const value = values.dob ? new Date(values.dob) : null;
  const minDate = subYears(new Date(), 100);
  const maxDate = subYears(new Date(), 13);
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        label="Birth year"
        views={['year']}
        openTo="year"
        value={value}
        minDate={minDate}
        maxDate={maxDate}
        onChange={(d) => {
          setFieldTouched('dob', true, false);
          if (!d || Number.isNaN(d.getTime())) {
            setFieldValue('dob', '');
          } else {
            const y = d.getFullYear();
            setFieldValue('dob', `${y}-01-01`);
          }
        }}
        slotProps={{
          textField: {
            size: 'small',
            fullWidth: true,
            InputLabelProps: { shrink: true },
            error: Boolean(touched.dob && errors.dob),
            helperText: (touched.dob && errors.dob) || ' ',
          },
        }}
      />
    </LocalizationProvider>
  );
}

import { Box, TextField } from '@mui/material';
import { getIn, useFormikContext } from 'formik';
import MediaPickerField from '../MediaPickerField';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';

type Values = HostCreateValues & Partial<HostEditValues>;

export default function HostIdentitySection() {
  const { values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue } =
    useFormikContext<Values>();
  const hasError = (name: string) => {
    const value = getIn(values, name);
    const hasValue = Array.isArray(value) ? value.length > 0 : String(value ?? '').length > 0;
    return Boolean(getIn(errors, name) && (submitCount > 0 || getIn(touched, name) || hasValue));
  };
  const tfProps = (name: string) => ({
    name,
    value: getIn(values, name) ?? '',
    onChange: handleChange,
    onBlur: handleBlur,
    error: hasError(name),
    helperText: hasError(name) ? (getIn(errors, name) as string) : ' ',
    fullWidth: true,
    size: 'small' as const,
  });

  return (
    <>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField label="Aadhar number" required {...tfProps('step2.aadhar_number')} />
        <TextField label="PAN number" required {...tfProps('step2.pan_number')} />
      </Box>
      <MediaPickerField
        label="Passport photo"
        value={values.step2.passport_photo_url}
        onChange={(url) => setFieldValue('step2.passport_photo_url', url)}
        helperText={
          hasError('step2.passport_photo_url')
            ? (getIn(errors, 'step2.passport_photo_url') as string)
            : ' '
        }
        folder="/hosts/photo"
        required
      />
    </>
  );
}
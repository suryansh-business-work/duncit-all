import { TextField } from '@mui/material';
import { getIn, useFormikContext } from 'formik';
import MediaPickerField from '../MediaPickerField';
import type { HostCreateValues, HostEditValues } from '../../forms/host.form';

type Values = HostCreateValues & Partial<HostEditValues>;

export default function HostVerificationSection() {
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
      <MediaPickerField
        label="Police verification document"
        value={values.step3.police_verification_url}
        onChange={(url) => setFieldValue('step3.police_verification_url', url)}
        helperText={
          hasError('step3.police_verification_url')
            ? (getIn(errors, 'step3.police_verification_url') as string)
            : ' '
        }
        folder="/hosts/docs"
        required
      />
      <TextField label="Full address" multiline minRows={2} required {...tfProps('step3.full_address')} />
      <TextField
        label="Tags"
        value={values.step3.tags.join(', ')}
        onChange={(event) =>
          setFieldValue(
            'step3.tags',
            event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean),
          )
        }
        helperText="Comma separated host tags."
        fullWidth
        size="small"
      />
    </>
  );
}
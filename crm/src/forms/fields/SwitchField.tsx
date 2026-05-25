import { useField } from 'formik';
import { FormControlLabel, Switch } from '@mui/material';

interface Props {
  name: string;
  label: string;
}

/** Boolean switch bound to Formik. */
export default function SwitchField({ name, label }: Props) {
  const [field] = useField<boolean>(name);
  const { value, ...rest } = field;
  return (
    <FormControlLabel
      control={<Switch checked={!!value} {...rest} />}
      label={label}
      componentsProps={{ typography: { variant: 'body2' } }}
    />
  );
}

import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';

interface SwitchRowProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}

/**
 * One setting that is a switch: the control, and the sentence saying what it
 * actually does.
 *
 * Module scope, never nested inside the form that renders it — a component
 * defined inside another is a new type on every render, so it is remounted and
 * loses the focus ring the moment the switch is used with a keyboard.
 */
export default function SwitchRow({ checked, onChange, label, hint }: Readonly<SwitchRowProps>) {
  return (
    <Stack spacing={0.5}>
      <FormControlLabel
        control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label={label}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', pl: 6 }}>
        {hint}
      </Typography>
    </Stack>
  );
}

import { useId } from 'react';
import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';

interface PrefSwitchProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** One on/off choice: the label names the switch, the hint describes it. */
export function PrefSwitch({ label, hint, checked, onChange }: Readonly<PrefSwitchProps>) {
  const hintId = useId();
  return (
    <Stack spacing={0.25}>
      <FormControlLabel
        labelPlacement="start"
        label={label}
        sx={{ m: 0, minHeight: 44, justifyContent: 'space-between', '& .MuiFormControlLabel-label': { fontWeight: 700 } }}
        control={
          <Switch
            checked={checked}
            onChange={(_event, next) => onChange(next)}
            slotProps={{ input: { 'aria-describedby': hintId } }}
          />
        }
      />
      <Typography id={hintId} variant="body2" color="text.secondary">
        {hint}
      </Typography>
    </Stack>
  );
}

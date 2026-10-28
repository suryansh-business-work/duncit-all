import { useEffect, useState } from 'react';
import { Paper } from '@mui/material';
import { MuiIconPicker } from '@duncit/ui';

export interface MuiIconPickerMock {
  icon: string;
  label: string;
  hint: string;
}

/**
 * Admin's "MUI Icon" category field, live. Hoisted for the same reason as
 * `SpotsDemo`: the picked value is component state.
 */
export function MuiIconPickerDemo({ mock }: Readonly<{ mock: MuiIconPickerMock }>) {
  const [icon, setIcon] = useState(mock.icon);
  useEffect(() => {
    setIcon(mock.icon);
  }, [mock.icon]);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <MuiIconPicker value={icon} onChange={setIcon} label={mock.label} helperText={mock.hint} />
    </Paper>
  );
}

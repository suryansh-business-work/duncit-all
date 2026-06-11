import { Card, CardContent, FormControlLabel, Switch, Typography } from '@mui/material';
import { useColorMode } from '../../ColorModeContext';

export default function AppearanceSection() {
  const { mode, toggle } = useColorMode();
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Appearance
        </Typography>
        <FormControlLabel
          control={<Switch checked={mode === 'dark'} onChange={toggle} />}
          label={mode === 'dark' ? 'Dark mode' : 'Light mode'}
        />
      </CardContent>
    </Card>
  );
}

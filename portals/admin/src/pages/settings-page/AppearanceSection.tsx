import { Card, CardContent, FormControlLabel, Switch, Typography } from '@mui/material';
import { useColorMode } from '@duncit/shell';

export default function AppearanceSection() {
  const { mode, toggle } = useColorMode();
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>
          Appearance
        </Typography>
        <FormControlLabel
          control={<Switch checked={mode === 'dark'} onChange={toggle} slotProps={{ input: { 'data-testid': 'settings-appearance-switch' } as Record<string, string> }} />}
          label={mode === 'dark' ? 'Dark mode' : 'Light mode'}
          data-testid="settings-appearance"
        />
      </CardContent>
    </Card>
  );
}

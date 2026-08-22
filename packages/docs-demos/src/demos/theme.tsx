import { Alert, Button, Chip, Paper, Stack, TextField, ThemeProvider } from '@mui/material';
import { createDuncitTheme, tokens } from '@duncit/theme';
import { defineDemo, defineDemos } from '../types';

/** Exactly the four accent values a portal hands the factory. */
interface ThemeMock {
  mode: 'light' | 'dark';
  accent_light: string;
  accent_main: string;
  accent_hover: string;
  accent_active: string;
}

export default defineDemos('theme', [
  defineDemo<ThemeMock>({
    id: 'accent',
    title: 'One theme factory, every portal',
    note:
      "Change accent_main to '#0ea5e9' or flip mode to 'dark'. The controls below are plain MUI — everything about how they look comes from the theme this package builds.",
    mock: {
      mode: 'light',
      accent_light: '#a78bfa',
      accent_main: '#7c3aed',
      accent_hover: '#6d28d9',
      accent_active: '#5b21b6',
    },
    render: (mock) => (
      <ThemeProvider
        theme={createDuncitTheme(mock.mode, {
          light: mock.accent_light,
          main: mock.accent_main,
          hover: mock.accent_hover,
          active: mock.accent_active,
        })}
      >
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained">Create pod</Button>
              <Button variant="outlined">Cancel</Button>
              <Button variant="text">Learn more</Button>
              <Chip label="HOST" color="primary" />
              <Chip label="PENDING" color="warning" variant="outlined" />
            </Stack>
            <TextField label="Pod title" defaultValue="Sunday Badminton Doubles" size="small" />
            <Alert severity="info">Gift cards are charged at face value — no fees on top.</Alert>
          </Stack>
        </Paper>
      </ThemeProvider>
    ),
    compute: () => ({
      'Default accent': tokens.defaultAccent,
      'Radii': tokens.radius,
      'Semantic colours': tokens.semantic,
      'Dark surfaces': tokens.dark,
    }),
  }),
]);

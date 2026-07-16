import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const theme = createTheme();

function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>{children}</LocalizationProvider>
    </ThemeProvider>
  );
}

/** Render a leaf/UI element inside the theme + localization + an in-memory router. */
export function renderUI(ui: ReactElement, initialEntries: string[] = ['/']) {
  return render(
    <Providers>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </Providers>,
  );
}

interface RouteOptions {
  path?: string;
  entry?: string;
  extra?: ReactNode;
}

/** Render a page behind a route so navigation (useNavigate/useParams) can be asserted. */
export function renderRoute(ui: ReactElement, { path = '/', entry = '/', extra }: RouteOptions = {}) {
  return render(
    <Providers>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={path} element={ui} />
          {extra}
          <Route path="*" element={<div data-testid="location-other">other</div>} />
        </Routes>
      </MemoryRouter>
    </Providers>,
  );
}

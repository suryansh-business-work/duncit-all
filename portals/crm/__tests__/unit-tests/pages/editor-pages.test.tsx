import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import VenueLeadEditorPage from '@/pages/venue-leads/VenueLeadEditorPage';
import HostLeadEditorPage from '@/pages/host-leads/HostLeadEditorPage';

const wrap = (route: string, path: string, ui: React.ReactElement) =>
  render(
    <MockedProvider mocks={[]}>
      <MemoryRouter initialEntries={[route]}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </LocalizationProvider>
      </MemoryRouter>
    </MockedProvider>
  );

describe('VenueLeadEditorPage (create)', () => {
  it('shows the "New Venue Lead" title for the no-id route', async () => {
    wrap('/venue-leads/new', '/venue-leads/new', <VenueLeadEditorPage />);
    expect(await screen.findByText(/New Venue Lead/i)).toBeTruthy();
  });
});

describe('HostLeadEditorPage (create)', () => {
  it('shows the "New Host Lead" title for the no-id route', async () => {
    wrap('/host-leads/new', '/host-leads/new', <HostLeadEditorPage />);
    expect(await screen.findByText(/New Host Lead/i)).toBeTruthy();
  });
});

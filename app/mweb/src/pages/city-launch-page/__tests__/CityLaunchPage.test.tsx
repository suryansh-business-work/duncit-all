import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router';

import CityLaunchPage from '../index';

vi.mock('../../../components/city-launch', () => ({
  CityLaunchView: (p: { locationId: string; onBack: () => void }) => (
    <button data-testid="view" data-location={p.locationId} onClick={p.onBack} />
  ),
}));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

describe('CityLaunchPage', () => {
  it('hands the city id from the URL to the view', () => {
    render(
      <MemoryRouter initialEntries={['/city-launch/agra']}>
        <Routes>
          <Route path="/city-launch/:locationId" element={<CityLaunchPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('city-launch-page')).toBeInTheDocument();
    expect(screen.getByTestId('view')).toHaveAttribute('data-location', 'agra');
  });

  it('sends Back to Home when the shared link was the first page of the tab', () => {
    render(
      <MemoryRouter initialEntries={['/city-launch/agra']}>
        <Routes>
          <Route path="/city-launch/:locationId" element={<CityLaunchPage />} />
          <Route path="/" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId('view'));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
  });

  it('goes back one step when the page was reached from somewhere in the app', () => {
    render(
      <MemoryRouter initialEntries={['/earlier']}>
        <Routes>
          <Route path="/earlier" element={<Link to="/city-launch/agra">open</Link>} />
          <Route path="/city-launch/:locationId" element={<CityLaunchPage />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('open'));
    fireEvent.click(screen.getByTestId('view'));
    expect(screen.getByText('open')).toBeInTheDocument();
  });

  it('falls back to an empty id when the route has none', () => {
    render(
      <MemoryRouter initialEntries={['/city-launch']}>
        <Routes>
          <Route path="/city-launch" element={<CityLaunchPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('view')).toHaveAttribute('data-location', '');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import LocationCityCard from '../LocationCityCard';
import { fallbackT } from '../../../i18n/fallback';

const city = (over: object = {}) => ({
  id: 'l1',
  location_name: 'Bengaluru',
  location_image: 'https://img/blr.jpg',
  active_club_count: 3,
  is_launched: true,
  ...over,
});

const card = (location: object, active = false) => {
  const onSelect = vi.fn();
  render(<LocationCityCard location={location} active={active} onSelect={onSelect} />);
  return onSelect;
};

describe('LocationCityCard', () => {
  it('shows the name, the club count and selects on press', () => {
    const onSelect = card(city());
    expect(screen.getByTestId('location-l1')).toHaveTextContent('Bengaluru');
    expect(screen.getByTestId('location-l1')).toHaveTextContent('3 Clubs');
    expect(screen.getByTestId('location-l1-select')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('city-tile-coming-soon')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('location-l1-select'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('uses a city glyph instead of a photo when the city has no image, and no check unless active', () => {
    card(city({ location_image: '', active_club_count: 1 }));
    expect(screen.getByTestId('LocationCityIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('CheckCircleIcon')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-l1')).toHaveTextContent('1 Club');
  });

  it('keeps the photo (no glyph) and ticks the active city', () => {
    card(city(), true);
    expect(screen.queryByTestId('LocationCityIcon')).not.toBeInTheDocument();
    expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    expect(screen.getByTestId('location-l1-select')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows Coming soon and the waitlist count for a city that has not launched', () => {
    card(city({ is_launched: false, subscriber_count: 12 }));
    expect(screen.getByTestId('city-tile-coming-soon')).toHaveTextContent(fallbackT('mweb.cityLaunch.comingSoon'));
    expect(screen.getByTestId('city-tile-people-in')).toHaveTextContent(
      fallbackT('mweb.cityLaunch.peopleIn', { count: 12 })
    );
  });

  it('counts an unlaunched city with no subscriber figure as zero people', () => {
    card(city({ is_launched: false }));
    expect(screen.getByTestId('city-tile-people-in')).toHaveTextContent(
      fallbackT('mweb.cityLaunch.peopleIn', { count: 0 })
    );
  });
});

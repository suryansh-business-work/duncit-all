import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import NearbyResults from '../NearbyResults';
import QuotaLine from '../QuotaLine';
import type { NearbyCardData } from '../NearbyResultCard';
import { renderWithProviders } from '../../../../__tests__/render';

afterEach(cleanup);

const card = (over: Partial<NearbyCardData> = {}): NearbyCardData => ({
  id: 'host-1',
  name: 'Kiran Shah',
  image: '',
  lines: ['Badminton, Yoga', ''],
  distanceKm: 1.2,
  openStatus: null,
  round: true,
  ...over,
});

const mount = (over: Partial<Parameters<typeof NearbyResults>[0]> = {}) => {
  const handlers = { onRequest: vi.fn(), onRadius: vi.fn(), onAllCategories: vi.fn() };
  renderWithProviders(
    <NearbyResults
      loading={false}
      error={null}
      items={[]}
      radiusKm={5}
      filtered={false}
      searching={{ title: 'Searching Nearby Hosts...', hint: 'Looking within 5 km of Indiranagar', icon: <span /> }}
      emptyText="No hosts found within 5 km."
      canRequest
      {...handlers}
      {...over}
    />,
  );
  return handlers;
};

describe('NearbyResults', () => {
  it('shows the radar, announced as a status, while the search runs', () => {
    mount({ loading: true, items: [card()] });

    expect(screen.getByText('Searching Nearby Hosts...')).toBeTruthy();
    expect(screen.getByText('Looking within 5 km of Indiranagar')).toBeTruthy();
    expect(screen.getByText('Searching Nearby Hosts...').closest('[role="status"]')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(screen.queryByTestId('nearby-result')).toBeNull();
  });

  it('shows the error rather than results or an empty state', () => {
    mount({ error: 'Search failed', items: [card()] });

    expect(screen.getByRole('alert').textContent).toContain('Search failed');
    expect(screen.queryByTestId('nearby-result')).toBeNull();
    expect(screen.queryByText('No hosts found within 5 km.')).toBeNull();
  });

  it('offers the full 10 km and all categories on an empty filtered search', () => {
    const { onRadius, onAllCategories } = mount({ filtered: true });

    expect(screen.getByText('No hosts found within 5 km.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Search within 10 km' }));
    expect(onRadius).toHaveBeenCalledWith(10);
    fireEvent.click(screen.getByRole('button', { name: 'Try all categories' }));
    expect(onAllCategories).toHaveBeenCalledTimes(1);
  });

  it('offers neither widening once the search is already 10 km and unfiltered', () => {
    mount({ radiusKm: 10, emptyText: 'No hosts found within 10 km.' });

    expect(screen.getByText('No hosts found within 10 km.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Search within/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try all categories' })).toBeNull();
  });

  it('draws each result with its lines and distance, skipping blank lines', () => {
    const { onRequest } = mount({ items: [card()] });

    const result = screen.getByTestId('nearby-result');
    expect(result.querySelectorAll('.MuiTypography-caption')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Kiran Shah' })).toBeTruthy();
    expect(screen.getByText('Badminton, Yoga')).toBeTruthy();
    expect(screen.getByText('1.2 km away')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Request Pod' }));
    expect(onRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 'host-1', name: 'Kiran Shah' }));
  });

  it('shows the live request state instead of Request Pod', () => {
    mount({ items: [card({ openStatus: 'SLOT_REQUESTED' })] });

    expect(screen.getByText('Slot requested')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request Pod' })).toBeNull();
  });

  it('disables Request Pod once the monthly allowance is spent', () => {
    const { onRequest } = mount({ items: [card()], canRequest: false });

    const button = screen.getByRole('button', { name: 'Request Pod' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onRequest).not.toHaveBeenCalled();
  });
});

describe('QuotaLine', () => {
  it('renders nothing until the allowance is known', () => {
    const { container } = renderWithProviders(<QuotaLine quota={null} />);
    expect(container.querySelector('.MuiTypography-root')).toBeNull();
  });

  it("counts what is left of the month's allowance", () => {
    renderWithProviders(<QuotaLine quota={{ limit: 10, remaining: 3 }} />);
    expect(screen.getByText('3 of 10 requests left this month')).toBeTruthy();
  });

  it('says the allowance is spent at exactly zero left', () => {
    renderWithProviders(<QuotaLine quota={{ limit: 10, remaining: 0 }} />);
    expect(screen.getByText('You have used all 10 Pod Requests for this month.')).toBeTruthy();
    expect(screen.queryByText(/requests left/)).toBeNull();
  });
});

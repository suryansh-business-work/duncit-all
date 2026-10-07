import { screen } from '@testing-library/react-native';

import { SearchingNearby } from '@/components/searching-nearby';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useReduceMotion', () => ({ useReduceMotion: jest.fn() }));
const mockedReduce = useReduceMotion as jest.Mock;

/** The three ripple rings: the absolutely-placed, round, bordered views. */
const rings = () =>
  screen.UNSAFE_root.findAll(
    (node) =>
      typeof node.type === 'string' &&
      node.props.style?.borderWidth === 2 &&
      node.props.style?.position === 'absolute',
  );

describe('SearchingNearby', () => {
  it('announces the search politely with its title and hint', () => {
    mockedReduce.mockReturnValue(false);
    renderWithProviders(
      <SearchingNearby
        title="Searching Nearby Hosts..."
        hint="Looking within 5 km"
        icon="person-search"
      />,
    );
    const status = screen.getByTestId('searching-nearby');
    expect(status.props.role).toBe('status');
    expect(status.props['aria-live']).toBe('polite');
    expect(screen.getByText('Searching Nearby Hosts...')).toBeOnTheScreen();
    expect(screen.getByText('Looking within 5 km')).toBeOnTheScreen();
    expect(rings()).toHaveLength(3);
  });

  it('holds the rings still and spread out when the device asks for less motion', () => {
    mockedReduce.mockReturnValue(true);
    const { unmount } = renderWithProviders(
      <SearchingNearby title="Searching" hint="" icon="storefront" testID="radar" />,
    );
    expect(screen.getByTestId('radar')).toBeOnTheScreen();
    const still = rings();
    expect(still.map((ring) => ring.props.style.opacity)).toEqual([0.25, 0.25, 0.25]);
    expect(still.map((ring) => ring.props.style.transform[0].scale)).toEqual([0.45, 0.7, 0.95]);
    unmount();
  });

  it('animates the rings while motion is on, and stops cleanly on unmount', () => {
    mockedReduce.mockReturnValue(false);
    const { unmount } = renderWithProviders(
      <SearchingNearby title="Searching" hint="" icon="storefront" />,
    );
    // Moving rings carry animated values, not the fixed still-state numbers.
    expect(rings().every((ring) => ring.props.style.opacity !== 0.25)).toBe(true);
    expect(() => unmount()).not.toThrow();
  });
});

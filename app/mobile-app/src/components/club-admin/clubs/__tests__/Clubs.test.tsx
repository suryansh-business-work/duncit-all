import { Image } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { formatCount } from '@duncit/utils';

import type { AdminClubRow as AdminClubRowData, AdminClubsState } from '@/hooks/useClubAdminClubs';
import { renderWithProviders } from '@/utils/test-utils';
import { AdminClubRow } from '../AdminClubRow';
import { YourClubsSection } from '../YourClubsSection';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const clubOf = (patch: Record<string, unknown> = {}) =>
  ({
    id: 'c1',
    club_name: 'Smash Club',
    super_category: 'Sports',
    category: 'Racquet',
    locality: 'Gomti Nagar',
    is_verified: true,
    cover_image_url: 'https://cdn/c1.jpg',
    followers_count: 1200,
    total_pods: 14,
    upcoming_pods: 3,
    matched_venues_count: 5,
    ...patch,
  }) as unknown as AdminClubRowData;

describe('AdminClubRow', () => {
  const mount = (club: AdminClubRowData) => {
    const onOpenPods = jest.fn();
    const onEdit = jest.fn();
    renderWithProviders(
      <AdminClubRow club={club} testID="club" onOpenPods={onOpenPods} onEdit={onEdit} />,
    );
    return { onOpenPods, onEdit };
  };

  it('shows the name, the category path and the locality', () => {
    mount(clubOf());
    expect(screen.getByText('Smash Club')).toBeOnTheScreen();
    expect(screen.getByText('Sports › Racquet · Gomti Nagar')).toBeOnTheScreen();
  });

  it('shows only the parts of the category line that exist', () => {
    mount(clubOf({ super_category: null, category: 'Racquet', locality: '' }));
    expect(screen.getByText('Racquet')).toBeOnTheScreen();
  });

  it('shows no category line for a club with no category or locality', () => {
    mount(clubOf({ super_category: null, category: null, locality: null }));
    expect(screen.queryByText(/›/)).toBeNull();
    expect(screen.queryByText('Gomti Nagar')).toBeNull();
  });

  it('shows a verified club as verified and an unverified one as not', () => {
    const { unmount } = renderWithProviders(
      <AdminClubRow club={clubOf()} testID="club" onOpenPods={jest.fn()} onEdit={jest.fn()} />,
    );
    expect(screen.getByTestId('club-verified')).toHaveTextContent('clubAdmin.clubs.verified');
    unmount();
    renderWithProviders(
      <AdminClubRow
        club={clubOf({ is_verified: false })}
        testID="club"
        onOpenPods={jest.fn()}
        onEdit={jest.fn()}
      />,
    );
    expect(screen.getByTestId('club-verified')).toHaveTextContent('clubAdmin.clubs.unverified');
  });

  it('shows the four figures', () => {
    mount(clubOf());
    expect(screen.getByTestId('club-followers')).toHaveTextContent(
      `clubAdmin.clubs.followers${formatCount(1200)}`,
    );
    expect(screen.getByTestId('club-pods')).toHaveTextContent(
      `clubAdmin.clubs.pods${formatCount(14)}`,
    );
    expect(screen.getByTestId('club-upcoming')).toHaveTextContent(
      `clubAdmin.clubs.upcoming${formatCount(3)}`,
    );
    expect(screen.getByTestId('club-venues')).toHaveTextContent(
      `clubAdmin.clubs.venues${formatCount(5)}`,
    );
  });

  it('shows the cover image when there is one', () => {
    mount(clubOf());
    expect(screen.UNSAFE_getAllByType(Image).map((image) => image.props.source)).toEqual([
      { uri: 'https://cdn/c1.jpg' },
    ]);
  });

  it('shows a placeholder instead when there is no cover', () => {
    mount(clubOf({ cover_image_url: null }));
    expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });

  it('opens the pods and the editor', () => {
    const { onOpenPods, onEdit } = mount(clubOf());
    fireEvent.press(screen.getByTestId('club-open-pods'));
    fireEvent.press(screen.getByTestId('club-edit'));
    expect(onOpenPods).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe('YourClubsSection', () => {
  const stateOf = (patch: Partial<AdminClubsState> = {}): AdminClubsState => ({
    clubs: [clubOf(), clubOf({ id: 'c2', club_name: 'Rally Club' })],
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
    ...patch,
  });

  const mount = (state: AdminClubsState, query = '') => {
    const handlers = { onQuery: jest.fn(), onOpenPods: jest.fn(), onEdit: jest.fn() };
    renderWithProviders(<YourClubsSection state={state} query={query} {...handlers} />);
    return handlers;
  };

  it('shows a row per club under the section title', () => {
    mount(stateOf());
    expect(screen.getByText('mweb.clubStudio.yourClubs')).toBeOnTheScreen();
    expect(screen.getByTestId('club-studio-club-c1')).toBeOnTheScreen();
    expect(screen.getByTestId('club-studio-club-c2')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-studio-clubs-empty')).toBeNull();
  });

  it('searches on the server: the box shows the query and reports what is typed', () => {
    const { onQuery } = mount(stateOf(), 'smash');
    const box = screen.getByTestId('field-club-studio-clubs-search');
    expect(box.props.value).toBe('smash');
    fireEvent.changeText(box, 'rally');
    expect(onQuery).toHaveBeenCalledWith('rally');
  });

  it('opens the pods and the editor of the club whose button was pressed', () => {
    const { onOpenPods, onEdit } = mount(stateOf());
    fireEvent.press(screen.getByTestId('club-studio-club-c2-open-pods'));
    fireEvent.press(screen.getByTestId('club-studio-club-c1-edit'));
    expect(onOpenPods).toHaveBeenCalledWith('c2');
    expect(onEdit).toHaveBeenCalledWith('c1');
  });

  it('shows a spinner while loading', () => {
    mount(stateOf({ clubs: [], isLoading: true }));
    expect(screen.getByTestId('club-studio-clubs-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-studio-clubs-empty')).toBeNull();
  });

  it('says the load failed, never that there are no clubs, and retries', () => {
    const state = stateOf({ clubs: [], hasError: true });
    mount(state);
    expect(screen.getByTestId('club-studio-clubs-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-studio-clubs-empty')).toBeNull();
    fireEvent.press(screen.getByTestId('club-studio-clubs-error-retry'));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('says there are no clubs once loaded empty', () => {
    mount(stateOf({ clubs: [] }));
    expect(screen.getByTestId('club-studio-clubs-empty')).toHaveTextContent(
      'mweb.clubStudio.noClubs',
    );
  });
});

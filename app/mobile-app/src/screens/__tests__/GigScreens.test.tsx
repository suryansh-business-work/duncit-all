import { fireEvent, screen } from '@testing-library/react-native';

import { useGigContext } from '@/components/gigs/useGigContext';
import { useGigJob } from '@/components/gigs/useGigJob';
import { usePagedGigs } from '@/components/gigs/usePagedGigs';
import { GigJobDetailScreen } from '@/screens/GigJobDetailScreen';
import { GigJobsScreen } from '@/screens/GigJobsScreen';
import { MyGigJobsScreen } from '@/screens/MyGigJobsScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
const mockNavigate = jest.fn();
let mockParams: { id: string } = { id: 'g1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('@/hooks/useLocations', () => ({ useLocations: () => ({ selectedId: 'loc1' }) }));
jest.mock('@/components/gigs/useGigContext', () => ({ useGigContext: jest.fn() }));
jest.mock('@/components/gigs/useGigJob', () => ({ useGigJob: jest.fn() }));
jest.mock('@/components/gigs/usePagedGigs', () => ({ usePagedGigs: jest.fn() }));
jest.mock('@/components/StackScreen', () => ({
  StackScreen: ({
    title,
    testID,
    children,
  }: {
    title: string;
    testID: string;
    children: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text, View } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID="screen-title">{title}</Text>
        {children}
      </View>
    );
  },
}));
jest.mock('@/components/PullToRefresh', () => ({
  RefreshScrollView: ({ children }: { children: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

const mockSeen: Record<string, Record<string, unknown>> = {};
const mockStub = (name: string, press?: (props: Record<string, unknown>) => void) =>
  function Stub(props: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    mockSeen[name] = props;
    return (
      <Pressable testID={`stub-${name}`} onPress={() => press?.(props)}>
        <Text>{name}</Text>
      </Pressable>
    );
  };
const call = (props: Record<string, unknown>, key: string, ...args: unknown[]) => {
  const fn: unknown = props[key];
  if (typeof fn === 'function') fn(...args);
};
jest.mock('@/components/gigs/GigFilters', () => ({
  GigFilters: (p: Record<string, unknown>) =>
    mockStub('filters', (props) => call(props, 'onChange', { search: 'dj', city: 'x' }))(p),
}));
jest.mock('@/components/gigs/GigList', () => ({
  GigList: (p: Record<string, unknown>) =>
    mockStub('list', (props) => {
      call(props, 'onRetry');
      call(props, 'onMore');
      call(props, 'onOpen', 'g7');
    })(p),
}));
jest.mock('@/components/gigs/GigFacts', () => ({
  GigFacts: (p: Record<string, unknown>) => mockStub('facts')(p),
}));
jest.mock('@/components/gigs/GigViewerActions', () => ({
  GigViewerActions: (p: Record<string, unknown>) =>
    mockStub('actions', (props) => call(props, 'onChanged', { id: 'next' }))(p),
}));
jest.mock('@/components/gigs/GigContactCard', () => ({
  GigContactCard: (p: Record<string, unknown>) => mockStub('contact-card')(p),
}));
jest.mock('@/components/gigs/GigContactReveal', () => ({
  GigContactReveal: (p: Record<string, unknown>) => mockStub('contact-reveal')(p),
}));
jest.mock('@/components/gigs/GigInterestsList', () => ({
  GigInterestsList: (p: Record<string, unknown>) => mockStub('interests')(p),
}));

const contextMock = jest.mocked(useGigContext);
const jobMock = jest.mocked(useGigJob);
const pagedMock = jest.mocked(usePagedGigs);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'g1' };
});

describe('GigJobsScreen', () => {
  const paged = (patch: Record<string, unknown> = {}) => ({
    rows: [{ id: 'g1' }],
    total: 1,
    failed: false,
    loading: false,
    retry: jest.fn(),
    more: jest.fn(),
    ...patch,
  });
  const mount = (viewer: unknown, board = paged()) => {
    contextMock.mockReturnValue({
      categories: [{ id: 'c1' }],
      viewer,
      failed: false,
      loading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGigContext>);
    pagedMock.mockReturnValue(board as unknown as ReturnType<typeof usePagedGigs>);
    renderWithProviders(<GigJobsScreen />);
    return board;
  };

  it('titles the screen and follows the header city until a filter is picked', () => {
    mount(null);
    expect(screen.getByTestId('screen-title')).toHaveTextContent('gigJobs.board.title');
    expect(pagedMock).toHaveBeenCalledWith(
      'BOARD',
      expect.objectContaining({ location_id: 'loc1' }),
    );
  });

  it('hands the filters the categories and the filter, and queries with what they pick', () => {
    mount(null);
    expect(mockSeen.filters?.categories).toEqual([{ id: 'c1' }]);
    fireEvent.press(screen.getByTestId('stub-filters'));
    expect(pagedMock).toHaveBeenLastCalledWith('BOARD', expect.objectContaining({ search: 'dj' }));
  });

  it('hands the list the board and opens a gig, retries and loads more through it', () => {
    const board = mount(null);
    expect(mockSeen.list).toMatchObject({
      rows: [{ id: 'g1' }],
      total: 1,
      loading: false,
      failed: false,
      emptyTitle: 'gigJobs.board.empty',
    });
    fireEvent.press(screen.getByTestId('stub-list'));
    expect(board.retry).toHaveBeenCalledTimes(1);
    expect(board.more).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('GigJobDetail', { id: 'g7' });
  });

  it('offers no posting or profile buttons before the viewer is known', () => {
    mount(null);
    expect(screen.queryByTestId('gig-post')).toBeNull();
    expect(screen.queryByTestId('gig-freelancer')).toBeNull();
    expect(screen.queryByTestId('gig-freelancer-hint')).toBeNull();
  });

  it('lets a poster post a gig and open their posts', () => {
    mount({ poster_roles: ['HOST'], is_freelancer: true });
    fireEvent.press(screen.getByTestId('gig-post'));
    fireEvent.press(screen.getByTestId('gig-my-posts'));
    expect(mockNavigate).toHaveBeenNthCalledWith(1, 'GigJobForm', {});
    expect(mockNavigate).toHaveBeenNthCalledWith(2, 'MyGigJobs');
  });

  it('shows a freelancer a link to their profile and no hint', () => {
    mount({ poster_roles: [], is_freelancer: true });
    expect(screen.getByText('gigJobs.board.myProfile')).toBeOnTheScreen();
    expect(screen.queryByTestId('gig-post')).toBeNull();
    expect(screen.queryByTestId('gig-freelancer-hint')).toBeNull();
    fireEvent.press(screen.getByTestId('gig-freelancer'));
    expect(mockNavigate).toHaveBeenCalledWith('FreelancerProfile');
  });

  it('invites a member who is not a freelancer to join, with a hint', () => {
    mount({ poster_roles: [], is_freelancer: false });
    expect(screen.getByText('gigJobs.board.joinAsFreelancer')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-freelancer-hint')).toBeOnTheScreen();
  });
});

describe('MyGigJobsScreen', () => {
  it('lists the viewer own posts and opens one', () => {
    const mine = {
      rows: [{ id: 'm1' }],
      total: 1,
      failed: false,
      loading: false,
      retry: jest.fn(),
      more: jest.fn(),
    };
    pagedMock.mockReturnValue(mine as unknown as ReturnType<typeof usePagedGigs>);
    renderWithProviders(<MyGigJobsScreen />);
    expect(pagedMock).toHaveBeenCalledWith('MINE');
    expect(screen.getByTestId('screen-title')).toHaveTextContent('gigJobs.mine.title');
    expect(mockSeen.list).toMatchObject({ rows: [{ id: 'm1' }], emptyTitle: 'gigJobs.mine.empty' });
    fireEvent.press(screen.getByTestId('stub-list'));
    expect(mine.retry).toHaveBeenCalledTimes(1);
    expect(mine.more).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('GigJobDetail', { id: 'g7' });
  });

  it('starts a new post', () => {
    pagedMock.mockReturnValue({
      rows: [],
      total: 0,
      failed: false,
      loading: false,
      retry: jest.fn(),
      more: jest.fn(),
    } as unknown as ReturnType<typeof usePagedGigs>);
    renderWithProviders(<MyGigJobsScreen />);
    fireEvent.press(screen.getByTestId('my-gigs-post'));
    expect(mockNavigate).toHaveBeenCalledWith('GigJobForm', {});
  });
});

describe('GigJobDetailScreen', () => {
  const jobOf = (patch: Record<string, unknown> = {}) => ({
    id: 'g1',
    status: 'OPEN',
    is_mine: false,
    contact: null,
    ...patch,
  });
  const mount = (gig: Record<string, unknown>) => {
    const state = {
      job: null,
      missing: false,
      failed: false,
      loading: false,
      refetch: jest.fn(),
      replace: jest.fn(),
      ...gig,
    };
    contextMock.mockReturnValue({ viewer: { is_freelancer: true } } as unknown as ReturnType<
      typeof useGigContext
    >);
    jobMock.mockReturnValue(state as unknown as ReturnType<typeof useGigJob>);
    renderWithProviders(<GigJobDetailScreen />);
    return state;
  };

  it('reads the gig of the route', () => {
    mount({ job: jobOf() });
    expect(jobMock).toHaveBeenCalledWith('g1');
  });

  it('shows a spinner until the gig arrives', () => {
    mount({});
    expect(screen.getByTestId('gig-loading')).toBeOnTheScreen();
  });

  it('says the load failed, when there is no gig to show, and retries', () => {
    const state = mount({ failed: true });
    expect(screen.getByText('gigJobs.board.loadFailed')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('gigJobs.board.retry'));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps showing a gig already on screen when a later read fails', () => {
    mount({ job: jobOf(), failed: true });
    expect(screen.getByTestId('stub-facts')).toBeOnTheScreen();
    expect(screen.queryByText('gigJobs.board.loadFailed')).toBeNull();
  });

  it('says the gig was not found', () => {
    mount({ missing: true });
    expect(screen.getByTestId('gig-not-found')).toBeOnTheScreen();
  });

  it('shows what the gig is, and what this viewer can do, taking the answer back into the screen', () => {
    const state = mount({ job: jobOf() });
    expect(mockSeen.facts?.job).toMatchObject({ id: 'g1' });
    expect(mockSeen.actions).toMatchObject({ viewer: { is_freelancer: true } });
    fireEvent.press(screen.getByTestId('stub-actions'));
    expect(state.replace).toHaveBeenCalledWith({ id: 'next' });
  });

  it('offers to reveal the poster contact on an open gig that is not the viewer own', () => {
    mount({ job: jobOf() });
    expect(mockSeen['contact-reveal']).toMatchObject({ jobId: 'g1' });
    expect(screen.queryByTestId('stub-contact-card')).toBeNull();
    expect(screen.queryByTestId('stub-interests')).toBeNull();
  });

  it('shows the contact once it is shared, with no reveal button', () => {
    mount({ job: jobOf({ contact: { name: 'Asha', phone: '', email: '' } }) });
    expect(screen.getByTestId('stub-contact-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('stub-contact-reveal')).toBeNull();
  });

  it('offers no reveal on a closed gig', () => {
    mount({ job: jobOf({ status: 'CLOSED' }) });
    expect(screen.queryByTestId('stub-contact-reveal')).toBeNull();
  });

  it('shows the poster who is interested, and never their own contact card', () => {
    mount({ job: jobOf({ is_mine: true, contact: { name: 'Me', phone: '', email: '' } }) });
    expect(mockSeen.interests).toMatchObject({ jobId: 'g1' });
    expect(screen.queryByTestId('stub-contact-card')).toBeNull();
    expect(screen.queryByTestId('stub-contact-reveal')).toBeNull();
  });
});

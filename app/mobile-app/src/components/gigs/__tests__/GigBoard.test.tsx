import { fireEvent, screen } from '@testing-library/react-native';
import type { GigCategory, GigJobFilter, GigJobRow } from '@duncit/utils';

import { renderWithProviders } from '@/utils/test-utils';
import { GigFilters } from '../GigFilters';
import { GigJobCard } from '../GigJobCard';
import { GigList } from '../GigList';
import { MultiChipField } from '../MultiChipField';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number>; count?: number }) => {
    if (options?.vars) return `${key}|${Object.values(options.vars).join(',')}`;
    if (options?.count !== undefined) return `${key}|${options.count}`;
    return key;
  };
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDay: (key: string) => `day:${key}` }),
}));
jest.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (value: string) => value }));
const mockPicker = jest.fn();
jest.mock('@/components/LocationPickerField/LocationPickerField', () => ({
  LocationPickerField: (props: {
    locationId: string;
    onChange: (locationId: string, locality: string) => void;
    [key: string]: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockPicker(props);
    return (
      <Pressable
        testID="pick-city"
        onPress={() => props.onChange(props.locationId ? '' : 'loc9', '')}
      />
    );
  },
}));

const rowOf = (patch: Record<string, unknown> = {}) =>
  ({
    id: 'g1',
    title: 'Wedding DJ',
    category_title: 'Music',
    roles: ['DJ', 'MC', 'Sound', 'Lights', 'Host'],
    event_type: 'EVENT',
    event_date: '2030-02-14T18:00:00.000Z',
    city: 'Lucknow',
    locality: 'Gomti Nagar',
    budget: 25000,
    openings: 2,
    status: 'OPEN',
    poster_role: 'HOST',
    poster_name: 'Asha',
    interest_count: 4,
    is_mine: false,
    viewer_interested: false,
    ...patch,
  }) as unknown as GigJobRow;

describe('MultiChipField', () => {
  const OPTIONS = [
    { value: 'dj', label: 'DJ' },
    { value: 'mc', label: 'MC' },
  ];
  const mount = (value: string[], extra: Record<string, unknown> = {}) => {
    const onChange = jest.fn();
    renderWithProviders(
      <MultiChipField
        label="Roles"
        options={OPTIONS}
        value={value}
        onChange={onChange}
        testID="roles"
        {...extra}
      />,
    );
    return onChange;
  };

  it('shows every option as a checkbox, marking the chosen ones', () => {
    mount(['mc']);
    expect(screen.getByTestId('roles-dj').props['aria-checked']).toBe(false);
    expect(screen.getByTestId('roles-mc').props['aria-checked']).toBe(true);
    expect(screen.getByLabelText('Roles')).toBeOnTheScreen();
  });

  it('adds an option, keeping the order picked', () => {
    const onChange = mount(['mc']);
    fireEvent.press(screen.getByTestId('roles-dj'));
    expect(onChange).toHaveBeenCalledWith(['mc', 'dj']);
  });

  it('removes a chosen option', () => {
    const onChange = mount(['dj', 'mc']);
    fireEvent.press(screen.getByTestId('roles-dj'));
    expect(onChange).toHaveBeenCalledWith(['mc']);
  });

  it('shows the hint and the error when given', () => {
    mount([], { hint: 'Pick what you need', error: 'Pick at least one' });
    expect(screen.getByTestId('roles-hint')).toHaveTextContent('Pick what you need');
    expect(screen.getByTestId('roles-error')).toHaveTextContent('Pick at least one');
  });

  it('shows neither without them', () => {
    mount([]);
    expect(screen.queryByTestId('roles-hint')).toBeNull();
    expect(screen.queryByTestId('roles-error')).toBeNull();
  });
});

describe('GigJobCard', () => {
  const mount = (job: GigJobRow) => {
    const onOpen = jest.fn();
    renderWithProviders(<GigJobCard job={job} onOpen={onOpen} />);
    return onOpen;
  };

  it('opens the gig when pressed, named by its title', () => {
    const onOpen = mount(rowOf());
    fireEvent.press(screen.getByTestId('gig-card-g1'));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('gig-card-g1').props['aria-label']).toBe('Wedding DJ');
  });

  it('shows the title, category, date, place, budget, openings, interest and poster', () => {
    mount(rowOf());
    expect(screen.getByText('Wedding DJ')).toBeOnTheScreen();
    expect(screen.getByText('Music')).toBeOnTheScreen();
    expect(screen.getByText('day:2030-02-14')).toBeOnTheScreen();
    expect(screen.getByText('gigJobs.card.openings|2')).toBeOnTheScreen();
    expect(screen.getByText('gigJobs.card.interested|4')).toBeOnTheScreen();
    expect(screen.getByText(/^gigJobs\.card\.postedBy\|Asha,/)).toBeOnTheScreen();
  });

  it('shows the first three roles and how many more', () => {
    mount(rowOf());
    expect(screen.getByText('DJ · MC · Sound +2')).toBeOnTheScreen();
  });

  it('shows all the roles with no count when there are three or fewer', () => {
    mount(rowOf({ roles: ['DJ', 'MC'] }));
    expect(screen.getByText('DJ · MC')).toBeOnTheScreen();
  });

  it('says there is no date and that the budget is open', () => {
    mount(rowOf({ event_date: null, budget: null }));
    expect(screen.getByText('gigJobs.card.noDate')).toBeOnTheScreen();
    expect(screen.getByText('gigJobs.card.budgetOpen')).toBeOnTheScreen();
  });

  it('shows a status pill only for a gig that is not open', () => {
    const { unmount } = renderWithProviders(<GigJobCard job={rowOf()} onOpen={jest.fn()} />);
    expect(screen.queryByText(/gigJobs.status/)).toBeNull();
    unmount();
    renderWithProviders(<GigJobCard job={rowOf({ status: 'CLOSED' })} onOpen={jest.fn()} />);
    expect(screen.getByText(/gigJobs.status/)).toBeOnTheScreen();
  });

  it('marks the viewer own gig and one they showed interest in', () => {
    const { unmount } = renderWithProviders(<GigJobCard job={rowOf()} onOpen={jest.fn()} />);
    expect(screen.queryByText('gigJobs.card.mine')).toBeNull();
    expect(screen.queryByText('gigJobs.card.shared')).toBeNull();
    unmount();
    renderWithProviders(
      <GigJobCard job={rowOf({ is_mine: true, viewer_interested: true })} onOpen={jest.fn()} />,
    );
    expect(screen.getByText('gigJobs.card.mine')).toBeOnTheScreen();
    expect(screen.getByText('gigJobs.card.shared')).toBeOnTheScreen();
  });
});

describe('GigList', () => {
  const mount = (patch: Record<string, unknown> = {}) => {
    const handlers = { onRetry: jest.fn(), onMore: jest.fn(), onOpen: jest.fn() };
    renderWithProviders(
      <GigList
        rows={[rowOf(), rowOf({ id: 'g2', title: 'Workshop' })]}
        total={2}
        loading={false}
        failed={false}
        emptyTitle="No gigs yet"
        {...handlers}
        {...patch}
      />,
    );
    return handlers;
  };

  it('shows a spinner until the first page lands', () => {
    mount({ rows: null });
    expect(screen.getByTestId('gig-list-loading')).toBeOnTheScreen();
  });

  it('says the load failed and retries, when nothing is on screen', () => {
    const { onRetry } = mount({ rows: null, failed: true });
    expect(screen.getByText('gigJobs.board.loadFailed')).toBeOnTheScreen();
    expect(screen.queryByTestId('gig-list-loading')).toBeNull();
    fireEvent.press(screen.getByTestId('gig-list-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the rows on screen when a later read fails', () => {
    mount({ failed: true });
    expect(screen.getByTestId('gig-card-g1')).toBeOnTheScreen();
    expect(screen.queryByTestId('gig-list-retry')).toBeNull();
  });

  it('says there are no gigs', () => {
    mount({ rows: [], total: 0 });
    expect(screen.getByTestId('gig-list-empty')).toBeOnTheScreen();
    expect(screen.getByText('No gigs yet')).toBeOnTheScreen();
  });

  it('lists the gigs and opens the one pressed', () => {
    const { onOpen } = mount();
    fireEvent.press(screen.getByTestId('gig-card-g2'));
    expect(onOpen).toHaveBeenCalledWith('g2');
    expect(screen.queryByTestId('gig-list-more')).toBeNull();
  });

  it('offers more while the total is above what is shown, and loads it on tap', () => {
    const { onMore } = mount({ total: 9 });
    fireEvent.press(screen.getByTestId('gig-list-more'));
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it('spins the load-more button while a wider page is read', () => {
    mount({ total: 9, loading: true });
    expect(screen.getByTestId('gig-list-more')).toBeDisabled();
  });
});

describe('GigFilters', () => {
  beforeEach(() => jest.clearAllMocks());

  const CATEGORIES: GigCategory[] = [{ id: 'cat1', title: 'Music', examples: [] }];
  const mount = (value: GigJobFilter = {}) => {
    const onChange = jest.fn();
    renderWithProviders(<GigFilters categories={CATEGORIES} value={value} onChange={onChange} />);
    return onChange;
  };

  it('shows the search, the city and every category with an all option', () => {
    mount({ search: 'dj' });
    expect(screen.getByTestId('gig-filter-search').props.value).toBe('dj');
    expect(screen.getByTestId('gig-filter-category-')).toBeOnTheScreen();
    expect(screen.getByTestId('gig-filter-category-cat1')).toBeOnTheScreen();
    expect(screen.getByText('gigJobs.board.allCategories')).toBeOnTheScreen();
  });

  it('starts with the search empty and all categories chosen', () => {
    mount();
    expect(screen.getByTestId('gig-filter-search').props.value).toBe('');
    expect(screen.getByTestId('gig-filter-category-').props['aria-checked']).toBe(true);
  });

  it('queries with the settled search once typing stops', () => {
    const onChange = mount({ category_id: 'cat1' });
    fireEvent.changeText(screen.getByTestId('gig-filter-search'), 'dj');
    expect(onChange).toHaveBeenLastCalledWith({ category_id: 'cat1', search: 'dj' });
  });

  it('queries nothing when the settled search already matches the filter', () => {
    const onChange = mount({ search: 'dj' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('picks a category, and clears it again with the all option', () => {
    const onChange = mount({ search: '' });
    fireEvent.press(screen.getByTestId('gig-filter-category-cat1'));
    expect(onChange).toHaveBeenLastCalledWith({ search: '', category_id: 'cat1' });
    fireEvent.press(screen.getByTestId('gig-filter-category-'));
    expect(onChange).toHaveBeenLastCalledWith({ search: '', category_id: null });
  });

  it('hands the shared picker the filter city and the board wording', () => {
    mount({ search: '', location_id: 'loc1' });
    const props = mockPicker.mock.calls[0][0];
    expect(props).toMatchObject({ locationId: 'loc1', locality: '', testID: 'gig-filter' });
    expect(props.copy).toMatchObject({
      label: 'gigJobs.board.city',
      placeholder: 'gigJobs.board.allCities',
      clear: 'gigJobs.board.allCities',
    });
    expect(props.copy.cityAria('Lucknow')).toBe('gigJobs.form.cityAria|Lucknow');
  });

  it('shows no city when the filter has none', () => {
    mount({ search: '' });
    expect(mockPicker.mock.calls[0][0].locationId).toBe('');
  });

  it('sets the city when one is picked, and clears it when the picker answers blank', () => {
    const onChange = mount({ search: '' });
    fireEvent.press(screen.getByTestId('pick-city'));
    expect(onChange).toHaveBeenLastCalledWith({ search: '', location_id: 'loc9' });
  });

  it('clears the city to null when the picker answers blank', () => {
    const onChange = mount({ search: '', location_id: 'loc1' });
    fireEvent.press(screen.getByTestId('pick-city'));
    expect(onChange).toHaveBeenLastCalledWith({ search: '', location_id: null });
  });
});

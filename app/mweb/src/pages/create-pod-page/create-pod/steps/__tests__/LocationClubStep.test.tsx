/**
 * Step 1 of creating a pod: the category, the locality and the club.
 *
 * The city is the one the header has selected, so the step only picks an area of
 * it, and the club list stays locked until it has one. The club list itself
 * arrives already scoped, so this step renders what it is handed rather than
 * filtering again and risking a second, disagreeing rule.
 */
import '@testing-library/jest-dom/vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LocationClubStep from '../LocationClubStep';
import {
  blankCreatePodForm,
  type CreatePodClub,
  type CreatePodFormValues,
  type CreatePodLocation,
} from '../../create-pod.types';

const testTheme = createTheme();

const LOCATIONS: CreatePodLocation[] = [
  {
    id: 'loc-1',
    location_name: 'Bengaluru',
    active_club_count: 4,
    location_zones: [
      { zone_name: 'Indiranagar', active_club_count: 3 },
      { zone_name: 'Whitefield', active_club_count: 1 },
    ],
  },
  { id: 'loc-2', location_name: 'Pune', active_club_count: 1, location_zones: [] },
];

const CLUBS: CreatePodClub[] = [
  {
    id: 'club-1',
    club_name: 'Sunset Club',
    location_id: 'loc-1',
    locality: 'Indiranagar',
    matched_venues_count: 2,
    matched_venues: [{ id: 'venue-1' }, { id: 'venue-2' }],
  },
  {
    id: 'club-2',
    club_name: 'Whitefield Club',
    location_id: 'loc-1',
    locality: 'Whitefield',
    matched_venues_count: 0,
    matched_venues: [],
  },
  {
    id: 'club-3',
    club_name: 'Pune Club',
    location_id: 'loc-2',
    locality: '',
    matched_venues_count: 1,
  },
];

let formRef: ReturnType<typeof useForm<CreatePodFormValues>> | null = null;

function Harness({
  values,
  errors,
}: Readonly<{ values?: Partial<CreatePodFormValues>; errors?: Record<string, string> }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...values },
  });
  formRef = form;
  // In an effect, not during render: setError re-renders, and setting it on the
  // way through loops until React gives up.
  useEffect(() => {
    for (const [field, message] of Object.entries(errors ?? {})) {
      form.setError(field as keyof CreatePodFormValues, { type: 'manual', message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationClubStep form={form} hostCategories={[]} clubs={CLUBS} cityClubs={CLUBS} locations={LOCATIONS} />
  );
}

const step = (over: Parameters<typeof Harness>[0] = {}) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <Harness {...over} />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

const clubInput = () => within(screen.getByTestId('create-pod-club')).getByRole('combobox');

afterEach(() => {
  formRef = null;
  vi.clearAllMocks();
});

describe('LocationClubStep', () => {
  it('opens on the city the host already has selected', () => {
    const { container } = step({ values: { location_id: 'loc-1' } });

    expect(container.textContent).toContain('Bengaluru');
  });

  it('renders before a city has been chosen at all', () => {
    const { container } = step();

    expect(container.innerHTML).not.toBe('');
  });

  it('offers the clubs it was handed, which arrive already scoped to the category', () => {
    const { container } = step({ values: { location_id: 'loc-1', locality: 'Indiranagar' } });

    const picker = container.querySelector('[role="combobox"]');
    if (picker) fireEvent.mouseDown(picker as HTMLElement);

    // Scoping is the page's job — the category is chosen above the title, and
    // the list arrives narrowed. This step renders what it is given.
    expect(document.body.textContent).toContain('Sunset Club');
  });

  it('names each club by where it operates, so two same-named clubs differ', () => {
    step({ values: { location_id: 'loc-1', locality: 'Indiranagar' } });

    fireEvent.mouseDown(clubInput());

    // Bengaluru has no separate city name recorded, so its location name is used.
    expect(screen.getByTestId('create-pod-club-option-club-1-place')).toHaveTextContent(
      'Indiranagar, Bengaluru',
    );
    expect(screen.getByTestId('create-pod-club-option-club-1')).toHaveAccessibleName(
      'Sunset Club, Indiranagar, Bengaluru',
    );
    // A club with no area still says which city it is in.
    expect(screen.getByTestId('create-pod-club-option-club-3-place')).toHaveTextContent('Pune');
  });

  it('shows the picked club with its place in the field', () => {
    step({ values: { location_id: 'loc-1', locality: 'Indiranagar', club_id: 'club-1' } });

    expect(clubInput()).toHaveValue('Sunset Club | Indiranagar, Bengaluru');
  });

  it('finds a club by typing its area', () => {
    step({ values: { location_id: 'loc-1', locality: 'Indiranagar' } });
    const search = clubInput();

    // Autocomplete resets the text of a field that is not focused.
    act(() => search.focus());
    fireEvent.change(search, { target: { value: 'indiranagar' } });

    expect(screen.getByTestId('create-pod-club-option-club-1')).toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-club-option-club-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('create-pod-club-option-club-3')).not.toBeInTheDocument();
  });

  it('picks a club from the list', () => {
    step({ values: { location_id: 'loc-1', locality: 'Whitefield' } });

    fireEvent.mouseDown(clubInput());
    fireEvent.click(screen.getByTestId('create-pod-club-option-club-2'));

    expect(formRef?.getValues('club_id')).toBe('club-2');
    expect(clubInput()).toHaveValue('Whitefield Club | Whitefield, Bengaluru');
  });

  it('renders a locality that has no clubs in it', () => {
    const { container } = step({ values: { location_id: 'loc-1', locality: 'Whitefield' } });

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a city with no localities recorded', () => {
    step({ values: { location_id: 'loc-2' } });

    // Nothing to narrow by, so the city's clubs are open straight away.
    expect(clubInput()).not.toBeDisabled();
  });

  it('offers both pod modes', () => {
    const { container } = step({ values: { location_id: 'loc-1' } });

    expect(container.querySelectorAll('input, [role="radio"], [role="combobox"]').length).toBeGreaterThan(0);
  });

  it('opens on the club the host already picked', () => {
    step({ values: { location_id: 'loc-1', locality: 'Indiranagar', club_id: 'club-1' } });

    expect(formRef?.getValues('club_id')).toBe('club-1');
  });

  it('reports a missing club on the club field rather than on the form', () => {
    const { container } = step({
      values: { location_id: 'loc-1' },
      errors: { club_id: 'Pick a club for this pod' },
    });

    expect(container.textContent).toContain('Pick a club for this pod');
  });

  it('survives every control on it being pressed', () => {
    const { container } = step({ values: { location_id: 'loc-1', locality: 'Indiranagar' } });

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 12)) {
      if (control.isConnected) fireEvent.click(control);
    }

    expect(container.innerHTML).not.toBe('');
  });
});

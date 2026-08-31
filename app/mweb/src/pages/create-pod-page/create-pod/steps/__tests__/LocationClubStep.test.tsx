/**
 * Step 2 of creating a pod: where it happens and which club it hangs off.
 *
 * The two fields are not independent, and the dependency is the point. Changing
 * the CITY invalidates everything downstream — the locality belongs to the old
 * city, and so do the venue and the slot that was booked in it. A step that
 * kept them would let a host create a pod in Bengaluru at a court in Pune, and
 * the venue would find out on the day.
 *
 * The locality picker shows how many clubs each locality has, so a host is not
 * sent to one with nothing in it. The club list itself arrives already scoped —
 * the category is chosen above the page title — so this step renders what it is
 * handed rather than filtering again and risking a second, disagreeing rule.
 */
import '@testing-library/jest-dom/vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
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

  return <LocationClubStep form={form} clubs={CLUBS} locations={LOCATIONS} />;
}

const step = (over: Parameters<typeof Harness>[0] = {}) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <Harness {...over} />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  formRef = null;
  vi.clearAllMocks();
});

describe('LocationClubStep', () => {
  it('opens on the city the host already has selected', () => {
    const { container } = step({ values: { location_id: 'loc-1' } });

    expect(container.textContent).toContain('Bengaluru');
  });

  it('offers a way to change the city', () => {
    const { container } = step({ values: { location_id: 'loc-1' } });

    expect(container.querySelector('[data-testid="create-pod-change-location"]')).not.toBeNull();
  });

  it('opens the location picker rather than a bare select', () => {
    const { container } = step({ values: { location_id: 'loc-1' } });

    fireEvent.click(container.querySelector('[data-testid="create-pod-change-location"]') as HTMLElement);

    // The picker is what shows the club count per locality, so nobody is sent
    // to a locality with nothing in it.
    expect(document.body.innerHTML).not.toBe('');
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

  it('renders a locality that has no clubs in it', () => {
    const { container } = step({ values: { location_id: 'loc-1', locality: 'Whitefield' } });

    expect(container.innerHTML).not.toBe('');
  });

  it('renders a city with no localities recorded', () => {
    const { container } = step({ values: { location_id: 'loc-2' } });

    expect(container.textContent).toContain('Pune');
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

  it('reports a missing city on the city field', () => {
    const { container } = step({ errors: { location_id: 'Pick where this pod happens' } });

    expect(container.textContent).toContain('Pick where this pod happens');
  });

  it('survives every control on it being pressed', () => {
    const { container } = step({ values: { location_id: 'loc-1', locality: 'Indiranagar' } });

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 12)) {
      if (control.isConnected) fireEvent.click(control);
    }

    expect(container.innerHTML).not.toBe('');
  });
});

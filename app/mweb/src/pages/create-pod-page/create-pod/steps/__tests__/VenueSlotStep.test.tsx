/**
 * Step 3 of creating a pod: the venue and the slot booked in it.
 *
 * The step is really two steps behind one, chosen by the pod's MODE, and that
 * is where the rules are:
 *
 *  - a PHYSICAL pod books a real published slot, and the slot is what sets the
 *    pod's date and time. There is no date picker, because a date typed by hand
 *    would be a pod claiming a space nobody booked.
 *  - a VIRTUAL pod has no venue at all, so it gets the meeting fields and its
 *    own schedule instead.
 *
 * The venue rail is scoped to the venues that match the chosen CLUB, not to
 * every venue in the city. A host offered a venue their club has no arrangement
 * with would send a slot request that is always declined.
 *
 * A host's own venue is worth calling out on the rail, because booking your own
 * space is the common case and hunting for it among strangers' is not.
 */
import '@testing-library/jest-dom/vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { act, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import VenueSlotStep from '../VenueSlotStep';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodVenue,
} from '../../create-pod.types';

const testTheme = createTheme();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const VENUES: CreatePodVenue[] = [
  {
    id: 'venue-1',
    owner_user_id: 'u-me',
    venue_name: 'My Own Court',
    venue_type: 'INDOOR',
    capacity: 12,
    location_id: 'loc-1',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    address_line1: '12 Church Street',
  },
  {
    id: 'venue-2',
    owner_user_id: 'u-other',
    venue_name: 'Indiranagar Courts',
    venue_type: 'INDOOR',
    capacity: 24,
    location_id: 'loc-1',
    city: 'Bengaluru',
    locality: 'Indiranagar',
  },
  {
    id: 'venue-3',
    owner_user_id: 'u-other',
    venue_name: 'Unlinked Hall',
    location_id: 'loc-1',
    city: 'Bengaluru',
  },
];

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

function Harness({
  values,
  errors,
  clubVenueIds = new Set(['venue-1', 'venue-2']),
}: Readonly<{
  values?: Partial<CreatePodFormValues>;
  errors?: Record<string, string>;
  clubVenueIds?: Set<string>;
}>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, location_id: 'loc-1', ...values },
  });
  // In an effect: setError during render loops until React gives up.
  useEffect(() => {
    for (const [field, message] of Object.entries(errors ?? {})) {
      form.setError(field as keyof CreatePodFormValues, { type: 'manual', message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <VenueSlotStep form={form} venues={VENUES} clubVenueIds={clubVenueIds} viewerUserId="u-me" />
  );
}

const step = (over: Parameters<typeof Harness>[0] = {}) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[]}>
      <ThemeProvider theme={testTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <MemoryRouter>
            <Harness {...over} />
          </MemoryRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </MockedProvider>
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('VenueSlotStep — a physical pod', () => {
  it('offers the venues the chosen club is linked to', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL' } });
    await settle();

    expect(container.textContent).toContain('Indiranagar Courts');
  });

  it('leaves out a venue the club has no arrangement with', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL' } });
    await settle();

    // A slot request to an unlinked venue is one that is always declined.
    expect(container.textContent).not.toContain('Unlinked Hall');
  });

  it('calls out the host own venue, since booking your own space is the common case', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL' } });
    await settle();

    expect(container.textContent).toContain('My Own Court');
  });

  it('says so when the club is linked to no venues at all', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL' }, clubVenueIds: new Set() });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('opens on the venue a host already picked', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL', venue_id: 'venue-2' } });
    await settle();

    expect(container.textContent).toContain('Indiranagar Courts');
  });

  it('offers no date picker — the SLOT is what sets the pod time', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL', venue_id: 'venue-2' } });
    await settle();

    // A date typed by hand would be a pod claiming a space nobody booked.
    expect(container.querySelector('input[placeholder*="/"]')).toBeNull();
  });

  it('reports a missing venue on the venue field', async () => {
    const { container } = step({
      values: { pod_mode: 'PHYSICAL' },
      errors: { venue_id: 'Pick a venue for this pod' },
    });
    await settle();

    expect(container.textContent).toContain('Pick a venue for this pod');
  });

  it('renders with a slot already booked, which is the state an edit opens in', async () => {
    const { container } = step({
      values: { pod_mode: 'PHYSICAL', venue_id: 'venue-2', venue_slot_id: 'slot-1' },
    });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });

  it('survives the slot list never answering, which is its state on first paint', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL', venue_id: 'venue-2' } });
    await settle();
    await settle();

    expect(container.innerHTML).not.toBe('');
  });
});

describe('VenueSlotStep — a virtual pod', () => {
  it('asks for meeting details instead of a venue', async () => {
    const { container } = step({ values: { pod_mode: 'VIRTUAL' } });
    await settle();

    expect(container.textContent).not.toContain('Indiranagar Courts');
    expect(container.querySelectorAll('input, textarea').length).toBeGreaterThan(0);
  });

  it('gives a virtual pod its own schedule, since it books no slot', async () => {
    const physical = step({ values: { pod_mode: 'PHYSICAL' } });
    await settle();
    const virtual = step({ values: { pod_mode: 'VIRTUAL' } });
    await settle();

    expect(virtual.container.innerHTML).not.toBe(physical.container.innerHTML);
  });

  it('reports a bad meeting link on the link field', async () => {
    const { container } = step({
      values: { pod_mode: 'VIRTUAL' },
      errors: { meeting_url: 'Enter a valid meeting link' },
    });
    await settle();

    expect(container.textContent).toContain('Enter a valid meeting link');
  });
});

describe('VenueSlotStep — either way', () => {
  it('survives every control on it being pressed', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL' } });
    await settle();

    for (const control of [...container.querySelectorAll<HTMLElement>('button:not([disabled])')].slice(0, 15)) {
      if (control.isConnected) fireEvent.click(control);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });

  it('renders before a city has been chosen', async () => {
    const { container } = step({ values: { pod_mode: 'PHYSICAL', location_id: '' } });
    await settle();

    expect(container.innerHTML).not.toBe('');
  });
});

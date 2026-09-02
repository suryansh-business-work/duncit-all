import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import BasicSection from '../../src/sections/BasicSection';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormValues } from '../../src/types';

// The spots floor comes off the sub-category's admin-set `min_pax`, read
// through the same cache-first category query the cascade issues.
const apollo = vi.hoisted(() => ({ categories: [] as unknown[] }));
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: { categories: apollo.categories, venueAvailableSlots: [] },
    loading: false,
    error: undefined,
  }),
}));

afterEach(() => {
  apollo.categories = [];
});

function renderAutoPodBasics(defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness
      data={makeData({ config: makeConfig({ autoPod: true }) })}
      defaultValues={{ pod_type: 'PAID', pod_amount: 1, no_of_spots: 2, ...defaults }}
      methodsRef={methodsRef}
    >
      <BasicSection />
    </Harness>,
  );
  return methodsRef;
}

describe('Basic Information in Auto Pod mode', () => {
  it('carries the title, the economics and the tags — no club, hosts or mode toggle', () => {
    renderAutoPodBasics();
    expect(screen.getByLabelText(/Pod title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/)).toBeInTheDocument();
    expect(screen.getByLabelText(/No\. of spots/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Occurrence/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hashtags/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Club/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Virtual pod' })).not.toBeInTheDocument();
    // No activity minimum known: the plain "at least 2" hint.
    expect(screen.getByText('Total spots including the host’s free seat — at least 2.')).toBeInTheDocument();
  });

  it('writes the price and the spots into the form as numbers', async () => {
    const user = userEvent.setup();
    const ref = renderAutoPodBasics();
    const amount = screen.getByLabelText(/Amount/);
    await user.clear(amount);
    await user.type(amount, '750');
    expect(ref.current?.getValues('pod_amount')).toBe(750);
    const spots = screen.getByLabelText(/No\. of spots/);
    await user.clear(spots);
    await user.type(spots, '12');
    expect(ref.current?.getValues('no_of_spots')).toBe(12);
    // A cleared field is 0, never NaN.
    await user.clear(amount);
    expect(ref.current?.getValues('pod_amount')).toBe(0);
  });

  it('picks an occurrence', async () => {
    const user = userEvent.setup();
    const ref = renderAutoPodBasics();
    await user.click(screen.getByLabelText(/Occurrence/));
    await user.click(await screen.findByRole('option', { name: 'Weekly' }));
    expect(ref.current?.getValues('pod_occurrence')).toBe('WEEKLY');
  });

  it("raises the spots to the activity's minimum and says why", () => {
    apollo.categories = [{ id: 'sub-doubles', name: 'Doubles', level: 'SUB', parent_id: 'cat', min_pax: 4 }];
    const ref = renderAutoPodBasics({ sub_category_id: 'sub-doubles', no_of_spots: 2 });
    expect(ref.current?.getValues('no_of_spots')).toBe(4);
    expect(screen.getByText('This activity needs at least 4 people.')).toBeInTheDocument();
  });

  it('shows the schema messages over the hints once a field is faulted', async () => {
    const ref = renderAutoPodBasics();
    await act(async () => {
      ref.current?.setError('pod_amount', { message: 'Ticket price must be between 1 and 1999' });
      ref.current?.setError('no_of_spots', { message: 'An Auto Pod needs at least 2 spots' });
    });
    expect(screen.getByText('Ticket price must be between 1 and 1999')).toBeInTheDocument();
    expect(screen.getByText('An Auto Pod needs at least 2 spots')).toBeInTheDocument();
  });
});

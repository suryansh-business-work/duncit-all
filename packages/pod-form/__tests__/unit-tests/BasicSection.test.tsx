import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import BasicSection from '../../src/sections/BasicSection';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormData, PodFormValues } from '../../src/types';

const CLUBS = [
  { id: 'c1', club_name: 'Club One' },
  { id: 'c2', club_name: 'Club Two' },
];
const USERS = [
  { user_id: 'u1', full_name: 'Alice' },
  { user_id: 'u2', email: 'bob@x.com' },
];

function renderBasic(data: PodFormData, defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness data={data} defaultValues={defaults} methodsRef={methodsRef}>
      <BasicSection />
    </Harness>,
  );
  return methodsRef;
}

describe('BasicSection', () => {
  it('edits the title and hashtags', async () => {
    const user = userEvent.setup();
    renderBasic(makeData({ clubs: CLUBS }));
    await user.type(screen.getByLabelText(/Pod title/), 'My Pod');
    expect(screen.getByLabelText(/Pod title/)).toHaveValue('My Pod');
    await user.type(screen.getByLabelText(/Hashtags/), '#fun');
    expect(screen.getByLabelText(/Hashtags/)).toHaveValue('#fun');
  });

  it('switches pod mode and ignores a deselect click', async () => {
    const user = userEvent.setup();
    const ref = renderBasic(makeData({ clubs: CLUBS }));
    await user.click(screen.getByRole('button', { name: 'Virtual pod' }));
    expect(ref.current?.getValues('pod_mode')).toBe('VIRTUAL');
    // clicking the already-selected mode deselects -> nextMode null -> no change
    await user.click(screen.getByRole('button', { name: 'Virtual pod' }));
    expect(ref.current?.getValues('pod_mode')).toBe('VIRTUAL');
  });

  it('selects a club and clears dependent venue fields', async () => {
    const user = userEvent.setup();
    const ref = renderBasic(makeData({ clubs: CLUBS }), { venue_id: 'v-old', venue_slot_id: 's-old' });
    await user.click(screen.getByLabelText(/Club/));
    await user.click(await screen.findByRole('option', { name: 'Club Two' }));
    expect(ref.current?.getValues('club_id')).toBe('c2');
    expect(ref.current?.getValues('venue_id')).toBe('');
    expect(ref.current?.getValues('venue_slot_id')).toBe('');
  });

  it('renders the server-search host picker when searchHosts is injected', () => {
    const searchHosts = vi.fn().mockResolvedValue([]);
    renderBasic(makeData({ clubs: CLUBS, config: makeConfig({ showHosts: true }), searchHosts }));
    // HostsField renders its own combobox with placeholder "Search hosts…"
    expect(screen.getByPlaceholderText('Search hosts…')).toBeInTheDocument();
  });

  it('renders the multi-select host field and resolves labels for each id', async () => {
    const user = userEvent.setup();
    const ref = renderBasic(
      makeData({ clubs: CLUBS, users: USERS, config: makeConfig({ showHosts: true }) }),
      // unknown id -> id.slice(0,6); u2 -> email label
      { pod_hosts_id: ['unknownid', 'u2'] },
    );
    expect(screen.getByText(/unknow/)).toBeInTheDocument();
    expect(screen.getByText(/bob@x.com/)).toBeInTheDocument();
    await user.click(screen.getByText(/unknow/));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('Alice'));
    expect(ref.current?.getValues('pod_hosts_id')).toContain('u1');
    // full_name label now renders in the selected value (and the open option)
    expect(screen.getAllByText(/Alice/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows club and host validation errors', () => {
    const ref = renderBasic(
      makeData({ clubs: CLUBS, users: USERS, config: makeConfig({ showHosts: true }) }),
    );
    act(() => {
      ref.current?.setError('club_id', { type: 'custom', message: 'Select a club' });
      ref.current?.setError('pod_hosts_id', { type: 'custom', message: 'Add at least one host' });
    });
    expect(screen.getByText('Select a club')).toBeInTheDocument();
    expect(screen.getByText('Add at least one host')).toBeInTheDocument();
  });

  it('omits the host field entirely when hosts are hidden', () => {
    renderBasic(makeData({ clubs: CLUBS, config: makeConfig({ showHosts: false }) }));
    expect(screen.queryByRole('combobox', { name: /Hosts/ })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search hosts…')).not.toBeInTheDocument();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  useQuery: useQueryMock,
}));

import AdminsSection from '../src/sections/AdminsSection';
import { ClubFormDataProvider } from '../src/context';
import type { ClubAdmin, ClubFormData, ClubFormValues } from '../src/types';
import { FormHarness } from './formHarness';

const config = { showAdmins: true, showVerified: true, showIsActive: true };

function renderSection(opts: {
  admins?: string[];
  initialAdmins?: ClubAdmin[];
  onMethods?: Parameters<typeof FormHarness>[0]['onMethods'];
} = {}) {
  const data: ClubFormData = { config, initialAdmins: opts.initialAdmins ?? [] };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FormHarness defaultValues={{ admin_user_ids: opts.admins ?? [] }} onMethods={opts.onMethods}>
      <ClubFormDataProvider value={data}>{children}</ClubFormDataProvider>
    </FormHarness>
  );
  return render(<AdminsSection />, { wrapper: Wrapper });
}

beforeEach(() => {
  useQueryMock.mockReturnValue({ data: undefined, loading: false });
});
afterEach(() => {
  vi.useRealTimers();
  useQueryMock.mockReset();
});

describe('AdminsSection', () => {
  it('runs the debounced setter after 300ms and queries with an undefined term', () => {
    vi.useFakeTimers();
    renderSection();
    // Initial render queries with an undefined search term.
    expect(useQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { filter: { search: undefined } } }),
    );
    // Advancing past the debounce fires the (empty) term setter without error.
    act(() => vi.advanceTimersByTime(300));
    expect(useQueryMock).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { filter: { search: undefined } } }),
    );
  });

  it('seeds labelled chips from initialAdmins (with and without an avatar) and shows the count', () => {
    renderSection({
      admins: ['u1', 'u2'],
      initialAdmins: [
        { id: 'u1', name: 'Alice', avatar_url: 'https://x/a.png' },
        { id: 'u2', name: 'Bob' },
      ],
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Count chip shows 2 (primary because there are admins).
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('keeps an assigned id with no matching option as an id-only placeholder chip', () => {
    renderSection({ admins: ['ghost-id'], initialAdmins: [] });
    expect(screen.getByText('ghost-id')).toBeInTheDocument();
  });

  it('renders the empty state with a default-coloured zero count', () => {
    renderSection({ admins: [], initialAdmins: [] });
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Club Admins')).toBeInTheDocument();
  });

  it('falls back to an empty list when admin_user_ids is undefined', () => {
    const data: ClubFormData = { config, initialAdmins: [] };
    render(<AdminsSection />, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <FormHarness defaultValues={{ admin_user_ids: undefined as unknown as string[] }}>
          <ClubFormDataProvider value={data}>{children}</ClubFormDataProvider>
        </FormHarness>
      ),
    });
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows a spinner while the query is loading', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true });
    renderSection();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('lists fetched users and adds one on selection', async () => {
    const user = userEvent.setup();
    let formMethods: import('react-hook-form').UseFormReturn<ClubFormValues> | undefined;
    useQueryMock.mockReturnValue({
      data: {
        users: [
          { user_id: 'r1', full_name: 'Rob', email: 'rob@x.com', profile_photo: null },
          { user_id: 'r2', full_name: null, email: 'e2@x.com', profile_photo: null },
        ],
      },
      loading: false,
    });
    renderSection({ admins: [], onMethods: (m) => { formMethods = m; } });

    await user.click(screen.getByLabelText('Assign Club Admins'));
    // Both fetched users appear as options; the nameless one shows the em dash.
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('Rob')).toBeInTheDocument();
    expect(within(listbox).getByText('—')).toBeInTheDocument();
    expect(within(listbox).getByText('e2@x.com')).toBeInTheDocument();

    await user.click(within(listbox).getByText('Rob'));
    expect(formMethods?.getValues('admin_user_ids')).toEqual(['r1']);
  });

  it('removes an assigned admin when its chip is deleted', async () => {
    const user = userEvent.setup();
    let formMethods: import('react-hook-form').UseFormReturn<ClubFormValues> | undefined;
    renderSection({
      admins: ['u1', 'u2'],
      initialAdmins: [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ],
      onMethods: (m) => { formMethods = m; },
    });

    const aliceChip = screen.getByText('Alice').closest('.MuiChip-root') as HTMLElement;
    await user.click(within(aliceChip).getByTestId('CancelIcon'));
    await waitFor(() => expect(formMethods?.getValues('admin_user_ids')).toEqual(['u2']));
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });
});

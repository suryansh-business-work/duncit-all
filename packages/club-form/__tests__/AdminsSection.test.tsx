import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

type QueryVars = { super_category_id?: string; sub_category_id?: string; search?: string };
const lastVariables = () =>
  (useQueryMock.mock.lastCall?.[1] as { variables?: QueryVars })?.variables;

function renderSection(opts: {
  values?: Partial<ClubFormValues>;
  initialAdmins?: ClubAdmin[];
  onMethods?: Parameters<typeof FormHarness>[0]['onMethods'];
} = {}) {
  const data: ClubFormData = { config, initialAdmins: opts.initialAdmins ?? [] };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FormHarness defaultValues={{ admin_user_ids: [], ...opts.values }} onMethods={opts.onMethods}>
      <ClubFormDataProvider value={data}>{children}</ClubFormDataProvider>
    </FormHarness>
  );
  return render(<AdminsSection />, { wrapper: Wrapper });
}

const input = () => screen.getByLabelText(/Assign Club Admin/) as HTMLInputElement;

beforeEach(() => {
  useQueryMock.mockReturnValue({ data: undefined, loading: false });
});
afterEach(() => {
  vi.useRealTimers();
  useQueryMock.mockReset();
});

describe('AdminsSection', () => {
  it('runs the debounced setter after 300ms and queries with everything undefined', () => {
    vi.useFakeTimers();
    renderSection();
    // Initial render queries with no category scope and no search term.
    expect(lastVariables()).toEqual({
      super_category_id: undefined,
      sub_category_id: undefined,
      search: undefined,
    });
    // Advancing past the debounce fires the (empty) term setter without error.
    act(() => vi.advanceTimersByTime(300));
    expect(lastVariables()).toEqual({
      super_category_id: undefined,
      sub_category_id: undefined,
      search: undefined,
    });
  });

  it("scopes the candidates query to the club's Super and Sub category", () => {
    renderSection({ values: { super_category_id: 'sc1', category_id: 'sub9' } });
    expect(lastVariables()).toEqual({
      super_category_id: 'sc1',
      sub_category_id: 'sub9',
      search: undefined,
    });
  });

  it('seeds the assigned admin as a labelled value from initialAdmins', () => {
    renderSection({
      values: { admin_user_ids: ['u1'] },
      initialAdmins: [{ id: 'u1', name: 'Alice', avatar_url: 'https://x/a.png' }],
    });
    expect(input().value).toBe('Alice');
    // A single assigned admin drops nobody, so no warning shows.
    expect(screen.queryByText(/more than one admin/)).not.toBeInTheDocument();
  });

  it('keeps an assigned id with no matching option as an id-only value', () => {
    renderSection({ values: { admin_user_ids: ['ghost-id'] }, initialAdmins: [] });
    expect(input().value).toBe('ghost-id');
  });

  it('trims a legacy multi-admin list to the first id and warns about the dropped admins', () => {
    let formMethods: import('react-hook-form').UseFormReturn<ClubFormValues> | undefined;
    renderSection({
      values: { admin_user_ids: ['u1', 'u2'] },
      initialAdmins: [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' },
      ],
      onMethods: (m) => { formMethods = m; },
    });
    expect(formMethods?.getValues('admin_user_ids')).toEqual(['u1']);
    expect(input().value).toBe('Alice');
    // The co-admin the trim discards is named before a save removes them.
    expect(screen.getByText(/removes Bob/)).toBeInTheDocument();
  });

  it('renders empty with the replace-semantics helper when no admin is assigned', () => {
    renderSection({ values: { admin_user_ids: [] } });
    expect(input().value).toBe('');
    expect(
      screen.getByText('One user administers this club. Picking another replaces the current one.'),
    ).toBeInTheDocument();
  });

  it('falls back to an empty list when admin_user_ids is undefined', () => {
    renderSection({ values: { admin_user_ids: undefined as unknown as string[] } });
    expect(input().value).toBe('');
  });

  it('shows a spinner while the query is loading', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true });
    renderSection();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('lists fetched candidates and assigns one on selection', async () => {
    const user = userEvent.setup();
    let formMethods: import('react-hook-form').UseFormReturn<ClubFormValues> | undefined;
    useQueryMock.mockReturnValue({
      data: {
        clubAdminCandidates: [
          { user_id: 'r1', full_name: 'Rob', email: 'rob@x.com', profile_photo: 'https://x/r.png' },
          { user_id: 'r2', full_name: null, email: 'e2@x.com', profile_photo: null },
        ],
      },
      loading: false,
    });
    renderSection({ onMethods: (m) => { formMethods = m; } });

    await user.click(input());
    // Both fetched users appear as options; the nameless one shows the em dash.
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('Rob')).toBeInTheDocument();
    expect(within(listbox).getByText('—')).toBeInTheDocument();
    expect(within(listbox).getByText('e2@x.com')).toBeInTheDocument();

    await user.click(within(listbox).getByText('Rob'));
    expect(formMethods?.getValues('admin_user_ids')).toEqual(['r1']);
    expect(input().value).toBe('Rob');
  });

  it('clearing the selection empties admin_user_ids', async () => {
    let formMethods: import('react-hook-form').UseFormReturn<ClubFormValues> | undefined;
    renderSection({
      values: { admin_user_ids: ['u1'] },
      initialAdmins: [{ id: 'u1', name: 'Alice' }],
      onMethods: (m) => { formMethods = m; },
    });
    expect(input().value).toBe('Alice');
    fireEvent.click(screen.getByLabelText('Clear'));
    await waitFor(() => expect(formMethods?.getValues('admin_user_ids')).toEqual([]));
  });

  it('surfaces the RHF validation error as helper text', () => {
    let formMethods: import('react-hook-form').UseFormReturn<ClubFormValues> | undefined;
    renderSection({ onMethods: (m) => { formMethods = m; } });
    act(() => {
      formMethods?.setError('admin_user_ids', { message: 'Assign one Club Admin' });
    });
    expect(screen.getByText('Assign one Club Admin')).toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
  });

  it("re-seeds the labelled value when a different club's admin arrives", () => {
    const ui = (admins: ClubAdmin[]) => (
      <FormHarness defaultValues={{ admin_user_ids: ['u2'] }}>
        <ClubFormDataProvider value={{ config, initialAdmins: admins }}>
          <AdminsSection />
        </ClubFormDataProvider>
      </FormHarness>
    );
    const view = render(ui([]));
    expect(input().value).toBe('u2');
    view.rerender(ui([{ id: 'u2', name: 'Bob' }]));
    expect(input().value).toBe('Bob');
  });
});

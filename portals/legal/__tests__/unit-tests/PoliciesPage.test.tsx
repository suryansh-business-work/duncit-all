import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import PoliciesPage from '../../src/pages/policies/PoliciesPage';
import { CREATE_POLICY, DELETE_POLICY, POLICIES_TABLE, UPDATE_POLICY, type Policy } from '../../src/graphql/policies';
import { renderWithProviders } from './testkit';

vi.mock('react-quill', () => ({
  default: ({ value, onChange }: any) => (
    <textarea data-testid="quill" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const policy = (id: string, title: string, slug: string): Policy => ({
  id,
  slug,
  title,
  content: '<p>Body</p>',
  is_active: true,
  sort_order: 0,
  updated_at: new Date().toISOString(),
});

const tableMock = (
  policies: Policy[],
  match: (variables: Record<string, any>) => boolean = () => true
) => ({
  request: { query: POLICIES_TABLE },
  variableMatcher: match,
  result: { data: { policiesTable: { total: policies.length, rows: policies } } },
});

describe('PoliciesPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<PoliciesPage />, { mocks: [tableMock([])] });
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
  });

  it('lists active and hidden policies', async () => {
    const hidden: Policy = { ...policy('p2', 'Draft Policy', 'draft-policy'), is_active: false };
    renderWithProviders(<PoliciesPage />, {
      mocks: [tableMock([policy('p1', 'Privacy Policy', 'privacy-policy'), hidden])],
    });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    expect(screen.getByText('privacy-policy')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('filters by search via the table toolbar', async () => {
    renderWithProviders(<PoliciesPage />, {
      mocks: [
        tableMock([policy('p1', 'Privacy Policy', 'privacy-policy')], (v) => !v.query.search),
        tableMock([policy('p2', 'Refund Policy', 'refund-policy')], (v) => v.query.search === 'refund'),
      ],
    });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: 'Search title or slug' }), {
      target: { value: 'refund' },
    });
    await waitFor(() => expect(screen.getByText('Refund Policy')).toBeInTheDocument(), {
      timeout: 2000,
    });
  });

  it('creates a policy with an auto-generated slug', async () => {
    renderWithProviders(<PoliciesPage />, {
      mocks: [
        tableMock([]),
        { request: { query: CREATE_POLICY }, variableMatcher: () => true, result: { data: { createPolicy: { id: 'new-1' } } } },
        tableMock([policy('new-1', 'Cookie Policy', 'cookie-policy')]),
      ],
    });
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Cookie Policy' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('Cookie Policy')).toBeInTheDocument());
  });

  it('validates that a title is required', async () => {
    renderWithProviders(<PoliciesPage />, { mocks: [tableMock([])] });
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText(/title is required/i)).toBeInTheDocument();
  });

  it('rejects a title that cannot form a slug', async () => {
    renderWithProviders(<PoliciesPage />, { mocks: [tableMock([])] });
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: '!!!' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText(/slug is required/i)).toBeInTheDocument();
  });

  it('surfaces a server error on create', async () => {
    renderWithProviders(<PoliciesPage />, {
      mocks: [
        tableMock([]),
        { request: { query: CREATE_POLICY }, variableMatcher: () => true, result: { errors: [{ message: 'Slug already exists' }] } },
      ],
    });
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Privacy Policy' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText(/slug already exists/i)).toBeInTheDocument();
  });

  it('edits a policy from the row action', async () => {
    renderWithProviders(<PoliciesPage />, {
      mocks: [
        tableMock([policy('p1', 'Privacy Policy', 'privacy-policy')]),
        { request: { query: UPDATE_POLICY }, variableMatcher: () => true, result: { data: { updatePolicy: { id: 'p1' } } } },
        tableMock([policy('p1', 'Privacy Policy v2', 'privacy-policy')]),
      ],
    });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Privacy Policy v2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(screen.getByText('Privacy Policy v2')).toBeInTheDocument());
  });

  it('toggles active state and edits sort order in the dialog', async () => {
    renderWithProviders(<PoliciesPage />, {
      mocks: [tableMock([policy('p1', 'Privacy Policy', 'privacy-policy')])],
    });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.change(within(dialog).getByLabelText('Sort order'), { target: { value: '3' } });
    fireEvent.change(within(dialog).getByLabelText(/Slug/), { target: { value: 'privacy' } });
    fireEvent.change(within(dialog).getByTestId('quill'), { target: { value: '<p>New body</p>' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits a policy that has no stored content and closes via the backdrop', async () => {
    const noContent = { ...policy('p1', 'Privacy Policy', 'privacy-policy'), content: null as unknown as string };
    renderWithProviders(<PoliciesPage />, { mocks: [tableMock([noContent])] });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    // `p.content || ''` fed the editor an empty string for the null content.
    expect(within(dialog).getByTestId('quill')).toHaveValue('');
    // Escape fires the form dialog's own onClose (guarded by `!saving`).
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancels a pending delete via the confirm dialog', async () => {
    renderWithProviders(<PoliciesPage />, {
      mocks: [tableMock([policy('p1', 'Privacy Policy', 'privacy-policy')])],
    });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deletes a policy from the row action', async () => {
    renderWithProviders(<PoliciesPage />, {
      mocks: [
        tableMock([policy('p1', 'Privacy Policy', 'privacy-policy')]),
        { request: { query: DELETE_POLICY, variables: { id: 'p1' } }, result: { data: { deletePolicy: true } } },
        tableMock([]),
      ],
    });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
  });
});

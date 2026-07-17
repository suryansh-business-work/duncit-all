import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import PoliciesPage from '../../src/pages/policies/PoliciesPage';
import { renderWithProviders } from '../testkit';
import { createPolicyMock, deletePolicyMock, makePolicy, updatePolicyMock } from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('react-quill', () => ({
  default: ({ value, onChange }: any) => (
    <textarea data-testid="quill" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

describe('PoliciesPage', () => {
  it('shows an empty state', async () => {
    __setTableRows([]);
    renderWithProviders(<PoliciesPage />);
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
  });

  it('lists active and hidden policies', async () => {
    __setTableRows([
      makePolicy({ id: 'p1', title: 'Privacy Policy', slug: 'privacy-policy' }),
      makePolicy({ id: 'p2', title: 'Draft Policy', slug: 'draft-policy', is_active: false }),
    ]);
    renderWithProviders(<PoliciesPage />);
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    expect(screen.getByText('privacy-policy')).toBeInTheDocument();
    // is_active carries both a status Chip (renderStatus) and a text valueGetter
    // (statusValue), so each label renders twice — assert at least one of each.
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0);
  });

  it('creates a policy with an auto-generated slug', async () => {
    __setTableRows([]);
    renderWithProviders(<PoliciesPage />, { mocks: [createPolicyMock({ id: 'new-1' })] });
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Cookie Policy' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('validates that a title is required', async () => {
    __setTableRows([]);
    renderWithProviders(<PoliciesPage />);
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText(/title is required/i)).toBeInTheDocument();
  });

  it('rejects a title that cannot form a slug', async () => {
    __setTableRows([]);
    renderWithProviders(<PoliciesPage />);
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: '!!!' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText(/slug is required/i)).toBeInTheDocument();
  });

  it('surfaces a server error on create', async () => {
    __setTableRows([]);
    renderWithProviders(<PoliciesPage />, {
      mocks: [createPolicyMock({ fail: 'Slug already exists' })],
    });
    await waitFor(() => expect(screen.getByText(/no policies yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Privacy Policy' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    expect(await within(dialog).findByText(/slug already exists/i)).toBeInTheDocument();
  });

  it('edits a policy from the row action', async () => {
    __setTableRows([makePolicy({ id: 'p1', title: 'Privacy Policy', slug: 'privacy-policy' })]);
    renderWithProviders(<PoliciesPage />, { mocks: [updatePolicyMock({ id: 'p1' })] });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Title/), { target: { value: 'Privacy Policy v2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('toggles active state and edits sort order in the dialog', async () => {
    __setTableRows([makePolicy({ id: 'p1', title: 'Privacy Policy', slug: 'privacy-policy' })]);
    renderWithProviders(<PoliciesPage />);
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
    __setTableRows([makePolicy({ id: 'p1', title: 'Privacy Policy', slug: 'privacy-policy', content: '' })]);
    renderWithProviders(<PoliciesPage />);
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    // `p.content || ''` fed the editor an empty string for the empty content.
    expect(within(dialog).getByTestId('quill')).toHaveValue('');
    // Escape fires the form dialog's own onClose (guarded by `!saving`).
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('cancels a pending delete via the confirm dialog', async () => {
    __setTableRows([makePolicy({ id: 'p1', title: 'Privacy Policy', slug: 'privacy-policy' })]);
    renderWithProviders(<PoliciesPage />);
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deletes a policy from the row action', async () => {
    __setTableRows([makePolicy({ id: 'p1', title: 'Privacy Policy', slug: 'privacy-policy' })]);
    renderWithProviders(<PoliciesPage />, { mocks: [deletePolicyMock('p1')] });
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

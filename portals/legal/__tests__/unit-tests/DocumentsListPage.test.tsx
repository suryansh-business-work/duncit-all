import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import DocumentsListPage from '../../src/pages/documents/DocumentsListPage';
import { renderWithProviders } from '../testkit';
import { createLegalDocumentMock, makeLegalDocumentRow } from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('react-quill', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <textarea data-testid="quill" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

describe('DocumentsListPage', () => {
  it('shows an empty state', async () => {
    __setTableRows([]);
    renderWithProviders(<DocumentsListPage />);
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
  });

  it('lists documents and opens a detail row', async () => {
    __setTableRows([
      makeLegalDocumentRow({ id: 'd1', name: 'Master NDA' }),
      makeLegalDocumentRow({ id: 'd2', name: 'Orphan Doc', updated_by_name: '' }),
    ]);
    renderWithProviders(<></>, {
      initialEntries: ['/documents'],
      routes: (
        <>
          <Route path="/documents" element={<DocumentsListPage />} />
          <Route path="/documents/:id" element={<div>DOC DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Master NDA')).toBeInTheDocument());
    // The no-editor row falls back to an em-dash in the Updated-by column.
    expect(screen.getByText('—')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Master NDA'));
    await waitFor(() => expect(screen.getByText('DOC DETAIL')).toBeInTheDocument());
  });

  it('creates a document and navigates to it', async () => {
    __setTableRows([]);
    renderWithProviders(<></>, {
      mocks: [createLegalDocumentMock({ id: 'new-1' })],
      initialEntries: ['/documents'],
      routes: (
        <>
          <Route path="/documents" element={<DocumentsListPage />} />
          <Route path="/documents/:id" element={<div>DOC DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new document/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Document name'), { target: { value: 'Vendor Agreement' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(screen.getByText('Vendor Agreement'));
    fireEvent.change(within(dialog).getByTestId('quill'), { target: { value: '<p>Body</p>' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('DOC DETAIL')).toBeInTheDocument());
  });

  it('cancels the new-document dialog', async () => {
    __setTableRows([]);
    renderWithProviders(<DocumentsListPage />);
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new document/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits the description and closes via the dialog backdrop handler', async () => {
    __setTableRows([]);
    renderWithProviders(<DocumentsListPage />);
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new document/i }));
    const dialog = await screen.findByRole('dialog');
    // Exercise the Description change handler.
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'A short summary' } });
    expect(within(dialog).getByLabelText('Description')).toHaveValue('A short summary');
    // Escape fires the Dialog onClose handler.
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refetches the table when create returns no id', async () => {
    __setTableRows([]);
    renderWithProviders(<DocumentsListPage />, {
      mocks: [createLegalDocumentMock({ id: null })],
    });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new document/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Document name'), { target: { value: 'Some Doc' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(screen.getByText('Vendor Agreement'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    // Create returned no id → dialog closes and the table refetch fires.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

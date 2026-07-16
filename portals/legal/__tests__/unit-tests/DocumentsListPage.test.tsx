import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import DocumentsListPage from '../../src/pages/documents/DocumentsListPage';
import {
  CREATE_LEGAL_DOCUMENT,
  LEGAL_DOCUMENTS_TABLE,
  type LegalDocumentListItem,
} from '../../src/graphql/documents';
import { renderWithProviders } from './testkit';

vi.mock('react-quill', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <textarea data-testid="quill" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const doc = (id: string, name: string): LegalDocumentListItem & { __typename: string } => ({
  __typename: 'LegalDocument',
  id,
  name,
  document_type: 'Privacy Policy',
  description: 'desc',
  created_by_name: 'Sam',
  updated_by_name: 'Sam',
  version_count: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const tableMock = (
  docs: any[],
  match: (variables: Record<string, any>) => boolean = () => true
) => ({
  request: { query: LEGAL_DOCUMENTS_TABLE },
  variableMatcher: match,
  result: { data: { legalDocumentsTable: { total: docs.length, rows: docs } } },
});

describe('DocumentsListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<DocumentsListPage />, { mocks: [tableMock([])] });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
  });

  it('lists documents and opens a detail row', async () => {
    const noEditor = { ...doc('d2', 'Orphan Doc'), updated_by_name: '' };
    renderWithProviders(<></>, {
      mocks: [tableMock([doc('d1', 'Master NDA'), noEditor])],
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

  it('filters by search text via the table toolbar', async () => {
    renderWithProviders(<DocumentsListPage />, {
      mocks: [
        tableMock([doc('d1', 'Master NDA')], (v) => !v.query.search),
        tableMock([doc('d2', 'Privacy Policy Doc')], (v) => v.query.search === 'privacy'),
      ],
    });
    await waitFor(() => expect(screen.getByText('Master NDA')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: 'Search name, type or description' }), {
      target: { value: 'privacy' },
    });
    await waitFor(() => expect(screen.getByText('Privacy Policy Doc')).toBeInTheDocument(), {
      timeout: 2000,
    });
  });

  it('creates a document and navigates to it', async () => {
    renderWithProviders(<></>, {
      mocks: [
        tableMock([]),
        { request: { query: CREATE_LEGAL_DOCUMENT }, variableMatcher: () => true, result: { data: { createLegalDocument: { id: 'new-1' } } } },
      ],
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
    renderWithProviders(<DocumentsListPage />, { mocks: [tableMock([])] });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new document/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits the description and closes via the dialog backdrop handler', async () => {
    renderWithProviders(<DocumentsListPage />, { mocks: [tableMock([])] });
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
    renderWithProviders(<DocumentsListPage />, {
      mocks: [
        tableMock([]),
        { request: { query: CREATE_LEGAL_DOCUMENT }, variableMatcher: () => true, result: { data: { createLegalDocument: { id: null } } } },
        tableMock([doc('d9', 'Created elsewhere')]),
      ],
    });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new document/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Document name'), { target: { value: 'Some Doc' } });
    fireEvent.mouseDown(within(dialog).getByRole('combobox'));
    fireEvent.click(screen.getByText('Vendor Agreement'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('Created elsewhere')).toBeInTheDocument());
  });
});

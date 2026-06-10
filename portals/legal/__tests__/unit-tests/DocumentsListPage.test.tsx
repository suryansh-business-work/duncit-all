import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import DocumentsListPage from '../../src/pages/documents/DocumentsListPage';
import { CREATE_LEGAL_DOCUMENT, LEGAL_DOCUMENTS, type LegalDocumentListItem } from '../../src/graphql/documents';
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

const listMock = (filter: any, docs: any[]) => ({
  request: { query: LEGAL_DOCUMENTS, variables: { filter } },
  result: { data: { legalDocuments: docs } },
});

describe('DocumentsListPage', () => {
  it('shows an empty state', async () => {
    renderWithProviders(<DocumentsListPage />, { mocks: [listMock(undefined, [])] });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
  });

  it('lists documents and opens a detail row', async () => {
    const noEditor = { ...doc('d2', 'Orphan Doc'), updated_by_name: '' };
    renderWithProviders(<></>, {
      mocks: [listMock(undefined, [doc('d1', 'Master NDA'), noEditor])],
      initialEntries: ['/documents'],
      routes: (
        <>
          <Route path="/documents" element={<DocumentsListPage />} />
          <Route path="/documents/:id" element={<div>DOC DETAIL</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Master NDA')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Master NDA'));
    expect(screen.getByText('DOC DETAIL')).toBeInTheDocument();
  });

  it('filters by search text', async () => {
    renderWithProviders(<DocumentsListPage />, {
      mocks: [
        listMock(undefined, [doc('d1', 'Master NDA')]),
        listMock({ search: 'privacy' }, [doc('d2', 'Privacy Policy Doc')]),
      ],
    });
    await waitFor(() => expect(screen.getByText('Master NDA')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'privacy' } });
    await waitFor(() => expect(screen.getByText('Privacy Policy Doc')).toBeInTheDocument());
  });

  it('creates a document and navigates to it', async () => {
    renderWithProviders(<></>, {
      mocks: [
        listMock(undefined, []),
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
    renderWithProviders(<DocumentsListPage />, { mocks: [listMock(undefined, [])] });
    await waitFor(() => expect(screen.getByText(/no documents yet/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new document/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refetches the list when create returns no id', async () => {
    renderWithProviders(<DocumentsListPage />, {
      mocks: [
        listMock(undefined, []),
        { request: { query: CREATE_LEGAL_DOCUMENT }, variableMatcher: () => true, result: { data: { createLegalDocument: { id: null } } } },
        listMock(undefined, [doc('d9', 'Created elsewhere')]),
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

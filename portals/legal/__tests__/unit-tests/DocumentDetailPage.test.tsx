import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import DocumentDetailPage from '../../src/pages/documents/DocumentDetailPage';
import {
  CLONE_LEGAL_DOCUMENT,
  DELETE_LEGAL_DOCUMENT,
  LEGAL_DOCUMENT,
  UPDATE_LEGAL_DOCUMENT,
} from '../../src/graphql/documents';
import { renderWithProviders } from './testkit';

vi.mock('react-quill', () => ({
  default: ({ value, onChange }: any) => (
    <textarea data-testid="quill" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const ID = 'doc-1';

const detail = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'LegalDocument',
  id: ID,
  name: 'Privacy Policy',
  document_type: 'Privacy Policy',
  description: 'Our privacy policy',
  content: '<p>Body text</p>',
  created_by_name: 'Sam',
  updated_by_name: 'Sam',
  version_count: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  versions: [
    {
      id: 'v1',
      name: 'Privacy Policy',
      document_type: 'Privacy Policy',
      description: '',
      content: '<p>old</p>',
      updated_by_name: 'Sam',
      created_at: new Date().toISOString(),
    },
    {
      id: 'v2',
      name: 'Privacy Policy',
      document_type: 'Privacy Policy',
      description: '',
      content: '<p>older</p>',
      updated_by_name: '',
      created_at: new Date().toISOString(),
    },
  ],
  ...overrides,
});

const docMock = (doc: any) => ({
  request: { query: LEGAL_DOCUMENT, variables: { id: ID } },
  result: { data: { legalDocument: doc } },
});

const renderAt = (mocks: any[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/documents/${ID}`],
    routes: (
      <>
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/documents" element={<div>DOC LIST</div>} />
        <Route path="/documents/new-1" element={<div>CLONED DOC</div>} />
      </>
    ),
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DocumentDetailPage', () => {
  it('shows a not-found message', async () => {
    renderAt([docMock(null)]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it('renders the read view with content and update history', async () => {
    renderAt([docMock(detail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    expect(screen.getByText('Update history')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
  });

  it('renders empty-content + empty-history hints', async () => {
    renderAt([docMock(detail({ content: '', description: '', versions: [] }))]);
    await waitFor(() => expect(screen.getByText(/no content yet/i)).toBeInTheDocument());
    expect(screen.getByText(/no edits yet/i)).toBeInTheDocument();
  });

  it('navigates back to the documents list', async () => {
    renderAt([docMock(detail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('DOC LIST')).toBeInTheDocument();
  });

  it('edits and saves the document', async () => {
    renderAt([
      docMock(detail()),
      { request: { query: UPDATE_LEGAL_DOCUMENT }, variableMatcher: () => true, result: { data: { updateLegalDocument: { id: ID, version_count: 2, updated_at: 'now' } } } },
      docMock(detail({ content: '<p>Updated body</p>', version_count: 2 })),
    ]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    // Touch every editable field to exercise their change handlers.
    fireEvent.change(screen.getByLabelText('Document name'), { target: { value: 'Privacy Policy v2' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated description' } });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Cookie Policy'));
    fireEvent.change(screen.getByTestId('quill'), { target: { value: '<p>Updated body</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Updated body')).toBeInTheDocument());
  });

  it('cancels an edit', async () => {
    renderAt([docMock(detail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
  });

  it('deletes the document', async () => {
    renderAt([
      docMock(detail()),
      { request: { query: DELETE_LEGAL_DOCUMENT, variables: { id: ID } }, result: { data: { deleteLegalDocument: true } } },
    ]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByText('DOC LIST')).toBeInTheDocument());
  });

  it('clones the document', async () => {
    renderAt([
      docMock(detail()),
      { request: { query: CLONE_LEGAL_DOCUMENT, variables: { id: ID } }, result: { data: { cloneLegalDocument: { id: 'new-1' } } } },
    ]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /clone/i }));
    await waitFor(() => expect(screen.getByText('CLONED DOC')).toBeInTheDocument());
  });

  it('prints, downloads and copies the document', async () => {
    const win = {
      document: { body: { innerHTML: '' }, close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    };
    vi.stubGlobal('open', vi.fn(() => win));
    (URL as any).createObjectURL = vi.fn(() => 'blob:x');
    (URL as any).revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const writeText = vi.fn().mockResolvedValue(undefined);
    (navigator as any).clipboard = { writeText };

    renderAt([docMock(detail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(win.print).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /download/i }));
    expect((URL as any).createObjectURL).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Body text'));
  });

  it('reports when copying fails', async () => {
    (navigator as any).clipboard = { writeText: vi.fn().mockRejectedValue(new Error('denied')) };
    renderAt([docMock(detail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(screen.getByText(/could not copy/i)).toBeInTheDocument());
  });

  it('cancels a pending delete', async () => {
    renderAt([docMock(detail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

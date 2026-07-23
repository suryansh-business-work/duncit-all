import { afterEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import DocumentDetailPage from '../../src/pages/documents/DocumentDetailPage';
import { renderWithProviders } from '../testkit';
import {
  cloneLegalDocumentMock,
  deleteLegalDocumentMock,
  legalDocumentMock,
  makeLegalDocumentDetail,
  updateLegalDocumentMock,
} from '../mocks';

vi.mock('react-quill', () => ({
  default: ({ value, onChange }: any) => (
    <textarea data-testid="quill" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const ID = 'doc-1';

const renderAt = (mocks: MockedResponse[]) =>
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
    renderAt([legalDocumentMock(null)]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it('renders the read view with content and update history', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    expect(screen.getByText('Update history')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
  });

  it('renders empty-content + empty-history hints', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail({ content: '', description: '', versions: [] }))]);
    await waitFor(() => expect(screen.getByText(/no content yet/i)).toBeInTheDocument());
    expect(screen.getByText(/no edits yet/i)).toBeInTheDocument();
  });

  it('navigates back to the documents list', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('DOC LIST')).toBeInTheDocument();
  });

  it('edits and saves the document', async () => {
    renderAt([
      legalDocumentMock(makeLegalDocumentDetail()),
      updateLegalDocumentMock(ID),
      legalDocumentMock(makeLegalDocumentDetail({ content: '<p>Updated body</p>', version_count: 2 })),
    ]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    // Touch every editable field to exercise their change handlers.
    fireEvent.change(screen.getByLabelText(/^Document name/), { target: { value: 'Privacy Policy v2' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated description' } });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Cookie Policy'));
    fireEvent.change(screen.getByTestId('quill'), { target: { value: '<p>Updated body</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Updated body')).toBeInTheDocument());
  });

  it('cancels an edit', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
  });

  it('deletes the document', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail()), deleteLegalDocumentMock(ID)]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByText('DOC LIST')).toBeInTheDocument());
  });

  it('clones the document', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail()), cloneLegalDocumentMock({ id: 'new-1' }, ID)]);
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

    renderAt([legalDocumentMock(makeLegalDocumentDetail())]);
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
    renderAt([legalDocumentMock(makeLegalDocumentDetail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(screen.getByText(/could not copy/i)).toBeInTheDocument());
  });

  it('cancels a pending delete', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('falls back to an em-dash when the document has no last editor', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail({ updated_by_name: '' }))]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    // `doc.updated_by_name || '—'` renders the dash for an empty editor name.
    expect(screen.getByText(/Updated by —/)).toBeInTheDocument();
  });

  it('dismisses the delete dialog and the toast via their close handlers', async () => {
    renderAt([legalDocumentMock(makeLegalDocumentDetail())]);
    await waitFor(() => expect(screen.getByText('Body text')).toBeInTheDocument());
    // Backdrop/Escape close on the confirm dialog fires the Dialog onClose.
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Trigger a toast, then let its Snackbar onClose fire via Escape.
    (navigator as any).clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument());
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByText(/copied to clipboard/i)).not.toBeInTheDocument());
  });
});

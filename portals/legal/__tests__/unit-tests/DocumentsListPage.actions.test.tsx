import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import DocumentsListPage from '../../src/pages/documents/DocumentsListPage';
import type { SignableRecord } from '../../src/components/signing';
import { renderWithProviders } from '../testkit';
import {
  makeLegalDocumentListItem,
  setLegalDocumentActiveMock,
  updateLegalDocumentMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

interface SignStubProps {
  record: SignableRecord | null;
  onClose: () => void;
  onSigned: () => void;
}

/**
 * The signing workflow has its own suite; here it only has to show what the
 * page handed it and hand back the two outcomes the page listens for.
 */
vi.mock(import('../../src/components/signing'), async (importOriginal) => ({
  ...(await importOriginal()),
  SignWorkflowDialog: ({ record, onClose, onSigned }: Readonly<SignStubProps>) =>
    record ? (
      <div data-testid="sign-stub">
        <span>
          {record.title} · {record.signing_status}
        </span>
        <button type="button" onClick={onSigned}>
          stub-signed
        </button>
        <button type="button" onClick={onClose}>
          stub-close
        </button>
      </div>
    ) : null,
}));

const DRAFT = makeLegalDocumentListItem({ id: 'd1', name: 'Master NDA' });
const EXECUTED = makeLegalDocumentListItem({
  id: 'd2',
  document_no: 'DOC-000008',
  name: 'Vendor Agreement — Smash Arena',
  signing_status: 'SIGNED',
  signed_at: '2026-03-05T10:00:00.000Z',
  is_locked: true,
});

const renderList = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: ['/documents'],
    routes: (
      <>
        <Route path="/documents" element={<DocumentsListPage />} />
        <Route path="/documents/:id" element={<div>DOC DETAIL</div>} />
      </>
    ),
  });

const rows = async () => {
  await screen.findByText('Master NDA');
  return screen.getAllByTestId('table-row');
};

beforeEach(() => {
  __setTableRows([DRAFT, EXECUTED]);
});

describe('DocumentsListPage — row actions', () => {
  it('shows which documents are signed and locks those against edits', async () => {
    renderList();
    const [draft, executed] = await rows();

    expect(within(draft).getAllByText('Unsigned').length).toBeGreaterThan(0);
    expect(within(draft).getByRole('button', { name: 'Edit' })).toBeEnabled();
    expect(within(executed).getAllByText('Signed').length).toBeGreaterThan(0);
    expect(within(executed).getByRole('button', { name: 'Edit' })).toBeDisabled();
  });

  it('edits a title from the row without opening the document', async () => {
    renderList([updateLegalDocumentMock('d1')]);
    const [draft] = await rows();
    fireEvent.click(within(draft).getByRole('button', { name: 'Edit' }));

    const dialog = await screen.findByRole('dialog');
    const title = within(dialog).getByLabelText(/^Title/);
    expect(title).toHaveValue('Master NDA');
    fireEvent.change(title, { target: { value: 'Master NDA 2026' } });
    // What the server will list once the rename lands.
    __setTableRows([{ ...DRAFT, name: 'Master NDA 2026' }, EXECUTED]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Saved, so the table re-read and shows the new title…
    expect(await screen.findByText('Master NDA 2026')).toBeInTheDocument();
    // …and the row's own click never fired underneath the dialog.
    expect(screen.queryByText('DOC DETAIL')).not.toBeInTheDocument();
  });

  it('opens the signing workflow with the document mapped onto it', async () => {
    renderList();
    const [, executed] = await rows();
    fireEvent.click(within(executed).getByRole('button', { name: 'Sign' }));

    const stub = await screen.findByTestId('sign-stub');
    expect(stub).toHaveTextContent('Vendor Agreement — Smash Arena · SIGNED');
    expect(screen.queryByText('DOC DETAIL')).not.toBeInTheDocument();

    // A signature re-reads the list…
    __setTableRows([EXECUTED]);
    fireEvent.click(within(stub).getByRole('button', { name: 'stub-signed' }));
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    // …and closing hands the record back.
    fireEvent.click(within(stub).getByRole('button', { name: 'stub-close' }));
    expect(screen.queryByTestId('sign-stub')).not.toBeInTheDocument();
  });

  it('switches a document off straight from the table and re-reads it', async () => {
    renderList([setLegalDocumentActiveMock('d1', false)]);
    const [draft] = await rows();
    // The column shows the word twice: once as its text value, once beside the switch.
    expect(within(draft).getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
    __setTableRows([{ ...DRAFT, is_active: false }, EXECUTED]);

    fireEvent.click(within(draft).getByRole('switch', { name: 'Active' }));

    expect((await screen.findAllByText('Inactive')).length).toBeGreaterThan(0);
    expect(screen.queryByText('DOC DETAIL')).not.toBeInTheDocument();
  });
});

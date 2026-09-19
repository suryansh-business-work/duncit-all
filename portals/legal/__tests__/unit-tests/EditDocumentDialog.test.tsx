import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import EditDocumentDialog from '../../src/pages/documents/EditDocumentDialog';
import type { LegalDocumentListItem } from '../../src/graphql/documents';
import { renderWithProviders } from '../testkit';
import {
  makeLegalDocumentListItem,
  setLegalDocumentActiveMock,
  updateLegalDocumentErrorMock,
  updateLegalDocumentMock,
  type LegalDocumentListItemMock,
} from '../mocks';

/**
 * The quick edit behind a table row: the title, and whether the app shows the
 * document at all. A signed document keeps its title but can still be hidden.
 */
interface HarnessProps {
  initial: LegalDocumentListItemMock;
  onClose: () => void;
  onSaved: () => void;
}

/** Holds the row the way the list page does, so closing really lets it go. */
function Harness({ initial, onClose, onSaved }: Readonly<HarnessProps>) {
  const [doc, setDoc] = useState<LegalDocumentListItem | null>(initial);
  return (
    <EditDocumentDialog
      doc={doc}
      onClose={() => {
        setDoc(null);
        onClose();
      }}
      onSaved={onSaved}
    />
  );
}

const DRAFT = makeLegalDocumentListItem({ id: 'd1', name: 'Master NDA' });
const SIGNED = makeLegalDocumentListItem({
  id: 'd2',
  document_no: 'DOC-000008',
  name: 'Vendor Agreement — Smash Arena',
  signing_status: 'SIGNED',
  is_locked: true,
});

const open = (initial: LegalDocumentListItemMock, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  renderWithProviders(<Harness initial={initial} onClose={onClose} onSaved={onSaved} />, { mocks });
  return { onClose, onSaved, dialog: screen.getByRole('dialog') };
};

describe('EditDocumentDialog', () => {
  it('opens on the row it was given', () => {
    const { dialog } = open(DRAFT);
    expect(within(dialog).getByText('DOC-000007')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Title/)).toHaveValue('Master NDA');
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('renames the document, then hands back to the list', async () => {
    const { dialog, onClose, onSaved } = open(DRAFT, [updateLegalDocumentMock('d1')]);
    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: '  Master NDA 2026 ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('will not apply a blank title and says what the title is for', () => {
    const { dialog } = open(DRAFT);
    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: '   ' } });
    expect(within(dialog).getByText('The name this document is listed and searched by.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it("keeps the dialog open with the server's reason, and clears it on the next edit", async () => {
    const { dialog, onSaved } = open(DRAFT, [
      updateLegalDocumentErrorMock('That title is already used by DOC-000009'),
    ]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));

    expect(await within(dialog).findByText('That title is already used by DOC-000009')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: 'Master NDA v2' } });
    expect(within(dialog).queryByText('That title is already used by DOC-000009')).not.toBeInTheDocument();
  });

  it('locks the title of a signed document but still lets it be hidden', async () => {
    const { dialog, onSaved } = open(SIGNED, [setLegalDocumentActiveMock('d2', false)]);
    expect(within(dialog).getByText(/This document is signed, so its details are locked/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Title/)).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Apply' })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('switch', { name: 'Active' }));

    // The switch wrote through its own mutation; the dialog flips its label
    // and tells the list to re-read.
    expect(await within(dialog).findByText('Inactive')).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('closes from the corner icon', async () => {
    const first = open(DRAFT);
    fireEvent.click(within(first.dialog).getAllByRole('button', { name: 'Close' })[0]);
    expect(first.onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes from the Close button in the actions', () => {
    const { dialog, onClose } = open(DRAFT);
    const buttons = within(dialog).getAllByRole('button', { name: 'Close' });
    fireEvent.click(buttons.at(-1) as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const { dialog, onClose } = open(DRAFT);
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

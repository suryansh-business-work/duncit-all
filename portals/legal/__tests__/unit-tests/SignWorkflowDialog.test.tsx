import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifySuccess } from '@duncit/dialogs';
import { SignWorkflowDialog, type SignableRecord } from '../../src/components/signing';
import { DOCUMENT_SIGNING_OPS } from '../../src/graphql/signing';
import { renderWithProviders } from '../testkit';
import {
  PDF_BASE64,
  documentPdfMock,
  shareDocumentErrorMock,
  shareDocumentMock,
  signDocumentErrorMock,
  signDocumentMock,
  signatureMethodsMock,
} from '../mocks';

vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
}));

/**
 * Preview → sign → send, for one record. The dialog drives documents and
 * contracts alike through the operations it is handed; the document set is
 * used here.
 */
const PNG = 'data:image/png;base64,U0lHTkFUVVJF';
const UNSIGNED: SignableRecord = { id: 'doc-1', title: 'Master NDA 2026', signing_status: 'UNSIGNED' };
const SIGNED: SignableRecord = { ...UNSIGNED, signing_status: 'SIGNED' };
const SIGNER = {
  full_name: 'Asha Rao',
  designation: 'Head of Partnerships',
  initials: 'ABCDEFGHIJKL',
  signature_image: PNG,
  signature_method: 'TYPE' as const,
};

interface HarnessProps {
  initial: SignableRecord;
  onClose: () => void;
  onSigned: () => void;
}

/** Holds the record the way a page does, so Close really takes it away. */
function Harness({ initial, onClose, onSigned }: Readonly<HarnessProps>) {
  const [record, setRecord] = useState<SignableRecord | null>(initial);
  return (
    <SignWorkflowDialog
      record={record}
      ops={DOCUMENT_SIGNING_OPS}
      onClose={() => {
        setRecord(null);
        onClose();
      }}
      onSigned={onSigned}
    />
  );
}

const open = (initial: SignableRecord, mocks: MockedResponse[]) => {
  const onClose = vi.fn();
  const onSigned = vi.fn();
  renderWithProviders(<Harness initial={initial} onClose={onClose} onSigned={onSigned} />, { mocks });
  return { onClose, onSigned };
};

const fillSignature = () => {
  fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: `  ${SIGNER.full_name} ` } });
  fireEvent.change(screen.getByLabelText(/^Designation/), { target: { value: SIGNER.designation } });
  // Initials are capped at twelve characters as they are typed.
  fireEvent.change(screen.getByLabelText(/^Initials/), { target: { value: 'ABCDEFGHIJKLMNOP' } });
  fireEvent.change(screen.getByLabelText('Type your signature'), { target: { value: SIGNER.full_name } });
};

let anchors: { download: string; href: string }[];

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillText: vi.fn(),
  } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(PNG);
  anchors = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function record(this: HTMLAnchorElement) {
    anchors.push({ download: this.download, href: this.href });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SignWorkflowDialog — an unsigned record', () => {
  it('previews the draft, signs it and sends the executed copy on', async () => {
    const onSignCall = vi.fn();
    const onShareCall = vi.fn();
    const { onSigned } = open(UNSIGNED, [
      signatureMethodsMock(['TYPE']),
      documentPdfMock('doc-1'),
      signDocumentMock(SIGNER, 'doc-1', onSignCall),
      shareDocumentMock('legal@smasharena.in', 'Countersigned copy attached.', 'doc-1', onShareCall),
    ]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Master NDA 2026')).toBeInTheDocument();
    expect(within(dialog).getByText('Unsigned')).toBeInTheDocument();
    // The PDF is still on its way.
    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();

    const download = within(dialog).getByRole('button', { name: 'Download the draft' });
    await waitFor(() => expect(download).toBeEnabled());
    expect(dialog.querySelector('object')).toHaveAttribute(
      'data',
      `data:application/pdf;base64,${PDF_BASE64}`,
    );
    fireEvent.click(download);
    expect(anchors).toEqual([
      { download: 'Master-NDA-2026.pdf', href: `data:application/pdf;base64,${PDF_BASE64}` },
    ]);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Signature' }));
    const sign = within(dialog).getByRole('button', { name: 'Sign it' });
    expect(sign).toBeDisabled();
    fillSignature();
    expect(screen.getByLabelText(/^Initials/)).toHaveValue(SIGNER.initials);
    expect(sign).toBeEnabled();
    fireEvent.click(sign);

    expect(await within(dialog).findByText('This is signed and locked. It can no longer be edited.')).toBeInTheDocument();
    expect(onSignCall).toHaveBeenCalledTimes(1);
    expect(onSigned).toHaveBeenCalledTimes(1);
    expect(notifySuccess).toHaveBeenCalledWith('Signed');

    const send = within(dialog).getByRole('button', { name: 'Email' });
    const to = within(dialog).getByLabelText('Send to');
    fireEvent.change(to, { target: { value: 'legal@smasharena' } });
    expect(send).toBeDisabled();
    fireEvent.change(to, { target: { value: ' legal@smasharena.in ' } });
    fireEvent.change(within(dialog).getByLabelText('Message (optional)'), {
      target: { value: 'Countersigned copy attached. ' },
    });
    expect(send).toBeEnabled();
    fireEvent.click(send);

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Sent to legal@smasharena.in'));
    expect(onShareCall).toHaveBeenCalledTimes(1);
    // Sent: the form is ready for the next address.
    expect(to).toHaveValue('');
  });

  it('steps back from the signature to the preview', async () => {
    open(UNSIGNED, [signatureMethodsMock(['TYPE']), documentPdfMock('doc-1')]);
    fireEvent.click(screen.getByRole('button', { name: 'Signature' }));
    expect(await screen.findByLabelText(/^Full name/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.queryByLabelText(/^Full name/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Signature' })).toBeInTheDocument();
  });

  it("shows the server's refusal to take the signature", async () => {
    const { onSigned } = open(UNSIGNED, [
      signatureMethodsMock(['TYPE']),
      documentPdfMock('doc-1'),
      signDocumentErrorMock('The initials do not match the full name.'),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Signature' }));
    fillSignature();
    fireEvent.click(screen.getByRole('button', { name: 'Sign it' }));

    expect(await screen.findByText('The initials do not match the full name.')).toBeInTheDocument();
    expect(onSigned).not.toHaveBeenCalled();
    // Still on the signature step, so the signer can correct it.
    expect(screen.getByLabelText(/^Full name/)).toBeInTheDocument();
  });

  it('does not sign when Sign is pressed while the dialog is closing', async () => {
    const onSignCall = vi.fn();
    const { onClose, onSigned } = open(UNSIGNED, [
      signatureMethodsMock(['TYPE']),
      documentPdfMock('doc-1'),
      signDocumentMock(SIGNER, 'doc-1', onSignCall),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Signature' }));
    fillSignature();
    const sign = screen.getByRole('button', { name: 'Sign it' });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    // Fading out, the dialog has already let go of its record.
    expect(screen.getByText('Untitled')).toBeInTheDocument();
    fireEvent.click(sign);
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(onSignCall).not.toHaveBeenCalled();
    expect(onSigned).not.toHaveBeenCalled();
  });
});

describe('SignWorkflowDialog — a signed record', () => {
  it('opens straight on the send step with the signed copy to download', async () => {
    open(SIGNED, [signatureMethodsMock(['TYPE']), documentPdfMock('doc-1')]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Signed')).toBeInTheDocument();
    expect(await within(dialog).findByText('This is signed and locked. It can no longer be edited.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Signature' })).not.toBeInTheDocument();

    const download = within(dialog).getByRole('button', { name: 'Download the signed copy' });
    await waitFor(() => expect(download).toBeEnabled());
    fireEvent.click(download);
    expect(anchors[0]?.download).toBe('Master-NDA-2026-signed.pdf');
  });

  it("shows the server's refusal to send it", async () => {
    open(SIGNED, [
      signatureMethodsMock(['TYPE']),
      documentPdfMock('doc-1'),
      shareDocumentErrorMock('That mailbox is not accepting mail.'),
    ]);
    fireEvent.change(screen.getByLabelText('Send to'), { target: { value: 'legal@smasharena.in' } });
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));

    expect(await screen.findByText('That mailbox is not accepting mail.')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
    // Nothing went out, so the address stays for another try.
    expect(screen.getByLabelText('Send to')).toHaveValue('legal@smasharena.in');
  });

  it('does not send when Email is pressed while the dialog is closing', async () => {
    const onShareCall = vi.fn();
    const { onClose } = open(SIGNED, [
      signatureMethodsMock(['TYPE']),
      documentPdfMock('doc-1'),
      shareDocumentMock('legal@smasharena.in', '', 'doc-1', onShareCall),
    ]);
    fireEvent.change(screen.getByLabelText('Send to'), { target: { value: 'legal@smasharena.in' } });
    const send = screen.getByRole('button', { name: 'Email' });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(send);
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(onShareCall).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const { onClose } = open(SIGNED, [signatureMethodsMock(['TYPE']), documentPdfMock('doc-1')]);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

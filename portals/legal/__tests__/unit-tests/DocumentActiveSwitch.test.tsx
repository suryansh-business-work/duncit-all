import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import DocumentActiveSwitch from '../../src/pages/documents/DocumentActiveSwitch';
import { renderWithProviders } from '../testkit';
import { setLegalDocumentActiveErrorMock, setLegalDocumentActiveMock } from '../mocks';

vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

/**
 * Show or hide a document from wherever it is listed, writing on the spot.
 * (That the press never reaches the row underneath is asserted where there is
 * a row: DocumentsListPage.actions.)
 */
const renderSwitch = (isActive: boolean, mocks: MockedResponse[], onChanged?: () => void) => {
  renderWithProviders(
    <DocumentActiveSwitch documentId="doc-1" isActive={isActive} onChanged={onChanged} />,
    { mocks },
  );
  return screen.getByRole('switch', { name: 'Active' });
};

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('DocumentActiveSwitch', () => {
  it('takes an active document down and tells the list to re-read', async () => {
    const onChanged = vi.fn();
    const toggle = renderSwitch(true, [setLegalDocumentActiveMock('doc-1', false)], onChanged);
    expect(screen.getByText('Active')).toBeInTheDocument();

    fireEvent.click(toggle);
    // Held while the write is in flight, so a second press cannot race it.
    expect(toggle).toBeDisabled();

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Document is now inactive'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('puts an inactive document back up', async () => {
    const onChanged = vi.fn();
    const toggle = renderSwitch(false, [setLegalDocumentActiveMock('doc-1', true)], onChanged);
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    fireEvent.click(toggle);

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Document is now active'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('works where nobody listens for the change', async () => {
    const toggle = renderSwitch(false, [setLegalDocumentActiveMock('doc-1', true)]);
    fireEvent.click(toggle);
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Document is now active'));
  });

  it("reports the server's refusal and leaves the list alone", async () => {
    const onChanged = vi.fn();
    const toggle = renderSwitch(true, [setLegalDocumentActiveErrorMock('doc-1', false)], onChanged);

    fireEvent.click(toggle);

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Only Legal can take a document down'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });
});

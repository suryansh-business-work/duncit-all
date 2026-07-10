import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { TicketAttachments } from '@/components/support/TicketAttachments';
import { useSupportUpload } from '@/hooks/useSupportUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupportUpload', () => ({ useSupportUpload: jest.fn() }));
const mockedUpload = useSupportUpload as jest.Mock;
const pickAndUpload = jest.fn();

beforeEach(() => {
  pickAndUpload.mockReset();
  mockedUpload.mockReturnValue({ uploading: false, error: '', pickAndUpload });
});

function Harness({ initial = [] as string[] }: Readonly<{ initial?: string[] }>) {
  const [attachments, setAttachments] = useState<string[]>(initial);
  return <TicketAttachments attachments={attachments} onChange={setAttachments} />;
}

describe('TicketAttachments', () => {
  it('uses the "Add files" wording (renamed from "Add image")', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByText('Attach files (0/5)')).toBeOnTheScreen();
    expect(screen.getByText('Add files')).toBeOnTheScreen();
    expect(screen.getByTestId('ticket-attach-add')).toHaveProp('aria-label', 'Add files');
    expect(screen.queryByText('Add image')).toBeNull();
  });

  it('adds an uploaded image as a preview', async () => {
    pickAndUpload.mockResolvedValue('https://img/1.jpg');
    renderWithProviders(<Harness />);
    expect(screen.queryByTestId('ticket-attach-0')).toBeNull();
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    await waitFor(() => expect(screen.getByTestId('ticket-attach-0')).toBeOnTheScreen());
  });

  it('adds a document/video as a type-aware file card', async () => {
    pickAndUpload.mockResolvedValue('https://img/spec.pdf');
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    // Non-image renders the AttachmentView file card, not a thumbnail.
    await waitFor(() =>
      expect(screen.getByTestId('support-attach-https://img/spec.pdf')).toBeOnTheScreen(),
    );
  });

  it('ignores a cancelled / too-large pick', async () => {
    pickAndUpload.mockResolvedValue(null);
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    await waitFor(() => expect(pickAndUpload).toHaveBeenCalled());
    expect(screen.queryByTestId('ticket-attach-0')).toBeNull();
  });

  it('removes a preview', () => {
    renderWithProviders(<Harness initial={['https://img/1.jpg']} />);
    expect(screen.getByTestId('ticket-attach-0')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ticket-attach-remove-0'));
    expect(screen.queryByTestId('ticket-attach-0')).toBeNull();
  });

  it('blocks adding at the five-file cap', () => {
    renderWithProviders(
      <TicketAttachments attachments={['1', '2', '3', '4', '5']} onChange={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    expect(pickAndUpload).not.toHaveBeenCalled();
  });

  it('shows the uploading state and blocks adding', () => {
    mockedUpload.mockReturnValue({ uploading: true, error: '', pickAndUpload });
    renderWithProviders(<Harness />);
    expect(screen.getByText('Uploading…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    expect(pickAndUpload).not.toHaveBeenCalled();
  });
});

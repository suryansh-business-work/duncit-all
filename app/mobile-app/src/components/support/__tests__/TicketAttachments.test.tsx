import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { TicketAttachments } from '@/components/support/TicketAttachments';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useMediaUpload', () => ({ useMediaUpload: jest.fn() }));
const mockedUpload = useMediaUpload as jest.Mock;
const pickAndUpload = jest.fn();

beforeEach(() => {
  pickAndUpload.mockReset();
  mockedUpload.mockReturnValue({ uploading: false, error: undefined, pickAndUpload });
});

function Harness({ initial = [] as string[] }: Readonly<{ initial?: string[] }>) {
  const [attachments, setAttachments] = useState<string[]>(initial);
  return <TicketAttachments attachments={attachments} onChange={setAttachments} />;
}

describe('TicketAttachments', () => {
  it('adds an uploaded image as a thumbnail', async () => {
    pickAndUpload.mockResolvedValue('https://img/1.jpg');
    renderWithProviders(<Harness />);
    expect(screen.queryByTestId('ticket-attach-0')).toBeNull();
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    await waitFor(() => expect(screen.getByTestId('ticket-attach-0')).toBeOnTheScreen());
  });

  it('ignores a cancelled pick', async () => {
    pickAndUpload.mockResolvedValue(null);
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    await waitFor(() => expect(pickAndUpload).toHaveBeenCalled());
    expect(screen.queryByTestId('ticket-attach-0')).toBeNull();
  });

  it('removes a thumbnail', () => {
    renderWithProviders(<Harness initial={['https://img/1.jpg']} />);
    expect(screen.getByTestId('ticket-attach-0')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ticket-attach-remove-0'));
    expect(screen.queryByTestId('ticket-attach-0')).toBeNull();
  });

  it('blocks adding at the five-image cap', () => {
    renderWithProviders(
      <TicketAttachments attachments={['1', '2', '3', '4', '5']} onChange={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    expect(pickAndUpload).not.toHaveBeenCalled();
  });

  it('shows the uploading state and blocks adding', () => {
    mockedUpload.mockReturnValue({ uploading: true, error: undefined, pickAndUpload });
    renderWithProviders(<Harness />);
    expect(screen.getByText('Uploading…')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ticket-attach-add'));
    expect(pickAndUpload).not.toHaveBeenCalled();
  });
});

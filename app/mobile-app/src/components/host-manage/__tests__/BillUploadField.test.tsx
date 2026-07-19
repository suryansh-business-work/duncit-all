import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { BillUploadField } from '@/components/host-manage/BillUploadField';
import { useSupportUpload } from '@/hooks/useSupportUpload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useSupportUpload', () => ({ useSupportUpload: jest.fn() }));
const mockedUpload = useSupportUpload as jest.Mock;

function Harness({ initial = '' }: Readonly<{ initial?: string }>) {
  const [value, setValue] = useState(initial);
  return <BillUploadField value={value} onChange={setValue} />;
}

const api = (over: Record<string, unknown> = {}) => ({
  uploading: false,
  error: '',
  pickAndUpload: jest.fn().mockResolvedValue('https://cdn/bill.pdf'),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('BillUploadField', () => {
  it('uploads a bill from the device and shows a preview', async () => {
    mockedUpload.mockReturnValue(api());
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('bill-upload-add'));
    await waitFor(() => expect(screen.getByTestId('bill-preview')).toBeOnTheScreen());
  });

  it('ignores a cancelled upload', async () => {
    const hook = api({ pickAndUpload: jest.fn().mockResolvedValue(null) });
    mockedUpload.mockReturnValue(hook);
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('bill-upload-add'));
    await waitFor(() => expect(hook.pickAndUpload).toHaveBeenCalled());
    expect(screen.queryByTestId('bill-preview')).toBeNull();
  });

  it('previews an image bill and removes it', () => {
    mockedUpload.mockReturnValue(api());
    renderWithProviders(<Harness initial="https://cdn/bill.jpg" />);
    expect(screen.getByTestId('bill-preview')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('bill-remove'));
    expect(screen.queryByTestId('bill-preview')).toBeNull();
  });

  it('previews a non-image (PDF) bill', () => {
    mockedUpload.mockReturnValue(api());
    renderWithProviders(<BillUploadField value="https://cdn/bill.pdf" onChange={jest.fn()} />);
    expect(screen.getByTestId('bill-preview')).toBeOnTheScreen();
  });

  it('shows uploading, upload-error and validation-error states', () => {
    mockedUpload.mockReturnValue(
      api({ uploading: true, error: 'File is too large (max 100 MB).' }),
    );
    renderWithProviders(
      <BillUploadField value="" onChange={jest.fn()} error="Upload the venue bill" />,
    );
    expect(screen.getByText('Uploading…')).toBeOnTheScreen();
    expect(screen.getByTestId('bill-upload-error')).toBeOnTheScreen();
    expect(screen.getByTestId('bill_url-error')).toBeOnTheScreen();
    // While uploading, the add control is inert.
    fireEvent.press(screen.getByTestId('bill-upload-add'));
  });
});

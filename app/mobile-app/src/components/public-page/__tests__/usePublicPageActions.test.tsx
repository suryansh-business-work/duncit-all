import { act, renderHook } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { usePublicPageActions } from '@/components/public-page/usePublicPageActions';
import {
  fetchPosterBase64,
  fetchTableLabelBase64,
  shareBase64File,
} from '@/components/public-page/publicPageRequests';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('@/components/public-page/publicPageRequests', () => ({
  fetchPosterBase64: jest.fn(),
  fetchTableLabelBase64: jest.fn(),
  shareBase64File: jest.fn(),
  qrBase64: (url: string) => url.replace('data:image/png;base64,', ''),
}));

const mockCopy = Clipboard.setStringAsync as jest.Mock;
const mockPoster = fetchPosterBase64 as jest.Mock;
const mockLabel = fetchTableLabelBase64 as jest.Mock;
const mockShareFile = shareBase64File as jest.Mock;

const link = {
  url: 'https://duncit.example/p/jam-night',
  qr_data_url: 'data:image/png;base64,QUJD',
} as never;

const FOOD_HEADLINE = 'Scan to see the Menu & pods happening here';

function setup(withLink = true, kind: 'VENUE' | 'HOST' = 'VENUE', offersFood = false) {
  return renderHook(() =>
    usePublicPageActions(kind, 'ref-1', 'Jam Night', withLink ? link : null, offersFood),
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  mockCopy.mockReset().mockResolvedValue(undefined);
  mockPoster.mockReset();
  mockLabel.mockReset();
  mockShareFile.mockReset();
  jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('usePublicPageActions', () => {
  it('copies the link, says so, and clears the notice after its time', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.copy();
    });
    expect(mockCopy).toHaveBeenCalledWith('https://duncit.example/p/jam-night');
    expect(result.current.notice?.tone).toBe('success');
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.notice).toBeNull();
  });

  it('does nothing without a published link', async () => {
    const { result } = setup(false);
    await act(async () => {
      await result.current.copy();
      await result.current.share();
      await result.current.open();
      await result.current.downloadQr();
    });
    expect(mockCopy).not.toHaveBeenCalled();
    expect(Share.share).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mockShareFile).not.toHaveBeenCalled();
    expect(result.current.notice).toBeNull();
  });

  it('reports a clipboard failure as a danger notice', async () => {
    mockCopy.mockRejectedValue(new Error('denied'));
    const { result } = setup();
    await act(async () => {
      await result.current.copy();
    });
    expect(result.current.notice?.tone).toBe('danger');
  });

  it('shares the title and link through the OS sheet', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.share();
    });
    const arg = (Share.share as jest.Mock).mock.calls[0][0];
    expect(arg.title).toBe('Jam Night');
    expect(arg.message).toContain('Jam Night');
    expect(arg.message).toContain('https://duncit.example/p/jam-night');
  });

  it('reports a share failure', async () => {
    (Share.share as jest.Mock).mockRejectedValue(new Error('cancelled hard'));
    const { result } = setup();
    await act(async () => {
      await result.current.share();
    });
    expect(result.current.notice?.tone).toBe('danger');
  });

  it('opens the link, and reports when it cannot be opened', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.open();
    });
    expect(Linking.openURL).toHaveBeenCalledWith('https://duncit.example/p/jam-night');
    expect(result.current.notice).toBeNull();

    (Linking.openURL as jest.Mock).mockRejectedValue(new Error('no handler'));
    await act(async () => {
      await result.current.open();
    });
    expect(result.current.notice?.tone).toBe('danger');
  });

  it('saves the QR as a PNG without the data-url prefix', async () => {
    mockShareFile.mockResolvedValue(true);
    const { result } = setup();
    await act(async () => {
      await result.current.downloadQr();
    });
    expect(mockShareFile.mock.calls[0][0]).toBe('QUJD');
    expect(mockShareFile.mock.calls[0][2]).toBe('image/png');
    expect(result.current.busy).toBeNull();
    expect(result.current.notice).toBeNull();
  });

  it('tells the user when the QR could not be saved (no share sheet or error)', async () => {
    mockShareFile.mockResolvedValue(false);
    const { result } = setup();
    await act(async () => {
      await result.current.downloadQr();
    });
    expect(result.current.notice?.tone).toBe('danger');

    mockShareFile.mockRejectedValue(new Error('disk full'));
    await act(async () => {
      await result.current.downloadQr();
    });
    expect(result.current.notice?.tone).toBe('danger');
    expect(result.current.busy).toBeNull();
  });

  it('builds the venue poster with the venue headline and shares the PDF', async () => {
    mockPoster.mockResolvedValue('UERG');
    mockShareFile.mockResolvedValue(true);
    const { result } = setup(true, 'VENUE');
    await act(async () => {
      await result.current.downloadPoster();
    });
    expect(mockPoster.mock.calls[0][0]).toBe('VENUE');
    expect(mockPoster.mock.calls[0][1]).toBe('ref-1');
    const venueCopy = mockPoster.mock.calls[0][2];
    expect(mockShareFile.mock.calls[0][0]).toBe('UERG');
    expect(mockShareFile.mock.calls[0][2]).toBe('application/pdf');

    mockPoster.mockClear();
    const host = setup(true, 'HOST');
    await act(async () => {
      await host.result.current.downloadPoster();
    });
    expect(mockPoster.mock.calls[0][2].headline).not.toBe(venueCopy.headline);
  });

  it('invites guests to the menu on the poster only for a venue that serves food', async () => {
    mockPoster.mockResolvedValue('UERG');
    mockShareFile.mockResolvedValue(true);
    const headlineOf = async (kind: 'VENUE' | 'HOST', offersFood: boolean) => {
      mockPoster.mockClear();
      const { result } = setup(true, kind, offersFood);
      await act(async () => {
        await result.current.downloadPoster();
      });
      return mockPoster.mock.calls[0][2].headline as string;
    };

    const plainVenue = await headlineOf('VENUE', false);
    expect(await headlineOf('VENUE', true)).toBe(FOOD_HEADLINE);
    expect(plainVenue).not.toBe(FOOD_HEADLINE);
    // A host has no menu, whatever the flag says.
    const host = await headlineOf('HOST', true);
    expect(host).not.toBe(FOOD_HEADLINE);
    expect(host).not.toBe(plainVenue);
  });

  it('downloads the table label with the poster headline and shares it as a PDF', async () => {
    mockLabel.mockResolvedValue('TEFC');
    mockShareFile.mockResolvedValue(true);
    const { result } = setup(true, 'VENUE', true);
    await act(async () => {
      await result.current.downloadTableLabel();
    });
    expect(mockLabel).toHaveBeenCalledWith('ref-1', FOOD_HEADLINE);
    expect(mockShareFile).toHaveBeenCalledWith(
      'TEFC',
      'jam-night-table-label.pdf',
      'application/pdf',
    );
    expect(result.current.busy).toBeNull();
    expect(result.current.notice).toBeNull();
  });

  it('has no table label for a host page', async () => {
    const { result } = setup(true, 'HOST');
    await act(async () => {
      await result.current.downloadTableLabel();
    });
    expect(mockLabel).not.toHaveBeenCalled();
    expect(mockShareFile).not.toHaveBeenCalled();
    expect(result.current.notice).toBeNull();
  });

  it('reports a table label that failed to render and one nobody could save', async () => {
    mockLabel.mockRejectedValue(new Error('render failed'));
    const { result } = setup();
    await act(async () => {
      await result.current.downloadTableLabel();
    });
    expect(result.current.notice).toEqual({
      text: "We couldn't make the table label. Please try again.",
      tone: 'danger',
    });
    expect(result.current.busy).toBeNull();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.notice).toBeNull();
    mockLabel.mockResolvedValue('TEFC');
    mockShareFile.mockResolvedValue(false);
    await act(async () => {
      await result.current.downloadTableLabel();
    });
    expect(result.current.notice?.tone).toBe('danger');
    expect(result.current.busy).toBeNull();
  });

  it('reports a poster failure and a poster nobody could save', async () => {
    mockPoster.mockRejectedValue(new Error('render failed'));
    const { result } = setup();
    await act(async () => {
      await result.current.downloadPoster();
    });
    expect(result.current.notice?.tone).toBe('danger');
    expect(result.current.busy).toBeNull();

    mockPoster.mockResolvedValue('UERG');
    mockShareFile.mockResolvedValue(false);
    await act(async () => {
      await result.current.downloadPoster();
    });
    expect(result.current.notice?.tone).toBe('danger');
  });
});

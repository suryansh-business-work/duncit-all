/**
 * Download: the dashboard saved as a PNG of exactly what is on screen.
 *
 * The rasteriser and the save-as are mocked — jsdom has no canvas to draw on
 * and no file system to save to. What is real is everything this package
 * decides: which nodes are in the picture, how dense it is, what the file is
 * called, and what the person sees while it is made and when it fails.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { domToBlob, downloadBlob, logError } = vi.hoisted(() => ({
  domToBlob: vi.fn(),
  downloadBlob: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('modern-screenshot', () => ({ domToBlob }));
vi.mock('@duncit/utils', () => ({ downloadBlob }));
vi.mock('@duncit/logs', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: logError }),
}));

import { SKIP_IN_DOWNLOAD, downloadDashboardImage, imageScale, inDownload } from '../src/download';
import { useDashboardDownload } from '../src/useDashboardDownload';

const PNG = new Blob(['png'], { type: 'image/png' });

afterEach(() => {
  vi.clearAllMocks();
});

describe('imageScale', () => {
  it('draws a normal dashboard at 2x, so its text stays sharp', () => {
    expect(imageScale(1280, 2400)).toBe(2);
  });

  it('draws a dashboard too tall for 2x just inside the canvas limit instead of failing', () => {
    const scale = imageScale(1600, 12_000);

    expect(scale).toBeLessThan(2);
    expect(1600 * 12_000 * scale * scale).toBeLessThanOrEqual(16_777_216 + 1);
  });

  it('copes with a node that has not been laid out yet', () => {
    expect(imageScale(0, 0)).toBe(2);
  });
});

describe('inDownload', () => {
  it('leaves out chrome marked as not part of the picture', () => {
    const toolbar = document.createElement('div');
    for (const [name, value] of Object.entries(SKIP_IN_DOWNLOAD)) toolbar.setAttribute(name, value);

    expect(inDownload(toolbar)).toBe(false);
  });

  it('keeps every widget element and every text node', () => {
    expect(inDownload(document.createElement('section'))).toBe(true);
    expect(inDownload(document.createTextNode('Pods today'))).toBe(true);
  });
});

describe('downloadDashboardImage', () => {
  it('rasterises the dashboard on its page colour and saves it under the given name', async () => {
    domToBlob.mockResolvedValue(PNG);
    const node = document.createElement('div');

    await downloadDashboardImage(node, 'admin.overview.png', '#ffffff');

    expect(domToBlob).toHaveBeenCalledWith(
      node,
      expect.objectContaining({ backgroundColor: '#ffffff', scale: 2, filter: inDownload })
    );
    expect(downloadBlob).toHaveBeenCalledWith(PNG, 'admin.overview.png');
  });
});

describe('useDashboardDownload', () => {
  const mount = () => renderHook(() => useDashboardDownload('finance.startup', '#fafafa', 'Could not download'));

  it('does nothing before the dashboard has rendered', () => {
    const { result } = mount();

    act(() => result.current.download());

    expect(domToBlob).not.toHaveBeenCalled();
    expect(result.current.downloading).toBe(false);
  });

  it('is busy while the image is made, then saves it as <dashboardId>.png', async () => {
    let finish: (blob: Blob) => void = () => undefined;
    domToBlob.mockReturnValue(
      new Promise<Blob>((resolve) => {
        finish = resolve;
      })
    );
    const { result } = mount();
    result.current.targetRef.current = document.createElement('div');

    act(() => result.current.download());
    await waitFor(() => expect(domToBlob).toHaveBeenCalled());
    expect(result.current.downloading).toBe(true);

    await act(async () => {
      finish(PNG);
    });

    await waitFor(() => expect(result.current.downloading).toBe(false));
    expect(downloadBlob).toHaveBeenCalledWith(PNG, 'finance.startup.png');
    expect(result.current.error).toBeNull();
  });

  it('says so inline, and logs why, when the image cannot be made', async () => {
    const failure = new Error('canvas too large');
    domToBlob.mockRejectedValue(failure);
    const { result } = mount();
    result.current.targetRef.current = document.createElement('div');

    act(() => result.current.download());

    await waitFor(() => expect(result.current.error).toBe('Could not download'));
    expect(result.current.downloading).toBe(false);
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'dashboard',
      'download',
      expect.objectContaining({ error: failure, dashboardId: 'finance.startup' })
    );
  });
});

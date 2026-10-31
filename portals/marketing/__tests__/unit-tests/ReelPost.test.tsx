import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, screen } from '@testing-library/react';
import { logs } from '@duncit/logs';
import { directUploadToImagekit, useUploadCaps } from '@duncit/media-picker';
import { exportView } from '../../src/pages/reels/studio/export/exportView';
import ReelComposer from '../../src/pages/reels/studio/export/ReelComposer';
import type { ExportState } from '../../src/pages/reels/studio/export/useReelExport';
import { REEL_UPLOAD_FOLDER, useReelPost, type PostState } from '../../src/pages/reels/studio/export/useReelPost';
import { renderWithProviders } from '../testkit';

const client = vi.hoisted(() => ({ mutate: vi.fn() }));
const MB = 1024 * 1024;

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useApolloClient: () => client,
}));

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  directUploadToImagekit: vi.fn(),
  // The admin's cap for the PORTALS surface, as useUploadCaps resolves it.
  useUploadCaps: vi.fn(() => ({ maxVideoBytes: 2 * MB })),
}));

vi.mock('@duncit/logs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/logs')>();
  return { ...actual, logs: { ...actual.logs, portal: { ...actual.logs.portal, marketing: { error: vi.fn() } } } };
});

/** The calendar's composer, as what it was opened with. */
vi.mock('../../src/pages/social-accounts-page/publish/ComposerDialog', () => ({
  default: ({ request, accounts, onClose }: { request: { text?: string; media_url?: string }; accounts: unknown[]; onClose: () => void }) => (
    <button type="button" data-testid="composer" data-text={request.text} data-media={request.media_url} data-accounts={accounts.length} onClick={onClose} />
  ),
}));
vi.mock('../../src/pages/social-accounts-page/useSocialSetup', () => ({
  useSocialSetup: () => ({ accounts: [{ id: 'acc-1' }, { id: 'acc-2' }, { id: 'acc-3' }], providers: [], loading: false, error: undefined, reload: vi.fn() }),
}));

const upload = vi.mocked(directUploadToImagekit);
const file = (bytes: number, name = 'jam-night-recap.mp4') => new File([new Uint8Array(bytes)], name, { type: 'video/mp4' });
const URL_UPLOADED = 'https://ik.imagekit.io/duncit/marketing/reels/jam-night-recap.mp4';

beforeEach(() => {
  upload.mockReset();
  vi.mocked(useUploadCaps).mockClear();
  vi.mocked(logs.portal.marketing.error).mockClear();
});

describe('useReelPost', () => {
  it('uploads the reel to the marketing reels folder with its progress, then opens the composer on it', async () => {
    upload.mockImplementation(async (_client, _file, _folder, onProgress) => {
      onProgress?.(40);
      return URL_UPLOADED;
    });
    const { result } = renderHook(() => useReelPost('Jam night recap', true));
    expect(result.current.state).toEqual({ phase: 'idle' });
    expect(result.current.composer).toBeNull();

    let posted = false;
    await act(async () => {
      posted = await result.current.post(file(10));
    });

    expect(posted).toBe(true);
    expect(upload).toHaveBeenCalledWith(client, expect.objectContaining({ name: 'jam-night-recap.mp4' }), REEL_UPLOAD_FOLDER, expect.any(Function), 'PORTALS');
    expect(REEL_UPLOAD_FOLDER).toBe('/marketing/reels');
    expect(result.current.state).toEqual({ phase: 'idle' });
    expect(result.current.composer).toEqual({ text: 'Jam night recap', media_url: URL_UPLOADED });

    act(() => result.current.closeComposer());
    expect(result.current.composer).toBeNull();
  });

  it('reports the upload as it goes, as a fraction', async () => {
    let report: (pct: number) => void = () => undefined;
    let finish: (url: string) => void = () => undefined;
    upload.mockImplementation((_client, _file, _folder, onProgress) => {
      report = onProgress ?? report;
      return new Promise<string>((resolve) => {
        finish = resolve;
      });
    });
    const { result } = renderHook(() => useReelPost('Jam night recap', true));
    let done: Promise<boolean> = Promise.resolve(false);
    act(() => {
      done = result.current.post(file(10));
    });
    expect(result.current.state).toEqual({ phase: 'uploading', progress: 0 });
    act(() => report(65));
    expect(result.current.state).toEqual({ phase: 'uploading', progress: 0.65 });
    await act(async () => {
      finish(URL_UPLOADED);
      await done;
    });
    expect(result.current.state).toEqual({ phase: 'idle' });
  });

  it('refuses a reel over the surface’s video cap without uploading a byte', async () => {
    const { result } = renderHook(() => useReelPost('Jam night recap', true));
    let posted = true;
    await act(async () => {
      posted = await result.current.post(file(3 * MB));
    });
    expect(posted).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    expect(result.current.state).toEqual({ phase: 'failed', message: expect.stringContaining('3.0 MB') });
    expect(result.current.state).toMatchObject({ message: expect.stringContaining('2 MB') });
    expect(result.current.composer).toBeNull();
  });

  it('says why the upload failed, logs it, and can be dismissed back to the rendered reel', async () => {
    upload.mockRejectedValue(new Error('Upload is not available right now'));
    const { result } = renderHook(() => useReelPost('Jam night recap', true));
    let posted = true;
    await act(async () => {
      posted = await result.current.post(file(10));
    });
    expect(posted).toBe(false);
    expect(result.current.state).toEqual({ phase: 'failed', message: 'Upload is not available right now' });
    expect(logs.portal.marketing.error).toHaveBeenCalledWith('reels', 'post', { error: expect.any(Error) });
    expect(result.current.composer).toBeNull();

    act(() => result.current.dismiss());
    expect(result.current.state).toEqual({ phase: 'idle' });
  });

  it('falls back to its own words when the failure carries none', async () => {
    upload.mockRejectedValue({});
    const { result } = renderHook(() => useReelPost('Jam night recap', true));
    await act(async () => {
      await result.current.post(file(10));
    });
    expect(result.current.state).toEqual({ phase: 'failed', message: 'The reel could not be uploaded' });
  });

  it('asks for the upload caps only once a reel is rendered', () => {
    renderHook(() => useReelPost('Jam night recap', false));
    expect(useUploadCaps).toHaveBeenLastCalledWith('PORTALS', { skip: true });
    renderHook(() => useReelPost('Jam night recap', true));
    expect(useUploadCaps).toHaveBeenLastCalledWith('PORTALS', { skip: false });
  });
});

describe('exportView', () => {
  const rendered: ExportState = { phase: 'rendered', file: file(10) };
  const idle: PostState = { phase: 'idle' };

  it('is hidden while nothing is exporting', () => {
    expect(exportView({ phase: 'idle' }, idle)).toEqual({ kind: 'hidden' });
    // Even a stale post state cannot show a dialog with no export behind it.
    expect(exportView({ phase: 'idle' }, { phase: 'failed', message: 'x' })).toEqual({ kind: 'hidden' });
  });

  it.each([
    ['downloading', 0.5, 'ai.reels.export.downloading', 50],
    ['rendering', 0.426, 'ai.reels.export.progress', 43],
  ] as const)('shows the %s bar, which can be cancelled', (phase, progress, statusKey, percent) => {
    expect(exportView({ phase, progress }, idle)).toEqual({
      kind: 'busy',
      percent,
      statusKey,
      labelKey: 'ai.reels.export.progressLabel',
      cancellable: true,
    });
  });

  it('names a render failure with no file to fall back on', () => {
    expect(exportView({ phase: 'failed', message: 'No encoder' }, idle)).toEqual({ kind: 'failed', message: 'No encoder', file: null });
  });

  it('offers a rendered reel, then follows the upload on it', () => {
    expect(exportView(rendered, idle)).toEqual({ kind: 'ready', file: rendered.file });
    expect(exportView(rendered, { phase: 'uploading', progress: 0.25 })).toEqual({
      kind: 'busy',
      percent: 25,
      statusKey: 'ai.reels.export.uploading',
      labelKey: 'ai.reels.export.uploadProgressLabel',
      cancellable: false,
    });
    expect(exportView(rendered, { phase: 'failed', message: 'Refused' })).toEqual({ kind: 'failed', message: 'Refused', file: rendered.file });
  });
});

describe('ReelComposer', () => {
  it('opens the calendar’s composer on the request with the connected accounts', () => {
    const onClose = vi.fn();
    renderWithProviders(<ReelComposer request={{ text: 'Jam night recap', media_url: URL_UPLOADED }} onClose={onClose} />);
    const composer = screen.getByTestId('composer');
    expect(composer).toHaveAttribute('data-text', 'Jam night recap');
    expect(composer).toHaveAttribute('data-media', URL_UPLOADED);
    expect(composer).toHaveAttribute('data-accounts', '3');
    composer.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

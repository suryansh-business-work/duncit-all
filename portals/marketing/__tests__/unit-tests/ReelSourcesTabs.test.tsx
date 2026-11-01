import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { MB } from '@duncit/media-picker';
import { GENERATE_REEL_VOICEOVER, REEL_DRIVE_FOLDER, REEL_DRIVE_STATUS, REEL_MEDIA_SEARCH } from '../../src/pages/reels/queries';
import AssetList, { assetMeta } from '../../src/pages/reels/studio/sources/AssetList';
import DriveTab from '../../src/pages/reels/studio/sources/DriveTab';
import { measureFile } from '../../src/pages/reels/studio/sources/measureFile';
import SourcesPanel from '../../src/pages/reels/studio/sources/SourcesPanel';
import { stockCredit, stockMeta } from '../../src/pages/reels/studio/sources/StockCard';
import StockTab, { toStockInput } from '../../src/pages/reels/studio/sources/StockTab';
import UploadTab from '../../src/pages/reels/studio/sources/UploadTab';
import { REEL_UPLOADS_FOLDER, useReelUploads } from '../../src/pages/reels/studio/sources/useReelUploads';
import { useStockSearch } from '../../src/pages/reels/studio/sources/useStockSearch';
import VoiceTab from '../../src/pages/reels/studio/sources/VoiceTab';
import type { ReelActions } from '../../src/pages/reels/studio/useReelActions';
import type { ReelAspect } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, queryOptions, reelAsset, reelProject, reelScene, reelSpec, reelStockItem, reelStockPage, resetApollo } from '../mocks/reel-apollo-mock';

const confirm = vi.hoisted(() => vi.fn());
const picker = vi.hoisted(() => ({ upload: vi.fn(), validate: vi.fn() }));
const measure = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../mocks/reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

/** ImageKit's direct upload and the admin's caps, as the picker package hands them out. */
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  default: () => null,
  useImagekitDirectUpload: () => ({ upload: picker.upload, uploading: false }),
  useUploadCaps: () => ({ maxImageBytes: 15 * MB, maxVideoBytes: 100 * MB, validate: picker.validate }),
}));

vi.mock('../../src/pages/reels/studio/sources/measureFile', () => ({ measureFile: measure }));

const actions = (): ReelActions => ({
  addDriveFiles: vi.fn(async () => undefined),
  adding: false,
  addStockItems: vi.fn(async () => true),
  addingStock: false,
  addUploads: vi.fn(async () => true),
  addingUploads: false,
  removeAsset: vi.fn(async () => undefined),
  restoreVersion: vi.fn(async () => undefined),
  saveDetails: vi.fn(async () => true),
  saving: false,
  setCover: vi.fn(async () => undefined),
  settingCover: false,
});

const configured = () =>
  answerQuery(REEL_DRIVE_STATUS, { data: { reelDriveStatus: { configured: true, service_account_email: 'reels@duncit-drive.iam.gserviceaccount.com' } } });

const file = (name: string, type: string, bytes = 10) => new File([new Uint8Array(bytes)], name, { type });

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  picker.upload.mockReset();
  picker.validate.mockReset().mockReturnValue(null);
  measure.mockReset().mockResolvedValue({ width: 1080, height: 1920 });
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('SourcesPanel', () => {
  it('opens on Drive and switches shelf by tab, keeping the tab in the URL', () => {
    configured();
    renderWithProviders(<SourcesPanel project={reelProject()} actions={actions()} onEditDetails={vi.fn()} />);
    expect(screen.getByTestId('reel-drive-tab')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Stock' }));
    expect(screen.getByTestId('reel-stock-tab')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Upload' }));
    expect(screen.getByTestId('reel-upload-tab')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Voice' }));
    expect(screen.getByTestId('reel-voice-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-drive-tab')).not.toBeInTheDocument();
  });

  it('asks before removing the voiceover or the watermark, since the reel plays them', async () => {
    configured();
    confirm.mockResolvedValue(false);
    const studio = actions();
    renderWithProviders(
      <SourcesPanel
        project={reelProject({
          assets: [reelAsset({ id: 'g1', kind: 'AUDIO', source: 'GENERATED', name: 'voice.mp3' }), reelAsset({ id: 'logo', kind: 'IMAGE', name: 'logo.png' }), reelAsset({ id: 'spare', name: 'spare.mp4' })],
          spec: reelSpec({ scenes: [reelScene({ asset_id: '' })], voiceover: { asset_id: 'g1', volume: 1 }, brand: { watermark_asset_id: 'logo', watermark_corner: 'TOP_LEFT', watermark_width_pct: 10, primary_color: '' } }),
        })}
        actions={studio}
        onEditDetails={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('reel-asset-remove-g1'));
    fireEvent.click(screen.getByTestId('reel-asset-remove-logo'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByTestId('reel-asset-remove-spare'));
    await waitFor(() => expect(studio.removeAsset).toHaveBeenCalledWith('spare'));
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});

describe('DriveTab', () => {
  it('says Drive is not connected, and offers nothing to browse', () => {
    answerQuery(REEL_DRIVE_STATUS, { data: { reelDriveStatus: { configured: false, service_account_email: '' } } });
    renderWithProviders(<DriveTab project={reelProject({ drive_folder_id: 'root' })} actions={actions()} onEditDetails={vi.fn()} />);
    expect(screen.getByTestId('reel-drive-not-configured')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-drive-browser')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-drive-share-hint')).not.toBeInTheDocument();
  });

  it('asks for a folder link when the reel has none, and shows nothing until the status is known', () => {
    const onEditDetails = vi.fn();
    const { unmount } = renderWithProviders(<DriveTab project={reelProject()} actions={actions()} onEditDetails={onEditDetails} />);
    expect(screen.queryByTestId('reel-drive-no-folder')).not.toBeInTheDocument();
    unmount();

    configured();
    renderWithProviders(<DriveTab project={reelProject()} actions={actions()} onEditDetails={onEditDetails} />);
    expect(screen.getByTestId('reel-drive-share-hint')).toHaveTextContent('reels@duncit-drive.iam.gserviceaccount.com');
    fireEvent.click(screen.getByTestId('reel-drive-add-link'));
    expect(onEditDetails).toHaveBeenCalledTimes(1);
  });

  it('browses the folder, ticking what the reel holds, and offers to change the folder', async () => {
    configured();
    answerQuery(REEL_DRIVE_FOLDER, {
      data: {
        reelDriveFolder: {
          id: 'root',
          name: 'Jam shoot',
          truncated: false,
          entries: [
            { id: 'drive-a1', name: 'jam.mp4', kind: 'VIDEO', mime_type: 'video/mp4', size_bytes: 0, duration_ms: 0, width: 0, height: 0, thumbnail_url: '' },
            { id: 'drive-new', name: 'encore.mp4', kind: 'VIDEO', mime_type: 'video/mp4', size_bytes: 0, duration_ms: 0, width: 0, height: 0, thumbnail_url: '' },
          ],
        },
      },
    });
    const studio = actions();
    const onEditDetails = vi.fn();
    renderWithProviders(<DriveTab project={reelProject({ drive_folder_id: 'root', assets: [reelAsset()] })} actions={studio} onEditDetails={onEditDetails} />);
    expect(screen.queryByTestId('reel-drive-add-drive-a1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-drive-add-drive-new'));
    await waitFor(() => expect(studio.addDriveFiles).toHaveBeenCalledWith(['drive-new']));
    fireEvent.click(within(screen.getByTestId('reel-drive-share-hint')).getByRole('button'));
    expect(onEditDetails).toHaveBeenCalledTimes(1);
  });
});

describe('StockTab', () => {
  const searchFor = (words: string) => {
    fireEvent.change(screen.getByTestId('reel-stock-query'), { target: { value: words } });
    fireEvent.submit(screen.getByTestId('reel-stock-form'));
  };

  it('searches in the reel’s orientation, lists each file with its licence, and adds one to the reel', async () => {
    answerQuery(REEL_MEDIA_SEARCH, { data: { reelMediaSearch: reelStockPage([reelStockItem(), reelStockItem({ id: 'px-2', provider_id: 'pexels:2', kind: 'IMAGE', duration_ms: 0 }), reelStockItem({ id: 'px-3', provider_id: 'pexels:3', attribution: '' })], true) } });
    const studio = actions();
    renderWithProviders(<StockTab project={reelProject({ spec: reelSpec({ aspect: 'SQUARE' }), assets: [reelAsset({ provider_id: 'pexels:2', source: 'STOCK' })] })} actions={studio} />);
    expect(screen.getByTestId('reel-stock-search')).toBeDisabled();
    expect(queryOptions.get(REEL_MEDIA_SEARCH)?.skip).toBe(true);

    searchFor('  sunset court ');
    expect(queryOptions.get(REEL_MEDIA_SEARCH)?.variables).toEqual({ query: 'sunset court', kind: 'VIDEO', orientation: 'SQUARE', page: 1 });
    expect(screen.getByTestId('reel-stock-item-px-1')).toHaveTextContent('Pexels Licence · Ana Ruiz');
    expect(screen.getByTestId('reel-stock-item-px-1')).toHaveTextContent('0:12');
    // Each add button names its file: by its credit, or by its provider id when it has none.
    expect(screen.getByTestId('reel-stock-add-px-1')).toHaveAccessibleName('Add Ana Ruiz to the reel');
    expect(screen.getByTestId('reel-stock-add-px-3')).toHaveAccessibleName('Add pexels:3 to the reel');
    // Already in the reel: a tick, not an add button.
    expect(screen.queryByTestId('reel-stock-add-px-2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-stock-add-px-1'));
    await waitFor(() => expect(studio.addStockItems).toHaveBeenCalledWith([toStockInput(reelStockItem())]));

    fireEvent.click(screen.getByTestId('reel-stock-more'));
    expect(queryOptions.get(REEL_MEDIA_SEARCH)?.variables).toMatchObject({ page: 2 });
  });

  it('searches photos when asked, and keeps the kind when its button is pressed again', () => {
    answerQuery(REEL_MEDIA_SEARCH, { data: { reelMediaSearch: reelStockPage([]) } });
    renderWithProviders(<StockTab project={reelProject()} actions={actions()} />);
    fireEvent.click(screen.getByTestId('reel-stock-kind-image'));
    fireEvent.click(screen.getByTestId('reel-stock-kind-image'));
    searchFor('pottery');
    expect(queryOptions.get(REEL_MEDIA_SEARCH)?.variables).toMatchObject({ kind: 'IMAGE', orientation: 'PORTRAIT' });
    expect(screen.getByTestId('reel-stock-empty')).toBeInTheDocument();
  });

  it('says why a search failed, and shows the loader while one is out', () => {
    answerQuery(REEL_MEDIA_SEARCH, { error: new Error('Pexels is not configured') });
    const { unmount } = renderWithProviders(<StockTab project={reelProject()} actions={actions()} />);
    searchFor('x');
    expect(screen.getByTestId('reel-stock-error')).toHaveTextContent('Pexels is not configured');
    expect(screen.queryByTestId('reel-stock-empty')).not.toBeInTheDocument();
    unmount();

    answerQuery(REEL_MEDIA_SEARCH, { loading: true });
    renderWithProviders(<StockTab project={reelProject()} actions={actions()} />);
    searchFor('x');
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(screen.queryByTestId('reel-stock-more')).not.toBeInTheDocument();
  });

  it('names a stock file by its credit, or its provider id when there is none', () => {
    expect(toStockInput(reelStockItem({ attribution: '' })).name).toBe('pexels:1');
    const t = (key: string) => key;
    expect(stockMeta(reelStockItem({ kind: 'IMAGE', duration_ms: 0, width: 0, height: 0 }), t)).toBe('ai.reels.sources.kindImage');
    expect(stockMeta(reelStockItem(), t)).toBe('ai.reels.sources.kindVideo · 0:12 · 1080×1920');
    expect(stockCredit({ licence: '', attribution: 'Ana' })).toBe('Ana');
  });
});

describe('useStockSearch', () => {
  it('ignores an empty search and a "more" before any search, and starts over when the aspect changes', () => {
    answerQuery(REEL_MEDIA_SEARCH, { data: { reelMediaSearch: reelStockPage([reelStockItem()], true) } });
    const { result, rerender } = renderHook(({ aspect }) => useStockSearch(aspect), { initialProps: { aspect: 'PORTRAIT' as ReelAspect } });
    act(() => result.current.run('   ', 'VIDEO'));
    act(() => result.current.more());
    expect(result.current.searched).toBe(false);
    expect(result.current.items).toEqual([]);

    act(() => result.current.run('court', 'VIDEO'));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
    // The same page answering again changes nothing.
    answerQuery(REEL_MEDIA_SEARCH, { data: { reelMediaSearch: reelStockPage([reelStockItem({ id: 'px-dup' })], true) } });
    rerender({ aspect: 'PORTRAIT' });
    expect(result.current.items.map((item) => item.id)).toEqual(['px-1']);

    rerender({ aspect: 'LANDSCAPE' });
    expect(result.current.searched).toBe(false);
    expect(result.current.items).toEqual([]);
  });
});

describe('UploadTab and useReelUploads', () => {
  const pickFiles = (...files: File[]) => fireEvent.change(screen.getByTestId('reel-upload-input'), { target: { files } });

  it('uploads each picked file with its progress, then adds it to the reel', async () => {
    picker.upload.mockImplementation(async (_file: File, _folder: string, onProgress?: (pct: number) => void) => {
      onProgress?.(55);
      return 'https://ik.imagekit.io/duncit/marketing/reels/uploads/clip.mp4';
    });
    const studio = actions();
    renderWithProviders(<UploadTab actions={studio} />);
    expect(screen.getByTestId('reel-upload-empty')).toBeInTheDocument();
    expect(screen.getByText(/Pictures up to 15 MB, videos up to 100 MB/)).toBeInTheDocument();

    pickFiles(file('clip.mp4', 'video/mp4', 2048));
    expect(await screen.findByTestId('reel-upload-row-u1')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('reel-upload-row-u1')).toHaveAttribute('data-phase', 'done'));
    expect(picker.upload).toHaveBeenCalledWith(expect.objectContaining({ name: 'clip.mp4' }), REEL_UPLOADS_FOLDER, expect.any(Function), 'PORTALS');
    expect(studio.addUploads).toHaveBeenCalledWith([
      { url: 'https://ik.imagekit.io/duncit/marketing/reels/uploads/clip.mp4', name: 'clip.mp4', width: 1080, height: 1920, size_bytes: 2048 },
    ]);
    expect(screen.getByTestId('reel-upload-row-u1')).toHaveTextContent('Added to the reel');

    fireEvent.click(screen.getByTestId('reel-upload-clear'));
    expect(screen.getByTestId('reel-upload-empty')).toBeInTheDocument();
  });

  it('refuses a file the caps reject, and says when the upload or the reel refused one', async () => {
    picker.validate.mockReturnValueOnce('Videos are capped at 100 MB').mockReturnValue(null);
    picker.upload.mockRejectedValueOnce(new Error('Upload is not available right now')).mockResolvedValue('https://ik.imagekit.io/x.png');
    const studio = actions();
    vi.mocked(studio.addUploads).mockResolvedValue(false);
    renderWithProviders(<UploadTab actions={studio} />);
    pickFiles(file('huge.mp4', 'video/mp4'), file('clip.mp4', 'video/mp4'), file('poster.png', 'image/png'));
    await waitFor(() => expect(screen.getByTestId('reel-upload-row-u3')).toHaveAttribute('data-phase', 'failed'));
    const rows = screen.getAllByTestId(/^reel-upload-row-/);
    expect(rows[0]).toHaveTextContent('Videos are capped at 100 MB');
    expect(rows[1]).toHaveTextContent('Upload is not available right now');
    expect(rows[2]).toHaveTextContent('The uploaded file could not be added to the reel');
    expect(picker.upload).toHaveBeenCalledTimes(2);
  });

  it('shows the bar while a file is on the wire, and does not take another pick meanwhile', async () => {
    let finish: (url: string) => void = () => undefined;
    let report: (pct: number) => void = () => undefined;
    picker.upload.mockImplementation((_file: File, _folder: string, onProgress?: (pct: number) => void) => {
      report = onProgress ?? report;
      return new Promise<string>((resolve) => (finish = resolve));
    });
    renderWithProviders(<UploadTab actions={actions()} />);
    pickFiles(file('clip.mp4', 'video/mp4'));
    await waitFor(() => expect(screen.getByTestId('reel-upload-row-u1')).toHaveAttribute('data-phase', 'uploading'));
    act(() => report(40));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByTestId('reel-upload-pick')).toBeDisabled();
    await act(async () => finish('https://ik.imagekit.io/x.mp4'));
    await waitFor(() => expect(screen.getByTestId('reel-upload-pick')).toBeEnabled());
  });

  it('says the file is going into the reel once it is up, with a bar that has no end yet', async () => {
    picker.upload.mockResolvedValue('https://ik.imagekit.io/x.mp4');
    let added: (ok: boolean) => void = () => undefined;
    const studio = actions();
    vi.mocked(studio.addUploads).mockImplementation(() => new Promise<boolean>((resolve) => (added = resolve)));
    renderWithProviders(<UploadTab actions={studio} />);
    pickFiles(file('clip.mp4', 'video/mp4'));
    await waitFor(() => expect(screen.getByTestId('reel-upload-row-u1')).toHaveAttribute('data-phase', 'adding'));
    expect(screen.getByTestId('reel-upload-row-u1')).toHaveTextContent('Adding to the reel…');
    expect(screen.getByRole('progressbar', { name: 'Upload progress for clip.mp4' })).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByTestId('reel-upload-pick')).toBeDisabled();
    await act(async () => added(true));
    expect(screen.getByTestId('reel-upload-row-u1')).toHaveAttribute('data-phase', 'done');
  });

  it('opens the device picker from Choose files', () => {
    renderWithProviders(<UploadTab actions={actions()} />);
    const opened = vi.fn();
    screen.getByTestId('reel-upload-input').addEventListener('click', opened);
    fireEvent.click(screen.getByTestId('reel-upload-pick'));
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it('does nothing for an empty or a cancelled pick', () => {
    renderWithProviders(<UploadTab actions={actions()} />);
    pickFiles();
    expect(screen.getByTestId('reel-upload-empty')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('reel-upload-input'), { target: { files: null } });
    expect(screen.getByTestId('reel-upload-empty')).toBeInTheDocument();
    expect(picker.upload).not.toHaveBeenCalled();
  });

  it('reads a failed upload without words as its own failure', async () => {
    picker.upload.mockRejectedValue({});
    const { result } = renderHook(() => useReelUploads(vi.fn(async () => true)));
    await act(() => result.current.add([file('clip.mp4', 'video/mp4')]));
    expect(result.current.rows[0]).toMatchObject({ phase: 'failed', message: 'The upload failed' });
    expect(result.current.busy).toBe(false);
  });

  it('clears only the finished rows, keeping a file still on the wire', async () => {
    let finish: (url: string) => void = () => undefined;
    picker.upload.mockRejectedValueOnce(new Error('Upload is not available right now')).mockImplementationOnce(() => new Promise<string>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useReelUploads(vi.fn(async () => true)));
    let adding: Promise<void> = Promise.resolve();
    act(() => {
      adding = result.current.add([file('broken.mp4', 'video/mp4'), file('clip.mp4', 'video/mp4')]);
    });
    await waitFor(() => expect(result.current.rows.map((row) => row.phase)).toEqual(['failed', 'uploading']));
    act(() => result.current.clearFinished());
    expect(result.current.rows).toEqual([expect.objectContaining({ id: 'u2', name: 'clip.mp4', phase: 'uploading' })]);
    await act(async () => {
      finish('https://ik.imagekit.io/clip.mp4');
      await adding;
    });
    expect(result.current.rows[0]).toMatchObject({ id: 'u2', phase: 'done' });
  });
});

describe('VoiceTab', () => {
  it('speaks a typed voiceover into the reel and lists what has been generated', async () => {
    renderWithProviders(
      <VoiceTab project={reelProject({ assets: [reelAsset({ id: 'g1', kind: 'AUDIO', source: 'GENERATED', name: 'voice.mp3', duration_ms: 8000 }), reelAsset({ id: 'g2', kind: 'AUDIO', source: 'GENERATED', name: 'intro.mp3', duration_ms: 0 })] })} />
    );
    expect(screen.getByTestId('reel-voice-g1')).toHaveTextContent('0:08');
    expect(within(screen.getByTestId('reel-voice-g1')).getByLabelText('Play voice.mp3')).toHaveAttribute('src', 'https://server.duncit.com/reels/media/a1');
    fireEvent.change(screen.getByTestId('reel-voiceover-text'), { target: { value: 'Welcome' } });
    await waitFor(() => expect(screen.getByTestId('reel-voiceover-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('reel-voiceover-form'));
    await waitFor(() => expect(mutationOf(GENERATE_REEL_VOICEOVER)).toHaveBeenCalledWith({ variables: { project_id: 'DUN-REEL-1', text: 'Welcome', voice: 'alloy', language: 'en-IN' } }));
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('says so before any sound has been generated, and when the server would not speak', async () => {
    mutationOf(GENERATE_REEL_VOICEOVER).mockRejectedValue(new Error('No speech model'));
    renderWithProviders(<VoiceTab project={reelProject()} />);
    expect(screen.getByTestId('reel-voice-empty')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('reel-voiceover-text'), { target: { value: 'Welcome' } });
    await waitFor(() => expect(screen.getByTestId('reel-voiceover-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('reel-voiceover-form'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('No speech model'));
  });
});

describe('AssetList — where a file came from', () => {
  it('names the source, the licence and the credit when they are known', () => {
    const t = (key: string) => key;
    expect(assetMeta(reelAsset(), t)).toBe('ai.reels.sources.kindVideo · 0:10');
    expect(assetMeta(reelAsset({ source: 'STOCK', licence: 'Pexels Licence', attribution: 'Ana Ruiz' }), t)).toBe('ai.reels.sources.kindVideo · 0:10 · ai.reels.sources.fromStock · Pexels Licence · Ana Ruiz');
    expect(assetMeta(reelAsset({ kind: 'AUDIO', source: 'GENERATED', duration_ms: 0 }), t)).toBe('ai.reels.sources.kindAudio · ai.reels.sources.fromGenerated');
    renderWithProviders(<AssetList assets={[reelAsset({ source: 'UPLOAD' })]} usedAssetIds={new Set()} onRemove={vi.fn()} />);
    expect(screen.getByTestId('reel-asset-a1')).toHaveTextContent('uploaded');
  });
});

describe('measureFile (mocked here)', () => {
  it('is the module the uploads measure with', async () => {
    await expect(measureFile(file('x.png', 'image/png'))).resolves.toEqual({ width: 1080, height: 1920 });
  });
});

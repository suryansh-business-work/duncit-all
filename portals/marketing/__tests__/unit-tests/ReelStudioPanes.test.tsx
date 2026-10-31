import { forwardRef, useImperativeHandle } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AI_PROMPTS } from '@duncit/ai-prompts';
import { REEL_DRIVE_FOLDER, REEL_DRIVE_STATUS } from '../../src/pages/reels/queries';
import ChatBubble, { type BubbleTone } from '../../src/pages/reels/studio/chat/ChatBubble';
import ChatPanel from '../../src/pages/reels/studio/chat/ChatPanel';
import ChatTranscript from '../../src/pages/reels/studio/chat/ChatTranscript';
import ExportDialog from '../../src/pages/reels/studio/export/ExportDialog';
import type { ReelExport } from '../../src/pages/reels/studio/export/useReelExport';
import type { ReelPost } from '../../src/pages/reels/studio/export/useReelPost';
import MediaThumb from '../../src/pages/reels/studio/MediaThumb';
import PreviewPane from '../../src/pages/reels/studio/preview/PreviewPane';
import AssetList from '../../src/pages/reels/studio/sources/AssetList';
import DriveBrowser from '../../src/pages/reels/studio/sources/DriveBrowser';
import SourcesPanel from '../../src/pages/reels/studio/sources/SourcesPanel';
import StudioToolbar from '../../src/pages/reels/studio/StudioToolbar';
import type { ReelActions } from '../../src/pages/reels/studio/useReelActions';
import type { ReelAsset, ReelDriveEntry, ReelMessage, ReelProject, ReelScene } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { answerQuery, resetApollo } from '../mocks/reel-apollo-mock';

const confirm = vi.hoisted(() => vi.fn());
const player = vi.hoisted(() => ({ seekTo: vi.fn(), props: {} as Record<string, unknown> }));

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

/** Remotion's player, as an element that records what it was handed and can be sought. */
vi.mock('@remotion/player', () => ({
  Player: forwardRef<{ seekTo: (frame: number) => void }, Record<string, unknown>>((props, ref) => {
    player.props = props;
    useImperativeHandle(ref, () => ({ seekTo: player.seekTo }));
    return <div data-testid="reel-player" />;
  }),
}));

vi.mock('../../src/pages/reels/composition/ReelComposition', () => ({ ReelComposition: () => null }));

vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  default: () => null,
}));

const asset = (over: Partial<ReelAsset>): ReelAsset =>
  ({
    id: 'a1',
    kind: 'VIDEO',
    source: 'DRIVE',
    name: 'jam.mp4',
    drive_file_id: 'drive-a1',
    url: 'https://server.duncit.com/reels/media/a1',
    thumbnail_url: 'https://server.duncit.com/reels/thumbnail/a1',
    duration_ms: 10_000,
    ...over,
  }) as ReelAsset;

const scene = (over: Partial<ReelScene>): ReelScene =>
  ({ id: 's1', asset_id: 'a1', duration_ms: 2000, transition_ms: 0, transition: 'NONE', overlays: [], texts: [], ...over }) as ReelScene;

const message = (over: Partial<ReelMessage>): ReelMessage =>
  ({ id: 'm1', role: 'USER', text: 'open on the drums', asset_ids: [], restorable: false, failed: false, at: '2026-10-01T12:00:00.000Z', ...over }) as ReelMessage;

const project = (over: Partial<ReelProject> = {}): ReelProject =>
  ({
    id: 'DUN-REEL-1',
    name: 'Jam night recap',
    drive_url: '',
    drive_folder_id: '',
    duration_ms: 0,
    assets: [],
    messages: [],
    spec: specOf([]),
    variants: [],
    checks: [],
    posts: [],
    cover_at_ms: null,
    ...over,
  }) as ReelProject;

/** A spec with the reel-level settings every pane now reads. */
function specOf(scenes: ReelScene[], music: ReelProject['spec']['music'] = null): ReelProject['spec'] {
  return {
    fps: 30,
    width: 1080,
    height: 1920,
    aspect: 'PORTRAIT',
    background: '#000000',
    music,
    voiceover: null,
    brand: { watermark_asset_id: '', watermark_corner: 'TOP_RIGHT', watermark_width_pct: 18, primary_color: '' },
    captions: { style: 'PLAIN' },
    scenes,
  } as ReelProject['spec'];
}

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

const entry = (over: Partial<ReelDriveEntry>): ReelDriveEntry =>
  ({ id: 'f1', name: 'jam.mp4', kind: 'VIDEO', mime_type: 'video/mp4', size_bytes: 0, duration_ms: 0, width: 0, height: 0, thumbnail_url: '', ...over }) as ReelDriveEntry;

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  player.seekTo.mockReset();
});

describe('MediaThumb', () => {
  it('shows the preview frame, lazily', () => {
    const { container } = renderWithProviders(<MediaThumb kind="VIDEO" src="https://server.duncit.com/reels/thumbnail/a1" />);
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy');
  });

  it('falls back to the icon for its kind when there is no frame, or it fails to load', () => {
    const { container, rerender } = renderWithProviders(<MediaThumb kind="AUDIO" src="" size={24} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();

    rerender(<MediaThumb kind="VIDEO" src="https://server.duncit.com/reels/thumbnail/a1" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();

    // A new address deserves a new attempt.
    rerender(<MediaThumb kind="VIDEO" src="https://server.duncit.com/reels/thumbnail/a2" />);
    expect(container.querySelector('img')).not.toBeNull();
  });
});

describe('AssetList', () => {
  it('says so when the reel holds no footage yet', () => {
    renderWithProviders(<AssetList assets={[]} usedAssetIds={new Set()} onRemove={vi.fn()} />);
    expect(screen.getByTestId('reel-assets-empty')).toBeInTheDocument();
  });

  it('describes each file by kind, length and where it came from', () => {
    renderWithProviders(
      <AssetList
        assets={[
          asset({}),
          asset({ id: 'a2', kind: 'AUDIO', name: 'theme.mp3', duration_ms: 0, thumbnail_url: '' }),
          asset({ id: 'a3', kind: 'IMAGE', source: 'UPLOAD', name: 'poster.png', duration_ms: 0 }),
        ]}
        usedAssetIds={new Set()}
        onRemove={vi.fn()}
      />
    );
    expect(screen.getByTestId('reel-asset-a1')).toHaveTextContent('jam.mp4');
    expect(screen.getByTestId('reel-asset-a1')).toHaveTextContent('0:10');
    expect(screen.getByTestId('reel-asset-a2')).not.toHaveTextContent('0:');
    // Three files, three different descriptions.
    const descriptions = ['a1', 'a2', 'a3'].map((id) => screen.getByTestId(`reel-asset-${id}`).textContent);
    expect(new Set(descriptions).size).toBe(3);
  });

  it('removes unused footage at once, and asks before removing footage the reel is using', async () => {
    const onRemove = vi.fn(async () => undefined);
    renderWithProviders(<AssetList assets={[asset({}), asset({ id: 'a2', name: 'intro.mp4' })]} usedAssetIds={new Set(['a2'])} onRemove={onRemove} />);

    fireEvent.click(screen.getByTestId('reel-asset-remove-a1'));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('a1'));
    expect(confirm).not.toHaveBeenCalled();

    confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByTestId('reel-asset-remove-a2'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(confirm.mock.calls[0][0]).toMatchObject({ destructive: true, message: expect.stringContaining('intro.mp4') });
    expect(onRemove).toHaveBeenCalledTimes(1);

    confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByTestId('reel-asset-remove-a2'));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('a2'));
  });
});

describe('DriveBrowser', () => {
  const listing = (entries: ReelDriveEntry[], truncated = false) => ({
    data: { reelDriveFolder: { id: 'root', name: 'Jam shoot', entries, truncated } },
  });
  const mount = (onAdd = vi.fn(async () => undefined), held: string[] = []) => {
    renderWithProviders(<DriveBrowser rootFolderId="root" heldFileIds={new Set(held)} onAdd={onAdd} />);
    return onAdd;
  };

  it('shows the folder loading, then its name', () => {
    answerQuery(REEL_DRIVE_FOLDER, { loading: true });
    const { unmount } = renderWithProviders(<DriveBrowser rootFolderId="root" heldFileIds={new Set()} onAdd={vi.fn()} />);
    // No folder yet: the trail cannot name it, and there is nothing to list.
    expect(screen.queryByText('Jam shoot')).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^reel-drive-file-/)).not.toBeInTheDocument();
    unmount();

    answerQuery(REEL_DRIVE_FOLDER, listing([]));
    mount();
    expect(screen.getByText('Jam shoot')).toBeInTheDocument();
  });

  it('says why a folder could not be opened, and that a long one was cut short', () => {
    answerQuery(REEL_DRIVE_FOLDER, { error: new Error('Google Drive cannot open that folder.') });
    const { unmount } = renderWithProviders(<DriveBrowser rootFolderId="root" heldFileIds={new Set()} onAdd={vi.fn()} />);
    expect(screen.getByTestId('reel-drive-error')).toHaveTextContent('Google Drive cannot open that folder.');
    unmount();

    answerQuery(REEL_DRIVE_FOLDER, listing([entry({})], true));
    mount();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('adds a file to the reel, and ticks one the reel already holds', async () => {
    answerQuery(
      REEL_DRIVE_FOLDER,
      listing([
        entry({ id: 'f1', duration_ms: 12_000, width: 1080, height: 1920, size_bytes: 2_500_000 }),
        entry({ id: 'f2', name: 'cover.png', kind: 'IMAGE' }),
      ])
    );
    const onAdd = mount(undefined, ['f2']);
    expect(screen.getByTestId('reel-drive-file-f1')).toHaveTextContent('0:12');
    expect(screen.getByTestId('reel-drive-file-f1')).toHaveTextContent('1080×1920');
    expect(screen.queryByTestId('reel-drive-add-f2')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-drive-add-f1'));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(['f1']));
  });

  it('steps into a sub-folder and back out by the trail', () => {
    answerQuery(REEL_DRIVE_FOLDER, listing([entry({ id: 'day-1', name: 'Day 1', kind: 'FOLDER' }), entry({ id: 'cam-a', name: 'Camera A', kind: 'FOLDER' })]));
    mount();
    const trail = () => within(screen.getByRole('navigation'));

    fireEvent.click(within(screen.getByTestId('reel-drive-folder-day-1')).getByRole('button'));
    expect(trail().getByText('Day 1')).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId('reel-drive-folder-cam-a')).getByRole('button'));
    // The last step is where we are; the ones before it are links back.
    expect(trail().getAllByRole('button')).toHaveLength(2);

    fireEvent.click(trail().getByRole('button', { name: 'Day 1' }));
    expect(trail().queryByText('Camera A')).not.toBeInTheDocument();
    fireEvent.click(trail().getAllByRole('button')[0]);
    expect(trail().queryByText('Day 1')).not.toBeInTheDocument();
  });

  it('reads the folder again on refresh', () => {
    const refetch = answerQuery(REEL_DRIVE_FOLDER, listing([]));
    mount();
    fireEvent.click(screen.getByTestId('reel-drive-refresh'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('SourcesPanel', () => {
  const status = (configured: boolean) =>
    answerQuery(REEL_DRIVE_STATUS, {
      data: { reelDriveStatus: { configured, service_account_email: configured ? 'reels@duncit-drive.iam.gserviceaccount.com' : '' } },
    });

  it('says Drive is not connected, and offers nothing to browse', () => {
    status(false);
    renderWithProviders(<SourcesPanel project={project({ drive_folder_id: 'root' })} actions={actions()} onEditDetails={vi.fn()} />);
    expect(screen.getByTestId('reel-drive-not-configured')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-drive-browser')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-drive-share-hint')).not.toBeInTheDocument();
  });

  it('asks for a folder link when the reel has none', () => {
    status(true);
    const onEditDetails = vi.fn();
    renderWithProviders(<SourcesPanel project={project()} actions={actions()} onEditDetails={onEditDetails} />);
    expect(screen.getByTestId('reel-drive-share-hint')).toHaveTextContent('reels@duncit-drive.iam.gserviceaccount.com');
    fireEvent.click(screen.getByTestId('reel-drive-add-link'));
    expect(onEditDetails).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('reel-drive-browser')).not.toBeInTheDocument();
  });

  it('shows nothing about Drive until its status is known', () => {
    renderWithProviders(<SourcesPanel project={project({ drive_folder_id: 'root' })} actions={actions()} onEditDetails={vi.fn()} />);
    expect(screen.queryByTestId('reel-drive-not-configured')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-drive-no-folder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-drive-browser')).not.toBeInTheDocument();
  });

  it('browses the reel’s folder, marking what the reel holds and what the edit uses', async () => {
    status(true);
    answerQuery(REEL_DRIVE_FOLDER, {
      data: { reelDriveFolder: { id: 'root', name: 'Jam shoot', truncated: false, entries: [entry({ id: 'drive-a1' }), entry({ id: 'drive-new', name: 'encore.mp4' })] } },
    });
    const studio = actions();
    const onEditDetails = vi.fn();
    renderWithProviders(
      <SourcesPanel
        project={project({
          drive_folder_id: 'root',
          assets: [asset({}), asset({ id: 'logo', kind: 'IMAGE', source: 'UPLOAD', drive_file_id: '', name: 'logo.png' }), asset({ id: 'song', kind: 'AUDIO', name: 'theme.mp3' })],
          spec: specOf(
            [scene({ overlays: [{ id: 'o1', asset_id: 'logo' }] as never }), scene({ id: 's2', asset_id: '' })],
            { asset_id: 'song', volume: 0.6, trim_start_ms: 0 } as ReelProject['spec']['music']
          ),
        })}
        actions={studio}
        onEditDetails={onEditDetails}
      />
    );
    // Held already: a tick, not an add button.
    expect(screen.queryByTestId('reel-drive-add-drive-a1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-drive-add-drive-new'));
    await waitFor(() => expect(studio.addDriveFiles).toHaveBeenCalledWith(['drive-new']));

    // Footage, overlay picture and music are all in use — removing any of them asks first.
    confirm.mockResolvedValue(false);
    for (const id of ['a1', 'logo', 'song']) fireEvent.click(screen.getByTestId(`reel-asset-remove-${id}`));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(3));
    expect(studio.removeAsset).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByTestId('reel-drive-share-hint')).getByRole('button'));
    expect(onEditDetails).toHaveBeenCalledTimes(1);
  });
});

describe('ChatTranscript', () => {
  it('explains what to say before the first request', () => {
    renderWithProviders(<ChatTranscript messages={[]} assets={[]} pending={null} onRestore={vi.fn()} />);
    expect(screen.getByTestId('reel-chat-intro')).toBeInTheDocument();
  });

  it('shows the conversation, the pictures sent with it, and a way back to each edit', async () => {
    const onRestore = vi.fn(async () => undefined);
    renderWithProviders(
      <ChatTranscript
        messages={[
          message({ asset_ids: ['up1', 'gone'] }),
          message({ id: 'm2', role: 'ASSISTANT', text: 'Opened on the drums.', restorable: true }),
          message({ id: 'm3', role: 'ASSISTANT', text: 'OpenAI timed out', failed: true }),
        ]}
        assets={[asset({ id: 'up1', thumbnail_url: 'https://ik.imagekit.io/duncit/ai/reels/poster.png' })]}
        pending={null}
        onRestore={onRestore}
      />
    );
    expect(screen.queryByTestId('reel-chat-intro')).not.toBeInTheDocument();
    // Only the picture the reel still holds is shown.
    expect(screen.getByTestId('reel-chat-message-m1').querySelectorAll('img')).toHaveLength(1);
    expect(screen.getByTestId('reel-chat-message-m2')).toHaveTextContent('Opened on the drums.');
    // A failed reply says so in words, with the reason.
    expect(screen.getByTestId('reel-chat-message-m3')).toHaveTextContent('OpenAI timed out');
    expect(screen.getByTestId('reel-chat-message-m3').textContent).not.toBe('OpenAI timed out');

    expect(screen.queryByTestId('reel-chat-restore-m1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-chat-restore-m2'));
    expect(onRestore).toHaveBeenCalledWith('m2');
  });

  it('draws the request at once and holds the reply’s place while the editor works', () => {
    renderWithProviders(
      <ChatTranscript
        messages={[]}
        assets={[]}
        pending={{ text: 'make it punchy', imageUrls: ['https://ik.imagekit.io/duncit/ai/reels/poster.png'] }}
        onRestore={vi.fn()}
      />
    );
    expect(screen.queryByTestId('reel-chat-intro')).not.toBeInTheDocument();
    expect(screen.getByTestId('reel-chat-pending')).toHaveTextContent('make it punchy');
    expect(screen.getByTestId('reel-chat-working')).toBeInTheDocument();
  });
});

describe('ChatBubble', () => {
  const TONES: BubbleTone[] = ['operator', 'editor', 'failed'];
  /** The bubble's fill in each tone, as the theme resolved it. */
  const fills = (mode: 'light' | 'dark') => {
    const { unmount } = render(
      <ThemeProvider theme={createTheme({ palette: { mode } })}>
        {TONES.map((tone) => (
          <ChatBubble key={tone} tone={tone} text="Opened on the drums." testId={`bubble-${tone}`} />
        ))}
      </ThemeProvider>
    );
    const colours = TONES.map((tone) => getComputedStyle(screen.getByTestId(`bubble-${tone}`)).backgroundColor);
    unmount();
    return colours;
  };

  it('tints each tone differently, and more strongly on a dark theme', () => {
    const light = fills('light');
    const dark = fills('dark');
    expect(new Set(light).size).toBe(3);
    expect(new Set(dark).size).toBe(3);
    // The operator's and the failed reply's tints are theme-dependent strengths.
    expect(dark[0]).not.toBe(light[0]);
    expect(dark[2]).not.toBe(light[2]);
  });
});

describe('ChatPanel', () => {
  it('puts the transcript above the composer and restores a version through the studio', () => {
    answerQuery(AI_PROMPTS, { data: { aiPrompts: [] } });
    const studio = actions();
    renderWithProviders(
      <ChatPanel project={project({ messages: [message({ id: 'm2', role: 'ASSISTANT', text: 'Done.', restorable: true })] })} actions={studio} />
    );
    expect(screen.getByTestId('reel-chat-panel')).toBeInTheDocument();
    expect(screen.getByTestId('reel-chat-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-chat-restore-m2'));
    expect(studio.restoreVersion).toHaveBeenCalledWith('m2');
  });
});

describe('PreviewPane', () => {
  it.each([
    [[], false],
    [[asset({})], true],
  ])('explains an empty reel, with footage %# or without', (assets, hasFootage) => {
    const { unmount } = renderWithProviders(<PreviewPane project={project({ assets })} />);
    const empty = screen.getByTestId('reel-preview-empty').textContent;
    expect(screen.queryByTestId('reel-player')).not.toBeInTheDocument();
    unmount();

    // The hint differs: one says add footage, the other says ask for a first cut.
    renderWithProviders(<PreviewPane project={project({ assets: hasFootage ? [] : [asset({})] })} />);
    expect(screen.getByTestId('reel-preview-empty').textContent).not.toBe(empty);
  });

  it('plays the reel and hands the mounted player to the studio', () => {
    const spec = { ...specOf([scene({}), scene({ id: 's2', asset_id: '', transition: 'FADE', transition_ms: 500 })]), background: '#101010' };
    const onPlayer = vi.fn();
    renderWithProviders(<PreviewPane project={project({ assets: [asset({})], spec })} onPlayer={onPlayer} />);

    expect(screen.getByTestId('reel-player')).toBeInTheDocument();
    expect(player.props).toMatchObject({
      durationInFrames: 105,
      compositionWidth: 1080,
      compositionHeight: 1920,
      fps: 30,
      inputProps: { spec, assets: [expect.objectContaining({ id: 'a1' })] },
    });

    // The timeline follows and moves the playhead through this handle.
    expect(onPlayer).toHaveBeenCalledWith(expect.objectContaining({ seekTo: player.seekTo }));
  });

  it('draws the frame the reel’s aspect asks for, and the safe-zone guides on request', () => {
    const spec = { ...specOf([scene({})]), aspect: 'LANDSCAPE' as const };
    renderWithProviders(<PreviewPane project={project({ assets: [asset({})], spec })} />);
    expect(player.props).toMatchObject({ compositionWidth: 1920, compositionHeight: 1080 });

    expect(screen.queryByTestId('reel-safe-zones')).not.toBeInTheDocument();
    const toggle = screen.getByTestId('reel-safe-zones-toggle');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('reel-safe-zone-top')).toHaveStyle({ height: '15%' });
    expect(screen.getByTestId('reel-safe-zone-bottom')).toHaveStyle({ height: '20%' });
    fireEvent.click(toggle);
    expect(screen.queryByTestId('reel-safe-zones')).not.toBeInTheDocument();
  });
});

describe('ExportDialog', () => {
  const exporter = (state: ReelExport['state']): ReelExport => ({
    state,
    start: vi.fn(async () => undefined),
    cancel: vi.fn(),
    dismiss: vi.fn(),
    save: vi.fn(),
  });
  const poster = (state: ReelPost['state'] = { phase: 'idle' }, posted = true): ReelPost => ({
    state,
    post: vi.fn(async () => posted),
    dismiss: vi.fn(),
    composer: null,
    closeComposer: vi.fn(),
  });
  const file = new File(['mp4'], 'jam-night-recap.mp4', { type: 'video/mp4' });
  const mount = (render: ReelExport, posting: ReelPost = poster()) =>
    renderWithProviders(<ExportDialog exporter={render} poster={posting} />);

  it('is not there while nothing is exporting', () => {
    mount(exporter({ phase: 'idle' }));
    expect(screen.queryByTestId('reel-export-dialog')).not.toBeInTheDocument();
  });

  it('shows how far the render has got, and can be cancelled', () => {
    const running = exporter({ phase: 'rendering', progress: 0.426 });
    mount(running);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '43');
    expect(screen.getByRole('status')).toHaveTextContent('43% rendered');
    fireEvent.click(screen.getByTestId('reel-export-cancel'));
    expect(running.cancel).toHaveBeenCalledTimes(1);
  });

  it('says the footage is downloading before any frame is drawn', () => {
    mount(exporter({ phase: 'downloading', progress: 0.5 }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('status')).toHaveTextContent('Downloading the footage — 50%');
  });

  it('says why a render failed, and offers to try again or close', () => {
    const failed = exporter({ phase: 'failed', message: 'This browser cannot encode H.264.' });
    mount(failed);
    expect(screen.getByTestId('reel-export-error')).toHaveTextContent('The reel could not be exported: This browser cannot encode H.264.');
    fireEvent.click(screen.getByTestId('reel-export-retry'));
    expect(failed.start).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('reel-export-close'));
    expect(failed.dismiss).toHaveBeenCalledTimes(1);
  });

  it('offers a rendered reel to save, to post to social, or to leave', () => {
    const ready = exporter({ phase: 'rendered', file });
    mount(ready);
    expect(screen.getByRole('dialog')).toHaveTextContent('Your reel is ready');
    expect(screen.getByTestId('reel-export-ready')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-export-save'));
    expect(ready.save).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('reel-export-close'));
    expect(ready.dismiss).toHaveBeenCalledTimes(1);
  });

  it('hands the rendered file to the poster, and closes once the composer is open', async () => {
    const ready = exporter({ phase: 'rendered', file });
    const posting = poster();
    mount(ready, posting);
    fireEvent.click(screen.getByTestId('reel-export-post'));
    expect(posting.post).toHaveBeenCalledWith(file);
    await waitFor(() => expect(ready.dismiss).toHaveBeenCalledTimes(1));
  });

  it('stays open when the post did not go through', async () => {
    const ready = exporter({ phase: 'rendered', file });
    const posting = poster({ phase: 'idle' }, false);
    mount(ready, posting);
    fireEvent.click(screen.getByTestId('reel-export-post'));
    await waitFor(() => expect(posting.post).toHaveBeenCalledTimes(1));
    expect(ready.dismiss).not.toHaveBeenCalled();
  });

  it('shows the upload in the same bar, with no way to cancel it', () => {
    mount(exporter({ phase: 'rendered', file }), poster({ phase: 'uploading', progress: 0.5 }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Upload progress');
    expect(screen.getByRole('status')).toHaveTextContent('Uploading the reel — 50%');
    expect(screen.queryByTestId('reel-export-cancel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-export-post')).not.toBeInTheDocument();
  });

  it('says why a post failed, keeps the rendered reel, and can try the upload again', () => {
    const ready = exporter({ phase: 'rendered', file });
    const posting = poster({ phase: 'failed', message: 'Upload is not available right now' });
    mount(ready, posting);
    expect(screen.getByTestId('reel-export-error')).toHaveTextContent('The reel could not be posted: Upload is not available right now');
    fireEvent.click(screen.getByTestId('reel-export-retry'));
    expect(posting.post).toHaveBeenCalledWith(file);
    expect(ready.start).not.toHaveBeenCalled();
    // Close goes back to the rendered reel, not out of the export: it can still be saved.
    fireEvent.click(screen.getByTestId('reel-export-close'));
    expect(posting.dismiss).toHaveBeenCalledTimes(1);
    expect(ready.dismiss).not.toHaveBeenCalled();
  });
});

describe('StudioToolbar', () => {
  const tools = () => ({ onEditDetails: vi.fn(), onTool: vi.fn(), onCover: vi.fn(), onExport: vi.fn(async () => undefined) });

  it('names the reel and will not export, validate or cover one with nothing in it', () => {
    const handlers = tools();
    renderWithProviders(<StudioToolbar project={project()} checks={[]} settingCover={false} {...handlers} />);
    expect(screen.getByText('Jam night recap')).toBeInTheDocument();
    expect(screen.getByTestId('reel-studio-export')).toBeDisabled();
    expect(screen.getByTestId('reel-studio-validate')).toBeDisabled();
    expect(screen.getByTestId('reel-studio-cover')).toBeDisabled();
    expect(screen.queryByTestId('reel-checks-chip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-cover-chip')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-studio-edit-details'));
    expect(handlers.onEditDetails).toHaveBeenCalledTimes(1);
  });

  it('summarises the reel, says how the checks stand and where the cover is, and opens every tool', () => {
    const handlers = tools();
    const reel = project({ duration_ms: 84_000, cover_at_ms: 3000, spec: specOf([scene({}), scene({ id: 's2' })]) });
    const { unmount } = renderWithProviders(
      <StudioToolbar project={reel} checks={[{ name: 'length', pass: true, detail: '' }, { name: 'sound', pass: false, detail: 'Silent' }]} settingCover={false} {...handlers} />
    );
    expect(screen.getByTestId('reel-studio-summary')).toHaveTextContent('1:24');
    expect(screen.getByTestId('reel-checks-chip')).toHaveTextContent('1 check needs attention');
    expect(screen.getByTestId('reel-cover-chip')).toHaveTextContent('0:03');

    fireEvent.click(screen.getByTestId('reel-studio-export'));
    expect(handlers.onExport).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('reel-studio-cover'));
    expect(handlers.onCover).toHaveBeenCalledTimes(1);
    for (const kind of ['validate', 'variants', 'history', 'analytics']) fireEvent.click(screen.getByTestId(`reel-studio-${kind}`));
    expect(handlers.onTool.mock.calls.map(([kind]) => kind)).toEqual(['validate', 'variants', 'history', 'analytics']);

    // rerender would drop the router the toolbar's links need, so the passing reel is drawn afresh.
    unmount();
    renderWithProviders(<StudioToolbar project={reel} checks={[{ name: 'length', pass: true, detail: '' }]} settingCover={false} {...handlers} />);
    expect(screen.getByTestId('reel-checks-chip')).toHaveTextContent('All checks pass');
  });
});

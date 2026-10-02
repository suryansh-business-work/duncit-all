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
import MediaThumb from '../../src/pages/reels/studio/MediaThumb';
import PreviewPane from '../../src/pages/reels/studio/preview/PreviewPane';
import AssetList from '../../src/pages/reels/studio/sources/AssetList';
import DriveBrowser from '../../src/pages/reels/studio/sources/DriveBrowser';
import SourcesPanel from '../../src/pages/reels/studio/sources/SourcesPanel';
import StudioToolbar from '../../src/pages/reels/studio/StudioToolbar';
import type { ReelActions } from '../../src/pages/reels/studio/useReelActions';
import type { ReelAsset, ReelDriveEntry, ReelMessage, ReelProject, ReelScene } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { answerQuery, resetApollo } from './reel-apollo-mock';

const confirm = vi.hoisted(() => vi.fn());
const player = vi.hoisted(() => ({ seekTo: vi.fn(), props: {} as Record<string, unknown> }));

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
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
    spec: { fps: 30, width: 1080, height: 1920, background: '#000000', music: null, scenes: [] },
    ...over,
  }) as ReelProject;

const actions = (): ReelActions => ({
  addDriveFiles: vi.fn(async () => undefined),
  adding: false,
  removeAsset: vi.fn(async () => undefined),
  restoreVersion: vi.fn(async () => undefined),
  saveDetails: vi.fn(async () => true),
  saving: false,
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
          spec: {
            fps: 30,
            width: 1080,
            height: 1920,
            background: '#000000',
            music: { asset_id: 'song', volume: 0.6, trim_start_ms: 0 },
            scenes: [scene({ overlays: [{ id: 'o1', asset_id: 'logo' }] as never }), scene({ id: 's2', asset_id: '' })],
          } as ReelProject['spec'],
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
    expect(screen.queryByTestId('reel-scene-strip')).not.toBeInTheDocument();
    unmount();

    // The hint differs: one says add footage, the other says ask for a first cut.
    renderWithProviders(<PreviewPane project={project({ assets: hasFootage ? [] : [asset({})] })} />);
    expect(screen.getByTestId('reel-preview-empty').textContent).not.toBe(empty);
  });

  it('plays the reel and jumps to a scene from the strip', () => {
    const spec = {
      fps: 30,
      width: 1080,
      height: 1920,
      background: '#101010',
      music: null,
      scenes: [scene({}), scene({ id: 's2', asset_id: '', transition: 'FADE', transition_ms: 500 })],
    } as ReelProject['spec'];
    renderWithProviders(<PreviewPane project={project({ assets: [asset({})], spec })} />);

    expect(screen.getByTestId('reel-player')).toBeInTheDocument();
    expect(player.props).toMatchObject({
      durationInFrames: 105,
      compositionWidth: 1080,
      compositionHeight: 1920,
      fps: 30,
      inputProps: { spec, assets: [expect.objectContaining({ id: 'a1' })] },
    });

    fireEvent.click(screen.getByTestId('reel-scene-s1'));
    expect(player.seekTo).toHaveBeenLastCalledWith(0);
    // Past the overlap, so the jump lands on the scene itself.
    fireEvent.click(screen.getByTestId('reel-scene-s2'));
    expect(player.seekTo).toHaveBeenLastCalledWith(60);
  });
});

describe('ExportDialog', () => {
  const exporter = (state: ReelExport['state']): ReelExport => ({
    state,
    start: vi.fn(async () => undefined),
    cancel: vi.fn(),
    dismiss: vi.fn(),
  });

  it('is not there while nothing is exporting', () => {
    renderWithProviders(<ExportDialog exporter={exporter({ phase: 'idle' })} />);
    expect(screen.queryByTestId('reel-export-dialog')).not.toBeInTheDocument();
  });

  it('shows how far the render has got, and can be cancelled', () => {
    const running = exporter({ phase: 'rendering', progress: 0.426 });
    renderWithProviders(<ExportDialog exporter={running} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '43');
    fireEvent.click(screen.getByTestId('reel-export-cancel'));
    expect(running.cancel).toHaveBeenCalledTimes(1);
  });

  it('says why a render failed, and offers to try again or close', () => {
    const failed = exporter({ phase: 'failed', message: 'This browser cannot encode H.264.' });
    renderWithProviders(<ExportDialog exporter={failed} />);
    expect(screen.getByTestId('reel-export-error')).toHaveTextContent('This browser cannot encode H.264.');
    fireEvent.click(screen.getByTestId('reel-export-retry'));
    expect(failed.start).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('reel-export-close'));
    expect(failed.dismiss).toHaveBeenCalledTimes(1);
  });
});

describe('StudioToolbar', () => {
  it('names the reel and will not export one with nothing in it', () => {
    const onEditDetails = vi.fn();
    renderWithProviders(<StudioToolbar project={project()} onEditDetails={onEditDetails} onExport={vi.fn()} />);
    expect(screen.getByText('Jam night recap')).toBeInTheDocument();
    expect(screen.getByTestId('reel-studio-export')).toBeDisabled();
    fireEvent.click(screen.getByTestId('reel-studio-edit-details'));
    expect(onEditDetails).toHaveBeenCalledTimes(1);
  });

  it('summarises the reel and exports it', () => {
    const onExport = vi.fn(async () => undefined);
    renderWithProviders(
      <StudioToolbar
        project={project({ duration_ms: 84_000, spec: { scenes: [scene({}), scene({ id: 's2' })] } as ReelProject['spec'] })}
        onEditDetails={vi.fn()}
        onExport={onExport}
      />
    );
    expect(screen.getByTestId('reel-studio-summary')).toHaveTextContent('1:24');
    fireEvent.click(screen.getByTestId('reel-studio-export'));
    expect(onExport).toHaveBeenCalledTimes(1);
  });
});

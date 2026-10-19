import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen } from '@testing-library/react';
import type { ReelAsset, ReelOverlay, ReelScene, ReelSpec, ReelText } from '@duncit/gql-types';
import type { CallbackListener, PlayerRef } from '@remotion/player';
import { SAVE_REEL_SPEC } from '../../src/pages/reels/queries';
import type { ReelSelection } from '../../src/pages/reels/editor/layout';
import { usePlayerFrame } from '../../src/pages/reels/editor/usePlayerFrame';
import { useSpecEditor, type SpecEditor } from '../../src/pages/reels/editor/useSpecEditor';
import InspectorPanel from '../../src/pages/reels/studio/inspector/InspectorPanel';
import TimelinePanel from '../../src/pages/reels/studio/timeline/TimelinePanel';
import { tickSeconds } from '../../src/pages/reels/studio/timeline/geometry';
import { useTimelineActions } from '../../src/pages/reels/studio/timeline/useTimelineActions';
import type { ReelProject } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { mutationOf, resetApollo } from './reel-apollo-mock';
import { en } from './automation-fixtures';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const video = { id: 'a1', kind: 'VIDEO', name: 'jam.mp4', url: 'https://server.duncit.com/reels/media/t1', thumbnail_url: '', duration_ms: 6000 } as ReelAsset;
const logo = { id: 'a2', kind: 'IMAGE', name: 'logo.png', url: 'https://ik.imagekit.io/duncit/logo.png', thumbnail_url: '', duration_ms: 0 } as ReelAsset;
const song = { id: 'a3', kind: 'AUDIO', name: 'song.mp3', url: 'https://server.duncit.com/reels/media/t3', thumbnail_url: '', duration_ms: 90_000 } as ReelAsset;

const text = (id: string): ReelText =>
  ({ id, text: 'Sunday Jam', position: 'BOTTOM', style: 'TITLE', animation: 'NONE', start_ms: 0, duration_ms: 0, color: '#FFFFFF', background: '' }) as ReelText;

const overlay = (id: string, asset_id = 'a2'): ReelOverlay =>
  ({ id, asset_id, corner: 'TOP_RIGHT', width_pct: 30, opacity: 1, start_ms: 0, duration_ms: 0 }) as ReelOverlay;

const scene = (id: string, duration_ms: number, extra: Partial<ReelScene> = {}): ReelScene =>
  ({
    id,
    asset_id: 'a1',
    duration_ms,
    trim_start_ms: 0,
    volume: 1,
    playback_rate: 1,
    fit: 'COVER',
    motion: 'NONE',
    transition: 'NONE',
    transition_ms: 0,
    background: '#000000',
    texts: [],
    overlays: [],
    ...extra,
  }) as ReelScene;

const specOf = (scenes: ReelScene[], music: ReelSpec['music'] = null): ReelSpec =>
  ({ fps: 30, width: 1080, height: 1920, background: '#000000', music, scenes }) as ReelSpec;

beforeEach(() => {
  resetApollo();
  // The server answers with the spec it was sent, as it does after sanitizing.
  mutationOf(SAVE_REEL_SPEC).mockImplementation(async (options) => ({
    data: { saveReelSpec: { id: 'reel-1', spec: JSON.parse(String(options?.variables?.spec_json)) } },
  }));
});

/** The actions on a reel held in a variable, so each edit's result can be read back. */
function actionsOn(initial: ReelSpec, selection: ReelSelection | null, playheadMs = 0) {
  let spec = initial;
  const apply = vi.fn((change: (current: ReelSpec) => ReelSpec) => {
    spec = change(spec);
  });
  const onSelect = vi.fn();
  const { result } = renderHook(() => useTimelineActions({ spec: initial, playheadMs, selection, onSelect, apply }));
  return { actions: result.current, apply, onSelect, current: () => spec };
}

describe('useTimelineActions', () => {
  it('offers only a new scene on an empty reel, and does nothing for the rest', () => {
    const { actions, apply, onSelect, current } = actionsOn(specOf([]), null);
    expect(actions.can).toMatchObject({ addScene: true, addText: false, addOverlay: false, split: false, duplicate: false, remove: false });

    actions.addTextHere();
    actions.addOverlayOf(logo);
    actions.split();
    actions.duplicate();
    actions.remove();
    actions.move(1);
    expect(apply).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();

    actions.addSceneOf(null);
    expect(current().scenes).toHaveLength(1);
    // A colour card: no footage behind it.
    expect(current().scenes[0].asset_id).toBe('');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'scene', sceneId: current().scenes[0].id });
  });

  it('adds to the scene under the playhead when the selected scene is gone', () => {
    const { actions, onSelect, current } = actionsOn(specOf([scene('s1', 3000), scene('s2', 2000)]), { kind: 'scene', sceneId: 'gone' }, 3500);
    actions.addTextHere();
    const added = current().scenes[1].texts;
    expect(added).toHaveLength(1);
    expect(onSelect).toHaveBeenCalledWith({ kind: 'text', sceneId: 's2', itemId: added[0].id });
    // A selection that is gone has no place in the order to move from.
    expect(actions.can).toMatchObject({ moveEarlier: false, moveLater: false });
  });

  it('puts music under the reel and selects it, and takes it away again', () => {
    const { actions, onSelect, current } = actionsOn(specOf([scene('s1', 3000)]), null);
    actions.chooseMusic(song);
    expect(current().music).toMatchObject({ asset_id: 'a3' });
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'music' });

    actions.chooseMusic(null);
    expect(current().music).toBeNull();
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it('removes the selected music, text or overlay, and clears the selection', () => {
    const reel = specOf([scene('s1', 3000, { texts: [text('t1')], overlays: [overlay('o1')] })], { asset_id: 'a3', volume: 0.6, trim_start_ms: 0 } as ReelSpec['music']);

    const music = actionsOn(reel, { kind: 'music' });
    music.actions.remove();
    expect(music.current().music).toBeNull();
    expect(music.current().scenes[0].texts).toHaveLength(1);
    expect(music.onSelect).toHaveBeenCalledWith(null);

    const words = actionsOn(reel, { kind: 'text', sceneId: 's1', itemId: 't1' });
    words.actions.remove();
    expect(words.current().scenes[0].texts).toEqual([]);
    expect(words.current().scenes[0].overlays).toHaveLength(1);
    expect(words.current().music).not.toBeNull();

    const picture = actionsOn(reel, { kind: 'overlay', sceneId: 's1', itemId: 'o1' });
    picture.actions.remove();
    expect(picture.current().scenes[0].overlays).toEqual([]);
    expect(picture.current().scenes[0].texts).toHaveLength(1);
    expect(picture.onSelect).toHaveBeenCalledWith(null);
  });
});

describe('tickSeconds', () => {
  it('spaces ruler labels at least 64 px apart, and at most a minute when zoomed right out', () => {
    expect(tickSeconds(80)).toBe(1);
    expect(tickSeconds(30)).toBe(5);
    expect(tickSeconds(1)).toBe(60);
  });
});

describe('usePlayerFrame', () => {
  it('stays at frame 0 until there is a player', () => {
    const { result } = renderHook(() => usePlayerFrame(null));
    expect(result.current).toBe(0);
  });

  it('follows the player as it plays and as it is scrubbed, and lets go on unmount', () => {
    const listeners: Record<string, CallbackListener<'frameupdate'> | CallbackListener<'seeked'>> = {};
    const player = {
      getCurrentFrame: () => 12,
      addEventListener: (name: string, listener: CallbackListener<'frameupdate'>) => {
        listeners[name] = listener;
      },
      removeEventListener: vi.fn(),
    } as unknown as PlayerRef;
    const { result, unmount } = renderHook(() => usePlayerFrame(player));
    expect(result.current).toBe(12);

    act(() => (listeners.frameupdate as CallbackListener<'frameupdate'>)({ detail: { frame: 40 } } as Parameters<CallbackListener<'frameupdate'>>[0]));
    expect(result.current).toBe(40);
    act(() => (listeners.seeked as CallbackListener<'seeked'>)({ detail: { frame: 5 } } as Parameters<CallbackListener<'seeked'>>[0]));
    expect(result.current).toBe(5);

    unmount();
    expect(player.removeEventListener).toHaveBeenCalledWith('frameupdate', listeners.frameupdate);
    expect(player.removeEventListener).toHaveBeenCalledWith('seeked', listeners.seeked);
  });
});

const projectOf = (spec: ReelSpec): ReelProject => ({ id: 'reel-1', name: 'Jam night recap', assets: [video, logo, song], spec }) as unknown as ReelProject;

/** The timeline and the inspector on one editor, as the studio wires them. */
function Editor({ project, player = null }: Readonly<{ project: ReelProject; player?: PlayerRef | null }>) {
  const editor = useSpecEditor(project);
  const [selection, setSelection] = useState<ReelSelection | null>(null);
  return (
    <>
      <TimelinePanel assets={project.assets} player={player} selection={selection} onSelect={setSelection} editor={editor} />
      <InspectorPanel spec={editor.spec} assets={project.assets} selection={selection} apply={editor.apply} />
    </>
  );
}

const fakePlayer = () =>
  ({ seekTo: vi.fn(), getCurrentFrame: vi.fn(() => 0), addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as PlayerRef;

describe('TimelinePanel', () => {
  const music = { asset_id: 'a3', volume: 0.6, trim_start_ms: 0 } as ReelSpec['music'];

  it('opens a text, an overlay and the music in the inspector from their blocks', () => {
    renderWithProviders(<Editor project={projectOf(specOf([scene('s1', 3000, { texts: [text('t1')], overlays: [overlay('o1')] })], music))} />);
    fireEvent.click(screen.getByTestId('reel-track-text-t1'));
    expect(screen.getByTestId('reel-track-text-t1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('reel-text-words')).toHaveValue('Sunday Jam');

    fireEvent.click(screen.getByTestId('reel-track-overlays-o1'));
    expect(screen.getByTestId('reel-overlay-form')).toBeInTheDocument();
    expect(screen.getByTestId('reel-track-text-t1')).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('reel-track-music-music'));
    expect(screen.getByTestId('reel-music-form')).toBeInTheDocument();
    expect(screen.getByTestId('reel-track-music-music')).toHaveAttribute('aria-pressed', 'true');
  });

  it('names an overlay and music whose file is gone without inventing a name', () => {
    const lost = { asset_id: 'deleted-song', volume: 0.6, trim_start_ms: 0 } as ReelSpec['music'];
    renderWithProviders(<Editor project={projectOf(specOf([scene('s1', 3000, { overlays: [overlay('o1', 'deleted-logo')] })], lost))} />);
    expect(screen.getByTestId('reel-track-overlays-o1')).toHaveAttribute('aria-label', en('ai.reels.editor.overlayBlock', { name: '' }));
    expect(screen.getByTestId('reel-track-music-music')).toHaveAttribute('aria-label', en('ai.reels.editor.musicBlock', { name: '' }));
  });

  it('leaves Delete to a field being typed in', () => {
    renderWithProviders(<Editor project={projectOf(specOf([scene('s1', 3000), scene('s2', 2000)]))} />);
    fireEvent.click(screen.getByTestId('reel-timeline-scene-s1'));
    const zoom = screen.getByRole('slider', { name: en('ai.reels.editor.zoomLabel') });
    fireEvent.keyDown(zoom, { key: 'Delete' });
    expect(screen.getAllByTestId(/^reel-timeline-scene-/)).toHaveLength(2);
    // The same key from the timeline itself does remove the scene.
    fireEvent.keyDown(screen.getByTestId('reel-timeline'), { key: 'Delete' });
    expect(screen.getAllByTestId(/^reel-timeline-scene-/)).toHaveLength(1);
  });

  it('moves the selected scene later, and zooms the tracks from the slider', () => {
    renderWithProviders(<Editor project={projectOf(specOf([scene('s1', 3000), scene('s2', 2000)]))} />);
    fireEvent.click(screen.getByTestId('reel-timeline-scene-s1'));
    fireEvent.click(screen.getByTestId('reel-move-later'));
    expect(screen.getAllByTestId(/^reel-timeline-scene-/).map((block) => block.dataset.testid)).toEqual([
      'reel-timeline-scene-s2',
      'reel-timeline-scene-s1',
    ]);

    const zoom = screen.getByRole('slider', { name: en('ai.reels.editor.zoomLabel') });
    fireEvent.change(zoom, { target: { value: '160' } });
    expect(zoom).toHaveAttribute('aria-valuenow', '160');
  });

  it('flags a save that failed in red', () => {
    const editor = {
      spec: specOf([scene('s1', 3000)]),
      apply: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false,
      saveState: 'failed',
    } as unknown as SpecEditor;
    renderWithProviders(<TimelinePanel assets={[video]} player={null} selection={null} onSelect={vi.fn()} editor={editor} />);
    const state = screen.getByTestId('reel-save-state');
    expect(state).toHaveTextContent(en('ai.reels.editor.failedState'));
    expect(state).toHaveClass('MuiChip-colorError');
  });
});

describe('Timeline pointer capture', () => {
  const original = HTMLElement.prototype.setPointerCapture;
  let capture: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    capture = vi.fn();
    HTMLElement.prototype.setPointerCapture = capture as unknown as typeof HTMLElement.prototype.setPointerCapture;
  });

  afterEach(() => {
    // jsdom has no pointer capture of its own; put back exactly what was there.
    if (original) HTMLElement.prototype.setPointerCapture = original;
    else Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
  });

  it('keeps a resize drag on its handle and a scrub on the ruler when the pointer leaves them', () => {
    const player = fakePlayer();
    renderWithProviders(<Editor project={projectOf(specOf([scene('s1', 3000)]))} player={player} />);
    fireEvent.pointerDown(screen.getByTestId('reel-timeline-resize-s1'), { clientX: 100, pointerId: 7 });
    expect(capture).toHaveBeenLastCalledWith(7);
    fireEvent.pointerUp(screen.getByTestId('reel-timeline-resize-s1'), { pointerId: 7 });

    fireEvent.pointerDown(screen.getByTestId('reel-timeline-ruler'), { clientX: 80, pointerId: 9 });
    expect(capture).toHaveBeenLastCalledWith(9);
    expect(player.seekTo).toHaveBeenLastCalledWith(30);
  });

  it('ignores a key the ruler has no move for', () => {
    const player = fakePlayer();
    renderWithProviders(<Editor project={projectOf(specOf([scene('s1', 3000)]))} player={player} />);
    fireEvent.keyDown(screen.getByTestId('reel-timeline-ruler'), { key: 'a' });
    expect(player.seekTo).not.toHaveBeenCalled();
  });
});

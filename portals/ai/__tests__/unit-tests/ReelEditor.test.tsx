import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, within } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import type { ReelAsset, ReelScene, ReelSpec } from '@duncit/gql-types';
import type { PlayerRef } from '@remotion/player';
import { SAVE_REEL_SPEC } from '../../src/pages/reels/queries';
import type { ReelSelection } from '../../src/pages/reels/editor/layout';
import { SAVE_DELAY_MS, useSpecEditor } from '../../src/pages/reels/editor/useSpecEditor';
import InspectorPanel from '../../src/pages/reels/studio/inspector/InspectorPanel';
import TimelinePanel from '../../src/pages/reels/studio/timeline/TimelinePanel';
import type { ReelProject } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { mutationOf, resetApollo } from './reel-apollo-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('@duncit/logs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/logs')>();
  return { ...actual, logs: { ...actual.logs, portal: { ...actual.logs.portal, ai: { error: vi.fn() } } } };
});

const video = { id: 'a1', kind: 'VIDEO', name: 'jam.mp4', url: 'https://server.duncit.com/reels/media/t1', thumbnail_url: '', duration_ms: 6000 } as ReelAsset;
const logo = { id: 'a2', kind: 'IMAGE', name: 'logo.png', url: 'https://ik.imagekit.io/duncit/logo.png', thumbnail_url: '', duration_ms: 0 } as ReelAsset;
const song = { id: 'a3', kind: 'AUDIO', name: 'song.mp3', url: 'https://server.duncit.com/reels/media/t3', thumbnail_url: '', duration_ms: 90_000 } as ReelAsset;

const scene = (id: string, duration_ms: number, extra: Partial<ReelScene> = {}): ReelScene => ({
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
});

const specOf = (scenes: ReelScene[]): ReelSpec =>
  ({ fps: 30, width: 1080, height: 1920, background: '#000000', music: null, scenes }) as ReelSpec;

const projectOf = (spec: ReelSpec): ReelProject => ({ id: 'reel-1', name: 'Jam night recap', assets: [video, logo, song], spec }) as unknown as ReelProject;

/** The save mutation, answering with the spec it was sent — as the server does after sanitizing. */
function echoSave() {
  const save = mutationOf(SAVE_REEL_SPEC);
  save.mockImplementation(async (options) => ({
    data: { saveReelSpec: { id: 'reel-1', spec: JSON.parse(String(options?.variables?.spec_json)) } },
  }));
  return save;
}

beforeEach(() => {
  resetApollo();
  vi.mocked(notifyError).mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSpecEditor', () => {
  const project = projectOf(specOf([scene('s1', 3000), scene('s2', 2000)]));
  const shorten = (spec: ReelSpec) => ({ ...spec, scenes: spec.scenes.slice(0, 1) });

  it('draws an edit at once and saves it a moment later', async () => {
    const save = echoSave();
    const { result } = renderHook(() => useSpecEditor(project));
    expect(result.current).toMatchObject({ saveState: 'saved', canUndo: false, canRedo: false });

    act(() => result.current.apply(shorten));
    expect(result.current.spec.scenes).toHaveLength(1);
    expect(result.current.saveState).toBe('pending');
    expect(save).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(SAVE_DELAY_MS));
    expect(save).toHaveBeenCalledTimes(1);
    const sent = save.mock.calls[0][0]?.variables;
    expect(sent?.project_id).toBe('reel-1');
    expect(JSON.parse(String(sent?.spec_json)).scenes).toHaveLength(1);
    expect(result.current.saveState).toBe('saved');
  });

  it('coalesces a burst of edits into one save, and ignores an edit that changes nothing', async () => {
    const save = echoSave();
    const { result } = renderHook(() => useSpecEditor(project));
    act(() => result.current.apply((spec) => spec));
    expect(result.current.saveState).toBe('saved');
    act(() => result.current.apply(shorten));
    act(() => result.current.apply((spec) => ({ ...spec, background: '#101010' })));
    await act(() => vi.advanceTimersByTimeAsync(SAVE_DELAY_MS));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('undoes and redoes, saving each step', async () => {
    const save = echoSave();
    const { result } = renderHook(() => useSpecEditor(project));
    act(() => result.current.apply(shorten));
    act(() => result.current.undo());
    expect(result.current.spec.scenes).toHaveLength(2);
    expect(result.current).toMatchObject({ canUndo: false, canRedo: true });
    act(() => result.current.redo());
    expect(result.current.spec.scenes).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    // Nothing more to undo or redo past either end.
    act(() => result.current.redo());
    act(() => result.current.undo());
    act(() => result.current.undo());
    expect(result.current.spec.scenes).toHaveLength(2);
    await act(() => vi.advanceTimersByTimeAsync(SAVE_DELAY_MS));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('takes a reel the chat changed on the server, unless a hand edit is waiting', () => {
    echoSave();
    const { result, rerender } = renderHook(({ current }) => useSpecEditor(current), { initialProps: { current: project } });
    const fromChat = projectOf(specOf([scene('s9', 4000)]));
    rerender({ current: fromChat });
    expect(result.current.spec.scenes.map((item) => item.id)).toEqual(['s9']);

    act(() => result.current.apply((spec) => ({ ...spec, background: '#222222' })));
    rerender({ current: projectOf(specOf([scene('s7', 1000)])) });
    expect(result.current.spec.background).toBe('#222222');
  });

  it('says so when a save fails, and keeps the edit on screen', async () => {
    mutationOf(SAVE_REEL_SPEC).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useSpecEditor(project));
    act(() => result.current.apply(shorten));
    await act(() => vi.advanceTimersByTimeAsync(SAVE_DELAY_MS));
    expect(result.current.saveState).toBe('failed');
    expect(result.current.spec.scenes).toHaveLength(1);
    expect(notifyError).toHaveBeenCalledTimes(1);
  });

  it('keeps an edit made while a save is out, and saves it next', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const save = mutationOf(SAVE_REEL_SPEC);
    save.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useSpecEditor(project));
    act(() => result.current.apply(shorten));
    await act(() => vi.advanceTimersByTimeAsync(SAVE_DELAY_MS));
    expect(result.current.saveState).toBe('saving');
    act(() => result.current.apply((spec) => ({ ...spec, background: '#333333' })));
    await act(async () => finish({ data: { saveReelSpec: { id: 'reel-1', spec: specOf([]) } } }));
    // The answer to the older save does not overwrite the newer edit.
    expect(result.current.spec.background).toBe('#333333');
    expect(result.current.saveState).toBe('pending');
  });

  it('saves what is waiting when the studio closes', () => {
    const save = echoSave();
    const { result, unmount } = renderHook(() => useSpecEditor(project));
    act(() => result.current.apply(shorten));
    unmount();
    expect(save).toHaveBeenCalledTimes(1);
  });
});

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
  ({ seekTo: vi.fn(), getCurrentFrame: vi.fn(() => 45), addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as PlayerRef;

describe('TimelinePanel + InspectorPanel', () => {
  const twoScenes = () => projectOf(specOf([scene('s1', 3000), scene('s2', 2000, { asset_id: '' })]));

  it('draws every scene to scale and opens the selected one in the inspector', () => {
    echoSave();
    renderWithProviders(<Editor project={twoScenes()} />);
    expect(screen.getByTestId('reel-inspector-empty')).toBeInTheDocument();
    expect(screen.getByTestId('reel-timeline-scene-s1')).toHaveAccessibleName('Scene 1, 0:03');
    expect(screen.getByTestId('reel-timeline-scene-s2')).toHaveTextContent('Colour card');

    fireEvent.click(screen.getByTestId('reel-timeline-scene-s1'));
    expect(screen.getByTestId('reel-timeline-scene-s1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('reel-scene-form')).toBeInTheDocument();
    expect(screen.getByTestId('reel-scene-duration')).toHaveValue(3);
  });

  it('applies a typed length to the timeline, and refuses one the clip cannot give', () => {
    echoSave();
    renderWithProviders(<Editor project={twoScenes()} />);
    fireEvent.click(screen.getByTestId('reel-timeline-scene-s1'));
    fireEvent.change(screen.getByTestId('reel-scene-duration'), { target: { value: '4.5' } });
    expect(screen.getByTestId('reel-timeline-scene-s1')).toHaveAccessibleName('Scene 1, 0:05');
    // The clip is 6 s long — 9 s cannot come out of it.
    fireEvent.change(screen.getByTestId('reel-scene-duration'), { target: { value: '9' } });
    expect(screen.getByTestId('reel-timeline-scene-s1')).toHaveAccessibleName('Scene 1, 0:05');
  });

  it('lengthens a scene from its handle with the keyboard', () => {
    echoSave();
    renderWithProviders(<Editor project={twoScenes()} />);
    const handle = screen.getByTestId('reel-timeline-resize-s1');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '3100');
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(handle).toHaveAttribute('aria-valuenow', '3000');
  });

  it('adds a text to the scene under the playhead and edits its words', () => {
    echoSave();
    renderWithProviders(<Editor project={twoScenes()} player={fakePlayer()} />);
    fireEvent.click(screen.getByTestId('reel-add-text'));
    expect(screen.getByTestId('reel-text-form')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('reel-text-words'), { target: { value: 'Sunday Jam' } });
    expect(within(screen.getByTestId('reel-track-text')).getByText('Sunday Jam')).toBeInTheDocument();
  });

  it('adds an overlay and music from the footage menus, and selects each', () => {
    echoSave();
    renderWithProviders(<Editor project={twoScenes()} player={fakePlayer()} />);
    fireEvent.click(screen.getByTestId('reel-add-overlay'));
    fireEvent.click(screen.getByTestId('reel-add-overlay-a2'));
    expect(screen.getByTestId('reel-overlay-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-add-music'));
    fireEvent.click(screen.getByTestId('reel-add-music-a3'));
    expect(screen.getByTestId('reel-music-form')).toBeInTheDocument();
    expect(within(screen.getByTestId('reel-track-music')).getByText('song.mp3')).toBeInTheDocument();
  });

  it('splits at the playhead, then deletes and undoes with the keyboard', () => {
    echoSave();
    renderWithProviders(<Editor project={twoScenes()} player={fakePlayer()} />);
    // The fake player sits at frame 45 = 1.5 s, inside scene 1.
    fireEvent.click(screen.getByTestId('reel-split'));
    expect(screen.getAllByTestId(/^reel-timeline-scene-/)).toHaveLength(3);

    const timeline = screen.getByTestId('reel-timeline');
    fireEvent.keyDown(timeline, { key: 'Delete' });
    expect(screen.getAllByTestId(/^reel-timeline-scene-/)).toHaveLength(2);
    fireEvent.keyDown(timeline, { key: 'z', ctrlKey: true });
    expect(screen.getAllByTestId(/^reel-timeline-scene-/)).toHaveLength(3);
    fireEvent.keyDown(timeline, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(screen.getAllByTestId(/^reel-timeline-scene-/)).toHaveLength(2);
  });

  it('moves the playhead from the ruler with the arrow keys', () => {
    echoSave();
    const player = fakePlayer();
    renderWithProviders(<Editor project={twoScenes()} player={player} />);
    const ruler = screen.getByTestId('reel-timeline-ruler');
    fireEvent.keyDown(ruler, { key: 'ArrowRight', shiftKey: true });
    expect(player.seekTo).toHaveBeenLastCalledWith(75);
    fireEvent.keyDown(ruler, { key: 'Home' });
    expect(player.seekTo).toHaveBeenLastCalledWith(0);
  });

  it('reorders and duplicates the selected scene', () => {
    echoSave();
    renderWithProviders(<Editor project={twoScenes()} />);
    fireEvent.click(screen.getByTestId('reel-timeline-scene-s2'));
    fireEvent.click(screen.getByTestId('reel-move-earlier'));
    expect(screen.getAllByTestId(/^reel-timeline-scene-/)[0]).toHaveAttribute('data-testid', 'reel-timeline-scene-s2');
    fireEvent.click(screen.getByTestId('reel-duplicate'));
    expect(screen.getAllByTestId(/^reel-timeline-scene-/)).toHaveLength(3);
  });
});

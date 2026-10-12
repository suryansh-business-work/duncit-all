import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { ReelAsset, ReelScene, ReelSpec } from '@duncit/gql-types';
import type { PlayerRef } from '@remotion/player';
import { SAVE_REEL_SPEC } from '../../src/pages/reels/queries';
import type { ReelSelection } from '../../src/pages/reels/editor/layout';
import { useSpecEditor } from '../../src/pages/reels/editor/useSpecEditor';
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

const video = { id: 'a1', kind: 'VIDEO', name: 'jam.mp4', url: 'https://server.duncit.com/reels/media/t1', thumbnail_url: '', duration_ms: 6000 } as ReelAsset;

const scene = (id: string, duration_ms: number): ReelScene =>
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
  }) as ReelScene;

const project = {
  id: 'reel-1',
  name: 'Jam night recap',
  assets: [video],
  spec: { fps: 30, width: 1080, height: 1920, background: '#000000', music: null, scenes: [scene('s1', 3000), scene('s2', 2000)] } as ReelSpec,
} as unknown as ReelProject;

function Editor({ player }: Readonly<{ player: PlayerRef }>) {
  const editor = useSpecEditor(project);
  const [selection, setSelection] = useState<ReelSelection | null>(null);
  return <TimelinePanel assets={project.assets} player={player} selection={selection} onSelect={setSelection} editor={editor} />;
}

const fakePlayer = () => ({ seekTo: vi.fn(), getCurrentFrame: vi.fn(() => 0), addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as PlayerRef;

const scenes = () => screen.getAllByTestId(/^reel-timeline-scene-/);

beforeEach(() => {
  resetApollo();
  // The server answers with the spec it was sent, as it does after sanitizing.
  mutationOf(SAVE_REEL_SPEC).mockImplementation(async (options) => ({
    data: { saveReelSpec: { id: 'reel-1', spec: JSON.parse(String(options?.variables?.spec_json)) } },
  }));
});

describe('Timeline pointer interaction', () => {
  it('resizes a scene by dragging its handle, landing as one change on release', () => {
    renderWithProviders(<Editor player={fakePlayer()} />);
    const handle = screen.getByTestId('reel-timeline-resize-s1');
    // 80 px per second by default: 40 px right is half a second longer.
    fireEvent.pointerMove(handle, { clientX: 500 });
    expect(handle).toHaveAttribute('aria-valuenow', '3000');
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 140, pointerId: 1 });
    expect(handle).toHaveAttribute('aria-valuenow', '3500');
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(scenes()[0]).toHaveAccessibleName('Scene 1, 0:04');
    expect(handle).toHaveAttribute('aria-valuenow', '3500');
  });

  it('stops a drag at what the clip can give, and drops a drag that went nowhere', () => {
    renderWithProviders(<Editor player={fakePlayer()} />);
    const handle = screen.getByTestId('reel-timeline-resize-s1');
    fireEvent.pointerDown(handle, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 4000, pointerId: 1 });
    // The clip is 6 s long.
    expect(handle).toHaveAttribute('aria-valuenow', '6000');
    fireEvent.pointerMove(handle, { clientX: -4000, pointerId: 1 });
    expect(Number(handle.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    fireEvent.pointerMove(handle, { clientX: 0, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(handle).toHaveAttribute('aria-valuenow', '3000');
    expect(scenes()[0]).toHaveAccessibleName('Scene 1, 0:03');
  });

  it('scrubs the playhead along the ruler, only while the button is held', () => {
    const player = fakePlayer();
    renderWithProviders(<Editor player={player} />);
    const ruler = screen.getByTestId('reel-timeline-ruler');
    fireEvent.pointerDown(ruler, { clientX: 160, pointerId: 1 });
    // 160 px at 80 px/s = 2 s = frame 60 at 30 fps.
    expect(player.seekTo).toHaveBeenLastCalledWith(60);
    const seeks = vi.mocked(player.seekTo).mock.calls.length;
    fireEvent.pointerMove(ruler, { clientX: 240, buttons: 0 });
    expect(player.seekTo).toHaveBeenCalledTimes(seeks);
    fireEvent.pointerMove(ruler, { clientX: 240, buttons: 1 });
    expect(player.seekTo).toHaveBeenLastCalledWith(90);
    // Past the end of the reel is the end of the reel (5 s = frame 150).
    fireEvent.pointerMove(ruler, { clientX: 9000, buttons: 1 });
    expect(player.seekTo).toHaveBeenLastCalledWith(150);
  });

  it('adds a scene from the footage menu right after the selected one', () => {
    renderWithProviders(<Editor player={fakePlayer()} />);
    fireEvent.click(screen.getByTestId('reel-timeline-scene-s1'));
    fireEvent.click(screen.getByTestId('reel-add-scene'));
    fireEvent.click(screen.getByTestId('reel-add-scene-a1'));
    const ids = scenes().map((block) => block.getAttribute('data-testid'));
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('reel-timeline-scene-s1');
    expect(ids[2]).toBe('reel-timeline-scene-s2');
    // The new scene is the selected one.
    expect(scenes()[1]).toHaveAttribute('aria-pressed', 'true');
  });
});

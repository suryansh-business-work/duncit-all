import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReelMusic, ReelOverlay, ReelScene, ReelText } from '@duncit/gql-types';
import { ReelMusicForm } from '../../src/forms/reel-music';
import { ReelOverlayForm } from '../../src/forms/reel-overlay';
import { ReelSceneForm } from '../../src/forms/reel-scene';
import { ReelTextForm } from '../../src/forms/reel-text';
import { renderWithProviders } from '../testkit';

/**
 * The inspector's live forms, mounted on their own: each edit that passes the
 * schema lands on the item at once, an invalid one never does, and a change made
 * elsewhere (a drag, undo, the chat) resets the form without echoing back.
 */

const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const invalid = (testId: string) => waitFor(() => expect(screen.getByTestId(testId)).toHaveAttribute('aria-invalid', 'true'));

const music = { asset_id: 'a3', volume: 0.8, trim_start_ms: 1500 } as ReelMusic;

const text = {
  id: 't1',
  text: 'Sunday Jam',
  position: 'BOTTOM',
  style: 'TITLE',
  animation: 'FADE',
  start_ms: 0,
  duration_ms: 0,
  color: '#FFFFFF',
  background: '',
} as ReelText;

const overlay = { id: 'o1', asset_id: 'a2', corner: 'TOP_RIGHT', width_pct: 30, opacity: 0.5, start_ms: 0, duration_ms: 0 } as ReelOverlay;

const scene = {
  id: 's1',
  asset_id: 'a1',
  duration_ms: 3000,
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
} as unknown as ReelScene;

describe('ReelMusicForm', () => {
  it('turns a typed volume into the 0–1 share the reel stores, keeping the trim in ms', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ReelMusicForm music={music} onChange={onChange} />);
    expect(screen.getByTestId('reel-music-volume')).toHaveValue(80);
    expect(screen.getByTestId('reel-music-trim')).toHaveValue(1.5);

    type('reel-music-volume', '40');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ volume: 0.4, trim_start_ms: 1500 }));
    type('reel-music-trim', '2.5');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ volume: 0.4, trim_start_ms: 2500 }));
  });

  it('keeps a volume past 100 % off the reel and marks the field', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ReelMusicForm music={music} onChange={onChange} />);
    type('reel-music-volume', '150');
    await invalid('reel-music-volume');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not report a retyped value that means the same thing', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ReelMusicForm music={music} onChange={onChange} />);
    type('reel-music-volume', '80.0');
    type('reel-music-volume', '45');
    // Only the real change reaches the reel; "80.0" is the volume it already has.
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith({ volume: 0.45, trim_start_ms: 1500 });
  });

  it('follows a change made elsewhere without sending it back', async () => {
    const onChange = vi.fn();
    function Parent() {
      const [current, setCurrent] = useState(music);
      return (
        <>
          <button type="button" data-testid="undo-elsewhere" onClick={() => setCurrent({ ...music, volume: 0.2, trim_start_ms: 4000 })}>
            undo
          </button>
          <ReelMusicForm music={current} onChange={onChange} />
        </>
      );
    }
    renderWithProviders(<Parent />);
    fireEvent.click(screen.getByTestId('undo-elsewhere'));
    await waitFor(() => expect(screen.getByTestId('reel-music-volume')).toHaveValue(20));
    expect(screen.getByTestId('reel-music-trim')).toHaveValue(4);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('never submits — Enter in a field must not reload the studio', () => {
    renderWithProviders(<ReelMusicForm music={music} onChange={vi.fn()} />);
    // fireEvent returns false once the handler called preventDefault.
    expect(fireEvent.submit(screen.getByTestId('reel-music-form'))).toBe(false);
  });
});

describe('ReelTextForm', () => {
  it('stores a typed pill colour upper-cased, and refuses one that is not a colour', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ReelTextForm text={text} sceneSeconds={3} onChange={onChange} />);
    type('reel-text-pill', '#zz');
    await invalid('reel-text-pill');
    expect(onChange).not.toHaveBeenCalled();

    type('reel-text-pill', '#ff00aa');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ background: '#FF00AA', text: 'Sunday Jam' })));
  });

  it('accepts no pill at all', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ReelTextForm text={{ ...text, background: '#112233' }} sceneSeconds={3} onChange={onChange} />);
    type('reel-text-pill', '');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ background: '' })));
  });

  it('never submits', () => {
    renderWithProviders(<ReelTextForm text={text} sceneSeconds={3} onChange={vi.fn()} />);
    expect(fireEvent.submit(screen.getByTestId('reel-text-form'))).toBe(false);
  });
});

describe('ReelOverlayForm', () => {
  it('stores a typed opacity as a share, and refuses one under the floor', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ReelOverlayForm overlay={overlay} sceneSeconds={3} onChange={onChange} />);
    type('reel-overlay-opacity', '5');
    await invalid('reel-overlay-opacity');
    expect(onChange).not.toHaveBeenCalled();

    type('reel-overlay-opacity', '70');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ opacity: 0.7, corner: 'TOP_RIGHT' })));
  });

  it('never submits', () => {
    renderWithProviders(<ReelOverlayForm overlay={overlay} sceneSeconds={3} onChange={vi.fn()} />);
    expect(fireEvent.submit(screen.getByTestId('reel-overlay-form'))).toBe(false);
  });
});

describe('ReelSceneForm', () => {
  const footage = [
    { value: '', label: 'Colour card' },
    { value: 'a1', label: 'jam.mp4' },
  ];

  it('offers trim, speed and volume only for a video', () => {
    renderWithProviders(<ReelSceneForm scene={scene} footage={footage} isVideo={false} maxSeconds={6} onChange={vi.fn()} />);
    expect(screen.getByTestId('reel-scene-duration')).toHaveValue(3);
    expect(screen.queryByTestId('reel-scene-trim')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reel-scene-speed')).not.toBeInTheDocument();
  });

  it('stores a typed speed and volume for a video', async () => {
    const onChange = vi.fn();
    renderWithProviders(<ReelSceneForm scene={scene} footage={footage} isVideo maxSeconds={6} onChange={onChange} />);
    type('reel-scene-speed', '2');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ playback_rate: 2, volume: 1 })));
    type('reel-scene-volume', '25');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ playback_rate: 2, volume: 0.25 })));
  });

  it('never submits', () => {
    renderWithProviders(<ReelSceneForm scene={scene} footage={footage} isVideo maxSeconds={6} onChange={vi.fn()} />);
    expect(fireEvent.submit(screen.getByTestId('reel-scene-form'))).toBe(false);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ASPECTS, FRAME, SAFE_ZONE, frameOf } from '../../src/pages/reels/composition/aspect';
import { boxColours, captionBlockStyle, contrastOn, highlightStyle, highlightedWordIndex } from '../../src/pages/reels/composition/captions';
import { CORNER } from '../../src/pages/reels/composition/corners';
import { ASPECT_LABEL, CAPTION_STYLE_LABEL, SOURCE_LABEL } from '../../src/pages/reels/editor/labels';
import { updateSettings, updateVoiceover } from '../../src/pages/reels/editor/specEdits';
import InspectorPanel from '../../src/pages/reels/studio/inspector/InspectorPanel';
import ReelSettingsSection from '../../src/pages/reels/studio/inspector/ReelSettingsSection';
import SafeZones from '../../src/pages/reels/studio/preview/SafeZones';
import type { ReelSpec } from '../../src/pages/reels/types';
import { renderWithProviders } from '../testkit';
import { reelAsset, reelScene, reelSpec } from '../mocks/reel-apollo-mock';

/** MUI's select keeps a native input the form reads; changing it is how a test picks an option. */
const pick = (container: HTMLElement, name: string, value: string) => {
  const input = container.querySelector(`input[name="${name}"]`);
  if (!input) throw new Error(`no select named ${name}`);
  fireEvent.change(input, { target: { value } });
};

describe('aspect', () => {
  it('knows the three frames, and reads the stored size for a spec from before aspects', () => {
    expect(ASPECTS.map((aspect) => FRAME[aspect])).toEqual([
      { width: 1080, height: 1920 },
      { width: 1080, height: 1080 },
      { width: 1920, height: 1080 },
    ]);
    expect(frameOf(reelSpec({ aspect: 'LANDSCAPE' }))).toEqual({ width: 1920, height: 1080 });
    expect(frameOf({ aspect: 'OLD' as ReelSpec['aspect'], width: 720, height: 1280 })).toEqual({ width: 720, height: 1280 });
    expect(SAFE_ZONE).toEqual({ topPct: 15, bottomPct: 20 });
  });

  it('labels every aspect, caption style and source', () => {
    expect(Object.keys(ASPECT_LABEL)).toEqual(['PORTRAIT', 'SQUARE', 'LANDSCAPE']);
    expect(Object.keys(CAPTION_STYLE_LABEL)).toEqual(['PLAIN', 'BOX', 'HIGHLIGHT']);
    expect(Object.keys(SOURCE_LABEL)).toEqual(['DRIVE', 'UPLOAD', 'STOCK', 'GENERATED']);
    expect(Object.keys(CORNER)).toHaveLength(5);
  });
});

describe('captions', () => {
  it('picks black ink on a light colour, white on a dark one, and white on anything that is not a colour', () => {
    expect(contrastOn('#FFEE00')).toBe('#000000');
    expect(contrastOn('#102030')).toBe('#FFFFFF');
    expect(contrastOn('orange')).toBe('#FFFFFF');
  });

  it('builds a BOX pill from the brand colour, else the text’s pill, else its own colour with the ink swapped', () => {
    expect(boxColours({ color: '#FFFFFF', background: '' }, '#FF5A1F')).toEqual({ pill: '#FF5A1F', ink: '#FFFFFF' });
    expect(boxColours({ color: '#FFFFFF', background: '#000000' }, '')).toEqual({ pill: '#000000', ink: '#FFFFFF' });
    expect(boxColours({ color: '#ffffff', background: '' }, '')).toEqual({ pill: '#ffffff', ink: '#000000' });
  });

  it('dresses PLAIN words with a shadow, or their own pill, and HIGHLIGHT words like PLAIN ones', () => {
    expect(captionBlockStyle('PLAIN', { color: '#FFFFFF', background: '' }, '')).toMatchObject({ backgroundColor: 'transparent', padding: 0, textShadow: '0 2px 12px rgba(0, 0, 0, 0.75)' });
    expect(captionBlockStyle('HIGHLIGHT', { color: '#FFFFFF', background: '#112233' }, '')).toMatchObject({ backgroundColor: '#112233', padding: '18px 34px', textShadow: 'none' });
    expect(captionBlockStyle('BOX', { color: '#FFFFFF', background: '' }, '#FF5A1F')).toMatchObject({ backgroundColor: '#FF5A1F', color: '#FFFFFF' });
  });

  it('paces the highlighted word across the caption’s frames', () => {
    expect(highlightedWordIndex(0, 10, 60)).toBe(-1);
    expect(highlightedWordIndex(4, 0, 60)).toBe(0);
    expect(highlightedWordIndex(4, 30, 60)).toBe(2);
    expect(highlightedWordIndex(4, 90, 60)).toBe(3);
    expect(highlightedWordIndex(4, -5, 60)).toBe(0);
    expect(highlightedWordIndex(4, 10, 0)).toBe(0);
    expect(highlightStyle({ color: '#000000' }, '')).toMatchObject({ backgroundColor: '#000000', color: '#FFFFFF' });
    expect(highlightStyle({ color: '#000000' }, '#FFEE00')).toMatchObject({ backgroundColor: '#FFEE00', color: '#000000' });
  });
});

describe('specEdits — the reel’s own settings', () => {
  it('sets the frame with a new aspect, and leaves it alone otherwise', () => {
    const spec = reelSpec();
    expect(updateSettings(spec, { aspect: 'LANDSCAPE' })).toMatchObject({ aspect: 'LANDSCAPE', width: 1920, height: 1080 });
    expect(updateSettings(spec, { captions: { style: 'BOX' } })).toMatchObject({ captions: { style: 'BOX' }, width: 1080, height: 1920 });
    expect(spec.aspect).toBe('PORTRAIT');
  });

  it('turns the voiceover up or down, and does nothing for a reel without one', () => {
    expect(updateVoiceover(reelSpec({ voiceover: { asset_id: 'g1', volume: 1 } }), { volume: 0.4 }).voiceover).toEqual({ asset_id: 'g1', volume: 0.4 });
    const silent = reelSpec();
    expect(updateVoiceover(silent, { volume: 0.4 })).toBe(silent);
  });
});

describe('ReelSettingsSection', () => {
  it('lands every change on the reel through apply, offering the reel’s pictures as watermarks', async () => {
    let spec = reelSpec({ voiceover: { asset_id: 'g1', volume: 1 } });
    const apply = vi.fn((change: (current: ReelSpec) => ReelSpec) => {
      spec = change(spec);
    });
    const { container } = renderWithProviders(<ReelSettingsSection spec={spec} assets={[reelAsset({ id: 'logo', kind: 'IMAGE', name: 'logo.png' }), reelAsset({ id: 'clip' })]} apply={apply} />);
    pick(container, 'aspect', 'SQUARE');
    await screen.findByTestId('reel-settings-form');
    expect(apply).toHaveBeenCalled();
    expect(spec).toMatchObject({ aspect: 'SQUARE', width: 1080, height: 1080, voiceover: { volume: 1 } });
    pick(container, 'watermark_asset_id', 'logo');
    expect(await screen.findByTestId('reel-settings-watermark-width')).toBeInTheDocument();
    expect(spec.brand.watermark_asset_id).toBe('logo');
    // Only pictures are offered: the clip is not a watermark.
    expect(container.querySelector('input[name="watermark_asset_id"]')).toHaveValue('logo');
  });
});

describe('InspectorPanel — settings and selection', () => {
  const spec = reelSpec({ scenes: [reelScene({ id: 's1', asset_id: '' })] });

  it('shows the reel’s settings with nothing selected, and a way back to them from an item', () => {
    const onDeselect = vi.fn();
    const { rerender } = renderWithProviders(<InspectorPanel spec={spec} assets={[]} selection={null} apply={vi.fn()} onDeselect={onDeselect} />);
    expect(screen.getByTestId('reel-settings-section')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-inspector-settings')).not.toBeInTheDocument();

    rerender(<InspectorPanel spec={spec} assets={[]} selection={{ kind: 'scene', sceneId: 's1' }} apply={vi.fn()} onDeselect={onDeselect} />);
    expect(screen.getByTestId('reel-scene-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-inspector-settings'));
    expect(onDeselect).toHaveBeenCalledTimes(1);
  });

  it('falls back to the settings when the selection no longer exists', () => {
    renderWithProviders(<InspectorPanel spec={spec} assets={[]} selection={{ kind: 'scene', sceneId: 'gone' }} apply={vi.fn()} onDeselect={vi.fn()} />);
    expect(screen.getByTestId('reel-settings-section')).toBeInTheDocument();
  });
});

describe('SafeZones', () => {
  it('shades the two bands a network covers, named so a reader knows what goes where', () => {
    renderWithProviders(<SafeZones />);
    expect(screen.getByTestId('reel-safe-zones')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('reel-safe-zone-top')).toHaveTextContent('Account name and sound');
    expect(screen.getByTestId('reel-safe-zone-bottom')).toHaveTextContent('Caption and buttons');
  });
});

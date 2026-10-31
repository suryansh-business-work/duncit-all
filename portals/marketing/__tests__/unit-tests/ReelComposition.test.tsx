import type { CSSProperties, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { ReelOverlay, ReelScene, ReelText } from '@duncit/gql-types';
import { ReelComposition } from '../../src/pages/reels/composition/ReelComposition';
import { SceneLayer, type SceneLook } from '../../src/pages/reels/composition/SceneLayer';
import { TextLayer } from '../../src/pages/reels/composition/TextLayer';
import { VoiceoverTrack } from '../../src/pages/reels/composition/VoiceoverTrack';
import { WatermarkLayer } from '../../src/pages/reels/composition/WatermarkLayer';
import type { ReelAsset, ReelSpec } from '../../src/pages/reels/types';

/** The frame the composition is "on" — Remotion's clock, set by each test. */
const clock = vi.hoisted(() => ({ frame: 0 }));

/**
 * Remotion's primitives, as plain elements.
 *
 * What is under test here is what the reel's own components hand to Remotion —
 * which clip, trimmed where, shown when. Remotion drawing it is Remotion's
 * suite; in jsdom its player has no canvas or decoder to draw with.
 */
vi.mock('remotion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('remotion')>()),
  AbsoluteFill: ({ children, style }: { children?: ReactNode; style?: CSSProperties }) => (
    <div data-testid="fill" style={style}>
      {children}
    </div>
  ),
  Img: ({ src, style, crossOrigin }: { src: string; style?: CSSProperties; crossOrigin?: 'anonymous' }) => (
    <img data-testid="picture" src={src} alt="" crossOrigin={crossOrigin} style={style} />
  ),
  Sequence: ({ children, from, durationInFrames }: { children?: ReactNode; from: number; durationInFrames: number }) => (
    <div data-testid="window" data-from={from} data-frames={durationInFrames}>
      {children}
    </div>
  ),
  useCurrentFrame: () => clock.frame,
  useVideoConfig: () => ({ fps: 30 }),
}));

vi.mock('@remotion/media', () => ({
  Video: (props: Record<string, unknown>) => <div data-testid="video" data-props={JSON.stringify(props)} />,
  Audio: (props: Record<string, unknown>) => <div data-testid="music" data-props={JSON.stringify(props)} />,
}));

vi.mock('@remotion/transitions', () => {
  const TransitionSeries = ({ children }: { children?: ReactNode }) => <div data-testid="series">{children}</div>;
  TransitionSeries.Sequence = ({ children, durationInFrames }: { children?: ReactNode; durationInFrames: number }) => (
    <div data-testid="scene" data-frames={durationInFrames}>
      {children}
    </div>
  );
  TransitionSeries.Transition = ({ presentation, timing }: { presentation: { kind: string }; timing: { durationInFrames: number } }) => (
    <div data-testid="transition" data-kind={presentation.kind} data-frames={timing.durationInFrames} />
  );
  return { TransitionSeries, linearTiming: (timing: { durationInFrames: number }) => timing };
});
vi.mock('@remotion/transitions/fade', () => ({ fade: () => ({ kind: 'fade' }) }));
vi.mock('@remotion/transitions/slide', () => ({ slide: ({ direction }: { direction: string }) => ({ kind: `slide ${direction}` }) }));
vi.mock('@remotion/transitions/wipe', () => ({ wipe: ({ direction }: { direction: string }) => ({ kind: `wipe ${direction}` }) }));

const asset = (id: string, kind: ReelAsset['kind']): ReelAsset =>
  ({ id, kind, name: `${id}.bin`, url: `https://server.duncit.com/reels/media/${id}`, thumbnail_url: '' }) as ReelAsset;

const text = (over: Partial<ReelText> = {}): ReelText =>
  ({
    id: 't1',
    text: 'Jam night',
    position: 'BOTTOM',
    style: 'CAPTION',
    animation: 'NONE',
    start_ms: 0,
    duration_ms: 0,
    color: '#FFFFFF',
    background: '',
    ...over,
  }) as ReelText;

const overlay = (over: Partial<ReelOverlay> = {}): ReelOverlay =>
  ({ id: 'o1', asset_id: 'logo', corner: 'TOP_RIGHT', width_pct: 22, opacity: 0.8, start_ms: 0, duration_ms: 0, ...over }) as ReelOverlay;

const scene = (over: Partial<ReelScene> = {}): ReelScene =>
  ({
    id: 's1',
    asset_id: '',
    duration_ms: 2000,
    trim_start_ms: 0,
    volume: 1,
    playback_rate: 1,
    fit: 'COVER',
    motion: 'NONE',
    transition: 'NONE',
    transition_ms: 0,
    background: '#101010',
    texts: [],
    overlays: [],
    ...over,
  }) as ReelScene;

const BRAND = { watermark_asset_id: '', watermark_corner: 'TOP_RIGHT', watermark_width_pct: 18, primary_color: '' } as const;

const spec = (over: Partial<ReelSpec> = {}): ReelSpec =>
  ({
    fps: 30,
    width: 1080,
    height: 1920,
    aspect: 'PORTRAIT',
    background: '#000000',
    scenes: [],
    music: null,
    voiceover: null,
    brand: BRAND,
    captions: { style: 'PLAIN' },
    ...over,
  }) as ReelSpec;

const ASSETS = [asset('clip', 'VIDEO'), asset('logo', 'IMAGE'), asset('song', 'AUDIO'), asset('voice', 'AUDIO')];
const LOOKUP = new Map(ASSETS.map((item) => [item.id, item]));
/** The reel's look as a scene receives it: plain captions, no brand colour. */
const LOOK: SceneLook = { captions: 'PLAIN', accent: '' };

const propsOf = (element: HTMLElement) => JSON.parse(element.dataset.props ?? '{}');

beforeEach(() => {
  clock.frame = 0;
});

describe('ReelComposition', () => {
  it('plays every scene in order, each for its own length', () => {
    render(<ReelComposition spec={spec({ scenes: [scene({ id: 'a' }), scene({ id: 'b', duration_ms: 1000 })] })} assets={ASSETS} />);
    expect(screen.getAllByTestId('scene').map((item) => item.dataset.frames)).toEqual(['60', '30']);
    expect(screen.queryByTestId('transition')).not.toBeInTheDocument();
  });

  it('brings a scene in with the transition it asks for, and cuts where there is nothing to overlap', () => {
    render(
      <ReelComposition
        spec={spec({
          scenes: [
            scene({ id: 'a', transition: 'FADE', transition_ms: 500 }),
            scene({ id: 'b', transition: 'FADE', transition_ms: 500 }),
            scene({ id: 'c', transition: 'SLIDE', transition_ms: 500 }),
            scene({ id: 'd', transition: 'WIPE', transition_ms: 500 }),
            scene({ id: 'e', transition: 'FADE', transition_ms: 0 }),
          ],
        })}
        assets={ASSETS}
      />
    );
    // The first scene has nothing before it; the last asked for a fade of no length.
    expect(screen.getAllByTestId('transition').map((item) => [item.dataset.kind, item.dataset.frames])).toEqual([
      ['fade', '15'],
      ['slide from-right', '15'],
      ['wipe from-left', '15'],
    ]);
    expect(screen.getAllByTestId('scene')).toHaveLength(5);
  });

  it('paints the reel’s own background behind everything', () => {
    render(<ReelComposition spec={spec({ background: '#112233' })} assets={ASSETS} />);
    expect(screen.getAllByTestId('fill')[0]).toHaveStyle({ backgroundColor: '#112233' });
  });

  it('loops the music under the reel from where it was trimmed', () => {
    render(<ReelComposition spec={spec({ music: { asset_id: 'song', volume: 0.6, trim_start_ms: 2000 } })} assets={ASSETS} />);
    expect(propsOf(screen.getByTestId('music'))).toEqual({
      src: 'https://server.duncit.com/reels/media/song',
      trimBefore: 60,
      volume: 0.6,
      loop: true,
    });
  });

  it('plays no music when there is none, or its file has left the reel', () => {
    const { rerender } = render(<ReelComposition spec={spec()} assets={ASSETS} />);
    expect(screen.queryByTestId('music')).not.toBeInTheDocument();
    rerender(<ReelComposition spec={spec({ music: { asset_id: 'gone', volume: 1, trim_start_ms: 0 } })} assets={ASSETS} />);
    expect(screen.queryByTestId('music')).not.toBeInTheDocument();
  });
});

describe('SceneLayer', () => {
  it('shows a colour card as its background alone', () => {
    render(<SceneLayer scene={scene()} frames={60} assets={LOOKUP} look={LOOK} />);
    expect(screen.getByTestId('fill')).toHaveStyle({ backgroundColor: '#101010' });
    expect(screen.queryByTestId('video')).not.toBeInTheDocument();
    expect(screen.queryByTestId('picture')).not.toBeInTheDocument();
  });

  it('plays a clip from its trim point at its own speed and volume', () => {
    render(
      <SceneLayer
        scene={scene({ asset_id: 'clip', trim_start_ms: 4000, volume: 0.5, playback_rate: 2, fit: 'CONTAIN' })}
        frames={60}
        assets={LOOKUP}
        look={LOOK}
      />
    );
    expect(propsOf(screen.getByTestId('video'))).toMatchObject({
      src: 'https://server.duncit.com/reels/media/clip',
      trimBefore: 120,
      volume: 0.5,
      muted: false,
      playbackRate: 2,
      objectFit: 'contain',
    });
  });

  it('mutes a clip whose volume is zero', () => {
    render(<SceneLayer scene={scene({ asset_id: 'clip', volume: 0 })} frames={60} assets={LOOKUP} look={LOOK} />);
    expect(propsOf(screen.getByTestId('video'))).toMatchObject({ muted: true, objectFit: 'cover' });
  });

  it('shows a picture fetched with CORS, so the exporter can read the frame back', () => {
    render(<SceneLayer scene={scene({ asset_id: 'logo' })} frames={60} assets={LOOKUP} look={LOOK} />);
    const picture = screen.getByTestId('picture');
    expect(picture).toHaveAttribute('src', 'https://server.duncit.com/reels/media/logo');
    expect(picture).toHaveAttribute('crossorigin', 'anonymous');
    expect(picture).toHaveStyle({ objectFit: 'cover' });
  });

  it('drifts the footage as the scene plays', () => {
    clock.frame = 59;
    render(<SceneLayer scene={scene({ asset_id: 'logo', motion: 'ZOOM_IN' })} frames={60} assets={LOOKUP} look={LOOK} />);
    expect(screen.getAllByTestId('fill')[1]).toHaveStyle({ transform: 'scale(1.15)' });
  });

  it('lays overlays over the scene for their window, skipping one whose picture is gone', () => {
    render(
      <SceneLayer
        scene={scene({
          overlays: [
            overlay({ start_ms: 500, duration_ms: 1000, corner: 'CENTER' }),
            overlay({ id: 'o2', asset_id: 'gone' }),
          ],
        })}
        frames={60}
        assets={LOOKUP}
        look={LOOK}
      />
    );
    const windows = screen.getAllByTestId('window');
    expect(windows).toHaveLength(1);
    expect(windows[0].dataset).toMatchObject({ from: '15', frames: '30' });
    expect(within(windows[0]).getByTestId('picture')).toHaveStyle({ width: '22%', opacity: '0.8', top: '50%', left: '50%' });
  });

  it('shows each text for its window', () => {
    render(
      <SceneLayer
        scene={scene({ texts: [text({ start_ms: 1000 }), text({ id: 't2', text: 'Friday 8 PM', duration_ms: 500 })] })}
        frames={60}
        assets={LOOKUP}
        look={LOOK}
      />
    );
    const windows = screen.getAllByTestId('window');
    expect(windows.map((item) => [item.dataset.from, item.dataset.frames])).toEqual([
      ['30', '30'],
      ['0', '15'],
    ]);
    expect(within(windows[1]).getByText('Friday 8 PM')).toBeInTheDocument();
  });
});

describe('TextLayer', () => {
  it('writes the words in their style and place, with an edge to stay readable over footage', () => {
    render(<TextLayer text={text({ style: 'TITLE', position: 'TOP', color: '#FFEE00' })} frames={60} captions="PLAIN" accent="" />);
    expect(screen.getByTestId('fill')).toHaveStyle({ justifyContent: 'flex-start', paddingTop: '15%' });
    // The element's own style: jsdom's computed style does not carry text-shadow faithfully.
    const { style } = screen.getByText('Jam night');
    expect(style.fontSize).toBe('92px');
    expect(style.color).toBe('rgb(255, 238, 0)');
    expect(style.backgroundColor).toBe('transparent');
    expect(style.textShadow).toBe('0 2px 12px rgba(0, 0, 0, 0.75)');
  });

  it('puts a pill behind the words when the text has a background', () => {
    render(<TextLayer text={text({ background: '#D92D2D' })} frames={60} captions="PLAIN" accent="" />);
    const { style } = screen.getByText('Jam night');
    expect(style.backgroundColor).toBe('rgb(217, 45, 45)');
    expect(style.padding).toBe('18px 34px');
    expect(style.textShadow).toBe('none');
  });

  it('types the words out a frame at a time', () => {
    clock.frame = 3;
    render(<TextLayer text={text({ animation: 'TYPEWRITER' })} frames={60} captions="PLAIN" accent="" />);
    expect(screen.getByText('Ja')).toBeInTheDocument();
    expect(screen.queryByText('Jam night')).not.toBeInTheDocument();
  });

  it('fades the words in', () => {
    clock.frame = 6;
    render(<TextLayer text={text({ animation: 'FADE' })} frames={60} captions="PLAIN" accent="" />);
    expect(screen.getByText('Jam night')).toHaveStyle({ opacity: '0.5' });
  });

  it('puts BOX captions on a pill in the brand colour, inked to read on it', () => {
    render(<TextLayer text={text({ color: '#FFFFFF' })} frames={60} captions="BOX" accent="#FFEE00" />);
    const { style } = screen.getByText('Jam night');
    expect(style.backgroundColor).toBe('rgb(255, 238, 0)');
    // The text keeps its own ink; only a pill in that same colour swaps it.
    expect(style.color).toBe('rgb(255, 255, 255)');
    expect(style.textShadow).toBe('none');
  });

  it('inks a BOX caption in the contrasting colour when the pill would be the text’s own colour', () => {
    render(<TextLayer text={text({ color: '#FFFFFF' })} frames={60} captions="BOX" accent="" />);
    const { style } = screen.getByText('Jam night');
    expect(style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(style.color).toBe('rgb(0, 0, 0)');
  });

  it('emphasises one word at a time across the caption’s stay, in HIGHLIGHT style', () => {
    clock.frame = 30;
    render(<TextLayer text={text({ text: 'Sundays at HSR go go' })} frames={60} captions="HIGHLIGHT" accent="#FF5A1F" />);
    // Five words over 60 frames: frame 30 is the third word.
    const current = screen.getByTestId('reel-highlight');
    expect(current).toHaveTextContent('HSR');
    expect(current.style.backgroundColor).toBe('rgb(255, 90, 31)');
    expect(current.style.color).toBe('rgb(255, 255, 255)');
    // The repeated word is drawn twice, each its own span.
    expect(screen.getAllByText(/^go\s?$/)).toHaveLength(2);
  });

  it('highlights the words typed so far when the caption is also a typewriter', () => {
    clock.frame = 3;
    render(<TextLayer text={text({ text: 'Jam night', animation: 'TYPEWRITER' })} frames={60} captions="HIGHLIGHT" accent="" />);
    expect(screen.getByTestId('reel-highlight')).toHaveTextContent('Ja');
  });
});

describe('WatermarkLayer', () => {
  const brand = { ...BRAND, watermark_asset_id: 'logo', watermark_corner: 'BOTTOM_LEFT' as const, watermark_width_pct: 25 };

  it('pins the brand’s mark to its corner at its width, fetched with CORS', () => {
    render(<WatermarkLayer brand={brand} asset={LOOKUP.get('logo')} />);
    const mark = screen.getByTestId('picture');
    expect(mark).toHaveAttribute('crossorigin', 'anonymous');
    expect(mark).toHaveStyle({ width: '25%', bottom: '10%', left: '6%' });
  });

  it('draws nothing without a mark, or when its picture has left the reel', () => {
    const { rerender } = render(<WatermarkLayer brand={BRAND} asset={LOOKUP.get('logo')} />);
    expect(screen.queryByTestId('picture')).not.toBeInTheDocument();
    rerender(<WatermarkLayer brand={brand} asset={undefined} />);
    expect(screen.queryByTestId('picture')).not.toBeInTheDocument();
  });
});

describe('VoiceoverTrack', () => {
  it('plays the speech once, at its volume', () => {
    render(<VoiceoverTrack voiceover={{ asset_id: 'voice', volume: 0.9 }} asset={LOOKUP.get('voice')} />);
    expect(propsOf(screen.getByTestId('music'))).toEqual({ src: 'https://server.duncit.com/reels/media/voice', volume: 0.9 });
  });

  it('is silent when the speech file has left the reel', () => {
    render(<VoiceoverTrack voiceover={{ asset_id: 'gone', volume: 1 }} asset={undefined} />);
    expect(screen.queryByTestId('music')).not.toBeInTheDocument();
  });
});

describe('ReelComposition — brand and voice', () => {
  it('draws the watermark over every scene and the voiceover under the reel', () => {
    render(
      <ReelComposition
        spec={spec({
          scenes: [scene({ id: 'a' })],
          brand: { ...BRAND, watermark_asset_id: 'logo' },
          voiceover: { asset_id: 'voice', volume: 0.7 },
          music: { asset_id: 'song', volume: 0.3, trim_start_ms: 0 },
        })}
        assets={ASSETS}
      />
    );
    expect(screen.getByTestId('picture')).toHaveStyle({ width: '18%', top: '6%', right: '6%' });
    const tracks = screen.getAllByTestId('music').map(propsOf);
    expect(tracks).toEqual([
      { src: 'https://server.duncit.com/reels/media/song', trimBefore: 0, volume: 0.3, loop: true },
      { src: 'https://server.duncit.com/reels/media/voice', volume: 0.7 },
    ]);
  });

  it('hands every scene the reel’s caption style and brand colour', () => {
    clock.frame = 0;
    render(
      <ReelComposition
        spec={spec({ scenes: [scene({ id: 'a', texts: [text()] })], brand: { ...BRAND, primary_color: '#FF5A1F' }, captions: { style: 'BOX' } })}
        assets={ASSETS}
      />
    );
    expect(screen.getByText('Jam night').style.backgroundColor).toBe('rgb(255, 90, 31)');
  });
});

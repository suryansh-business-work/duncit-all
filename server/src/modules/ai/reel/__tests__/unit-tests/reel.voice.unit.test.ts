import type { ServamCue } from '@services/servam/servam.service';
import { REEL_LIMITS, emptySpec, type ReelScene, type ReelSpec, type ReelText } from '../../reel.edit';
import { captionedScenes, mergeCues, wavDurationMs } from '../../reel.voice';

jest.mock('@services/servam/servam.service', () => ({ servamService: { tts: jest.fn(), transcribe: jest.fn() } }));
jest.mock('@modules/platform/upload/upload.service', () => ({ uploadToImagekit: jest.fn() }));
jest.mock('../../reel.drive', () => ({ driveContent: jest.fn() }));
jest.mock('../../reel.shared', () => ({
  ...jest.requireActual('../../reel.shared'),
  load: jest.fn(),
  reelRun: jest.fn(),
  toPub: jest.fn(),
}));

/** A canonical 16-bit mono WAV header followed by `dataBytes` bytes of samples. */
function wav(sampleRate: number, dataBytes: number, declaredData = dataBytes): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(declaredData, 40);
  return Buffer.concat([header, Buffer.alloc(dataBytes)]);
}

describe('wavDurationMs', () => {
  it('reads the length off the header: data bytes over the byte rate', () => {
    // 22050 Hz, 16-bit mono = 44100 bytes a second.
    expect(wavDurationMs(wav(22_050, 44_100 * 3))).toBe(3000);
    expect(wavDurationMs(wav(8000, 16_000 / 2))).toBe(500);
  });

  it('skips a chunk before the data chunk, padded to an even length', () => {
    const base = wav(8000, 16_000);
    const extra = Buffer.alloc(8 + 3 + 1);
    extra.write('LIST', 0, 'ascii');
    extra.writeUInt32LE(3, 4);
    const withList = Buffer.concat([base.subarray(0, 36), extra, base.subarray(36)]);
    expect(wavDurationMs(withList)).toBe(1000);
  });

  it('measures the bytes present when the header declares more than the file holds', () => {
    expect(wavDurationMs(wav(8000, 8000, 160_000))).toBe(500);
  });

  it.each([
    ['nothing', Buffer.alloc(0)],
    ['a short buffer', Buffer.from('RIFF')],
    ['an MP3', Buffer.from('ID3\u0003\u0000'.padEnd(64, '\u0000'))],
    ['a WAV with no data chunk', wav(8000, 0).subarray(0, 36)],
  ])('is 0 for %s', (_name, bytes) => {
    expect(wavDurationMs(bytes)).toBe(0);
  });
});

const cue = (start_ms: number, end_ms: number, text: string): ServamCue => ({ start_ms, end_ms, text });

describe('mergeCues', () => {
  const CUES = [cue(0, 500, 'one'), cue(500, 1000, 'two'), cue(1000, 1500, 'three'), cue(1500, 2000, 'four'), cue(2000, 2500, 'five')];

  it('leaves cues alone when they fit', () => {
    expect(mergeCues(CUES, 5)).toEqual(CUES);
    expect(mergeCues(CUES, 5)).not.toBe(CUES);
  });

  it('joins neighbours into at most the lines allowed, each spanning its first start to its last end', () => {
    expect(mergeCues(CUES, 2)).toEqual([cue(0, 1500, 'one two three'), cue(1500, 2500, 'four five')]);
    expect(mergeCues(CUES, 1)).toEqual([cue(0, 2500, 'one two three four five')]);
    expect(mergeCues(CUES, 4)).toEqual([cue(0, 1000, 'one two'), cue(1000, 2000, 'three four'), cue(2000, 2500, 'five')]);
  });

  it('is nothing for nothing', () => {
    expect(mergeCues([], 3)).toEqual([]);
  });
});

const text = (value: string, style: ReelText['style'] = 'TITLE'): ReelText => ({
  id: `t-${value}`,
  text: value,
  position: 'TOP',
  style,
  animation: 'NONE',
  start_ms: 0,
  duration_ms: 0,
  color: '#FFFFFF',
  background: '',
});

const scene = (over: Partial<ReelScene>): ReelScene => ({
  id: 's',
  asset_id: '',
  duration_ms: 3000,
  trim_start_ms: 0,
  volume: 0,
  playback_rate: 1,
  fit: 'COVER',
  motion: 'NONE',
  transition: 'NONE',
  transition_ms: 0,
  background: '#000000',
  texts: [],
  overlays: [],
  ...over,
});

const captionsOf = (item: ReelScene) => item.texts.filter((entry) => entry.style === 'CAPTION').map(({ text: words, start_ms, duration_ms }) => ({ text: words, start_ms, duration_ms }));

describe('captionedScenes', () => {
  it('lays a voiceover’s cues along the reel, scene by scene, timed from each scene’s start', () => {
    const spec: ReelSpec = {
      ...emptySpec(),
      voiceover: { asset_id: 'voice', volume: 1 },
      scenes: [scene({ id: 'a', duration_ms: 2000 }), scene({ id: 'b', duration_ms: 3000, transition_ms: 500 }), scene({ id: 'c', duration_ms: 1000 })],
    };
    const cues = [cue(0, 900, 'Hello'), cue(900, 1800, 'there'), cue(2100, 3500, 'friends'), cue(6000, 9000, 'late')];
    const [a, b, c] = captionedScenes(spec, 'voice', cues);
    expect(captionsOf(a)).toEqual([
      { text: 'Hello', start_ms: 0, duration_ms: 900 },
      { text: 'there', start_ms: 900, duration_ms: 900 },
    ]);
    // Scene b starts at 2000 on the reel: the cue at 2100 lands 100 ms in.
    expect(captionsOf(b)).toEqual([{ text: 'friends', start_ms: 100, duration_ms: 1400 }]);
    // Scene c runs 4500–5500 (b overlaps a by its transition); a cue at 6000 is after the reel ends.
    expect(captionsOf(c)).toEqual([]);
    expect(a.texts.every((entry) => entry.position === 'BOTTOM' && entry.animation === 'FADE')).toBe(true);
  });

  it('maps a clip’s cues through the scene’s trim and speed, and only onto scenes that play that clip', () => {
    const spec: ReelSpec = {
      ...emptySpec(),
      scenes: [
        scene({ id: 'a', asset_id: 'clip', duration_ms: 2000, trim_start_ms: 2000 }),
        scene({ id: 'b', asset_id: 'other', duration_ms: 2000 }),
        scene({ id: 'c', asset_id: 'clip', duration_ms: 1000, trim_start_ms: 0, playback_rate: 2 }),
      ],
    };
    const cues = [cue(500, 1500, 'early'), cue(2500, 3200, 'middle'), cue(3800, 4500, 'late')];
    const [a, b, c] = captionedScenes(spec, 'clip', cues);
    // Scene a shows clip time 2000–4000: "early" is before it, "late" is cut at its end.
    expect(captionsOf(a)).toEqual([
      { text: 'middle', start_ms: 500, duration_ms: 700 },
      { text: 'late', start_ms: 1800, duration_ms: 200 },
    ]);
    expect(captionsOf(b)).toEqual([]);
    // Scene c shows clip time 0–2000 at double speed: "early" lands at 250 ms for 500 ms.
    expect(captionsOf(c)).toEqual([{ text: 'early', start_ms: 250, duration_ms: 500 }]);
  });

  it('replaces earlier captions, keeps titles and subtitles, and merges down to the room left', () => {
    const spec: ReelSpec = {
      ...emptySpec(),
      voiceover: { asset_id: 'voice', volume: 1 },
      scenes: [scene({ id: 'a', duration_ms: 4000, texts: [text('Title'), text('Sub', 'SUBTITLE'), text('old caption', 'CAPTION')] })],
    };
    const cues = Array.from({ length: 10 }, (_item, index) => cue(index * 400, index * 400 + 400, `w${index}`));
    const [a] = captionedScenes(spec, 'voice', cues);
    expect(a.texts.filter((entry) => entry.style !== 'CAPTION').map((entry) => entry.text)).toEqual(['Title', 'Sub']);
    const captions = captionsOf(a);
    expect(captions).toHaveLength(REEL_LIMITS.maxTexts - 2);
    expect(captions.map((entry) => entry.text)).not.toContain('old caption');
    expect(captions[0]).toEqual({ text: 'w0 w1 w2', start_ms: 0, duration_ms: 1200 });
  });

  it('starts a music bed’s clock at its trim, and the voiceover’s at zero even when both are the same file', () => {
    const music: ReelSpec = { ...emptySpec(), music: { asset_id: 'bed', volume: 0.5, trim_start_ms: 1000 }, scenes: [scene({ id: 'a', duration_ms: 2000 })] };
    expect(captionsOf(captionedScenes(music, 'bed', [cue(1200, 1700, 'in')])[0])).toEqual([{ text: 'in', start_ms: 200, duration_ms: 500 }]);
    const both: ReelSpec = { ...music, voiceover: { asset_id: 'bed', volume: 1 } };
    expect(captionsOf(captionedScenes(both, 'bed', [cue(1200, 1700, 'in')])[0])).toEqual([{ text: 'in', start_ms: 1200, duration_ms: 500 }]);
  });
});

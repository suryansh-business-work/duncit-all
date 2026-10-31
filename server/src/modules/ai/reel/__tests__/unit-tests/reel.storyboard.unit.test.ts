import { REEL_LIMITS } from '../../reel.edit';
import { sanitizeScript } from '../../reel.storyboard';

jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));
jest.mock('../../reel.stock', () => ({ searchReelMedia: jest.fn(), stockAsset: jest.fn() }));
jest.mock('../../reel.shared', () => ({ ...jest.requireActual('../../reel.shared'), load: jest.fn(), reelRun: jest.fn(), toPub: jest.fn() }));

describe('sanitizeScript', () => {
  it('reads a well-formed script as it is', () => {
    const script = { hooks: ['Stay', 'Wait'], scenes: [{ text: 'Line', shot: 'A dog', duration_ms: 2500, asset_query: 'dog park' }], cta: 'Tap Host' };
    expect(sanitizeScript(script)).toEqual(script);
  });

  it.each([null, 'script', 7, []])('reads %p as an empty script', (raw) => {
    expect(sanitizeScript(raw)).toEqual({ hooks: [], scenes: [], cta: '' });
  });

  it('keeps at most five hooks, each trimmed to a line, and drops hooks that are not words', () => {
    const hooks = ['  one  ', 2, '', 'x'.repeat(REEL_LIMITS.maxTextLength + 5), 'three', 'four', 'five', 'six'];
    const kept = sanitizeScript({ hooks }).hooks;
    expect(kept).toHaveLength(5);
    expect(kept[0]).toBe('one');
    expect(kept[1]).toHaveLength(REEL_LIMITS.maxTextLength);
    expect(kept.at(-1)).toBe('five');
  });

  it('clamps a scene’s length into the reel’s limits and falls back to three seconds', () => {
    const scenes = [
      { text: 'a', duration_ms: 100 },
      { text: 'b', duration_ms: 99_999 },
      { text: 'c', duration_ms: '2500' },
      { text: 'd', duration_ms: 'long' },
      { text: 'e' },
    ];
    expect(sanitizeScript({ scenes }).scenes.map((scene) => scene.duration_ms)).toEqual([REEL_LIMITS.minSceneMs, REEL_LIMITS.maxSceneMs, 2500, 3000, 3000]);
  });

  it('drops a scene that is not an object or says nothing, and keeps at most the scenes a reel allows', () => {
    const scenes = ['card', null, {}, { text: '', shot: '', asset_query: '' }, { shot: 'Only a shot' }, { asset_query: 'only a query' }];
    expect(sanitizeScript({ scenes }).scenes).toEqual([
      { text: '', shot: 'Only a shot', duration_ms: 3000, asset_query: '' },
      { text: '', shot: '', duration_ms: 3000, asset_query: 'only a query' },
    ]);
    const many = Array.from({ length: REEL_LIMITS.maxScenes + 3 }, () => ({ text: 'x' }));
    expect(sanitizeScript({ scenes: many }).scenes).toHaveLength(REEL_LIMITS.maxScenes);
  });

  it('trims every string to its ceiling', () => {
    const [scene] = sanitizeScript({ scenes: [{ text: 'x'.repeat(300), shot: 's'.repeat(300), asset_query: 'q'.repeat(300) }], cta: 'c'.repeat(300) }).scenes;
    expect(scene.text).toHaveLength(REEL_LIMITS.maxTextLength);
    expect(scene.shot).toHaveLength(200);
    expect(scene.asset_query).toHaveLength(80);
    expect(sanitizeScript({ cta: 'c'.repeat(300) }).cta).toHaveLength(REEL_LIMITS.maxTextLength);
  });
});

import { likersWithViewer } from '@/utils/explore-likers';

describe('likersWithViewer', () => {
  it('returns the ids unchanged when there is no viewer', () => {
    expect(likersWithViewer(['a', 'b'], null, true)).toEqual(['a', 'b']);
  });

  it('appends the viewer when they liked but are absent from the cached list', () => {
    expect(likersWithViewer(['a'], 'me', true)).toEqual(['a', 'me']);
  });

  it('drops the viewer when they un-liked but are still in the cached list', () => {
    expect(likersWithViewer(['a', 'me'], 'me', false)).toEqual(['a']);
  });

  it('leaves the list as-is when the viewer membership already matches the like state', () => {
    expect(likersWithViewer(['a', 'me'], 'me', true)).toEqual(['a', 'me']);
    expect(likersWithViewer(['a'], 'me', false)).toEqual(['a']);
  });
});

import { decodeTarget, encodeTarget, type PreviewTarget } from '../../cmsPreviewLink.service';

const ID = '64b7f0c2a1b2c3d4e5f60718';
const ENTRY = '64b7f0c2a1b2c3d4e5f60719';

describe('encodeTarget', () => {
  it('names a page draft', () => {
    expect(encodeTarget({ kind: 'PAGE', id: ID, version: null, entryId: null })).toBe(`P:${ID}:draft:`);
  });

  it('names a page version at one entry', () => {
    expect(encodeTarget({ kind: 'PAGE', id: ID, version: 4, entryId: ENTRY })).toBe(`P:${ID}:4:${ENTRY}`);
  });

  it('names a component draft and a component version', () => {
    expect(encodeTarget({ kind: 'FRAGMENT', id: ID, version: null, entryId: null })).toBe(`F:${ID}:draft:`);
    expect(encodeTarget({ kind: 'FRAGMENT', id: ID, version: 2, entryId: null })).toBe(`F:${ID}:2:`);
  });
});

describe('decodeTarget', () => {
  it.each<PreviewTarget>([
    { kind: 'PAGE', id: ID, version: null, entryId: null },
    { kind: 'PAGE', id: ID, version: 7, entryId: ENTRY },
    { kind: 'FRAGMENT', id: ID, version: null, entryId: null },
    { kind: 'FRAGMENT', id: ID, version: 1, entryId: null },
  ])('reads back what encodeTarget wrote: %o', (target) => {
    expect(decodeTarget(encodeTarget(target))).toEqual(target);
  });

  it('refuses a token from before components could be previewed (no kind code)', () => {
    // The old shape was `<pageId>:<version>:<entryId>`.
    expect(decodeTarget(`${ID}:draft:`)).toBeNull();
  });

  it.each(['X', 'p', ''])('refuses the unknown kind code %p', (code) => {
    expect(decodeTarget(`${code}:${ID}:draft:`)).toBeNull();
  });

  it('refuses a target without an id', () => {
    expect(decodeTarget('P::draft:')).toBeNull();
    expect(decodeTarget('F')).toBeNull();
  });

  it.each(['', 'latest', 'abc', '3a', '0', '-1', '1.5'])('refuses the version %p', (version) => {
    expect(decodeTarget(`P:${ID}:${version}:`)).toBeNull();
  });

  it('refuses a target with no version part at all', () => {
    expect(decodeTarget(`P:${ID}`)).toBeNull();
  });

  it('reads a missing entry part as no entry', () => {
    expect(decodeTarget(`P:${ID}:3`)).toEqual({ kind: 'PAGE', id: ID, version: 3, entryId: null });
  });
});

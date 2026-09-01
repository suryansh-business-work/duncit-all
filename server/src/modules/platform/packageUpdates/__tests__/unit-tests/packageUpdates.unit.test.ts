import {
  alreadyResolvesToLatest,
  isRegistryRange,
  parseNcuOutput,
  registryDependencyNames,
  updateTypeOf,
} from '../../packageUpdates.service';

describe('packageUpdates classification', () => {
  it('calls a range current when installing it today already gives you the newest version', () => {
    // Every peerDependency in the repo is written as an open floor. `>=5` RESOLVES
    // to 9.4.0, so calling it four majors behind was 218 rows of noise.
    expect(alreadyResolvesToLatest('>=5', '9.4.0')).toBe(true);
    expect(updateTypeOf('>=5', '9.4.0')).toBe('UP_TO_DATE');
    expect(updateTypeOf('> 4.1', '19.2.8')).toBe('UP_TO_DATE');
    expect(updateTypeOf('>=3', '4.2.12')).toBe('UP_TO_DATE');
  });

  it('says the same about a caret or tilde range that reaches the newest version', () => {
    // `^9.0.6` installs 9.1.0 and `~4.1.77` installs 4.1.78 — the floor being old
    // is not an upgrade anyone can perform, so it is not outdated either.
    expect(updateTypeOf('^9.0.6', '9.1.0')).toBe('UP_TO_DATE');
    expect(updateTypeOf('~4.1.77', '4.1.78')).toBe('UP_TO_DATE');
    expect(updateTypeOf('^19.2.8', '19.2.8')).toBe('UP_TO_DATE');
    expect(updateTypeOf('^0.21.0', '0.21.2')).toBe('UP_TO_DATE');
  });

  it('grades the ranges that genuinely cannot reach the newest version', () => {
    expect(updateTypeOf('^16.14.2', '17.0.2')).toBe('MAJOR');
    expect(updateTypeOf('>=5 <6', '9.4.0')).toBe('MAJOR');
    // A caret on a 0.x line pins the MINOR, so 0.21 -> 0.22 is out of range.
    expect(updateTypeOf('^0.21.0', '0.22.0')).toBe('MINOR');
    // A tilde pins the minor, so a newer minor is out of range too.
    expect(updateTypeOf('~4.16.0', '4.27.0')).toBe('MINOR');
    expect(updateTypeOf('19.1.0', '19.2.8')).toBe('MINOR');
    expect(updateTypeOf('15.12.1', '15.12.4')).toBe('PATCH');
  });

  it('never reads a manifest that leads the registry as an upgrade', () => {
    // A manifest can sit AHEAD of the registry answer (a pinned prerelease, a
    // cached sweep). That is not an upgrade, so it must not read as one.
    expect(updateTypeOf('20.0.0', '18.4.0')).toBe('UP_TO_DATE');
    expect(updateTypeOf('19.3.0', '19.2.8')).toBe('UP_TO_DATE');
    expect(updateTypeOf('19.2.9', '19.2.8')).toBe('UP_TO_DATE');
  });

  it('says INTERNAL for a range that resolves inside the repo and UNKNOWN with no answer', () => {
    expect(updateTypeOf('workspace:*', '1.0.0')).toBe('INTERNAL');
    expect(updateTypeOf('file:../../packages/utils', null)).toBe('INTERNAL');
    expect(updateTypeOf('^1.2.3', null)).toBe('UNKNOWN');
    expect(updateTypeOf('nightly', '1.2.3')).toBe('UNKNOWN');
    expect(updateTypeOf('^1.2.3', 'nightly')).toBe('UNKNOWN');
  });

  it('only asks npm about ranges npm could answer for', () => {
    expect(isRegistryRange('^1.2.3')).toBe(true);
    expect(isRegistryRange('workspace:*')).toBe(false);
    expect(isRegistryRange('github:duncit/thing')).toBe(false);
    expect(isRegistryRange('https://example.com/pkg.tgz')).toBe(false);
  });

  it('collects the distinct registry names across manifests, sorted', () => {
    const names = registryDependencyNames([
      {
        name: 'a',
        path: 'a',
        private: true,
        dependencies: [
          { name: 'zod', kind: 'dependencies', range: '^4.5.4' },
          { name: '@duncit/utils', kind: 'dependencies', range: 'workspace:*' },
        ],
      },
      {
        name: 'b',
        path: 'b',
        private: true,
        dependencies: [
          { name: 'zod', kind: 'dependencies', range: '^4.5.4' },
          { name: 'date-fns', kind: 'peerDependencies', range: '>=2' },
        ],
      },
    ]);
    expect(names).toEqual(['date-fns', 'zod']);
  });

  it('reads ncustdout past whatever banner it printed first', () => {
    expect(parseNcuOutput('Checking package.json\n{"zod":"^4.5.4"}\n')).toEqual(
      new Map([['zod', '^4.5.4']]),
    );
    expect(parseNcuOutput('no json here')).toEqual(new Map());
  });
});

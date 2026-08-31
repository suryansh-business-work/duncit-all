import {
  acceptsAnyNewerVersion,
  isRegistryRange,
  parseNcuOutput,
  registryDependencyNames,
  updateTypeOf,
} from '../../packageUpdates.service';

describe('packageUpdates classification', () => {
  it('treats a range with a floor and no ceiling as current, whatever npm published', () => {
    // Every peerDependency in the repo is written this way. `>=5` is SATISFIED by
    // 9.4.0, so calling it four majors behind was 218 rows of noise on the console.
    expect(acceptsAnyNewerVersion('>=5')).toBe(true);
    expect(updateTypeOf('>=5', '9.4.0')).toBe('UP_TO_DATE');
    expect(updateTypeOf('> 4.1', '19.2.8')).toBe('UP_TO_DATE');
    expect(updateTypeOf('>=3', '4.2.12')).toBe('UP_TO_DATE');
  });

  it('still grades a range that names a ceiling, because a newer major falls outside it', () => {
    expect(acceptsAnyNewerVersion('>=5 <6')).toBe(false);
    expect(updateTypeOf('>=5 <6', '9.4.0')).toBe('MAJOR');
  });

  it('grades the ordinary caret and tilde ranges by how far behind they are', () => {
    expect(updateTypeOf('^16.14.2', '17.0.2')).toBe('MAJOR');
    expect(updateTypeOf('^9.0.6', '9.1.0')).toBe('MINOR');
    expect(updateTypeOf('~4.1.77', '4.1.78')).toBe('PATCH');
    expect(updateTypeOf('^19.2.8', '19.2.8')).toBe('UP_TO_DATE');
  });

  it('never asks the registry about a version it already leads', () => {
    // A manifest can sit AHEAD of the registry answer (a pinned prerelease, a
    // cached sweep). That is not an upgrade, so it must not read as one.
    expect(updateTypeOf('^19.2.8', '18.4.0')).toBe('UP_TO_DATE');
    expect(updateTypeOf('^19.3.0', '19.2.8')).toBe('UP_TO_DATE');
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

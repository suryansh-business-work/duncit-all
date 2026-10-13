import { describe, expect, it } from 'vitest';
import { PACKAGE_DOCS, toDoc } from '../../src/pages/packages-docs/package-docs';

const doc = (frontmatter: string[], body = '# @duncit/demo\n\nProse here.') =>
  ['---', ...frontmatter, '---', body].join('\n');

describe('toDoc', () => {
  it('reads scalars, booleans and dash lists and strips the matching title', () => {
    const parsed = toDoc(
      '../../../../../packages/demo/docs/index.mdx',
      doc([
        'name: "@duncit/demo"',
        "summary: 'Does a thing'",
        'category: domain',
        'zeroDeps: true',
        'frameworkFree: false',
        'coverageGate: true',
        'consumers:',
        '  - mweb',
        '  - "tech portal"',
        'exports:',
        '  - alpha',
        '  - beta',
      ]),
    );
    expect(parsed).toEqual({
      slug: 'demo',
      name: '@duncit/demo',
      summary: 'Does a thing',
      category: 'domain',
      zeroDeps: true,
      frameworkFree: false,
      coverageGate: true,
      consumers: ['mweb', 'tech portal'],
      exports: ['alpha', 'beta'],
      body: 'Prose here.',
    });
  });

  it('derives the name from the folder and defaults every field when there is no frontmatter', () => {
    const parsed = toDoc('packages/solo/docs/index.mdx', '# Not the package title\n\nBody');
    expect(parsed).toEqual({
      slug: 'solo',
      name: '@duncit/solo',
      summary: '',
      category: 'other',
      zeroDeps: false,
      frameworkFree: false,
      coverageGate: false,
      consumers: [],
      exports: [],
      body: '# Not the package title\n\nBody',
    });
  });

  it('treats an unterminated frontmatter block as plain body', () => {
    const raw = '---\nname: x\nno closing fence';
    const parsed = toDoc('packages/open/docs/index.mdx', raw);
    expect(parsed.name).toBe('@duncit/open');
    expect(parsed.body).toBe(raw);
  });

  it('ignores lines that are not key: value pairs and keys with a leading colon', () => {
    const parsed = toDoc(
      'packages/odd/docs/index.mdx',
      doc(['just a sentence', ': orphan', 'summary: Real one', '- stray dash before any list']),
    );
    expect(parsed.summary).toBe('Real one');
    expect(parsed.exports).toEqual([]);
  });

  it('ends a list when the next key starts and keeps a stray dash line out of it', () => {
    const parsed = toDoc(
      'packages/lists/docs/index.mdx',
      doc(['exports:', '  - one', 'summary: after', '  - not-a-list-item-any-more']),
    );
    expect(parsed.exports).toEqual(['one']);
    expect(parsed.summary).toBe('after');
  });

  it('falls back to the default when a scalar key is written as a list', () => {
    const parsed = toDoc('packages/mixed/docs/index.mdx', doc(['exports:', '  - a']));
    expect(parsed.summary).toBe('');
    expect(parsed.exports).toEqual(['a']);
  });

  it('keeps the body untouched when its heading is not the package name', () => {
    const parsed = toDoc('packages/h/docs/index.mdx', doc(['name: "@duncit/h"'], '# Something else\n\ntext'));
    expect(parsed.body).toBe('# Something else\n\ntext');
  });

  it('copes with windows line endings and backslash paths', () => {
    const raw = ['---', 'name: "@duncit/win"', '---', '# @duncit/win', 'text'].join('\r\n');
    const parsed = toDoc('..\\..\\packages\\win\\docs\\index.mdx', raw);
    expect(parsed.slug).toBe('win');
    expect(parsed.name).toBe('@duncit/win');
    expect(parsed.body).toBe('text');
  });

  it('uses the whole path as the slug when it is not under packages/', () => {
    expect(toDoc('somewhere/else.mdx', 'body').slug).toBe('somewhere/else.mdx');
  });
});

describe('PACKAGE_DOCS', () => {
  it('is sorted by package name', () => {
    const names = PACKAGE_DOCS.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

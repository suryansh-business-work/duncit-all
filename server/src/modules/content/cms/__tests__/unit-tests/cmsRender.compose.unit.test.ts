import {
  bindEntry,
  DEFAULT_DETAIL_TEMPLATE,
  expandFragments,
  fieldHtml,
  fragmentKeys,
  renderLists,
  wrapComponent,
  type ComposedPart,
  type RenderEntry,
} from '../../cmsRender.compose';

const entry = (over: Partial<RenderEntry> = {}): RenderEntry => ({
  id: 'e1',
  apply: false,
  title: 'QA Tester',
  slug: 'qa-tester',
  summary: 'Own quality.',
  body_html: '<p>Body</p>',
  cover_image_url: '',
  category: 'Engineering',
  tags: ['remote'],
  author_name: 'Duncit',
  fields: [{ key: 'team', value: 'Apps & <Web>' }],
  published_at: new Date('2026-04-02T10:00:00Z'),
  ...over,
});

const part = (html: string, css = '', js = ''): ComposedPart => ({ html, css, js });
const placeholder = (key: string) => `<cms-fragment data-key="${key}"></cms-fragment>`;

describe('expandFragments', () => {
  it('swaps each placeholder for its component, inside its scope wrapper', () => {
    const out = expandFragments(`<main>${placeholder('hero')}</main>`, new Map([['hero', part('<h1>Hi</h1>')]]));
    expect(out.html).toBe('<main><div data-cms-fragment="hero"><h1>Hi</h1></div></main>');
  });

  it('compiles a component’s SCSS scoped to the component', () => {
    const out = expandFragments(placeholder('hero'), new Map([['hero', part('<h1>Hi</h1>', '.title { span { color: red } }')]]));
    expect(out.css).toBe('[data-cms-fragment=hero] .title span{color:red}');
  });

  it('runs a component’s script scoped to its own placements', () => {
    const out = expandFragments(placeholder('hero'), new Map([['hero', part('<h1>Hi</h1>', '', 'root.hidden = false;')]]));
    expect(out.js).toContain('document.querySelectorAll("[data-cms-fragment=\\"hero\\"]")');
    expect(out.js).toContain('root.hidden = false;');
  });

  it('ships a component used twice with its css and js once', () => {
    const out = expandFragments(placeholder('cta') + placeholder('cta'), new Map([['cta', part('<a>Go</a>', '.a { color: red }', 'root.x = 1;')]]));
    expect(out.html.match(/data-cms-fragment="cta"/g)).toHaveLength(2);
    expect(out.css.match(/color:red/g)).toHaveLength(1);
    expect(out.js?.match(/root\.x = 1;/g)).toHaveLength(1);
  });

  it('expands components inside components, collecting their css', () => {
    const fragments = new Map([
      ['outer', part(`<section>${placeholder('inner')}</section>`, '.o { color: blue }')],
      ['inner', part('<p>in</p>', '.i { color: green }')],
    ]);
    const out = expandFragments(placeholder('outer'), fragments);
    expect(out.html).toBe('<div data-cms-fragment="outer"><section><div data-cms-fragment="inner"><p>in</p></div></section></div>');
    expect(out.css).toContain('[data-cms-fragment=outer] .o{color:blue}');
    expect(out.css).toContain('[data-cms-fragment=inner] .i{color:green}');
  });

  it('renders an unknown or unpublished component as nothing, never as a broken tag', () => {
    expect(expandFragments(`<p>a</p>${placeholder('gone')}`, new Map()).html).toBe('<p>a</p>');
  });

  it('stops a component that includes itself instead of rendering forever', () => {
    const out = expandFragments(placeholder('loop'), new Map([['loop', part(`<i>x</i>${placeholder('loop')}`)]]));
    expect(out.html.match(/<i>x<\/i>/g)!.length).toBeLessThanOrEqual(3);
  });

  it('serves a component whose SCSS no longer compiles as written, scoped nowhere', () => {
    const out = expandFragments(placeholder('bad'), new Map([['bad', part('<b>x</b>', '.a { color: ; }')]]));
    expect(out.css).toBe('.a { color: ; }');
  });
});

describe('wrapComponent / fragmentKeys', () => {
  it('wraps html in the element a component’s scope selects', () => {
    expect(wrapComponent('k', '<p>x</p>')).toBe('<div data-cms-fragment="k"><p>x</p></div>');
  });

  it('lists every component a page uses, once', () => {
    expect(fragmentKeys(placeholder('a') + placeholder('b') + placeholder('a'))).toEqual(['a', 'b']);
  });
});

describe('fieldHtml', () => {
  it('escapes text fields and custom fields', () => {
    expect(fieldHtml(entry({ title: '<Tom & Jerry>' }), 'title')).toBe('&lt;Tom &amp; Jerry&gt;');
    expect(fieldHtml(entry(), 'field:team')).toBe('Apps &amp; &lt;Web&gt;');
    expect(fieldHtml(entry(), 'field:missing')).toBe('');
  });

  it('keeps the body as authored html', () => {
    expect(fieldHtml(entry(), 'body_html')).toBe('<p>Body</p>');
  });

  it('renders the date as a machine-readable <time>', () => {
    expect(fieldHtml(entry(), 'published_at')).toBe('<time datetime="2026-04-02T10:00:00.000Z">2026-04-02</time>');
    expect(fieldHtml(entry({ published_at: null }), 'published_at')).toBe('');
  });

  it('renders tags, the cover image, and nothing for an unknown field', () => {
    expect(fieldHtml(entry(), 'tags')).toBe('<span class="cms-tag">remote</span>');
    expect(fieldHtml(entry({ cover_image_url: 'https://x/a.jpg' }), 'cover_image')).toBe('<img class="cms-cover" src="https://x/a.jpg" alt="QA Tester" loading="lazy">');
    expect(fieldHtml(entry(), 'cover_image')).toBe('');
    expect(fieldHtml(entry(), 'nope')).toBe('');
  });
});

describe('careers Apply', () => {
  const apply = '<cms-block data-block="apply" data-props="{&quot;role&quot;:&quot;QA Tester&quot;,&quot;role_id&quot;:&quot;e1&quot;}"></cms-block>';

  it('puts an Apply block under a career page’s body, even when its template never placed one', () => {
    expect(bindEntry(DEFAULT_DETAIL_TEMPLATE, entry({ apply: true }))).toContain(`<p>Body</p>${apply}`);
  });

  it('adds it at the end of a template with no body field', () => {
    expect(bindEntry('<h1><cms-field data-field="title"></cms-field></h1>', entry({ apply: true }))).toBe(`<h1>QA Tester</h1>${apply}`);
  });

  it('respects an Apply field the template placed itself, once', () => {
    const html = bindEntry('<cms-field data-field="apply"></cms-field><cms-field data-field="body_html"></cms-field>', entry({ apply: true }));
    expect(html).toBe(`${apply}<p>Body</p>`);
  });

  it('gives a career card an Apply button, and other entries none', () => {
    expect(renderLists('<cms-entry-list data-variant="cards"></cms-entry-list>', [entry({ apply: true })], '/careers')).toContain(apply);
    expect(renderLists('<cms-entry-list data-variant="rows"></cms-entry-list>', [entry()], '/blog')).not.toContain('data-block="apply"');
    expect(bindEntry(DEFAULT_DETAIL_TEMPLATE, entry())).not.toContain('data-block="apply"');
  });
});

describe('a component without a script', () => {
  it('adds no script for it, nested or not', () => {
    const fragments = new Map<string, ComposedPart>([
      ['outer', { html: `<div>${placeholder('inner')}</div>`, css: '' }],
      ['inner', { html: '<p>x</p>', css: '' }],
    ]);
    expect(expandFragments(placeholder('outer'), fragments).js).toBe('');
  });
});

describe('more entry fields', () => {
  it('escapes the summary, category and author, empty when missing', () => {
    expect(fieldHtml(entry({ summary: 'a < b' }), 'summary')).toBe('a &lt; b');
    expect(fieldHtml(entry(), 'category')).toBe('Engineering');
    expect(fieldHtml(entry(), 'author_name')).toBe('Duncit');
    expect(fieldHtml({ ...entry(), author_name: undefined as unknown as string }, 'author_name')).toBe('');
    expect(fieldHtml({ ...entry(), body_html: undefined as unknown as string }, 'body_html')).toBe('');
  });
});

describe('cards', () => {
  const list = (variant: string, e: RenderEntry) => renderLists(`<cms-entry-list data-variant="${variant}"></cms-entry-list>`, [e], '/blog');

  it('shows a cover, the category and the summary on a full card', () => {
    const html = list('cards', entry({ cover_image_url: 'https://x/a.jpg' }));
    expect(html).toContain('<a class="cms-card__media" href="/blog/qa-tester" tabindex="-1" aria-hidden="true"><img');
    expect(html).toContain('<span class="cms-card__category">Engineering</span>');
    expect(html).toContain('<p class="cms-card__summary">Own quality.</p>');
  });

  it('drops what an entry does not have, and the summary from a compact card', () => {
    const html = list('compact', entry({ category: '', summary: 'Hidden' }));
    expect(html).not.toContain('cms-card__category');
    expect(html).not.toContain('cms-card__summary');
    expect(html).not.toContain('cms-card__media');
    expect(list('rows', entry({ summary: '' }))).not.toContain('cms-card__summary');
  });
});

describe('renderLists', () => {
  it('links each card to its entry page and keeps an empty list a list', () => {
    expect(renderLists('<cms-entry-list data-variant="compact"></cms-entry-list>', [entry()], '/blog')).toContain('href="/blog/qa-tester"');
    expect(renderLists('<cms-entry-list data-variant="cards"></cms-entry-list>', [], '/blog')).toBe('<div class="cms-list cms-list--empty"></div>');
  });
});

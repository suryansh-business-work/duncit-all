import { validate } from '@utils/validate';
import { cmsDraftInputSchema, cmsFragmentInputSchema, cmsPageInputSchema, cmsSiteInputSchema } from '../../cms.validator';

const page = (seo: Record<string, unknown>) => validate(cmsPageInputSchema, { title: 'About', path: '/about', seo });

/** The messages a refused input reports, from the GraphQL error validate() throws. */
async function messages(promise: Promise<unknown>): Promise<string[]> {
  try {
    await promise;
  } catch (error) {
    return (error as { extensions: { errors: string[] } }).extensions.errors;
  }
  throw new Error('expected the input to be refused');
}

describe('SEO input: the sharing fields', () => {
  it('defaults every new field when the form leaves them out', async () => {
    const { seo } = await page({});
    expect(seo).toMatchObject({ og_title: '', og_description: '', twitter_card: '', keywords: '', json_ld: '', meta_tags: [] });
  });

  it('trims the share card, keywords and structured data', async () => {
    const { seo } = await page({
      og_title: '  Share  ',
      og_description: ' Text ',
      keywords: ' pets ',
      json_ld: '  {"@type":"Organization"}  ',
      twitter_card: 'summary_large_image',
    });
    expect(seo).toMatchObject({
      og_title: 'Share',
      og_description: 'Text',
      keywords: 'pets',
      json_ld: '{"@type":"Organization"}',
      twitter_card: 'summary_large_image',
    });
  });

  it('caps the share title at 160, its text at 320 and keywords at 300 characters', async () => {
    await expect(page({ og_title: 'a'.repeat(160), og_description: 'b'.repeat(320), keywords: 'c'.repeat(300) })).resolves.toBeDefined();
    expect(await messages(page({ og_title: 'a'.repeat(161) }))).toHaveLength(1);
    expect(await messages(page({ og_description: 'b'.repeat(321) }))).toHaveLength(1);
    expect(await messages(page({ keywords: 'c'.repeat(301) }))).toHaveLength(1);
  });

  it.each(['', 'summary', 'summary_large_image'])('accepts the twitter card %p', async (card) => {
    expect((await page({ twitter_card: card })).seo.twitter_card).toBe(card);
  });

  it('refuses a twitter card type the renderer does not know', async () => {
    expect(await messages(page({ twitter_card: 'player' }))).toHaveLength(1);
  });

  it('accepts blank (or whitespace-only) structured data', async () => {
    expect((await page({ json_ld: '   ' })).seo.json_ld).toBe('');
  });

  it('refuses structured data that is not JSON', async () => {
    expect(await messages(page({ json_ld: '{"@type": Organization}' }))).toEqual(['Structured data must be valid JSON']);
  });

  it('refuses structured data over 20,000 characters', async () => {
    const big = JSON.stringify({ text: 'x'.repeat(20_000) });
    expect((await messages(page({ json_ld: big }))).length).toBeGreaterThan(0);
  });

  it('keeps extra meta tags, trimmed, with blank content by default', async () => {
    const { seo } = await page({ meta_tags: [{ name: ' og:locale ', content: ' en_IN ' }, { name: 'author' }] });
    expect(seo.meta_tags).toEqual([
      { name: 'og:locale', content: 'en_IN' },
      { name: 'author', content: '' },
    ]);
  });

  it('asks for a name on a meta tag without one', async () => {
    expect(await messages(page({ meta_tags: [{ name: '   ', content: 'x' }] }))).toContain('Name the meta tag');
    expect(await messages(page({ meta_tags: [{ content: 'x' }] }))).toContain('Name the meta tag');
  });

  it('refuses a meta name that could break out of the attribute', async () => {
    expect(await messages(page({ meta_tags: [{ name: 'x" onload="evil', content: '' }] }))).toContain(
      'A meta name is letters, digits and : . - _'
    );
  });

  it('caps meta content at 500 characters', async () => {
    expect(await messages(page({ meta_tags: [{ name: 'author', content: 'a'.repeat(501) }] }))).toHaveLength(1);
  });

  it('allows 20 extra meta tags and refuses a 21st', async () => {
    const tags = (n: number) => Array.from({ length: n }, (_v, i) => ({ name: `tag${i}`, content: 'x' }));
    expect((await page({ meta_tags: tags(20) })).seo.meta_tags).toHaveLength(20);
    expect(await messages(page({ meta_tags: tags(21) }))).toHaveLength(1);
  });

  it('takes a share image as an https link or a path on the site, never http or protocol-relative', async () => {
    expect((await page({ og_image_url: 'https://cdn.duncit.com/og.png' })).seo.og_image_url).toBe('https://cdn.duncit.com/og.png');
    expect((await page({ og_image_url: '/legacy/main/og.png' })).seo.og_image_url).toBe('/legacy/main/og.png');
    expect(await messages(page({ og_image_url: 'http://cdn.duncit.com/og.png' }))).toEqual(['Use an https link']);
    expect(await messages(page({ og_image_url: '//evil.test/og.png' }))).toEqual(['Use an https link']);
    expect(await messages(page({ canonical_url: 'not a url' }))).toEqual(['Use an https link']);
  });

  it('applies the same SEO rules to a site', async () => {
    const site = await validate(cmsSiteInputSchema, { key: 'main', name: 'Main', seo: { og_title: 'Duncit', twitter_card: 'summary' } });
    expect(site.seo).toMatchObject({ og_title: 'Duncit', twitter_card: 'summary', meta_tags: [] });
    expect(await messages(validate(cmsSiteInputSchema, { key: 'main', name: 'Main', seo: { json_ld: 'nope' } }))).toEqual([
      'Structured data must be valid JSON',
    ]);
  });
});

describe('draft input: SCSS and JS', () => {
  it('leaves SCSS and JS out when the visual editor does not send them, so the saved code is kept', async () => {
    const draft = await validate(cmsDraftInputSchema, { project: '{}', html: '<p>x</p>', css: '' });
    expect(draft).not.toHaveProperty('scss');
    expect(draft).not.toHaveProperty('js');
    expect(draft.scss).toBeUndefined();
    expect(draft.js).toBeUndefined();
  });

  it('passes SCSS and JS through untouched, empty strings included (clearing them is a real edit)', async () => {
    const draft = await validate(cmsDraftInputSchema, { project: '{}', html: '', css: '', scss: '  $c: red;  ', js: '' });
    expect(draft.scss).toBe('  $c: red;  ');
    expect(draft.js).toBe('');
  });

  it('refuses SCSS or JS over a megabyte', async () => {
    const huge = 'a'.repeat(1_000_001);
    expect(await messages(validate(cmsDraftInputSchema, { scss: huge }))).toHaveLength(1);
    expect(await messages(validate(cmsDraftInputSchema, { js: huge }))).toHaveLength(1);
  });

  it('refuses SCSS that is not a string', async () => {
    expect(await messages(validate(cmsDraftInputSchema, { scss: 42 }))).toHaveLength(1);
  });
});

describe('fragment input: description and category', () => {
  const base = { key: 'hero', name: 'Hero', kind: 'SECTION' };

  it('defaults both to empty', async () => {
    expect(await validate(cmsFragmentInputSchema, base)).toMatchObject({ description: '', category: '' });
  });

  it('trims them', async () => {
    expect(await validate(cmsFragmentInputSchema, { ...base, description: ' For the top ', category: ' Hero ' })).toMatchObject({
      description: 'For the top',
      category: 'Hero',
    });
  });

  it('caps the description at 500 and the category at 60 characters', async () => {
    await expect(validate(cmsFragmentInputSchema, { ...base, description: 'd'.repeat(500), category: 'c'.repeat(60) })).resolves.toBeDefined();
    expect(await messages(validate(cmsFragmentInputSchema, { ...base, description: 'd'.repeat(501) }))).toHaveLength(1);
    expect(await messages(validate(cmsFragmentInputSchema, { ...base, category: 'c'.repeat(61) }))).toHaveLength(1);
  });
});

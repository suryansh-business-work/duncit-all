import { describe, expect, it } from 'vitest';
import { parseProps, splitSegments } from './segments';
import { list, record, text } from './props';
import { localiseDates, scriptSafe, styleSafe } from './design';

describe('parseProps', () => {
  it('reads entity-escaped JSON objects', () => {
    expect(parseProps('{&quot;heading&quot;:&quot;Tom &amp; Jerry&#39;s &lt;b&gt;&quot;}')).toEqual({ heading: "Tom & Jerry's <b>" });
  });

  it('treats missing, broken or non-object props as none', () => {
    expect(parseProps(undefined)).toEqual({});
    expect(parseProps('')).toEqual({});
    expect(parseProps('{broken')).toEqual({});
    expect(parseProps('[1,2]')).toEqual({});
    expect(parseProps('null')).toEqual({});
  });
});

describe('splitSegments', () => {
  it('keeps the html around each block, in order', () => {
    const html = '<div>a<cms-block data-block="reel-slider" data-props="{&quot;site&quot;:&quot;MAIN&quot;}"></cms-block>b</div>';
    expect(splitSegments(html)).toEqual([
      { kind: 'html', html: '<div>a' },
      { kind: 'block', block: 'reel-slider', props: { site: 'MAIN' } },
      { kind: 'html', html: 'b</div>' },
    ]);
  });

  it('handles adjacent blocks without props and pages with no blocks', () => {
    expect(splitSegments('<cms-block data-block="faq"></cms-block><cms-block data-block="newsletter"></cms-block>')).toEqual([
      { kind: 'block', block: 'faq', props: {} },
      { kind: 'block', block: 'newsletter', props: {} },
    ]);
    expect(splitSegments('<p>plain</p>')).toEqual([{ kind: 'html', html: '<p>plain</p>' }]);
    expect(splitSegments('')).toEqual([]);
  });
});

describe('props narrowing', () => {
  it('keeps only the expected shape', () => {
    expect(text('x')).toBe('x');
    expect(text(3)).toBe('');
    expect(list([1])).toEqual([1]);
    expect(list('x')).toEqual([]);
    expect(record({ a: 1 })).toEqual({ a: 1 });
    expect(record([1])).toEqual({});
    expect(record(null)).toEqual({});
  });
});

describe('design helpers', () => {
  it('stops editor css and js from closing their element', () => {
    expect(styleSafe('a{}</style><script>')).toBe('a{}<\\/style><script>');
    expect(scriptSafe('x="</script>"')).toBe('x="<\\/script>"');
  });

  it("writes ISO dates in the site's locale and leaves unreadable ones alone", () => {
    const html = '<time datetime="2026-10-06">2026-10-06</time> <time datetime="soon">soon</time>';
    expect(localiseDates(html, 'en-IN')).toBe('<time datetime="2026-10-06">6 Oct 2026</time> <time datetime="soon">soon</time>');
  });
});

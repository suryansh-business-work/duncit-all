import { describe, expect, it } from 'vitest';
import { MARKUP_MODES, componentCodeSchema, toComponentCodeValues, toDraftInput, type ComponentDraft } from './component-code.types';

const draft: ComponentDraft = {
  project: '{"pages":[{"id":"p1"}]}',
  html: '<section class="hero"></section>',
  css: '.hero{color:red}',
  scss: '.hero { color: var(--brand); }',
  js: 'root.dataset.ready = "1";',
};

describe('componentCodeSchema', () => {
  it('accepts every markup mode with empty code', () => {
    for (const mode of MARKUP_MODES) {
      expect(componentCodeSchema().safeParse({ mode, html: '', scss: '', js: '' }).success).toBe(true);
    }
  });

  it('rejects a markup mode the server cannot check', () => {
    expect(componentCodeSchema().safeParse({ mode: 'jsx', html: '', scss: '', js: '' }).success).toBe(false);
  });

  it('bounds each field at the API limits', () => {
    const base = { mode: 'html' as const, html: '', scss: '', js: '' };
    expect(componentCodeSchema().safeParse({ ...base, scss: 'x'.repeat(500_000) }).success).toBe(true);
    expect(componentCodeSchema().safeParse({ ...base, scss: 'x'.repeat(500_001) }).success).toBe(false);
    expect(componentCodeSchema().safeParse({ ...base, js: 'x'.repeat(500_001) }).success).toBe(false);
    expect(componentCodeSchema().safeParse({ ...base, html: 'x'.repeat(2_000_001) }).success).toBe(false);
  });
});

describe('toComponentCodeValues', () => {
  it('opens plain markup in HTML mode and keeps the code as saved', () => {
    expect(toComponentCodeValues(draft)).toEqual({ mode: 'html', html: draft.html, scss: draft.scss, js: draft.js });
  });

  it('opens markup with an Astro fence in Astro mode, even after leading blank lines', () => {
    expect(toComponentCodeValues({ ...draft, html: '\n  ---\nconst a = 1;\n---\n<p>{a}</p>' }).mode).toBe('astro');
  });

  it.each(['<ul class:list={["a"]}></ul>', '<div set:html={raw}></div>', '<Counter client:load="" />', '<Map client:visible={true} />'])(
    'opens markup with an Astro directive in Astro mode: %s',
    (html) => {
      expect(toComponentCodeValues({ ...draft, html }).mode).toBe('astro');
    },
  );

  it('does not mistake a directive-like word without an attribute for Astro', () => {
    expect(toComponentCodeValues({ ...draft, html: '<p>Use client:load to hydrate</p>' }).mode).toBe('html');
    expect(toComponentCodeValues({ ...draft, html: '<hr>---' }).mode).toBe('html');
  });
});

describe('toDraftInput', () => {
  const values = { mode: 'html' as const, html: draft.html, scss: '.hero { gap: 1rem; }', js: '' };

  it('keeps the visual editor project and css when the markup is unchanged', () => {
    expect(toDraftInput(values, draft, '2026-10-01T10:00:00.000Z')).toEqual({
      project: draft.project,
      html: draft.html,
      css: draft.css,
      scss: '.hero { gap: 1rem; }',
      js: '',
      base_updated_at: '2026-10-01T10:00:00.000Z',
    });
  });

  it('drops the stored project when the markup changed, so the editor re-reads it', () => {
    const input = toDraftInput({ ...values, html: '<section class="hero"><h1>Hi</h1></section>' }, draft, null);
    expect(input.project).toBe('');
    expect(input.html).toBe('<section class="hero"><h1>Hi</h1></section>');
    expect(input.css).toBe(draft.css);
    expect(input.base_updated_at).toBeNull();
  });
});

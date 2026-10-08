import { fontCss, googleFontsHref, tokensCss } from '@duncit/brand/cms-design';
import type { CmsPreviewData } from '../queries/pages';

/**
 * Live blocks (newsletter, reel slider…) are drawn by the website renderer, not
 * here — in the console they show as labelled outlines so a designer still
 * sees where each one sits.
 */
export const PLACEHOLDER_CSS = [
  'cms-block,cms-fragment,cms-field,cms-entry-list{display:block;min-height:3rem;margin:0.5rem 0;padding:0.75rem;',
  'border:1px dashed currentColor;border-radius:0.5rem;opacity:0.7;font:600 0.85rem/1.4 system-ui,sans-serif}',
  'cms-block::before{content:attr(data-block)}',
  // A block the site draws for the designer (editor/blockFrame.ts) is shown as it is, edge to edge.
  'cms-block[data-cms-live]{padding:0;border-style:solid;opacity:1}cms-block[data-cms-live]::before{content:none}',
  'cms-fragment::before{content:attr(data-key)}',
  'cms-field{display:inline-block;min-height:0}cms-field::before{content:"{" attr(data-field) "}"}',
  'cms-entry-list::before{content:attr(data-variant)}',
  // The composed preview wraps each component like the live site does: no box of its own.
  '[data-cms-fragment]{display:contents}',
].join('');

const STYLE_CLOSE = /<\/style/gi;
const safe = (css: string) => css.replaceAll(STYLE_CLOSE, String.raw`<\/style`);

/** The preview's whole document, built from what cmsPreview returned. */
export function previewDocument(preview: CmsPreviewData['cmsPreview']): string {
  const design = preview.site?.design;
  const hrefs = [googleFontsHref(design?.fonts ?? []), ...(design?.font_urls ?? [])].filter((href): href is string => Boolean(href));
  const fonts = hrefs.map((href) => `<link rel="stylesheet" href="${href.replaceAll('"', '&quot;')}">`).join('');
  const css = [design?.base_css ?? '', tokensCss(design?.tokens ?? []), fontCss(design?.fonts ?? []), preview.css, preview.site?.custom_css ?? '', PLACEHOLDER_CSS]
    .filter(Boolean)
    .map((rule) => `<style>${safe(rule)}</style>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${fonts}${css}</head><body>${preview.html}</body></html>`;
}

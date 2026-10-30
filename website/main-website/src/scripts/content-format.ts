/**
 * Shared by the Website-portal content renderers (content-cards.ts) and the
 * blog post page (blog-post.ts): the item shape, and the three helpers every
 * string needs before it lands in an innerHTML template.
 */
import { blogPostPath } from '../lib/blog-path';

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  body?: string | null;
  category?: string | null;
  image_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  published_at?: string | null;
}

/** Text as HTML-safe markup. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

/** An author-entered link, kept only when it is http(s), mailto: or tel:. */
export const safeUrl = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '#';
  if (/^(mailto:|tel:)/i.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : '#';
  } catch {
    return '#';
  }
};

/** "Oct 19, 2026", or '' for a missing or unreadable date. */
export const formatDate = (value: unknown): string => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

/** The on-site address of one blog post. */
export const postLink = (item: Pick<ContentItem, 'slug'>): string => blogPostPath(item.slug);

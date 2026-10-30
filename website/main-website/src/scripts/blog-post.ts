/**
 * The blog post page (pages/blog/post.astro): load every published post once,
 * show the one at /blog/<slug> (or the old `?slug=`), and fill the side panels: Suggested (same
 * category), Related (the latest others) and a month-by-month Archive.
 */
import { escapeHtml, formatDate, postLink, safeUrl, type ContentItem } from './content-format';
import { blogSlugFrom } from '../lib/blog-path';

interface PostCopy {
  notFound: string;
  error: string;
  noSuggested: string;
  noRelated: string;
  noArchive: string;
  titleSuffix: string;
}

const QUERY = 'query { publicWebsiteContent(type: BLOG) { id title slug summary body category image_url published_at } }';

const PANEL_SIZE = 3;

const miniCard = (item: ContentItem): string => `
  <a href="${postLink(item)}" class="group flex items-center gap-3 rounded-2xl p-2 transition duration-300 ease-soft hover:bg-lilac">
    ${
      item.image_url
        ? `<img src="${safeUrl(item.image_url)}" alt="" loading="lazy" class="h-14 w-14 shrink-0 rounded-xl object-cover" />`
        : '<span class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-lilac text-secondary" aria-hidden="true"><i class="fa-solid fa-feather-pointed"></i></span>'
    }
    <span class="min-w-0">
      <span class="block text-xs font-bold text-ink-soft">${escapeHtml(formatDate(item.published_at))}</span>
      <span class="block font-head text-sm leading-snug font-bold text-ink group-hover:text-primary-ink">${escapeHtml(item.title)}</span>
    </span>
  </a>`;

const note = (text: string): string => `<p class="text-sm text-ink-soft">${escapeHtml(text)}</p>`;

const fill = (id: string, html: string): void => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};

function postMarkup(post: ContentItem): string {
  const category = post.category
    ? `<span class="inline-flex -rotate-2 items-center rounded-full bg-tertiary px-3 py-1 font-head text-xs font-extrabold tracking-wide text-on-accent uppercase">${escapeHtml(post.category)}</span>`
    : '';
  const image = post.image_url
    ? `<img src="${safeUrl(post.image_url)}" alt="" class="mb-8 aspect-video w-full rounded-card object-cover shadow-lift" />`
    : '';
  // The body is trusted HTML from the Website portal's own editor.
  return `
    ${image}
    <div class="not-prose mb-8 flex flex-wrap items-center gap-3 text-sm font-bold text-ink-soft">
      ${category}
      <span class="inline-flex items-center gap-1.5"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${escapeHtml(formatDate(post.published_at))}</span>
    </div>
    <div class="prose-page">${post.body || `<p>${escapeHtml(post.summary)}</p>`}</div>`;
}

/** "October 2026" mapped to how many posts, newest month first. */
function archiveMarkup(posts: ContentItem[], copy: PostCopy): string {
  const byMonth = new Map<string, number>();
  for (const post of posts) {
    if (!post.published_at) continue;
    const date = new Date(post.published_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  if (!byMonth.size) return note(copy.noArchive);
  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, count]) => {
      const [year, month] = key.split('-').map(Number);
      const label = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
      return `<a href="/blog" class="flex min-h-11 items-center justify-between rounded-full border border-line px-4 text-sm font-bold text-ink transition duration-300 ease-soft hover:border-primary hover:text-primary-ink">
          <span>${escapeHtml(label)}</span><span class="rounded-full bg-lilac px-2 py-0.5 text-xs text-ink-soft">${count}</span>
        </a>`;
    })
    .join('');
}

function showPost(post: ContentItem, posts: ContentItem[], copy: PostCopy, body: HTMLElement): void {
  document.title = `${post.title} — ${copy.titleSuffix}`;
  const heading = document.querySelector('[data-page-heading]') ?? document.querySelector('h1');
  if (heading) heading.textContent = post.title;
  body.innerHTML = postMarkup(post);

  const others = posts.filter((p) => p.slug !== post.slug);
  const suggested = others.filter((p) => p.category && p.category === post.category).slice(0, PANEL_SIZE);
  const related = others.filter((p) => !suggested.includes(p)).slice(0, PANEL_SIZE);
  fill('suggestedPosts', suggested.length ? suggested.map(miniCard).join('') : note(copy.noSuggested));
  fill('relatedPosts', related.length ? related.map(miniCard).join('') : note(copy.noRelated));
  fill('postArchive', archiveMarkup(posts, copy));
}

export async function loadBlogPost(graphqlUrl: string): Promise<void> {
  const body = document.getElementById('postBody');
  if (!body) return;
  const slug = blogSlugFrom(globalThis.location.pathname, globalThis.location.search);
  if (!slug) {
    globalThis.location.replace('/blog');
    return;
  }
  // Handed over by the markup, since a module script cannot read Astro frontmatter.
  const copy: PostCopy = JSON.parse(body.dataset.copy ?? '{}');
  try {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
    });
    const json: { data?: { publicWebsiteContent?: ContentItem[] | null } | null } = await res.json();
    const posts = json?.data?.publicWebsiteContent ?? [];
    const post = posts.find((p) => p.slug === slug);
    if (post) showPost(post, posts, copy, body);
    else body.innerHTML = note(copy.notFound);
  } catch (error) {
    console.error('blog post failed to load', { slug, error });
    body.innerHTML = note(copy.error);
  }
}

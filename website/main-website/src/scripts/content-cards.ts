/**
 * The three ways WebsiteContentList draws Website-portal content: blog cards,
 * newsroom cards and open roles. Every author string is escaped; the copy
 * comes from the page's own catalogue through `data-copy`.
 */
import { escapeHtml, formatDate, postLink, safeUrl, type ContentItem } from './content-format';

export interface ListCopy {
  empty: string;
  error: string;
  readMore: string;
  apply: string;
}

const CARD =
  'group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-lift';

/** The rotated category label a card wears over its picture (or its corner). */
const sticker = (category: ContentItem['category']): string =>
  category
    ? `<span class="absolute top-4 left-4 z-10 inline-flex -rotate-3 items-center rounded-full bg-tertiary px-3 py-1 font-head text-xs font-extrabold tracking-wide text-on-accent uppercase shadow-soft">${escapeHtml(category)}</span>`
    : '';

const dateLine = (value: ContentItem['published_at']): string => {
  const date = formatDate(value);
  return date
    ? `<span class="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-soft uppercase"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${escapeHtml(date)}</span>`
    : '';
};

const arrowRow = (label: string): string => `
  <span class="mt-auto inline-flex items-center gap-2 pt-5 font-head text-sm font-extrabold text-primary-ink">
    ${escapeHtml(label)}
    <i class="fa-solid fa-arrow-right transition duration-300 ease-soft group-hover:-rotate-45" aria-hidden="true"></i>
  </span>`;

/** The picture, or a tinted stand-in so a card without one still has a face. */
const cover = (item: ContentItem, icon: string): string =>
  item.image_url
    ? `<div class="aspect-[16/10] overflow-hidden"><img src="${safeUrl(item.image_url)}" alt="" loading="lazy" class="h-full w-full object-cover transition duration-700 ease-soft group-hover:scale-105" /></div>`
    : `<div class="flex aspect-[16/10] items-center justify-center bg-lilac text-4xl text-secondary" aria-hidden="true"><i class="fa-solid ${icon}"></i></div>`;

const summary = (item: ContentItem): string =>
  item.summary ? `<p class="mt-2 line-clamp-3 text-[0.95rem] leading-relaxed text-ink-soft">${escapeHtml(item.summary)}</p>` : '';

/** Blog cards open the on-site post page (suggested/related/archive). */
export const renderCards = (items: ContentItem[], copy: ListCopy): string => `
  <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    ${items
      .map(
        (item) => `
      <li class="list-none">
        <a href="${postLink(item)}" class="${CARD}">
          ${sticker(item.category)}
          ${cover(item, 'fa-feather-pointed')}
          <div class="flex flex-1 flex-col p-6">
            ${dateLine(item.published_at)}
            <h3 class="mt-2 font-head text-xl leading-snug font-extrabold tracking-tight text-ink">${escapeHtml(item.title)}</h3>
            ${summary(item)}
            ${arrowRow(copy.readMore)}
          </div>
        </a>
      </li>`
      )
      .join('')}
  </ul>`;

/** Newsroom cards link out to the story itself. */
export const renderNews = (items: ContentItem[], copy: ListCopy): string => `
  <ul class="grid gap-6 sm:grid-cols-2">
    ${items
      .map(
        (item) => `
      <li class="list-none">
        <a href="${safeUrl(item.cta_url)}" class="${CARD} p-6 pt-14 sm:p-8 sm:pt-16">
          ${sticker(item.category)}
          <span class="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-light text-secondary" aria-hidden="true"><i class="fa-solid fa-newspaper"></i></span>
          ${dateLine(item.published_at)}
          <h3 class="mt-2 font-head text-xl leading-snug font-extrabold tracking-tight text-ink sm:text-2xl">${escapeHtml(item.title)}</h3>
          ${summary(item)}
          ${arrowRow(item.cta_label || copy.readMore)}
        </a>
      </li>`
      )
      .join('')}
  </ul>`;

/** Open roles: Apply opens the shared CareersApply dialog for that role. */
export const renderJobs = (items: ContentItem[], copy: ListCopy): string => `
  <ul class="grid gap-5 lg:grid-cols-2">
    ${items
      .map(
        (item) => `
      <li class="list-none">
        <div class="${CARD} gap-4 p-6 sm:p-8">
          <div class="flex items-start gap-4">
            <span class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-lg text-primary-ink" aria-hidden="true"><i class="fa-solid fa-briefcase"></i></span>
            <div class="min-w-0">
              <h3 class="font-head text-xl leading-snug font-extrabold tracking-tight text-ink">${escapeHtml(item.title)}</h3>
              ${item.category || item.summary ? `<p class="mt-1 text-sm font-bold text-ink-soft">${escapeHtml(item.category || item.summary)}</p>` : ''}
            </div>
          </div>
          ${item.body ? `<p class="text-[0.95rem] leading-relaxed text-ink-soft">${escapeHtml(item.body)}</p>` : ''}
          <button type="button" data-apply-role data-role-id="${escapeHtml(item.id)}" data-role-title="${escapeHtml(item.title)}" aria-haspopup="dialog"
            class="mt-auto inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-primary-dark px-6 font-head text-sm font-bold text-white shadow-soft transition duration-300 ease-soft hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lift">
            <i class="fa-solid fa-paper-plane" aria-hidden="true"></i> ${escapeHtml(copy.apply)}
          </button>
        </div>
      </li>`
      )
      .join('')}
  </ul>`;

/** The one-card message for an empty list or a failed load. */
export const renderNotice = (text: string, icon: string): string => `
  <div class="flex items-center gap-4 rounded-card border border-line bg-surface p-6 text-ink-soft shadow-soft">
    <span class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lilac text-secondary" aria-hidden="true"><i class="fa-solid ${icon}"></i></span>
    <p>${escapeHtml(text)}</p>
  </div>`;

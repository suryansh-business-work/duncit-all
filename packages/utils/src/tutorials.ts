/**
 * Tutorials — the short how-to videos both apps list under the account menu.
 * Framework-free (rule 56): the filter contract, the "watched" rule and the
 * share/deep-link shape live here once, so mWeb and the native app cannot
 * disagree about when a video counts as watched or what a link opens.
 */

/** The page both apps open (mWeb path; native's linking path is `tutorials`). */
export const TUTORIALS_PATH = '/tutorials';

/** Languages a tutorial is recorded in. Mirrors the server TutorialLanguage enum. */
export const TUTORIAL_LANGUAGES = ['en', 'hi'] as const;
export type TutorialLanguageCode = (typeof TUTORIAL_LANGUAGES)[number];

/** The language toggle, in display order — each label is a translation key. */
export const TUTORIAL_LANGUAGE_OPTIONS: readonly { value: TutorialLanguageCode; labelKey: string }[] = [
  { value: 'en', labelKey: 'mweb.tutorials.languageEnglish' },
  { value: 'hi', labelKey: 'mweb.tutorials.languageHindi' },
];

/** Share of the video a member must have played for it to count as watched. */
export const TUTORIAL_WATCHED_RATIO = 0.9;

/** Longest comment the server accepts — the forms check the same number. */
export const TUTORIAL_COMMENT_MAX = 500;

/** Tutorials per feed page. */
export const TUTORIAL_PAGE_SIZE = 10;

/**
 * True once `position` (seconds played) reaches {@link TUTORIAL_WATCHED_RATIO}
 * of `duration`. An unknown or zero duration never counts — the player's
 * `ended` event covers that case.
 */
export function hasWatchedEnough(position: number, duration: number): boolean {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return false;
  return position / duration >= TUTORIAL_WATCHED_RATIO;
}

/** The feed's filters as both apps hold them. Empty strings mean "any". */
export interface TutorialFilters {
  search: string;
  topic: string;
  language: TutorialLanguageCode | '';
  /** A tutorial to bring into view first (from a shared link). */
  focus: string;
}

/** The query-string names the filters travel under (mWeb URL, native route params). */
export const TUTORIAL_FILTER_PARAMS = { search: 'q', topic: 'topic', language: 'lang', focus: 'v' } as const;

const isLanguage = (value: unknown): value is TutorialLanguageCode =>
  typeof value === 'string' && (TUTORIAL_LANGUAGES as readonly string[]).includes(value);

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Reads filters from a param lookup (URLSearchParams.get or a route-params record). */
export function parseTutorialFilters(read: (name: string) => unknown): TutorialFilters {
  const language = read(TUTORIAL_FILTER_PARAMS.language);
  return {
    search: text(read(TUTORIAL_FILTER_PARAMS.search)),
    topic: text(read(TUTORIAL_FILTER_PARAMS.topic)),
    language: isLanguage(language) ? language : '',
    focus: text(read(TUTORIAL_FILTER_PARAMS.focus)),
  };
}

/** The filters as query params — only the ones that are set, so a clean feed has a clean URL. */
export function tutorialFilterParams(filters: Partial<TutorialFilters>): Record<string, string> {
  const params: Record<string, string> = {};
  const search = text(filters.search);
  const topic = text(filters.topic);
  const focus = text(filters.focus);
  if (search) params[TUTORIAL_FILTER_PARAMS.search] = search;
  if (topic) params[TUTORIAL_FILTER_PARAMS.topic] = topic;
  if (isLanguage(filters.language)) params[TUTORIAL_FILTER_PARAMS.language] = filters.language;
  if (focus) params[TUTORIAL_FILTER_PARAMS.focus] = focus;
  return params;
}

/** The variables the `tutorials` query takes for these filters and page. */
export function tutorialFeedVariables(filters: TutorialFilters, page = 1) {
  return {
    search: filters.search || null,
    topic: filters.topic || null,
    language: filters.language || null,
    page,
    page_size: TUTORIAL_PAGE_SIZE,
  };
}

/** True when any filter narrows the feed (the empty state offers "Clear filters"). */
export const hasTutorialFilters = (filters: TutorialFilters) =>
  Boolean(filters.search || filters.topic || filters.language);

/** The link a shared tutorial opens: the feed with that video brought first. */
export function tutorialShareUrl(origin: string, tutorialId: string): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}${TUTORIALS_PATH}?${TUTORIAL_FILTER_PARAMS.focus}=${encodeURIComponent(tutorialId)}`;
}

/** `m:ss` for a length in seconds (`2:05`); an hour or more reads `h:mm:ss`. */
export function formatTutorialDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`;
  return `${minutes}:${seconds}`;
}

/** Moves the focused tutorial to the front of a page, so a shared link opens on it. */
export function withFocusedFirst<T extends { id: string }>(rows: readonly T[], focusId: string): T[] {
  if (!focusId) return [...rows];
  const index = rows.findIndex((row) => row.id === focusId);
  if (index <= 0) return [...rows];
  return [rows[index], ...rows.slice(0, index), ...rows.slice(index + 1)];
}

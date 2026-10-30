import { cachedGql } from './graphql-client';
import { getTranslator } from './i18n';
import { fetchPodPage, type WebsitePodPage } from './pod-page';
import {
  POD_PAGE_PATTERN,
  DYNAMIC_ROUTES,
  STATIC_ROUTES,
  matchPattern,
  type DynamicRoute,
  type StaticRoute,
} from './meta-routes';

export interface PageMeta {
  /** Bare page/entity title — the ` | app name` suffix is the renderer's job. */
  title: string;
  description: string;
  /** Absolute or dist-relative; null renders the branding logo. */
  imageUrl: string | null;
  appName: string;
  defaultImageUrl: string | null;
  themeColor: string | null;
  /**
   * The path this page should be indexed under, when it is not the one
   * that was requested. A profile answers to both its @handle and its raw
   * id, and a crawler shown the same page at two URLs splits the ranking
   * between them unless one names the other.
   */
  canonicalPath: string | null;
  /** Only a pod's details page may be indexed; every other page of the app is noindex. */
  indexable: boolean;
  /** The address names no page (a pod that is not public, or never was): a 404. */
  notFound: boolean;
  /** The pod behind an indexable pod page — its text and Event JSON-LD go into the HTML. */
  pod: WebsitePodPage | null;
}

interface BrandingResult {
  branding: {
    app_name: string;
    mweb_logo_url: string | null;
    logo_url: string;
    primary_color: string;
  };
}

interface LinkPreviewResult {
  linkPreview: {
    title: string;
    description: string | null;
    image_url: string | null;
    canonical_path: string | null;
  } | null;
}

const BRANDING_QUERY = /* GraphQL */ `
  query MetaServerBranding {
    branding {
      app_name
      mweb_logo_url
      logo_url
      primary_color
    }
  }
`;

const LINK_PREVIEW_QUERY = /* GraphQL */ `
  query MetaServerLinkPreview($kind: LinkPreviewKind!, $id: String!, $secondary_id: String) {
    linkPreview(kind: $kind, id: $id, secondary_id: $secondary_id) {
      title
      description
      image_url
      canonical_path
    }
  }
`;

const BRANDING_TTL_MS = 5 * 60 * 1000;
/** Matches the API's Redis TTL for linkPreview, so the layers age together. */
const PREVIEW_TTL_MS = 60 * 1000;

/** The PWA icon shipped in dist — the card image of last resort. */
const BUNDLED_LOGO_PATH = '/new-duncit-logo.png';

type Translate = Awaited<ReturnType<typeof getTranslator>>['t'];

interface Defaults {
  t: Translate;
  appName: string;
  defaultImageUrl: string | null;
  themeColor: string | null;
}

async function loadDefaults(): Promise<Defaults> {
  const [translator, brandingResult] = await Promise.all([
    getTranslator(),
    cachedGql<BrandingResult>(BRANDING_QUERY, {}, BRANDING_TTL_MS),
  ]);
  const branding = brandingResult?.branding ?? null;
  return {
    t: translator.t,
    appName: branding?.app_name || translator.t('mweb.meta.appName'),
    defaultImageUrl: branding?.mweb_logo_url || branding?.logo_url || BUNDLED_LOGO_PATH,
    themeColor: branding?.primary_color ?? null,
  };
}

const defaultMeta = ({ t, appName, defaultImageUrl, themeColor }: Defaults): PageMeta => ({
  title: appName,
  description: t('mweb.meta.defaultDescription'),
  imageUrl: null,
  appName,
  defaultImageUrl,
  themeColor,
  canonicalPath: null,
  indexable: false,
  notFound: false,
  pod: null,
});

/** What a result snippet shows; the full text is in the page itself. */
const SNIPPET_MAX = 160;

function snippet(text: string): string {
  if (text.length <= SNIPPET_MAX) return text;
  const cut = text.slice(0, SNIPPET_MAX - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

/**
 * The pod details page. The API down: the plain default card, still a 200, so
 * an outage never tells a crawler the pod is gone. No such public pod: a 404.
 */
async function podMeta(params: Record<string, string>, defaults: Defaults): Promise<PageMeta> {
  const pod = await fetchPodPage(params.clubSlug ?? '', params.podSlug ?? '');
  if (pod === undefined) return defaultMeta(defaults);
  if (pod === null) return { ...defaultMeta(defaults), notFound: true };
  return {
    ...defaultMeta(defaults),
    title: pod.title,
    description: pod.description ? snippet(pod.description) : defaults.t('mweb.meta.pod.description'),
    imageUrl: pod.image_urls[0] ?? null,
    canonicalPath: pod.canonical_path,
    indexable: true,
    pod,
  };
}

function staticMeta(route: StaticRoute, defaults: Defaults): PageMeta {
  const { t } = defaults;
  return {
    ...defaultMeta(defaults),
    title: t(route.titleKey),
    description: t(route.descriptionKey ?? 'mweb.meta.defaultDescription'),
  };
}

async function dynamicMeta(
  route: DynamicRoute,
  params: Record<string, string>,
  defaults: Defaults
): Promise<PageMeta> {
  const [id, secondaryId] = route.idParams.map((name) => params[name] ?? '');
  const result = await cachedGql<LinkPreviewResult>(
    LINK_PREVIEW_QUERY,
    { kind: route.kind, id, secondary_id: secondaryId ?? null },
    PREVIEW_TTL_MS
  );
  const preview = result?.linkPreview ?? null;
  if (!preview) return defaultMeta(defaults);
  const { t } = defaults;
  const title = route.titleTemplateKey
    ? t(route.titleTemplateKey, { vars: { name: preview.title } })
    : preview.title;
  return {
    ...defaultMeta(defaults),
    title,
    description: preview.description ?? t(route.descriptionKey),
    imageUrl: preview.image_url,
    canonicalPath: preview.canonical_path,
  };
}

/**
 * Path → the meta card for that page. Never throws: any failure inside the
 * lookups degrades to the app's default card so HTML always goes out.
 */
export async function resolvePageMeta(path: string): Promise<PageMeta> {
  const defaults = await loadDefaults();
  const podParams = matchPattern(POD_PAGE_PATTERN, path);
  if (podParams) return podMeta(podParams, defaults);
  for (const route of DYNAMIC_ROUTES) {
    const params = matchPattern(route.pattern, path);
    if (params) return dynamicMeta(route, params, defaults);
  }
  for (const route of STATIC_ROUTES) {
    if (matchPattern(route.pattern, path)) return staticMeta(route, defaults);
  }
  return defaultMeta(defaults);
}

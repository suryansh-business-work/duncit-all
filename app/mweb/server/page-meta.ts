import { cachedGql } from './graphql-client';
import { getTranslator } from './i18n';
import {
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
  linkPreview: { title: string; description: string | null; image_url: string | null } | null;
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
});

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
  };
}

/**
 * Path → the meta card for that page. Never throws: any failure inside the
 * lookups degrades to the app's default card so HTML always goes out.
 */
export async function resolvePageMeta(path: string): Promise<PageMeta> {
  const defaults = await loadDefaults();
  for (const route of DYNAMIC_ROUTES) {
    const params = matchPattern(route.pattern, path);
    if (params) return dynamicMeta(route, params, defaults);
  }
  for (const route of STATIC_ROUTES) {
    if (matchPattern(route.pattern, path)) return staticMeta(route, defaults);
  }
  return defaultMeta(defaults);
}

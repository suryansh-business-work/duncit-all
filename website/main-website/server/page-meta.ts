import { buildSiteMetaTags } from '@duncit/brand/site-meta';
import { cachedGql } from './graphql-client';

/**
 * The cards that can only be composed when somebody asks for one.
 *
 * A blog post is one page serving every post — the body arrives from the API
 * after the page loads — so what was built into its head describes the blog,
 * not the post. A crawler never runs that fetch, which is why every post used
 * to unfurl under the same title.
 */

const FIVE_MINUTES = 5 * 60 * 1000;

const BLOG_QUERY = /* GraphQL */ `
  query SiteServerBlog {
    publicWebsiteContent(type: BLOG) {
      title
      slug
      summary
      image_url
    }
  }
`;

const BRANDING_QUERY = /* GraphQL */ `
  query SiteServerBranding {
    branding {
      app_name
      website_header_logo_url
    }
  }
`;

interface BlogResult {
  publicWebsiteContent: {
    title: string;
    slug: string;
    summary: string | null;
    image_url: string | null;
  }[];
}

interface BrandingResult {
  branding: { app_name: string; website_header_logo_url: string | null };
}

const MAX_DESCRIPTION = 300;

/** An author's rich text becomes the one plain line a card displays. */
function plainText(value: string | null): string | null {
  if (!value) return null;
  const text = value
    .replaceAll(/<[^>]*>?/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length <= MAX_DESCRIPTION ? text : `${text.slice(0, MAX_DESCRIPTION - 1)}…`;
}

/**
 * The meta block for one blog post, or null when there is no such post — an
 * old link, a draft, an unreachable API. Null leaves the built page's own tags
 * in place, which describe the blog and are never wrong, only general.
 */
export async function blogPostMeta(
  slug: string,
  pageUrl: string,
  fallbackDescription: string
): Promise<string | null> {
  if (!slug) return null;
  const data = await cachedGql<BlogResult>(BLOG_QUERY, FIVE_MINUTES);
  const post = data?.publicWebsiteContent?.find((entry) => entry.slug === slug);
  if (!post) return null;
  const branding = await cachedGql<BrandingResult>(BRANDING_QUERY, FIVE_MINUTES);
  return buildSiteMetaTags({
    title: post.title,
    description: plainText(post.summary) ?? fallbackDescription,
    url: pageUrl,
    siteName: branding?.branding?.app_name ?? 'Duncit',
    // The post's own picture earns the wide card; the site logo does not.
    imageUrl: post.image_url ?? branding?.branding?.website_header_logo_url ?? null,
    largeImage: !!post.image_url,
    type: 'article',
  });
}

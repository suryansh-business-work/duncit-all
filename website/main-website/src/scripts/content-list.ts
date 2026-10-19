/**
 * WebsiteContentList's runtime: fetch one type of Website-portal content
 * (blog, newsroom, careers) live, so a published item is on the site without a
 * redeploy, and draw it with the variant the markup asks for.
 */
import type { ContentItem } from './content-format';
import { renderCards, renderJobs, renderNews, renderNotice, type ListCopy } from './content-cards';

const QUERY = `
  query PublicWebsiteContent($type: WebsitePageType!) {
    publicWebsiteContent(type: $type) {
      id
      title
      slug
      summary
      body
      category
      image_url
      cta_label
      cta_url
      published_at
    }
  }
`;

type Renderer = (items: ContentItem[], copy: ListCopy) => string;

const RENDERERS: Record<string, Renderer> = {
  jobs: renderJobs,
  news: renderNews,
  cards: renderCards,
};

interface ContentResponse {
  data?: { publicWebsiteContent?: ContentItem[] | null } | null;
  errors?: { message: string }[];
}

export async function loadContentList(root: HTMLElement): Promise<void> {
  // Handed over by the markup — a module script cannot read Astro frontmatter.
  const copy: ListCopy = JSON.parse(root.dataset.copy ?? '{}');
  try {
    const response = await fetch(root.dataset.graphqlUrl ?? '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { type: root.dataset.type } }),
    });
    const payload: ContentResponse = await response.json();
    if (payload.errors?.length) throw new Error(payload.errors[0].message);
    const items = payload.data?.publicWebsiteContent ?? [];
    if (!items.length) {
      root.innerHTML = renderNotice(copy.empty, 'fa-hourglass-half');
      return;
    }
    const render = RENDERERS[root.dataset.variant ?? 'cards'] ?? renderCards;
    root.innerHTML = render(items, copy);
  } catch (error) {
    // The visitor gets the friendly line; the developer gets the reason.
    console.error('website content list failed', { type: root.dataset.type, error });
    root.innerHTML = renderNotice(copy.error, 'fa-cloud-bolt');
  }
}

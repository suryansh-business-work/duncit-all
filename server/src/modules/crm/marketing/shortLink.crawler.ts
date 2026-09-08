import type { ShortLinkCard } from './shortLink.preview';

/**
 * Link-preview crawlers, and the card they are served.
 *
 * A short link is a redirect, and a redirect has no meta tags of its own — so
 * for a long time every duncit.com/<code> shared into a chat unfurled as the
 * home page instead of the pod somebody meant to send. A crawler asks for the
 * link exactly once, reads the head and leaves; it never runs JavaScript and
 * (unlike a person) has nowhere to be. So it is answered with the card and no
 * redirect at all, which also keeps its visit out of the click counts.
 */

/**
 * The unfurlers, by the token each puts in its user agent. Matched
 * case-insensitively as a substring, because every one of them appends its own
 * version and platform detail.
 *
 * Anything not listed here is treated as a person and redirected, which is the
 * safe direction to be wrong in: a missed crawler unfurls the destination's
 * own card (still better than the home page), while a misfiled browser would
 * be shown a page instead of being taken where it asked to go.
 */
const CRAWLER_TOKENS = [
  'facebookexternalhit',
  'facebookcatalog',
  'whatsapp',
  'twitterbot',
  'slackbot',
  'slack-imgproxy',
  'linkedinbot',
  'telegrambot',
  'discordbot',
  'pinterest',
  'redditbot',
  'applebot',
  'skypeuripreview',
  'vkshare',
  'embedly',
  'quora link preview',
  'outbrain',
  'nuzzel',
  'flipboard',
  'iframely',
  'googlebot',
  'google-inspectiontool',
  'bingbot',
  'duckduckbot',
  'yandexbot',
  'baiduspider',
  'mastodon',
  'snapchat',
  'viber',
  'line-podcast',
  'bitlybot',
  'xing-contenttabreceiver',
  'w3c_validator',
  'opengraph',
  'metainspector',
  'preview',
];

export function isLinkPreviewCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const agent = userAgent.toLowerCase();
  return CRAWLER_TOKENS.some((token) => agent.includes(token));
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string): string =>
  value.replaceAll(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

/**
 * The card document.
 *
 * `og:url` is the SHORT link rather than the destination: a card is shared on
 * again from wherever it was posted, and the address that travels with it has
 * to be the one whose clicks are counted.
 *
 * The only script is the redirect, and it exists for a browser that was
 * mistaken for a crawler — no unfurler runs it, so none of them is carried
 * past the card it came for. The visible markup underneath is what a reader
 * with no JavaScript gets: the entity's own words, and a link onward.
 */
export function renderCardHtml(input: {
  card: ShortLinkCard;
  destination: string;
  shareUrl: string;
}): string {
  const { card, destination, shareUrl } = input;
  const title = escapeHtml(card.title);
  const description = card.description ? escapeHtml(card.description) : null;
  const image = card.image_url ? escapeHtml(card.image_url) : null;
  const url = escapeHtml(destination);

  const tags = [
    `<title>${title} | ${escapeHtml(card.site_name)}</title>`,
    `<meta name="theme-color" content="${escapeHtml(card.theme_color)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escapeHtml(card.site_name)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:url" content="${escapeHtml(shareUrl)}" />`,
    `<meta name="twitter:card" content="${card.large_image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    // The destination is the page worth indexing; this hop never is.
    `<link rel="canonical" href="${url}" />`,
  ];
  if (description) {
    tags.push(
      `<meta name="description" content="${description}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta name="twitter:description" content="${description}" />`
    );
  }
  if (image) {
    tags.push(
      `<meta property="og:image" content="${image}" />`,
      `<meta name="twitter:image" content="${image}" />`
    );
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${tags.join('\n    ')}
    <script>window.location.replace(${JSON.stringify(destination)});</script>
  </head>
  <body>
    <h1>${title}</h1>
    ${description ? `<p>${description}</p>` : ''}
    <a href="${url}">${title}</a>
  </body>
</html>
`;
}

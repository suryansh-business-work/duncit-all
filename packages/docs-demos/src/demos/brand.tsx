import { defineDemo, defineDemos } from '../types';

interface BrandMock {
  /** The Astro components this package publishes, and where each is used. */
  components: { name: string; renders: string }[];
}

export default defineDemos('brand', [
  defineDemo<BrandMock>({
    id: 'surface',
    title: 'The marketing chrome every Astro site shares',
    note:
      'The only package here with no live view, and honestly so: these are .astro components with an `astro` peer dependency, so they cannot be mounted in a React portal. Open one of the websites to see them running.',
    mock: {
      components: [
        { name: 'BrandLogo.astro', renders: 'The header mark, linked home.' },
        { name: 'FooterLogo.astro', renders: 'The footer mark, with the wordmark beside it.' },
        { name: 'SiteMenu.astro', renders: 'The top navigation, identical across every site.' },
        {
          name: 'NewsletterSignup.astro',
          renders: 'The email capture block — captcha-gated, because it is a public mutation.',
        },
        { name: 'PolicyStrip.astro', renders: 'The legal links row above the copyright line.' },
        { name: 'SocialLinks.astro', renders: 'The social icon row, from admin-configured URLs.' },
        { name: 'AppDownload.astro', renders: 'The store badges, pointed at the live listings.' },
        { name: 'AppPhone.astro', renders: 'The phone mockup used on landing hero sections.' },
        {
          name: 'EarnShowcase.astro',
          renders:
            'The "Earn with Duncit" drifting photo wall on every home page except earnwith\'s own; its one CTA goes to earnwith.duncit.com.',
        },
        {
          name: 'ReelSlider.astro',
          renders:
            'The 3D reel slider under each home-page footer: the reels from Website portal > Reel Slider, muted and looping, one reel with sound at a time.',
        },
        {
          name: 'GoogleAnalytics.astro',
          renders: 'The gtag.js tag this website has in Tech → Google Analytics (e.g. G-V0CTVZFGM0 for MAIN), read as the page opens.',
        },
        {
          name: 'widgets',
          renders:
            'WIDGET_LOADERS — the client behaviour of every interactive website block (calculators, contact/FAQ/grievance forms, help & policy lists, site nav/header), mounted on any [data-cms-widget] root from its data attributes, so a CMS HTML snapshot keeps working.',
        },
        {
          name: 'cms-block',
          renders:
            'cmsBlockProps / CMS_BLOCKS — the data-cms-block + data-cms-props markers on Newsletter, ReelSlider, EarnShowcase, AppDownload, SocialLinks and PolicyStrip.',
        },
        {
          name: 'cms-design',
          renders:
            'tokensCss / googleFontsHref / fontStack / fontCss — a CMS website\'s design system (tokens, Google + uploaded fonts) as CSS, shared by the cms-site renderer and the Website portal editor so both draw a page identically.',
        },
        {
          name: 'google-analytics',
          renders: 'loadGoogleAnalytics(graphqlUrl, site) — the same loader for the React sites (STATUS, ECOMM).',
        },
      ],
    },
    compute: (mock) => ({
      ...Object.fromEntries(mock.components.map((entry) => [entry.name, entry.renders])),
      'Why one package': 'Eight websites shared a footer by copying it. Now they import it.',
    }),
  }),
]);

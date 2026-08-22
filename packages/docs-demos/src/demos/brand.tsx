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
      ],
    },
    compute: (mock) => ({
      ...Object.fromEntries(mock.components.map((entry) => [entry.name, entry.renders])),
      'Why one package': 'Eight websites shared a footer by copying it. Now they import it.',
    }),
  }),
]);

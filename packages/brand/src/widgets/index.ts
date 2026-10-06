/**
 * Every CMS widget, loaded on demand.
 *
 * A widget is the client-side BEHAVIOUR of an interactive block — the part an
 * HTML snapshot of a page does not carry. Its root is marked
 * `data-cms-widget="<name>"` and everything it needs is read from data
 * attributes under that root (see each module's header and the package docs).
 * A renderer imports only the widgets a page actually contains:
 *
 *   for (const root of document.querySelectorAll<HTMLElement>('[data-cms-widget]')) {
 *     WIDGET_LOADERS[root.dataset.cmsWidget ?? '']?.().then((widget) => widget.mount(root));
 *   }
 *
 * `mount` is idempotent: it marks the root `data-cms-mounted` and returns
 * early on a root it has already mounted.
 */

export interface CmsWidget {
  mount(root: HTMLElement): void;
}

export const WIDGET_LOADERS: Record<string, () => Promise<CmsWidget>> = {
  'earnings-calculator': () => import('./earnings-calculator'),
  'campaign-calculator': () => import('./campaign-calculator'),
  'contact-form': () => import('./contact-form'),
  faq: () => import('./faq'),
  'help-center': () => import('./help-center'),
  'grievance-form': () => import('./grievance-form'),
  'policy-list': () => import('./policy-list'),
  'policy-reader': () => import('./policy-reader'),
  'site-nav': () => import('./site-nav'),
  'site-header': () => import('./site-header'),
};

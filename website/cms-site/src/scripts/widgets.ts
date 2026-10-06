import { WIDGET_LOADERS } from '@duncit/brand/widgets';

/**
 * Brings a page's interactive widgets to life. A page carries the widget's
 * markup (written in the editor, styled by the site's design system) with a
 * `data-cms-widget` marker; its behaviour lives in @duncit/brand and is
 * loaded only when the page actually contains it.
 */
export function mountWidgets(root: ParentNode): void {
  // The API a widget calls is THIS deployment's, not whatever a page was built
  // or migrated with — the renderer stamps it on <html>.
  const graphqlUrl = document.documentElement.dataset.graphqlUrl ?? '';
  const byName = new Map<string, HTMLElement[]>();
  for (const element of root.querySelectorAll<HTMLElement>('[data-cms-widget]')) {
    const name = element.dataset.cmsWidget ?? '';
    if (graphqlUrl) element.dataset.graphqlUrl = graphqlUrl;
    byName.set(name, [...(byName.get(name) ?? []), element]);
  }
  for (const [name, elements] of byName) {
    const load = WIDGET_LOADERS[name];
    if (!load) {
      console.warn('[cms-site] widget has no registered behaviour', { widget: name });
      continue;
    }
    load()
      .then((widget) => {
        for (const element of elements) widget.mount(element);
      })
      .catch((error: unknown) => console.error('[cms-site] widget failed to load', { widget: name, error }));
  }
}

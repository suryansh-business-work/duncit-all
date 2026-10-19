/** Css that came from an editor, made safe to sit inside a <style> element. */
export const styleSafe = (css: string): string => css.replaceAll('</style', String.raw`<\/style`);

/** Same for script bodies inside a <script> element. */
export const scriptSafe = (js: string): string => js.replaceAll('</script', String.raw`<\/script`);

const DATE = /<time datetime="([^"]+)">[^<]*<\/time>/g;

/** The API writes dates as ISO days; visitors read them in the site's locale. */
export function localiseDates(html: string, locale: string): string {
  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  return html.replaceAll(DATE, (match, iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? match : `<time datetime="${iso}">${format.format(date)}</time>`;
  });
}

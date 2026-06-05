/** Strip HTML tags from stored rich text for plain-text rendering in RN. */
export function stripHtml(html?: string | null): string {
  return (html ?? '')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

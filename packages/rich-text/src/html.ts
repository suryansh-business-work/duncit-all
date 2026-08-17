/** Strip authored HTML into the searchable/plain-text companion stored by APIs. */
export function htmlToText(html: string): string {
  if (!html) return '';
  const element = document.createElement('div');
  element.innerHTML = html;
  return (element.textContent ?? '').replaceAll('\u00a0', ' ').trim();
}

export const normalizedEditorHtml = (html: string): string => (html === '<p></p>' ? '' : html);

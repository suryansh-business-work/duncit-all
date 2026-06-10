/** Splice an <mj-image> for `url` into MJML — inside the first column, else before </mj-body>. */
export function insertMjmlImage(mjml: string, url: string): string {
  const tag = `      <mj-image src="${url}" alt="" />\n`;
  const colIdx = mjml.indexOf('</mj-column>');
  if (colIdx !== -1) return `${mjml.slice(0, colIdx)}${tag}    ${mjml.slice(colIdx)}`;
  const bodyIdx = mjml.indexOf('</mj-body>');
  const section = `    <mj-section><mj-column>\n${tag}    </mj-column></mj-section>\n  `;
  if (bodyIdx !== -1) return `${mjml.slice(0, bodyIdx)}${section}${mjml.slice(bodyIdx)}`;
  return `${mjml}\n${tag}`;
}

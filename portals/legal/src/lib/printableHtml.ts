const escapeHtml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Wrap saved rich text in a standalone document for printing and download. */
export function toPrintableHtml(title: string, contentHtml: string): string {
  const safeTitle = escapeHtml(title);
  return (
    `<!doctype html><html><head><meta charset="utf-8" /><title>${safeTitle}</title>` +
    '<style>body{font-family:Arial,Helvetica,sans-serif;max-width:800px;margin:32px auto;padding:0 16px;line-height:1.5;color:#111}h1{font-size:22px}</style>' +
    `</head><body><h1>${safeTitle}</h1>${contentHtml}</body></html>`
  );
}

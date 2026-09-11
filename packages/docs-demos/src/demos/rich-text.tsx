import { Box } from '@mui/material';
import { htmlToText, normalizedEditorHtml } from '@duncit/rich-text';
import { RICH_TEXT_BODY_SX } from '@duncit/ui';
import { defineDemo, defineDemos } from '../types';

interface HtmlMock {
  /** What the editor holds after someone has typed and pasted into it. */
  html: string;
}

export default defineDemos('rich-text', [
  defineDemo<HtmlMock>({
    id: 'normalise',
    title: 'An empty editor is empty, however it got that way',
    note:
      "Replace html with '<p></p>' or '<p><br></p>' — both are what an editor leaves behind after the last character is deleted, and both normalise to nothing so a required field is honestly empty.",
    mock: {
      html: '<p>Friendly doubles at <strong>Play Arena</strong>.</p><p>Rackets on site &amp; shuttles included.</p>',
    },
    render: (mock) => (
      <div
        style={{ lineHeight: 1.6 }}
        // The editor's own output, rendered the way a pod page renders it.
        dangerouslySetInnerHTML={{ __html: normalizedEditorHtml(mock.html) }}
      />
    ),
    compute: (mock) => ({
      'normalizedEditorHtml(html)': normalizedEditorHtml(mock.html) || '(empty)',
      'htmlToText(html)': htmlToText(mock.html),
      'Plain-text length': htmlToText(mock.html).length,
      'Why it matters':
        'A zod min(1) on the raw HTML passes for "<p><br></p>", so a description that looks blank saves as valid.',
    }),
  }),

  defineDemo<HtmlMock>({
    id: 'table',
    title: 'A saved table, rendered the way a reader gets it',
    note:
      "This is stored HTML going out to a reader, not an editor: the borders and the header shading come from RICH_TEXT_BODY_SX, and a browser gives a bare <table> none of them — drop the sx and the same markup reads as prose. Delete a <td> from a row and the row simply comes up short; nothing repairs a table on the way out. Note what htmlToText does to it: the plain-text companion runs the cells together, exactly as it already does with list items, so search matches the words but not the layout.",
    mock: { html: '<h3>Court hire, January</h3><table><tbody><tr><th>Pod</th><th>Venue</th><th>Spots</th><th>Per spot</th></tr><tr><td>DUN-POD-4821</td><td>Play Arena, HSR Layout</td><td>8</td><td>₹499</td></tr><tr><td>DUN-POD-4907</td><td>Smashtress, Raj Nagar Extension</td><td>12</td><td>₹349</td></tr></tbody></table><p>Rates hold until the 31st.</p>' },
    render: (mock) => (
      <Box sx={RICH_TEXT_BODY_SX} dangerouslySetInnerHTML={{ __html: mock.html }} />
    ),
    compute: (mock) => ({
      'htmlToText(html)': htmlToText(mock.html),
      'Rows': String(mock.html.split('<tr').length - 1),
      'Header cells': String(mock.html.split('<th').length - 1),
      'Why it matters':
        'The editor keeps a table only because the table nodes are registered; without them the same HTML loads back as flattened text, and the save that follows writes the flattened version.',
    }),
  }),

  defineDemo<HtmlMock>({
    id: 'picture',
    title: 'A picture is a URL and its own block',
    note:
      "This is what the toolbar's picture button leaves behind: an <img> that is a direct child of the document, not wrapped in a <p>, and whose src is an ImageKit URL because allowBase64 is off. Swap the src for a data: URI to see what the editor refuses to write — that string would be a megabyte long and would live in the HTML column forever. Clear the alt to see the other half: the file name becomes the alt text on upload, so a picture is not silently unlabelled for a screen reader. htmlToText drops it entirely, which is correct — a picture has no words for search to match.",
    mock: {
      html: '<p>Court 2 after the resurfacing:</p><img src="https://ik.imagekit.io/duncit/rich-text/court-2-resurfaced.jpg" alt="court-2-resurfaced.jpg"><p>Booking reopens for <strong>DUN-POD-4821</strong> on the 14th.</p>',
    },
    render: (mock) => <Box sx={RICH_TEXT_BODY_SX} dangerouslySetInnerHTML={{ __html: mock.html }} />,
    compute: (mock) => ({
      'htmlToText(html)': htmlToText(mock.html),
      'Stored HTML length': `${mock.html.length} characters`,
      'Is the src a URL': String(mock.html.includes('src="https://')),
      'Has alt text': String(/<img[^>]+alt="[^"]+"/.test(mock.html)),
      'Why it matters':
        'The upload finishes before anything is inserted, so a failed upload leaves the document untouched rather than saving a src that 404s for every reader from then on.',
    }),
  }),
]);

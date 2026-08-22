import { htmlToText, normalizedEditorHtml } from '@duncit/rich-text';
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
]);

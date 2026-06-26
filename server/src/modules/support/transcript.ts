/**
 * Shared transcript model + renderers for support chats and tickets.
 *
 * A {@link TranscriptData} is built once by each service (chat / ticket) from
 * its own documents, then rendered to either plain text (.txt) or a Word
 * document (.docx). Both the inline export query and the email mutation reuse
 * the same artifact so the contents are identical across formats.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx';

export type TranscriptFormat = 'TXT' | 'DOCX';

export interface TranscriptLine {
  /** Display name of the author (e.g. the user, "System", "Duncit Assistant"). */
  who: string;
  /** ISO timestamp of the message. */
  when: string;
  /** Message body (already resolved to text / attachment placeholder). */
  body: string;
}

export interface TranscriptData {
  /** Document title, e.g. "Duncit — Support chat transcript". */
  title: string;
  /** Prefixed human ticket number, e.g. CH-A1B2C3 / ST-A1B2C3. */
  no: string;
  /** Ordered key/value header rows shown above the conversation. */
  header: { label: string; value: string }[];
  lines: TranscriptLine[];
}

const SEPARATOR = '------------------------------------------------';

/** Render the transcript as a plain-text document. */
export function renderTranscriptText(data: TranscriptData): string {
  const head = [
    data.title,
    ...data.header.map((h) => `${h.label}: ${h.value}`),
    SEPARATOR,
    '',
  ];
  const body = data.lines.map((l) => `[${l.when}] ${l.who}: ${l.body}`);
  return [...head, ...body].join('\n');
}

/** Render the transcript as a .docx Word document buffer. */
export async function renderTranscriptDocx(data: TranscriptData): Promise<Buffer> {
  const headerParagraphs = data.header.map(
    (h) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${h.label}: `, bold: true }),
          new TextRun({ text: h.value }),
        ],
      })
  );

  const lineParagraphs = data.lines.map(
    (l) =>
      new Paragraph({
        children: [
          new TextRun({ text: `[${l.when}] `, color: '888888' }),
          new TextRun({ text: `${l.who}: `, bold: true }),
          new TextRun({ text: l.body }),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: data.title, heading: HeadingLevel.HEADING_1 }),
          ...headerParagraphs,
          new Paragraph({ text: '' }),
          ...lineParagraphs,
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface TranscriptArtifact {
  filename: string;
  /** Always the plain-text rendering (handy for previews / .txt downloads). */
  text: string;
  content_base64: string;
  content_type: string;
}

/**
 * Build the export artifact for the requested format. The returned `text` is
 * always the plain-text rendering; `content_base64` is the encoded file for the
 * chosen format (utf-8 .txt or binary .docx).
 */
export async function buildTranscriptArtifact(
  data: TranscriptData,
  format: TranscriptFormat
): Promise<TranscriptArtifact> {
  const text = renderTranscriptText(data);
  const base = `support-${data.no}`;
  if (format === 'DOCX') {
    const buffer = await renderTranscriptDocx(data);
    return {
      filename: `${base}.docx`,
      text,
      content_base64: buffer.toString('base64'),
      content_type: DOCX_MIME,
    };
  }
  return {
    filename: `${base}.txt`,
    text,
    content_base64: Buffer.from(text, 'utf8').toString('base64'),
    content_type: 'text/plain',
  };
}

import {
  renderTranscriptText,
  renderTranscriptDocx,
  buildTranscriptArtifact,
  type TranscriptData,
} from '../../transcript';

const data: TranscriptData = {
  title: 'Duncit — Support chat transcript',
  no: 'CH-ABC123',
  header: [
    { label: 'Ticket', value: 'CH-ABC123' },
    { label: 'Status', value: 'CLOSED' },
  ],
  lines: [
    { who: 'Asha', when: '2026-06-26T10:00:00.000Z', body: 'Hi there' },
    { who: 'System', when: '2026-06-26T10:01:00.000Z', body: 'Chat marked resolved.' },
  ],
};

describe('transcript renderers', () => {
  it('renders plain text with header rows and stamped lines', () => {
    const text = renderTranscriptText(data);
    expect(text).toContain('Duncit — Support chat transcript');
    expect(text).toContain('Ticket: CH-ABC123');
    expect(text).toContain('Status: CLOSED');
    expect(text).toContain('[2026-06-26T10:00:00.000Z] Asha: Hi there');
    expect(text).toContain('[2026-06-26T10:01:00.000Z] System: Chat marked resolved.');
  });

  it('renders a non-empty .docx zip buffer (PK signature)', async () => {
    const buf = await renderTranscriptDocx(data);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('builds a .txt artifact whose base64 decodes back to the text', async () => {
    const art = await buildTranscriptArtifact(data, 'TXT');
    expect(art.filename).toBe('support-CH-ABC123.txt');
    expect(art.content_type).toBe('text/plain');
    expect(Buffer.from(art.content_base64, 'base64').toString('utf8')).toBe(art.text);
  });

  it('builds a .docx artifact with the Office mime type and PK bytes', async () => {
    const art = await buildTranscriptArtifact(data, 'DOCX');
    expect(art.filename).toBe('support-CH-ABC123.docx');
    expect(art.content_type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    const bytes = Buffer.from(art.content_base64, 'base64');
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
    // The plain-text rendering is always returned alongside the binary.
    expect(art.text).toContain('Asha: Hi there');
  });
});

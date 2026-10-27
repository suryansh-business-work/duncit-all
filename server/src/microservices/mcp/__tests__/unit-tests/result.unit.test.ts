import { MAX_RESULT_CHARS } from '../../mcp.constants';
import { errorResult, successResult, UNTRUSTED_NOTICE } from '../../execute/result';

const textOf = (result: { content: unknown[] }) => (result.content[0] as { type: string; text: string }).text;

/** A string data value that makes the whole envelope exactly `length` characters. */
function dataForLength(length: number): string {
  const empty = JSON.stringify({ tool: 'pods_pods_table', notice: UNTRUSTED_NOTICE, data: '' }).length;
  return 'a'.repeat(length - empty);
}

describe('successResult', () => {
  it('wraps the data in the envelope with the untrusted-data notice', () => {
    const { result, text } = successResult({ tool: 'pods_pod', data: { id: 'p1', pod_title: 'Sunday run' } });
    expect(JSON.parse(text)).toEqual({ tool: 'pods_pod', notice: UNTRUSTED_NOTICE, data: { id: 'p1', pod_title: 'Sunday run' } });
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect(textOf(result)).toBe(text);
  });

  it('keeps a null result as data: null', () => {
    expect(JSON.parse(successResult({ tool: 'pods_pod', data: null }).text)).toHaveProperty('data', null);
  });

  it('always includes data, as null, when a tool answered nothing', () => {
    expect(JSON.parse(successResult({ tool: 'mcp_probe', data: undefined }).text)).toEqual({ tool: 'mcp_probe', notice: UNTRUSTED_NOTICE, data: null });
  });

  it('keeps falsy answers as they are rather than turning them into null', () => {
    for (const data of [0, false, '']) expect(JSON.parse(successResult({ tool: 't', data }).text).data).toBe(data);
  });

  it('adds GraphQL warnings from a partial result, and leaves the key out when there are none', () => {
    expect(JSON.parse(successResult({ tool: 't', data: 1, warnings: ['host could not be loaded'] }).text).warnings).toEqual(['host could not be loaded']);
    expect(JSON.parse(successResult({ tool: 't', data: 1, warnings: [] }).text)).not.toHaveProperty('warnings');
  });

  it('lists the injection signatures found in the result as "rule at path"', () => {
    const { text } = successResult({
      tool: 't',
      data: {},
      flags: [
        { rule: 'ignore_instructions', path: '$.rows[0].pod_description', blocking: true },
        { rule: 'credential_request', path: '$.rows[2].chat', blocking: false },
      ],
    });
    expect(JSON.parse(text).injection_flags).toEqual(['ignore_instructions at $.rows[0].pod_description', 'credential_request at $.rows[2].chat']);
  });

  it('leaves injection_flags out when nothing was flagged', () => {
    expect(JSON.parse(successResult({ tool: 't', data: {}, flags: [] }).text)).not.toHaveProperty('injection_flags');
  });

  it('reports how many invisible characters were stripped, only when some were', () => {
    expect(JSON.parse(successResult({ tool: 't', data: {}, stripped: 3 }).text).stripped_characters).toBe(3);
    expect(JSON.parse(successResult({ tool: 't', data: {}, stripped: 0 }).text)).not.toHaveProperty('stripped_characters');
  });

  it('returns a result of exactly the limit untouched', () => {
    const { text } = successResult({ tool: 'pods_pods_table', data: dataForLength(MAX_RESULT_CHARS) });
    expect(text).toHaveLength(MAX_RESULT_CHARS);
    expect(JSON.parse(text)).not.toHaveProperty('truncated');
  });

  it('cuts a result one character over the limit and says how to ask for less', () => {
    const full = JSON.stringify({ tool: 'pods_pods_table', notice: UNTRUSTED_NOTICE, data: dataForLength(MAX_RESULT_CHARS + 1) });
    const { text } = successResult({ tool: 'pods_pods_table', data: dataForLength(MAX_RESULT_CHARS + 1) });
    const parsed = JSON.parse(text);
    expect(parsed).toMatchObject({ tool: 'pods_pods_table', notice: UNTRUSTED_NOTICE, truncated: true });
    expect(parsed).not.toHaveProperty('data');
    expect(parsed.message).toBe(
      `The result was ${MAX_RESULT_CHARS + 1} characters, more than the ${MAX_RESULT_CHARS} a tool may return. Ask for less — a smaller page_size, a filter, or a narrower date range.`
    );
    // The preview is the start of the full answer, as long as the limit allows once
    // the envelope around it (and the escaping of its quotes) is counted.
    expect(full.startsWith(parsed.data_preview)).toBe(true);
    expect(text.length).toBeLessThanOrEqual(MAX_RESULT_CHARS);
    expect(parsed.data_preview.length).toBeGreaterThan(MAX_RESULT_CHARS / 2);
  });

  it('keeps the cut result itself within the limit, even when the preview needs escaping', () => {
    // Rows of short quoted fields: re-encoding the preview as a JSON string
    // escapes every quote, so a naive cut grows well past the limit.
    const rows = Array.from({ length: 12_000 }, (_, i) => ({ id: `p${i}`, t: 'x' }));
    const { text } = successResult({ tool: 'pods_pods_table', data: { rows } });
    expect(JSON.parse(text).truncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(MAX_RESULT_CHARS);
  });

  it('gives the longest preview that still fits: one more character would break the limit', () => {
    const rows = Array.from({ length: 12_000 }, (_, i) => ({ id: `p${i}`, t: 'x' }));
    const full = JSON.stringify({ tool: 'pods_pods_table', notice: UNTRUSTED_NOTICE, data: { rows } });
    const parsed = JSON.parse(successResult({ tool: 'pods_pods_table', data: { rows } }).text);
    expect(full.startsWith(parsed.data_preview)).toBe(true);
    const longer = JSON.stringify({ ...parsed, data_preview: full.slice(0, parsed.data_preview.length + 1) });
    expect(longer.length).toBeGreaterThan(MAX_RESULT_CHARS);
  });
});

describe('errorResult', () => {
  it('marks the result as an error with a code and a message', () => {
    const { result, text } = errorResult('UNKNOWN_TOOL', 'There is no tool called pods_x.');
    expect(result.isError).toBe(true);
    expect(JSON.parse(text)).toEqual({ error: { code: 'UNKNOWN_TOOL', message: 'There is no tool called pods_x.' } });
    expect(textOf(result)).toBe(text);
  });

  it('keeps a message with quotes and newlines as valid JSON', () => {
    const { text } = errorResult('INJECTION_SUSPECTED', 'Found "ignore"\nat $.input');
    expect(JSON.parse(text).error.message).toBe('Found "ignore"\nat $.input');
  });
});

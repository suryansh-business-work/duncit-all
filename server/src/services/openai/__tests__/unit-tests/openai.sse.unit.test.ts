/**
 * Streaming responses arrive split at arbitrary byte boundaries, with tool
 * call arguments in fragments. The fold must give the same result however the
 * stream was cut.
 */
import { applyEvent, emptyAccumulator, splitSseEvents } from '../../openai.sse';

const chunk = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;

describe('splitSseEvents', () => {
  it('returns complete events and keeps the unfinished tail', () => {
    const { events, rest } = splitSseEvents(`${chunk({ a: 1 })}data: {"b"`);
    expect(events).toEqual(['{"a":1}']);
    expect(rest).toBe('data: {"b"');
  });

  it('handles CRLF line endings', () => {
    expect(splitSseEvents('data: x\r\n\r\n').events).toEqual(['x']);
  });
});

describe('applyEvent', () => {
  it('concatenates text deltas and reports what each added', () => {
    const acc = emptyAccumulator();
    expect(applyEvent(acc, JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] }))).toBe('Hel');
    expect(applyEvent(acc, JSON.stringify({ choices: [{ delta: { content: 'lo' }, finish_reason: 'stop' }] }))).toBe('lo');
    expect(acc.content).toBe('Hello');
    expect(acc.finishReason).toBe('stop');
  });

  it('assembles a tool call from fragments by index', () => {
    const acc = emptyAccumulator();
    applyEvent(acc, JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'find_', arguments: '{"que' } }] } }] }));
    applyEvent(acc, JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'tools', arguments: 'ry":"pods"}' } }] } }] }));
    expect(acc.toolCalls).toEqual([{ id: 'c1', name: 'find_tools', arguments: '{"query":"pods"}' }]);
  });

  it('keeps two parallel tool calls apart', () => {
    const acc = emptyAccumulator();
    applyEvent(acc, JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'a', function: { name: 'x', arguments: '{}' } }, { index: 1, id: 'b', function: { name: 'y', arguments: '{}' } }] } }] }));
    expect(acc.toolCalls.map((c) => c.name)).toEqual(['x', 'y']);
  });

  it('reads the usage chunk, stops at [DONE] and records a provider error', () => {
    const acc = emptyAccumulator();
    applyEvent(acc, JSON.stringify({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }));
    expect(acc.usage).toEqual({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });
    expect(applyEvent(acc, '[DONE]')).toBeNull();
    applyEvent(acc, JSON.stringify({ error: { message: 'overloaded' } }));
    expect(acc.error).toBe('overloaded');
  });

  it('ignores a malformed payload instead of throwing', () => {
    const acc = emptyAccumulator();
    expect(applyEvent(acc, '{not json')).toBe('');
    expect(acc.content).toBe('');
  });
});

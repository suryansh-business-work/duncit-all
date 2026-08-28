/**
 * Reading a thrown value into something showable — a translation key or a
 * browser sentence for the headline, the whole throw kept underneath for
 * whoever has to report it.
 */
import { describe, expect, it } from 'vitest';

import { describeFailure, failureFromKey, plainFailure } from '../src/staff-chat/failure';

describe('describeFailure', () => {
  it('falls back to the given key, keeping the raw thrown value as detail, for a non-Error throw', () => {
    const result = describeFailure('camera busy', 'shell.chat.call.failed');

    expect(result.message).toBe('shell.chat.call.failed');
    expect(result.detail).toBe('Thrown value: "camera busy"');
  });

  it('names the thrown value literally as undefined when nothing at all was thrown', () => {
    const result = describeFailure(undefined, 'shell.chat.call.failed');

    expect(result.detail).toBe('Thrown value: undefined');
  });

  it('reads a plain Error, trimming its message into the headline', () => {
    const error = new Error('  Permission denied  ');
    const result = describeFailure(error, 'shell.chat.call.failed');

    expect(result.message).toBe('Permission denied');
    expect(result.detail).toContain('Error:');
    expect(result.detail).toContain('Permission denied');
  });

  it('falls back to the key when the Error carries no message at all', () => {
    const error = new Error('');
    const result = describeFailure(error, 'shell.chat.call.failed');

    expect(result.message).toBe('shell.chat.call.failed');
    expect(result.detail).toContain('(no message)');
  });

  it('folds in constraint, code and a wrapped cause, each on their own line', () => {
    const cause = new Error('device unplugged');
    const error = Object.assign(new Error('Could not start video'), {
      constraint: 'width',
      code: 8,
      cause,
    });
    const result = describeFailure(error, 'shell.chat.call.failed');

    expect(result.detail).toContain('constraint: width');
    expect(result.detail).toContain('code: 8');
    expect(result.detail).toContain('cause: device unplugged');
  });

  it('omits a cause line when the cause is not itself an Error', () => {
    const error = Object.assign(new Error('failed'), { cause: 'not an error' });
    const result = describeFailure(error, 'shell.chat.call.failed');

    expect(result.detail).not.toContain('cause:');
  });
});

describe('plainFailure', () => {
  it('trims a server message into the headline and the detail', () => {
    const result = plainFailure('  Could not send message  ', 'shell.chat.send.failed');

    expect(result.message).toBe('Could not send message');
    expect(result.detail).toBe('Could not send message');
  });

  it('falls back to the key when the server sent nothing but whitespace', () => {
    const result = plainFailure('   ', 'shell.chat.send.failed');

    expect(result.message).toBe('shell.chat.send.failed');
    expect(result.detail).toBe('');
  });
});

describe('failureFromKey', () => {
  it('carries the key as the message with no detail behind it', () => {
    expect(failureFromKey('shell.chat.call.startVideoFirst')).toEqual({
      message: 'shell.chat.call.startVideoFirst',
      detail: '',
    });
  });
});

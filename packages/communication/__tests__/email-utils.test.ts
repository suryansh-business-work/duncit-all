import { describe, expect, it, vi } from 'vitest';
import {
  EmailTemplateError,
  InMemoryTemplateRenderer,
  applyVariables,
  composeMiddleware,
  deriveIdempotencyKey,
  hash32,
  htmlToText,
  toBase64,
} from '../src/index';
import type { EmailContext, EmailMiddleware, PreparedEmail } from '../src/index';

describe('htmlToText', () => {
  it('reads as paragraphs, not one run-on line', () => {
    expect(htmlToText('<p>Hello</p><p>World</p>')).toBe('Hello\nWorld');
    expect(htmlToText('One<br>Two')).toBe('One\nTwo');
  });

  it('drops script and style CONTENT rather than pasting the source in', () => {
    expect(htmlToText('<style>.a{color:red}</style><p>Hi</p>')).toBe('Hi');
    expect(htmlToText('<script>alert(1)</script>Hi')).toBe('Hi');
  });

  it('survives an unclosed tag instead of hanging on it', () => {
    expect(htmlToText('<p>Hi</p><div class="x')).toBe('Hi');
    expect(htmlToText('<script>never closed')).toBe('');
  });

  it('decodes the entities an email body actually contains', () => {
    expect(htmlToText('<p>Tom &amp; Jerry&nbsp;&#39;s</p>')).toBe("Tom & Jerry 's");
    // An entity with no mapping is left alone rather than mangled.
    expect(htmlToText('<p>&hearts;</p>')).toBe('&hearts;');
  });

  it('collapses the empty space a table-based email leaves behind', () => {
    expect(htmlToText('<div>A</div><div></div><div></div><div>B</div>')).toBe('A\n\nB');
  });

  it('reads a tag name past its attributes', () => {
    expect(htmlToText('<p class="lead">Hi</p><p>There</p>')).toBe('Hi\nThere');
  });

  it('handles text with no markup at all', () => {
    expect(htmlToText('just words')).toBe('just words');
  });
});

describe('applyVariables', () => {
  it('fills flat and dotted placeholders', () => {
    expect(
      applyVariables('Hi {{name}}, pod {{booking.id}}', { name: 'S', booking: { id: 'P-1' } }),
    ).toBe('Hi S, pod P-1');
  });

  it('renders a missing value EMPTY — raw {{syntax}} in a customer email is worse', () => {
    expect(applyVariables('Hi {{name}}!', {})).toBe('Hi !');
    expect(applyVariables('Hi {{a.b.c}}!', { a: null })).toBe('Hi !');
  });

  it('stringifies numbers and tolerates whitespace in the placeholder', () => {
    expect(applyVariables('{{ amount }}', { amount: 299 })).toBe('299');
  });
});

describe('InMemoryTemplateRenderer', () => {
  const renderer = new InMemoryTemplateRenderer({
    welcome: { html: '<p>Hi {{name}}</p>', text: 'Hi {{name}}', subject: 'Welcome {{name}}' },
    bare: { html: '<p>x</p>' },
  });

  it('renders html, text and subject', async () => {
    await expect(renderer.render('welcome', { name: 'S' })).resolves.toEqual({
      html: '<p>Hi S</p>',
      text: 'Hi S',
      subject: 'Welcome S',
    });
  });

  it('leaves text and subject undefined when the template has none', async () => {
    await expect(renderer.render('bare', {})).resolves.toEqual({
      html: '<p>x</p>',
      text: undefined,
      subject: undefined,
    });
  });

  it('names the missing template', async () => {
    await expect(renderer.render('nope', {})).rejects.toBeInstanceOf(EmailTemplateError);
    await expect(renderer.render('nope', {})).rejects.toThrow(/No template registered/);
  });
});

describe('idempotency keys', () => {
  it('is stable for the same message and different for a different one', () => {
    const a = deriveIdempotencyKey({
      category: 'billing',
      to: ['a@x.com'],
      subject: 'S',
      html: 'H',
    });
    const b = deriveIdempotencyKey({
      category: 'billing',
      to: ['a@x.com'],
      subject: 'S',
      html: 'H',
    });
    const c = deriveIdempotencyKey({
      category: 'billing',
      to: ['b@x.com'],
      subject: 'S',
      html: 'H',
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('dc-')).toBe(true);
  });

  it('hashes to a fixed width, including the empty string', () => {
    expect(hash32('')).toHaveLength(8);
    expect(hash32('duncit')).toHaveLength(8);
    expect(hash32('a')).not.toBe(hash32('b'));
  });
});

describe('toBase64', () => {
  it('encodes bytes and text the same way', () => {
    expect(toBase64('hi')).toBe('aGk=');
    expect(toBase64(new Uint8Array([104, 105]))).toBe('aGk=');
  });

  it('encodes a rupee sign instead of throwing on it', () => {
    // btoa on a raw '₹' throws — the UTF-8 pass is what stops a ticket PDF
    // failing at the last moment before sending.
    expect(toBase64('₹299')).toBe(globalThis.btoa('â¹299'));
  });

  it('handles a payload larger than one chunk', () => {
    const big = new Uint8Array(70_000).fill(65);
    expect(toBase64(big)).toHaveLength(Math.ceil(70_000 / 3) * 4);
  });
});

describe('composeMiddleware', () => {
  const email = { subject: 'original' } as unknown as PreparedEmail;
  const context = {} as EmailContext;
  const result = { messageId: 'm', provider: 'p', accepted: [], raw: {} };

  it('runs in registration order, outermost first', async () => {
    const order: string[] = [];
    const one: EmailMiddleware = async (e, c, next) => {
      order.push('one-in');
      const r = await next(e);
      order.push('one-out');
      return r;
    };
    const two: EmailMiddleware = async (e, c, next) => {
      order.push('two');
      return next(e);
    };
    await composeMiddleware([one, two], async () => {
      order.push('send');
      return result;
    })(email, context);
    expect(order).toEqual(['one-in', 'two', 'send', 'one-out']);
  });

  it('lets a middleware rewrite the message', async () => {
    let seen = '';
    const stamp: EmailMiddleware = (e, c, next) =>
      next({ ...e, subject: `[staging] ${e.subject}` });
    await composeMiddleware([stamp], async (e) => {
      seen = e.subject;
      return result;
    })(email, context);
    expect(seen).toBe('[staging] original');
  });

  it('lets a middleware stop the send without calling next', async () => {
    const send = vi.fn();
    const blocked = { messageId: null, provider: 'blocked', accepted: [], raw: {} };
    const stop: EmailMiddleware = async () => blocked;
    await expect(composeMiddleware([stop], send as never)(email, context)).resolves.toBe(blocked);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a second next() — that would send the email twice', async () => {
    const twice: EmailMiddleware = async (e, c, next) => {
      await next(e);
      return next(e);
    };
    await expect(composeMiddleware([twice], async () => result)(email, context)).rejects.toThrow(
      /next\(\) twice/,
    );
  });

  it('sends straight through when there is no middleware', async () => {
    await expect(composeMiddleware([], async () => result)(email, context)).resolves.toBe(result);
  });
});

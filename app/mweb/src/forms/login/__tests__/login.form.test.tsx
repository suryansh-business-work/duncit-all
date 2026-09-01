/**
 * The sign-in form.
 *
 * Its whole job is to refuse, before a round trip, exactly what the server
 * would refuse — the same email rule and the same eight-character minimum the
 * mobile app's `loginSchema` holds — so the two never disagree about whether a
 * password is long enough.
 *
 * The messages are COPY, so they come from the shared catalogue rather than
 * being written here (rule 38). That is why the schema is built from a `t`:
 * these assert against a translate that echoes its key, which is what proves
 * the message is a key at all rather than a literal somebody typed in.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LoginForm from '../login.form';
import { loginDefaults, loginSchema, makeLoginSchema } from '../login.types';

const testTheme = createTheme();
const echo = (key: string) => key;

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const wrap = (ui: React.ReactNode) =>
  render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);

afterEach(() => {
  vi.clearAllMocks();
});

describe('loginSchema', () => {
  it('starts empty — a sign-in form never arrives pre-filled', () => {
    expect(loginDefaults).toEqual({ email: '', phoneExtension: '+91', phoneNumber: '', password: '' });
  });

  it('needs an email, and needs it to be one', () => {
    expect(loginSchema.safeParse({ email: '', password: 'longenough' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'meera', password: 'longenough' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'meera@duncit.com', password: 'longenough' }).success).toBe(
      true
    );
  });

  it('trims the email, because a pasted one carries the spaces around it', () => {
    const parsed = loginSchema.safeParse({ email: ' meera@duncit.com ', password: 'longenough' });

    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data.email : '').toBe('meera@duncit.com');
  });

  it('holds the same eight-character minimum the server and the app hold', () => {
    expect(loginSchema.safeParse({ email: 'meera@duncit.com', password: 'short12' }).success).toBe(
      false
    );
    expect(loginSchema.safeParse({ email: 'meera@duncit.com', password: 'short123' }).success).toBe(
      true
    );
  });

  it('caps the email at what an address can actually be', () => {
    const long = `${'x'.repeat(250)}@duncit.com`;

    expect(loginSchema.safeParse({ email: long, password: 'longenough' }).success).toBe(false);
  });

  it('reports its messages as catalogue KEYS, never as literals typed in here', () => {
    const parsed = makeLoginSchema(echo).safeParse({ email: '', password: '' });
    const messages = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);

    expect(messages.every((message) => message.startsWith('mweb.auth.validation.'))).toBe(true);
  });
});

describe('LoginForm', () => {
  const form = (over: Partial<Parameters<typeof LoginForm>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    return { onSubmit, ...wrap(<LoginForm onSubmit={onSubmit} {...over} />) };
  };

  const fields = (container: HTMLElement) => [...container.querySelectorAll<HTMLInputElement>('input')];

  it('asks for an email and a password', () => {
    expect(fields(form().container)).toHaveLength(2);
  });

  it('opens empty, and on the values a caller hands it', () => {
    expect(fields(form().container)[0]?.value).toBe('');

    const prefilled = form({
      initialValues: { ...loginDefaults, email: 'meera@duncit.com' },
    });
    expect(fields(prefilled.container)[0]?.value).toBe('meera@duncit.com');
  });

  it('hides the password until the reader asks to see it', async () => {
    const { container } = form();
    expect(fields(container)[1]?.type).toBe('password');

    const [toggle] = container.querySelectorAll<HTMLElement>('button[aria-label]');
    fireEvent.click(toggle);
    await settle();

    expect(fields(container)[1]?.type).toBe('text');
  });

  it('refuses an empty form without asking the server', async () => {
    const { container, onSubmit } = form();

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a short password without asking the server', async () => {
    const { container, onSubmit } = form();
    const [email, password] = fields(container);

    fireEvent.change(email as HTMLElement, { target: { value: 'meera@duncit.com' } });
    fireEvent.change(password as HTMLElement, { target: { value: 'short' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('signs in once both fields are good', async () => {
    const { container, onSubmit } = form();
    const [email, password] = fields(container);

    fireEvent.change(email as HTMLElement, { target: { value: 'meera@duncit.com' } });
    fireEvent.change(password as HTMLElement, { target: { value: 'longenough' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'meera@duncit.com', password: 'longenough' })
    );
  });

  it('shows the caller error, which is where a wrong password is reported', () => {
    const { container } = form({ errorMessage: 'Email or password is incorrect' });

    expect(container.textContent).toContain('Email or password is incorrect');
  });

  it('renders while the sign-in is in flight', () => {
    expect(form({ loading: true }).container.innerHTML).not.toBe('');
  });

  it('takes the caller label, since the same form signs in and re-authenticates', () => {
    const { container } = form({ submitLabel: 'Confirm it is you' });

    expect(container.textContent).toContain('Confirm it is you');
  });

  it('surfaces a submit that threw rather than swallowing it', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network is down'));
    const { container } = wrap(<LoginForm onSubmit={onSubmit} />);
    const [email, password] = fields(container);

    fireEvent.change(email as HTMLElement, { target: { value: 'meera@duncit.com' } });
    fireEvent.change(password as HTMLElement, { target: { value: 'longenough' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(container.textContent).toContain('Network is down');
  });
});

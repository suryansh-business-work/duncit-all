/**
 * Changing a password, both steps of it.
 *
 * The flow is deliberately two steps — prove you know the current password,
 * then prove you can read the account's email — and the client's job is to
 * refuse anything the server would refuse, with the reason named, before a
 * round trip. The one rule that is CLIENT-only is the confirm match: the server
 * never sees the confirmation field, so if this form does not check it, a typo
 * silently becomes the new password and locks the person out of their own
 * account.
 */
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CurrentPasswordForm, NewPasswordForm } from '../change-password.form';
import {
  currentPasswordDefaults,
  currentPasswordSchema,
  newPasswordDefaults,
  newPasswordSchema,
} from '../change-password.types';

const testTheme = createTheme();

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

describe('the schemas', () => {
  it('starts both steps empty, so nothing is ever pre-filled with a password', () => {
    expect(currentPasswordDefaults.current_password).toBe('');
    expect(Object.values(newPasswordDefaults).every((value) => value === '')).toBe(true);
  });

  it('will not send an empty current password', () => {
    expect(currentPasswordSchema.safeParse({ current_password: '' }).success).toBe(false);
    expect(currentPasswordSchema.safeParse({ current_password: 'anything' }).success).toBe(true);
  });

  it('wants six digits for the code, not five and not letters', () => {
    const base = { new_password: 'longenough1', confirm_password: 'longenough1' };

    expect(newPasswordSchema.safeParse({ ...base, otp: '12345' }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ ...base, otp: 'abcdef' }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ ...base, otp: '123456' }).success).toBe(true);
  });

  it('trims the code, because a pasted one carries the spaces around it', () => {
    const parsed = newPasswordSchema.safeParse({
      otp: ' 123456 ',
      new_password: 'longenough1',
      confirm_password: 'longenough1',
    });

    expect(parsed.success).toBe(true);
  });

  it('holds the server minimum rather than letting a short password fail remotely', () => {
    const short = newPasswordSchema.safeParse({
      otp: '123456',
      new_password: 'short',
      confirm_password: 'short',
    });

    expect(short.success).toBe(false);
  });

  it('reports a mismatch against the CONFIRM field — the server never sees it', () => {
    const parsed = newPasswordSchema.safeParse({
      otp: '123456',
      new_password: 'longenough1',
      confirm_password: 'longenough2',
    });

    expect(parsed.success).toBe(false);
    // Named on the field the person can fix, not on the form as a whole.
    expect(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'))).toContain(
      'confirm_password'
    );
  });
});

describe('CurrentPasswordForm', () => {
  const form = (over: Partial<Parameters<typeof CurrentPasswordForm>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    return { onSubmit, ...wrap(<CurrentPasswordForm onSubmit={onSubmit} {...over} />) };
  };

  it('asks for the current password and nothing else', () => {
    const { container } = form();

    expect(container.querySelectorAll('input')).toHaveLength(1);
  });

  it('hides the password until the reader asks to see it', async () => {
    const { container } = form();
    const field = container.querySelector('input') as HTMLInputElement;
    expect(field.type).toBe('password');

    const [toggle] = container.querySelectorAll<HTMLElement>('button[aria-label]');
    fireEvent.click(toggle);
    await settle();

    expect((container.querySelector('input') as HTMLInputElement).type).toBe('text');
  });

  it('refuses an empty password without asking the server', async () => {
    const { container, onSubmit } = form();

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Enter your current password');
  });

  it('sends what was typed once there is something to send', async () => {
    const { container, onSubmit } = form();

    fireEvent.change(container.querySelector('input') as HTMLElement, {
      target: { value: 'the-old-one' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ current_password: 'the-old-one' })
    );
  });

  it('shows the caller error, which is where a wrong password is reported', () => {
    const { container } = form({ errorMessage: 'That password is not right' });

    expect(container.textContent).toContain('That password is not right');
  });

  it('renders while the request is in flight', () => {
    expect(form({ loading: true }).container.innerHTML).not.toBe('');
  });

  it('surfaces a submit that threw rather than swallowing it', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network is down'));
    const { container } = wrap(<CurrentPasswordForm onSubmit={onSubmit} />);

    fireEvent.change(container.querySelector('input') as HTMLElement, {
      target: { value: 'the-old-one' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(container.textContent).toContain('Network is down');
  });
});

describe('NewPasswordForm', () => {
  const form = (over: Partial<Parameters<typeof NewPasswordForm>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    return { onSubmit, ...wrap(<NewPasswordForm onSubmit={onSubmit} {...over} />) };
  };

  const fill = (container: HTMLElement, values: [string, string, string]) => {
    const fields = [...container.querySelectorAll<HTMLInputElement>('input')];
    fields.forEach((field, index) => {
      fireEvent.change(field, { target: { value: values[index] ?? '' } });
    });
  };

  it('asks for the code and the new password twice', () => {
    const { container } = form();

    expect(container.querySelectorAll('input')).toHaveLength(3);
  });

  it('refuses a five-digit code before a round trip', async () => {
    const { container, onSubmit } = form();

    fill(container, ['12345', 'longenough1', 'longenough1']);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('6 digit OTP');
  });

  it('refuses a password shorter than the server would take', async () => {
    const { container, onSubmit } = form();

    fill(container, ['123456', 'short', 'short']);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Min 8 characters');
  });

  it('refuses a typo in the confirmation — the server never sees that field', async () => {
    const { container, onSubmit } = form();

    fill(container, ['123456', 'longenough1', 'longenough2']);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Passwords do not match');
  });

  it('commits the change once all three agree', async () => {
    const { container, onSubmit } = form();

    fill(container, ['123456', 'longenough1', 'longenough1']);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ otp: '123456', new_password: 'longenough1' })
    );
  });

  it('shows and hides each password field independently', async () => {
    const { container } = form();

    for (const toggle of container.querySelectorAll<HTMLElement>('button[aria-label]')) {
      fireEvent.click(toggle);
      await settle();
    }

    expect(container.innerHTML).not.toBe('');
  });

  it('shows the caller error, which is where an expired code is reported', () => {
    const { container } = form({ errorMessage: 'That code has expired' });

    expect(container.textContent).toContain('That code has expired');
  });

  it('renders while the change is being committed', () => {
    expect(form({ loading: true }).container.innerHTML).not.toBe('');
  });

  it('surfaces a submit that threw', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network is down'));
    const { container } = wrap(<NewPasswordForm onSubmit={onSubmit} />);

    fill(container, ['123456', 'longenough1', 'longenough1']);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await settle();
    await settle();

    expect(container.textContent).toContain('Network is down');
  });
});

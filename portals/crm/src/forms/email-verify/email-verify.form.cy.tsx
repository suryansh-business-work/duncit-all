import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EmailVerifyForm, emailVerifySchema } from '.';

// The schema takes the surface's translator; echoing keys keeps the messages assertable.
const schema = emailVerifySchema(((key: string) => key) as Parameters<typeof emailVerifySchema>[0]);

const messages = (email: string) => {
  const result = schema.safeParse({ email });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('emailVerifySchema', () => {
  it('accepts a well-formed address and trims the spaces around it', () => {
    const result = schema.safeParse({ email: '  asha@example.com ' });
    expect(result.success && result.data.email).toBe('asha@example.com');
  });

  it('asks for an address when the field is blank or only spaces', () => {
    expect(messages('')).toContain('crm.emailVerifier.emailRequired');
    expect(messages('   ')).toContain('crm.emailVerifier.emailRequired');
  });

  it.each(['asha', 'asha@', '@example.com', 'asha@example', 'as ha@example.com'])(
    'rejects the malformed address "%s"',
    (email) => {
      expect(messages(email)).toEqual(['crm.emailVerifier.emailInvalid']);
    },
  );
});

describe('EmailVerifyForm', () => {
  const input = () => screen.getByTestId('email-verify-input');
  const submit = () => fireEvent.click(screen.getByTestId('email-verify-submit'));

  it('submits the trimmed address', async () => {
    const onSubmit = vi.fn();
    render(<EmailVerifyForm onSubmit={onSubmit} />);

    fireEvent.change(input(), { target: { value: ' asha@example.com ' } });
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: 'asha@example.com' });
  });

  it('shows why an address was refused and does not submit it', async () => {
    const onSubmit = vi.fn();
    render(<EmailVerifyForm onSubmit={onSubmit} />);

    submit();
    expect(await screen.findByText('Enter an email address')).toBeInTheDocument();

    fireEvent.change(input(), { target: { value: 'asha@example' } });
    submit();
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('labels the button by what is happening', () => {
    const { rerender } = render(<EmailVerifyForm onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
    expect(screen.getByText('The address to check, e.g. name@company.com')).toBeInTheDocument();

    rerender(<EmailVerifyForm onSubmit={vi.fn()} submitting />);
    expect(screen.getByTestId('email-verify-submit')).toHaveTextContent('Checking…');
  });
});

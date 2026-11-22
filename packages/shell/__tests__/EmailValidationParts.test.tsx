import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EmailValidationResultData } from '../src/email-validation/queries';

vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (value: string) => `on ${value}` }),
}));

const { EmailValidateButton } = await import('../src/email-validation/EmailValidateButton');
const { EmailCheckList } = await import('../src/email-validation/EmailCheckList');
const { EmailValidationResult } = await import('../src/email-validation/EmailValidationResult');
const { EmailVerdictChip } = await import('../src/email-validation/EmailVerdictChip');
const { EmailValidationContextProvider, useEmailValidation } = await import(
  '../src/email-validation/emailValidationContext'
);

const RESULT: EmailValidationResultData = {
  id: 'v1',
  email: 'asha@gmial.com',
  verdict: 'RISKY',
  portal: 'finance',
  suggestion: 'asha@gmail.com',
  created_at: '2026-11-21T10:00:00.000Z',
  checks: [
    { key: 'SYNTAX', passed: true },
    { key: 'MAIL_SERVER', passed: true },
    { key: 'SMTP_CONNECTION', passed: false },
    { key: 'MAILBOX_EXISTS', passed: null },
  ],
};

describe('EmailValidateButton', () => {
  it('renders nothing outside a signed-in console', () => {
    const { container } = render(<EmailValidateButton email="asha@example.com" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a blank or malformed value', () => {
    const open = vi.fn();
    const { container } = render(
      <EmailValidationContextProvider value={{ open }}>
        <EmailValidateButton email="not-an-email" />
        <EmailValidateButton email={null} />
        <EmailValidateButton email="   " />
      </EmailValidationContextProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens validation for the trimmed address, named in its label, without the click reaching the row', () => {
    const open = vi.fn();
    const rowClick = vi.fn();
    render(
      <EmailValidationContextProvider value={{ open }}>
        {/* A clickable row around the button, as in a grid. */}
        <div onClick={rowClick} role="presentation">
          <EmailValidateButton email="  asha@example.com " />
        </div>
      </EmailValidationContextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Validate asha@example.com' }));

    expect(open).toHaveBeenCalledWith('asha@example.com');
    expect(rowClick).not.toHaveBeenCalled();
  });
});

describe('useEmailValidation', () => {
  it('is null without a provider', () => {
    let seen: unknown = 'unset';
    function Probe() {
      seen = useEmailValidation();
      return null;
    }
    render(<Probe />);
    expect(seen).toBeNull();
  });
});

describe('EmailCheckList', () => {
  it('lists every test as busy while the check runs', () => {
    render(<EmailCheckList />);
    const list = screen.getByRole('list', { name: 'Checks' });
    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(within(list).getAllByRole('listitem')).toHaveLength(9);
    expect(screen.getByText('Address format is valid')).toBeInTheDocument();
    expect(screen.getByText('Not a shared role address (info@, support@)')).toBeInTheDocument();
  });

  it('marks each finished test passed, failed or not checked', () => {
    render(<EmailCheckList checks={RESULT.checks} />);
    expect(screen.getByRole('list', { name: 'Checks' })).toHaveAttribute('aria-busy', 'false');
    expect(within(screen.getByTestId('email-check-syntax')).getByTitle('Passed')).toBeInTheDocument();
    expect(within(screen.getByTestId('email-check-smtp_connection')).getByTitle('Failed')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('email-check-mailbox_exists')).getByTitle('Not checked: an earlier check failed')
    ).toBeInTheDocument();
  });
});

describe('EmailVerdictChip', () => {
  it('names each verdict', () => {
    render(
      <>
        <EmailVerdictChip verdict="VALID" />
        <EmailVerdictChip verdict="RISKY" size="medium" />
        <EmailVerdictChip verdict="INVALID" />
      </>
    );
    expect(screen.getByTestId('email-verdict-valid')).toHaveTextContent('Valid');
    expect(screen.getByTestId('email-verdict-risky')).toHaveTextContent('Risky');
    expect(screen.getByTestId('email-verdict-invalid')).toHaveTextContent('Invalid');
  });
});

describe('EmailValidationResult', () => {
  it('announces the final status with what it means, the typo fix, every test and when it ran', () => {
    render(<EmailValidationResult result={RESULT} />);

    const verdict = screen.getByRole('status');
    expect(verdict).toHaveTextContent('Final status');
    expect(within(verdict).getByTestId('email-verdict-risky')).toBeInTheDocument();
    expect(verdict).toHaveTextContent('something about this address is doubtful');
    expect(screen.getByTestId('email-validation-suggestion')).toHaveTextContent('Did you mean asha@gmail.com?');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByTestId('email-validation-checked-at')).toHaveTextContent('Checked on 2026-11-21T10:00:00.000Z');
  });

  it('leaves the suggestion out when there is none', () => {
    render(<EmailValidationResult result={{ ...RESULT, verdict: 'VALID', suggestion: '' }} />);
    expect(screen.queryByTestId('email-validation-suggestion')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('The mail server confirmed this mailbox exists');
  });
});

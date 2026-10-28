import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SignInForm } from '../../../../components/auth/sign-in';
import { renderWithProviders } from '../../../test-utils';
import { emailRequestMock } from './sign-in-mocks';

describe('SignInForm', () => {
  it('moves from the address to the code once a code is sent, and back again', async () => {
    const request = emailRequestMock('asha@example.com', { via: 'LITE', expires_in_minutes: 10 });
    const { user } = renderWithProviders(<SignInForm />, { mocks: [request.mock] });

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));

    expect(await screen.findByTestId('sign-in-code-form')).toBeInTheDocument();
    expect(screen.getByText('We emailed a 6-digit code to asha@example.com. It works for 10 minutes.')).toBeInTheDocument();
    expect(screen.queryByTestId('sign-in-email-form')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use a different email' }));
    expect(screen.getByTestId('sign-in-email-form')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('');
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSignInPrompt } from '../../../app/providers/SignInPromptProvider';
import { SignInDialog } from '../../../components/auth/SignInDialog';
import { renderWithProviders } from '../../test-utils';

/** Whatever in the app asks for an account: here, a plain button. */
function Opener() {
  const { openSignIn } = useSignInPrompt();
  return (
    <button type="button" onClick={openSignIn}>
      Register
    </button>
  );
}

const renderDialog = () =>
  renderWithProviders(
    <>
      <Opener />
      <SignInDialog />
    </>,
  );

describe('SignInDialog', () => {
  it('stays closed until something asks for sign-in', () => {
    renderDialog();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a dialog named by its title, holding the sign-in door', async () => {
    const { user } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Register' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sign in' });
    expect(within(dialog).getByTestId('sign-in-panel')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('closes from its close button', async () => {
    const { user } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Register' }));
    await user.click(await screen.findByRole('button', { name: 'Close sign-in' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes on Escape', async () => {
    const { user } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Register' }));
    await screen.findByRole('dialog', { name: 'Sign in' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

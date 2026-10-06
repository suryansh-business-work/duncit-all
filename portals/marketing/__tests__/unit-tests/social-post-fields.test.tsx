import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import { makeSocialAccount } from '../mocks';
import type { SocialAccount } from '../../src/pages/social-accounts-page/queries';
import PlatformChecks from '../../src/pages/social-accounts-page/social-post-form/PlatformChecks';
import { SocialPostForm, blankSocialPostValues } from '../../src/pages/social-accounts-page/social-post-form';

const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const linkedin = makeSocialAccount();
const x = makeSocialAccount({ id: 'sa2', provider: 'X', platform: 'X', name: 'Duncit X' });
const expired = makeSocialAccount({ id: 'sa3', provider: 'META', platform: 'FACEBOOK', name: 'Duncit FB', status: 'EXPIRED' });

// AccountPicker is driven by the real composer form it lives in, so the
// react-hook-form wiring (value, validation message) is the production one.
const renderForm = (accounts: SocialAccount[], initial = blankSocialPostValues()) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(<SocialPostForm accounts={accounts} initial={initial} onCancel={vi.fn()} onSubmit={onSubmit} />);
  return { onSubmit, picker: screen.getByTestId('social-post-accounts') };
};

describe('AccountPicker', () => {
  it('lists every account as a named checkbox and refuses one that needs reconnecting', () => {
    const { picker } = renderForm([linkedin, x, expired]);
    expect(within(picker).getByText(t('marketing.social.postTo'))).toBeInTheDocument();
    expect(within(picker).getByRole('checkbox', { name: 'Duncit Pages' })).toBeEnabled();
    expect(within(picker).getByRole('checkbox', { name: 'Duncit X' })).toBeEnabled();
    expect(within(picker).getByRole('checkbox', { name: 'Duncit FB' })).toBeDisabled();
    expect(within(picker).getByTestId('LinkedInIcon')).toBeInTheDocument();
    expect(within(picker).queryByText(t('marketing.social.connectFirst'))).not.toBeInTheDocument();
  });

  it('tells the marketer to connect an account when there is none', () => {
    const { picker } = renderForm([]);
    expect(within(picker).queryAllByRole('checkbox')).toHaveLength(0);
    expect(within(picker).getByText(t('marketing.social.connectFirst'))).toBeInTheDocument();
  });

  it('starts with the accounts already chosen, toggles them on and off, and submits the picked ids', async () => {
    const { onSubmit, picker } = renderForm([linkedin, x], blankSocialPostValues({ account_ids: ['sa1'], text: 'Hi' }));
    const pages = within(picker).getByRole('checkbox', { name: 'Duncit Pages' });
    const xBox = within(picker).getByRole('checkbox', { name: 'Duncit X' });
    expect(pages).toBeChecked();
    expect(xBox).not.toBeChecked();

    fireEvent.click(xBox);
    fireEvent.click(pages);
    expect(xBox).toBeChecked();
    expect(pages).not.toBeChecked();

    fireEvent.click(screen.getByTestId('social-post-now'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ account_ids: ['sa2'], mode: 'NOW' });
  });

  it('shows the validation message in place of the hint when no account is picked', async () => {
    const { onSubmit, picker } = renderForm([linkedin], blankSocialPostValues({ text: 'Hi' }));
    fireEvent.click(screen.getByTestId('social-post-now'));
    expect(await within(picker).findByText(t('marketing.social.pickAccount'))).toBeInTheDocument();
    expect(picker.querySelector('.MuiFormLabel-root')).toHaveClass('Mui-error');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('PlatformChecks', () => {
  it('renders nothing when no network is chosen', () => {
    renderWithProviders(<PlatformChecks platforms={[]} text="Hello" />);
    expect(screen.queryByTestId('social-post-limits')).not.toBeInTheDocument();
  });

  it('counts characters as a person does against each network limit, flagging only the one exceeded', () => {
    // 279 letters + one emoji (two UTF-16 units) + one more letter = 281 characters.
    const text = `${'a'.repeat(279)}🎾b`;
    renderWithProviders(<PlatformChecks platforms={['X', 'LINKEDIN']} text={text} />);
    const limits = screen.getByTestId('social-post-limits');
    expect(limits).toHaveAttribute('aria-live', 'polite');
    const xChip = within(limits).getByText('X: 281 / 280').closest('.MuiChip-root');
    const linkedinChip = within(limits).getByText(/^LinkedIn: 281 \/ 3,?000$/).closest('.MuiChip-root');
    expect(xChip).toHaveClass('MuiChip-colorError');
    expect(linkedinChip).toHaveClass('MuiChip-colorDefault');
    expect(within(limits).getByTestId('XIcon')).toBeInTheDocument();
  });

  it('keeps a network at its exact limit unflagged', () => {
    renderWithProviders(<PlatformChecks platforms={['X']} text={'a'.repeat(280)} />);
    const chip = screen.getByText('X: 280 / 280').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-colorDefault');
    expect(chip).not.toHaveClass('MuiChip-colorError');
  });
});
